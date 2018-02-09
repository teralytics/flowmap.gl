import * as d3Array from 'd3-array';
import * as d3Collection from 'd3-collection';
import { interpolateHcl } from 'd3-interpolate';
import * as d3Scale from 'd3-scale';
import * as _ from 'lodash';
import { createSelector } from 'reselect';
import { Props } from './FlowMapLayer';
import {
  Colors,
  DiffColors,
  Flow,
  FlowAccessor,
  isDiffColors,
  Location,
  LocationAccessor,
  LocationCircle,
  LocationCircleType,
} from './types';
import { ColorScale } from './types';
import { rgbaToString } from './utils';

export interface InputGetters {
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

export interface LocationsById {
  [key: string]: Location;
}

export type PropsSelector<T> = (props: Props) => T;

export interface Selectors {
  getColors: PropsSelector<Colors | DiffColors>;
  getLocationsById: PropsSelector<LocationsById>;
  getActiveFlows: PropsSelector<Flow[]>;
  getSortedNonSelfFlows: PropsSelector<Flow[]>;
  isLocationConnectedGetter: PropsSelector<(id: string) => boolean>;
  getFlowColorScale: PropsSelector<ColorScale>;
  getFlowThicknessScale: PropsSelector<d3Scale.ScaleLinear<number, number>>;
  getLocationRadiusGetter: PropsSelector<(locCircle: LocationCircle) => number>;
  getLocationCircles: PropsSelector<LocationCircle[]>;
  getLocationTotalInGetter: PropsSelector<(location: Location) => number>;
  getLocationTotalOutGetter: PropsSelector<(location: Location) => number>;
}

const getColors = (props: Props) => props.colors;
const getLocationFeatures = (props: Props) => props.locations.features;
const getFlows = (props: Props) => props.flows;
const getHighlightedFlow = (props: Props) => props.highlightedFlow;
const getHighlightedLocationId = (props: Props) => props.highlightedLocationId;
const getSelectedLocationId = (props: Props) => props.selectedLocationId;
const getVaryFlowColorByMagnitude = (props: Props) => props.varyFlowColorByMagnitude;

export default function createSelectors({
  getLocationId,
  getFlowOriginId,
  getFlowDestId,
  getFlowMagnitude,
}: InputGetters): Selectors {
  const getLocationsById = createSelector(getLocationFeatures, locations =>
    d3Collection
      .nest<Location, Location | undefined>()
      .key(getLocationId)
      .rollup(_.head)
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
    (locations, getLocationTotalIn, getLocationTotalOut) => {
      const max = d3Array.max(locations, (location: Location) =>
        Math.max(getLocationTotalIn(location), getLocationTotalOut(location)),
      );
      return max || 0;
    },
  );

  const getSizeScale = createSelector(getLocationMaxTotal, maxTotal =>
    d3Scale
      .scalePow()
      .exponent(1 / 2)
      .domain([0, maxTotal])
      .range([0, 15]),
  );

  const getFlowThicknessScale = createSelector(getFlowMagnitudeExtent, ([minMagnitude, maxMagnitude]) =>
    d3Scale
      .scaleLinear()
      .range([0.05, 0.5])
      .domain([0, maxMagnitude || 0]),
  );

  const getFlowColorScale = createSelector(
    getColors,
    getFlowMagnitudeExtent,
    getVaryFlowColorByMagnitude,
    (colors: Colors | DiffColors, [minMagnitude, maxMagnitude], varyFlowColorByMagnitude) => {
      const { flows: flowColors } = isDiffColors(colors) ? colors.positive : colors;

      if (!varyFlowColorByMagnitude) {
        return () => rgbaToString(flowColors.max);
      }

      const scale = d3Scale
        .scalePow<string, string>()
        .exponent(1 / 3)
        .interpolate(interpolateHcl)
        .range([rgbaToString(flowColors.min), rgbaToString(flowColors.max)])
        .domain([0, maxMagnitude || 0]);

      return (magnitude: number) => scale(magnitude);
    },
  );

  const getLocationRadiusGetter = createSelector(
    getSizeScale,
    getLocationTotalInGetter,
    getLocationTotalOutGetter,
    (sizeScale, getLocationTotalIn, getLocationTotalOut) => {
      return ({ location, type }: LocationCircle) => {
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
