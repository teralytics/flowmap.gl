import * as d3Array from 'd3-array';
import * as d3Collection from 'd3-collection';
import { HCLColor } from 'd3-color';
import * as d3Color from 'd3-color';
import { interpolateHcl } from 'd3-interpolate';
import * as d3scale from 'd3-scale';
import * as _ from 'lodash';
import { createSelector } from 'reselect';
import {
  Flow,
  FlowAccessor,
  Location,
  LocationAccessor,
  LocationCircle,
  LocationCircleType,
  Props,
} from './FlowMapLayer';
import { colorAsArray, RGBA } from './utils';

export interface Getters {
  getLocationId: LocationAccessor<string>;
  getFlowOriginId: FlowAccessor<string>;
  getFlowDestId: FlowAccessor<string>;
  getFlowMagnitude: FlowAccessor<number>;
}

export interface LocationTotals {
  incoming: {
    [key: string]: number;
  };
  outgoing: {
    [key: string]: number;
  };
}

export interface Colors {
  flowLineColorRange: Array<HCLColor | string>;
  locationCircleColors: {
    inner: RGBA;
    outgoing: RGBA;
    incoming: RGBA;
    dimmed: RGBA;
    none: RGBA;
  };
  locationAreaColors: {
    normal: RGBA;
    selected: RGBA;
    highlighted: RGBA;
    connected: RGBA;
    none: RGBA;
  };
}

export interface LocationsById {
  [key: string]: Location;
}

export type MemoizedSelector<T> = (props: Props) => T;

export interface MemoizedSelectors {
  getColors: MemoizedSelector<Colors>;
  getLocationsById: MemoizedSelector<LocationsById>;
  getActiveFlows: MemoizedSelector<Flow[]>;
  getSortedNonSelfFlows: MemoizedSelector<Flow[]>;
  isLocationConnectedGetter: MemoizedSelector<(id: string) => boolean>;
  getFlowColorScale: MemoizedSelector<(value: number) => HCLColor>;
  getFlowThicknessScale: MemoizedSelector<d3scale.ScaleLinear<number, number>>;
  getLocationRadiusGetter: MemoizedSelector<(locCircle: LocationCircle) => number>;
  getLocationCircles: MemoizedSelector<LocationCircle[]>;
  getLocationTotalInGetter: MemoizedSelector<(location: Location) => number>;
  getLocationTotalOutGetter: MemoizedSelector<(location: Location) => number>;
}

const getBaseColor = (props: Props) => props.baseColor;
const getLocationFeatures = (props: Props) => props.locations.features;
const getFlows = (props: Props) => props.flows;
const getHighlightedFlow = (props: Props) => props.highlightedFlow;
const getHighlightedLocationId = (props: Props) => props.highlightedLocationId;
const getSelectedLocationId = (props: Props) => props.selectedLocationId;
const getVaryFlowColorByMagnitude = (props: Props) => props.varyFlowColorByMagnitude;

export default function createMemoizedSelectors({
  getLocationId,
  getFlowOriginId,
  getFlowDestId,
  getFlowMagnitude,
}: Getters): MemoizedSelectors {
  const getColors = createSelector(getBaseColor, baseColor => {
    const NOCOLOR: RGBA = [255, 255, 255, 0];
    const DIMMED: RGBA = [0, 0, 0, 100];

    const baseColorHcl = d3Color.hcl(baseColor);
    const baseColorDarker = baseColorHcl.darker(1.25);
    const baseColorDarker2 = baseColorHcl.darker(1.5);
    const baseColorBrighter2 = baseColorHcl.brighter(2);
    const baseColorBrighter3 = baseColorHcl.brighter(3);

    return {
      flowLineColorRange: [baseColorBrighter2, baseColorHcl],
      locationCircleColors: {
        inner: colorAsArray(baseColorHcl),
        outgoing: colorAsArray(baseColorBrighter3),
        incoming: colorAsArray(baseColorDarker),
        dimmed: DIMMED,
        none: NOCOLOR,
      },
      locationAreaColors: {
        normal: colorAsArray(baseColorBrighter2),
        selected: colorAsArray(baseColorDarker2),
        highlighted: colorAsArray(baseColorHcl),
        connected: colorAsArray(baseColorBrighter2),
        none: NOCOLOR,
      },
    };
  });

  const getLocationsById = createSelector(getLocationFeatures, locations =>
    d3Collection
      .nest<Location, Location>()
      .key(getLocationId)
      .rollup(([l]) => l)
      .object(locations),
  );

  const getFilteredFlows = createSelector(getFlows, getSelectedLocationId, (flows, selectedLocationId) => {
    if (selectedLocationId) {
      return flows.filter(
        flow => getFlowOriginId(flow) === selectedLocationId || getFlowDestId(flow) === selectedLocationId,
      );
    }
    return flows;
  });

  const isLocationConnectedGetter = createSelector(
    getFilteredFlows,
    getHighlightedLocationId,
    getHighlightedFlow,
    getSelectedLocationId,
    (flows, highlightedLocationId, highlightedFlow, selectedLocationId) => {
      if (highlightedFlow) {
        return (id: string) => id === getFlowOriginId(highlightedFlow) || id === getFlowDestId(highlightedFlow);
      }

      if (highlightedLocationId) {
        const isRelated = (flow: Flow) => {
          const originId = getFlowOriginId(flow);
          const destId = getFlowDestId(flow);
          return (
            originId === highlightedLocationId ||
            originId === selectedLocationId ||
            destId === highlightedLocationId ||
            destId === selectedLocationId
          );
        };

        const locations = new Set();
        for (const flow of flows) {
          if (isRelated(flow)) {
            locations.add(getFlowOriginId(flow));
            locations.add(getFlowDestId(flow));
          }
        }

        return (id: string) => locations.has(id);
      }

      return () => false;
    },
  );

  const getNonSelfFlows = createSelector(getFilteredFlows, flows =>
    flows.filter(flow => getFlowOriginId(flow) !== getFlowDestId(flow)),
  );

  const getSortedNonSelfFlows = createSelector(getNonSelfFlows, flows => _.orderBy(flows, [getFlowMagnitude, 'desc']));

  const getFlowMagnitudeExtent = createSelector(getNonSelfFlows, flows => d3Array.extent(flows, getFlowMagnitude));

  const getLocationTotals = createSelector(getLocationFeatures, getFilteredFlows, (locations, flows) =>
    flows.reduce<LocationTotals>(
      (acc, curr) => {
        const originId = getFlowOriginId(curr);
        const destId = getFlowDestId(curr);
        const magnitude = getFlowMagnitude(curr);
        acc.outgoing[originId] = (acc.outgoing[originId] || 0) + magnitude;
        acc.incoming[destId] = (acc.incoming[destId] || 0) + magnitude;
        return acc;
      },
      { incoming: {}, outgoing: {} },
    ),
  );

  const getLocationTotalInGetter = createSelector(getLocationTotals, ({ incoming }) => {
    return (location: Location) => incoming[getLocationId(location)] || 0;
  });

  const getLocationTotalOutGetter = createSelector(getLocationTotals, ({ outgoing }) => {
    return (location: Location) => outgoing[getLocationId(location)] || 0;
  });

  const getLocationMaxTotal = createSelector(
    getLocationFeatures,
    getLocationTotalInGetter,
    getLocationTotalOutGetter,
    (locations, getLocationTotalIn, getLocationTotalOut) =>
      d3Array.max(locations, (location: Location) =>
        Math.max(getLocationTotalIn(location), getLocationTotalOut(location)),
      ),
  );

  const getSizeScale = createSelector(getLocationMaxTotal, maxTotal =>
    d3scale
      .scalePow()
      .exponent(1 / 2)
      .domain([0, maxTotal || 0])
      .range([0, 15]),
  );

  const getFlowThicknessScale = createSelector(getFlowMagnitudeExtent, ([minMagnitude, maxMagnitude]) =>
    d3scale
      .scaleLinear()
      .range([0.05, 0.5])
      .domain([0, maxMagnitude || 0]),
  );

  const getFlowColorScale = createSelector(
    getColors,
    getFlowMagnitudeExtent,
    getVaryFlowColorByMagnitude,
    (colors, [minMagnitude, maxMagnitude], varyFlowColorByMagnitude) =>
      // varyFlowColorByMagnitude
      //   ? d3scale
      //       .scalePow()
      //       .exponent(1 / 3)
      //       .interpolate(interpolateHcl)
      //       .range(colors.flowLineColorRange)
      //       .domain([0, maxMagnitude || 0])
      //   :
      () => colors.flowLineColorRange[1],
  );

  const getLocationRadiusGetter = createSelector(
    getSizeScale,
    getLocationTotalInGetter,
    getLocationTotalOutGetter,
    (sizeScale, getLocationTotalIn, getLocationTotalOut) => {
      return ({ location, type }: LocationCircle) => {
        if (!location) {
          return 0;
        }

        const getSide = type === LocationCircleType.INNER ? Math.min : Math.max;
        return sizeScale(getSide(getLocationTotalIn(location), getLocationTotalOut(location)));
      };
    },
  );

  const getLocationCircles = createSelector(getLocationFeatures, locations =>
    _.flatMap(locations, location => [
      {
        location,
        type: LocationCircleType.OUTER,
      },
      {
        location,
        type: LocationCircleType.INNER,
      },
    ]),
  );

  const getActiveFlows = createSelector(
    getSortedNonSelfFlows,
    getHighlightedFlow,
    getHighlightedLocationId,
    getSelectedLocationId,
    (flows, highlightedFlow, highlightedLocationId, selectedLocationId) => {
      if (highlightedFlow) {
        return flows.filter(
          flow =>
            getFlowOriginId(flow) === getFlowOriginId(highlightedFlow) &&
            getFlowDestId(flow) === getFlowDestId(highlightedFlow),
        );
      }

      if (highlightedLocationId) {
        return flows.filter(
          flow => getFlowOriginId(flow) === highlightedLocationId || getFlowDestId(flow) === highlightedLocationId,
        );
      }

      if (selectedLocationId) {
        return flows.filter(
          flow => getFlowOriginId(flow) === selectedLocationId || getFlowDestId(flow) === selectedLocationId,
        );
      }

      return flows;
    },
  );

  return {
    getColors,
    getActiveFlows,
    getSortedNonSelfFlows,
    isLocationConnectedGetter,
    getLocationsById,
    getFlowColorScale,
    getFlowThicknessScale,
    getLocationRadiusGetter,
    getLocationCircles,
    getLocationTotalInGetter,
    getLocationTotalOutGetter,
  };
}
