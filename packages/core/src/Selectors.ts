// tslint:disable:member-ordering

import { extent, max } from 'd3-array';
import { nest } from 'd3-collection';
import { scaleLinear, scalePow } from 'd3-scale';
import { createSelector } from 'reselect';
import {
  colorAsRGBA,
  ColorScale,
  ColorsRGBA,
  createFlowColorScale,
  DiffColorsRGBA,
  getColorsRGBA,
  getDiffColorsRGBA,
  getDimmedCircleColor,
  getDimmedCircleOutlineColor,
  getDimmedColor,
  isDiffColorsRGBA,
  RGBA,
} from './colors';
import FlowMapLayer, { Props } from './FlowMapLayer';
import {
  Flow,
  FlowAccessor,
  isFeatureCollection,
  Location,
  LocationAccessor,
  LocationCircle,
  LocationCircleType,
  NumberScale,
} from './types';

export interface InputGetters {
  getLocationId: LocationAccessor<string>;
  getLocationTotalIn?: LocationAccessor<number>;
  getLocationTotalOut?: LocationAccessor<number>;
  getLocationTotalWithin?: LocationAccessor<number>;
  getFlowOriginId: FlowAccessor<string>;
  getFlowDestId: FlowAccessor<string>;
  getFlowMagnitude: FlowAccessor<number>;
  getFlowColor?: FlowAccessor<string | undefined>;
}

export type PropsSelector<T> = (props: Props) => T;

export interface LocationTotals {
  incoming: {
    [key: string]: number;
  };
  outgoing: {
    [key: string]: number;
  };
  within: {
    [key: string]: number;
  };
}

export type LocationByIdGetter = (id: string) => Location | undefined;

const getDiffMode = (props: Props) => props.diffMode;
const getColorsProp = (props: Props) => props.colors;
const getAnimate = (props: Props) => props.animate;
export const getLocationFeatures = (props: Props) =>
  isFeatureCollection(props.locations) ? props.locations.features : props.locations;
const getFlows = (props: Props) => props.flows;
const getHighlightedFlow = (props: Props) => props.highlightedFlow;
const getHighlightedLocationId = (props: Props) => props.highlightedLocationId;
const getSelectedLocationIds = (props: Props) => props.selectedLocationIds;
const getVaryFlowColorByMagnitude = (props: Props) => props.varyFlowColorByMagnitude;
const getShowOnlyTopFlows = (props: Props) => props.showOnlyTopFlows;
const getOutlineThickness = (props: Props) =>
  props.outlineThickness != null ? props.outlineThickness : FlowMapLayer.defaultProps.outlineThickness;

const MIN_OUTLINE_CIRCLE_RADIUS = 3;

class Selectors {
  constructor(private inputGetters: InputGetters) {}

  getColors: PropsSelector<ColorsRGBA | DiffColorsRGBA> = createSelector(
    [getColorsProp, getDiffMode],
    (colors, diffMode) => {
      if (diffMode) {
        return getDiffColorsRGBA(colors);
      }
      return getColorsRGBA(colors);
    },
  );

  getLocationByIdGetter: PropsSelector<LocationByIdGetter> = createSelector(
    [getLocationFeatures],
    locations => {
      const locationsById = nest<Location, Location | undefined>()
        .key(this.inputGetters.getLocationId)
        .rollup(([d]) => d)
        .object(locations);
      return (id: string) => {
        const location = locationsById[id];
        if (!location) {
          console.warn(`No location found for id '${id}'`);
        }
        return location;
      };
    },
  );

  private getFilteredFlows: PropsSelector<Flow[]> = createSelector(
    [getFlows, getSelectedLocationIds],
    (flows, selectedLocationIds) => {
      const { getFlowOriginId, getFlowDestId } = this.inputGetters;

      if (selectedLocationIds) {
        return flows.filter(
          flow =>
            selectedLocationIds.indexOf(getFlowOriginId(flow)) >= 0 ||
            selectedLocationIds.indexOf(getFlowDestId(flow)) >= 0,
        );
      }

      return flows;
    },
  );

  private getNonSelfFlows: PropsSelector<Flow[]> = createSelector(
    [this.getFilteredFlows],
    flows => {
      const { getFlowOriginId, getFlowDestId } = this.inputGetters;
      return flows.filter(flow => getFlowOriginId(flow) !== getFlowDestId(flow));
    },
  );

  getSortedNonSelfFlows: PropsSelector<Flow[]> = createSelector(
    [this.getNonSelfFlows],
    flows => {
      const comparator = (f1: Flow, f2: Flow) =>
        Math.abs(this.inputGetters.getFlowMagnitude(f1)) - Math.abs(this.inputGetters.getFlowMagnitude(f2));
      return flows.slice().sort(comparator);
    },
  );

  getTopFlows: PropsSelector<Flow[]> = createSelector(
    [this.getSortedNonSelfFlows, getShowOnlyTopFlows],
    (flows, showOnlyTopFlows) => {
      if (showOnlyTopFlows != null && showOnlyTopFlows > 0 && flows.length > showOnlyTopFlows) {
        return flows.slice(flows.length - showOnlyTopFlows, flows.length);
      }
      return flows;
    },
  );

  getHighlightedFlows: PropsSelector<Flow[] | undefined> = createSelector(
    [this.getSortedNonSelfFlows, getHighlightedFlow, getHighlightedLocationId],
    (flows, highlightedFlow, highlightedLocationId) => {
      const { getFlowOriginId, getFlowDestId } = this.inputGetters;

      if (highlightedFlow) {
        return [highlightedFlow];
      }

      if (highlightedLocationId) {
        return flows.filter(
          flow => getFlowOriginId(flow) === highlightedLocationId || getFlowDestId(flow) === highlightedLocationId,
        );
      }

      return undefined;
    },
  );

  private getFlowMagnitudeExtent: PropsSelector<[number, number] | [undefined, undefined]> = createSelector(
    [this.getNonSelfFlows],
    flows => extent(flows, this.inputGetters.getFlowMagnitude),
  );

  getFlowThicknessScale: PropsSelector<NumberScale> = createSelector(
    [this.getFlowMagnitudeExtent],
    ([minMagnitude, maxMagnitude]) => {
      const scale = scaleLinear()
        .range([0.05, 0.5])
        .domain([0, Math.max(Math.abs(minMagnitude || 0), Math.abs(maxMagnitude || 0))]);

      return (magnitude: number) => scale(Math.abs(magnitude));
    },
  );

  private getFlowColorScale: PropsSelector<ColorScale> = createSelector(
    [this.getColors, this.getFlowMagnitudeExtent, getVaryFlowColorByMagnitude, getAnimate],
    (colors, [minMagnitude, maxMagnitude], varyFlowColorByMagnitude, animate) => {
      if (!varyFlowColorByMagnitude) {
        if (isDiffColorsRGBA(colors)) {
          return (v: number) => (v >= 0 ? colors.positive.flows.max : colors.negative.flows.max);
        }

        return () => colors.flows.max;
      }

      if (isDiffColorsRGBA(colors)) {
        const posScale = createFlowColorScale(
          [0, maxMagnitude || 0],
          [colors.positive.flows.min, colors.positive.flows.max],
          animate,
        );
        const negScale = createFlowColorScale(
          [minMagnitude || 0, 0],
          [colors.negative.flows.max, colors.negative.flows.min],
          animate,
        );

        return (magnitude: number) => (magnitude >= 0 ? posScale(magnitude) : negScale(magnitude));
      }

      const { max, min } = colors.flows;
      const scale = createFlowColorScale([0, maxMagnitude || 0], [min, max], animate);
      return (magnitude: number) => scale(magnitude);
    },
  );

  getFlowLinesColorGetter(
    colors: ColorsRGBA | DiffColorsRGBA,
    flowColorScale: ColorScale,
    highlighted: boolean,
    dimmed: boolean,
  ) {
    const { getFlowMagnitude, getFlowColor } = this.inputGetters;
    return (flow: Flow) => {
      if (getFlowColor) {
        const color = getFlowColor(flow);
        if (color) {
          return colorAsRGBA(color);
        }
      }
      if (highlighted) {
        if (isDiffColorsRGBA(colors)) {
          const positiveColor = colors.positive.flows.highlighted;
          const negativeColor = colors.negative.flows.highlighted;
          const magnitude = getFlowMagnitude(flow);
          return magnitude >= 0 ? positiveColor : negativeColor;
        } else {
          return colors.flows.highlighted;
        }
      } else {
        const magnitude = getFlowMagnitude(flow);
        const color = flowColorScale(magnitude);
        if (dimmed) {
          return getDimmedColor(color, colors.dimmedOpacity);
        }
        return color;
      }
    };
  }

  private getLocationTotals: PropsSelector<LocationTotals> = createSelector(
    [getLocationFeatures, this.getFilteredFlows],
    (locations, flows) => {
      const { getFlowOriginId, getFlowDestId, getFlowMagnitude } = this.inputGetters;
      return flows.reduce<LocationTotals>(
        (acc, curr) => {
          const originId = getFlowOriginId(curr);
          const destId = getFlowDestId(curr);
          const magnitude = getFlowMagnitude(curr);
          if (originId === destId) {
            acc.within[originId] = (acc.within[originId] || 0) + magnitude;
          } else {
            acc.outgoing[originId] = (acc.outgoing[originId] || 0) + magnitude;
            acc.incoming[destId] = (acc.incoming[destId] || 0) + magnitude;
          }
          return acc;
        },
        { incoming: {}, outgoing: {}, within: {} },
      );
    },
  );

  getLocationCircles: PropsSelector<LocationCircle[]> = createSelector(
    [getLocationFeatures],
    locations => {
      const circles = [];
      for (const location of locations) {
        circles.push({
          location,
          type: LocationCircleType.OUTLINE,
        });
        circles.push({
          location,
          type: LocationCircleType.OUTER,
        });
        circles.push({
          location,
          type: LocationCircleType.INNER,
        });
      }
      return circles;
    },
  );

  getHighlightedLocationCircles: PropsSelector<LocationCircle[] | undefined> = createSelector(
    [this.getLocationByIdGetter, getHighlightedLocationId],
    (getLocationById, highlightedLocationId) => {
      if (highlightedLocationId) {
        const location = getLocationById(highlightedLocationId);
        if (!location) {
          return undefined;
        }
        return [
          { location, type: LocationCircleType.OUTLINE },
          { location, type: LocationCircleType.OUTER },
          { location, type: LocationCircleType.INNER },
        ];
      }
      return undefined;
    },
  );

  getLocationTotalInGetter = (props: Props) => {
    const { getLocationTotalIn, getLocationId } = this.inputGetters;
    if (getLocationTotalIn) {
      return getLocationTotalIn;
    }

    const { incoming } = this.getLocationTotals(props);
    return (location: Location) => incoming[getLocationId(location)] || 0;
  };

  getLocationTotalOutGetter = (props: Props) => {
    const { getLocationTotalOut, getLocationId } = this.inputGetters;
    if (getLocationTotalOut) {
      return getLocationTotalOut;
    }

    const { outgoing } = this.getLocationTotals(props);
    return (location: Location) => outgoing[getLocationId(location)] || 0;
  };

  getLocationTotalWithinGetter = (props: Props) => {
    const { getLocationTotalWithin, getLocationId } = this.inputGetters;
    if (getLocationTotalWithin) {
      return getLocationTotalWithin;
    }

    const { within } = this.getLocationTotals(props);
    return (location: Location) => within[getLocationId(location)] || 0;
  };

  private getLocationMaxAbsTotal: PropsSelector<number> = createSelector(
    [
      getLocationFeatures,
      this.getLocationTotalInGetter,
      this.getLocationTotalOutGetter,
      this.getLocationTotalWithinGetter,
    ],
    (locations, getLocationTotalIn, getLocationTotalOut, getLocationTotalWithin) => {
      const maxTotal = max(locations, (location: Location) =>
        Math.max(
          Math.abs(getLocationTotalIn(location) + getLocationTotalWithin(location)),
          Math.abs(getLocationTotalOut(location) + getLocationTotalWithin(location)),
        ),
      );
      return maxTotal || 0;
    },
  );

  private getSizeScale: PropsSelector<NumberScale> = createSelector(
    [this.getLocationMaxAbsTotal],
    maxTotal => {
      const scale = scalePow()
        .exponent(1 / 2)
        .domain([0, maxTotal])
        .range([0, 15]);

      return (v: number) => scale(Math.abs(v));
    },
  );

  getLocationCircleRadiusGetter: PropsSelector<(locCircle: LocationCircle) => number> = createSelector(
    [
      getOutlineThickness,
      this.getSizeScale,
      this.getLocationTotalInGetter,
      this.getLocationTotalOutGetter,
      this.getLocationTotalWithinGetter,
    ],
    (outlineThickness, sizeScale, getLocationTotalIn, getLocationTotalOut, getLocationTotalWithin) => {
      return ({ location, type }: LocationCircle) => {
        const getSide = type === LocationCircleType.INNER ? Math.min : Math.max;
        const totalIn = getLocationTotalIn(location);
        const totalOut = getLocationTotalOut(location);
        const totalWithin = getLocationTotalWithin(location);
        const r = sizeScale(getSide(totalIn + totalWithin, totalOut + totalWithin));
        if (type === LocationCircleType.OUTLINE) {
          return Math.max(r + outlineThickness, MIN_OUTLINE_CIRCLE_RADIUS);
        }
        return r;
      };
    },
  );

  getLocationCircleColorGetter: PropsSelector<(locCircle: LocationCircle) => RGBA> = createSelector(
    [
      this.getColors,
      getHighlightedLocationId,
      this.getLocationTotalInGetter,
      this.getLocationTotalOutGetter,
      this.getLocationTotalWithinGetter,
    ],
    (colors, highlightedLocationId, getLocationTotalIn, getLocationTotalOut, getLocationTotalWithin) => {
      const { getLocationId } = this.inputGetters;

      return ({ location, type }: LocationCircle) => {
        const isHighlighted = highlightedLocationId && highlightedLocationId === getLocationId(location);
        const isDimmed = highlightedLocationId && highlightedLocationId !== getLocationId(location);

        const totalWithin = getLocationTotalWithin(location);
        const totalIn = getLocationTotalIn(location) + totalWithin;
        const totalOut = getLocationTotalOut(location) + totalWithin;
        const isIncoming = type === LocationCircleType.OUTER && Math.abs(totalIn) > Math.abs(totalOut);

        const isPositive = (isIncoming === true && totalIn >= 0) || totalOut >= 0;
        const circleColors = (isDiffColorsRGBA(colors) ? (isPositive ? colors.positive : colors.negative) : colors)
          .locationCircles;
        if (isHighlighted && type === LocationCircleType.OUTLINE) {
          return circleColors.highlighted;
        }

        if (isDimmed) {
          if (type === LocationCircleType.OUTLINE) {
            return getDimmedCircleOutlineColor(colors.outlineColor, colors.dimmedOpacity);
          }
          return getDimmedCircleColor(circleColors.inner, colors.dimmedOpacity);
        }

        if (type === LocationCircleType.OUTLINE) {
          return colors.outlineColor;
        }

        if (type === LocationCircleType.INNER) {
          return circleColors.inner;
        }

        if (isIncoming === true) {
          return circleColors.incoming;
        }

        return circleColors.outgoing;
      };
    },
  );

  private isLocationConnectedGetter: PropsSelector<(id: string) => boolean> = createSelector(
    [this.getFilteredFlows, getHighlightedLocationId, getHighlightedFlow, getSelectedLocationIds],
    (flows, highlightedLocationId, highlightedFlow, selectedLocationIds) => {
      const { getFlowOriginId, getFlowDestId } = this.inputGetters;

      if (highlightedLocationId) {
        const isRelated = (flow: Flow) => {
          const originId = getFlowOriginId(flow);
          const destId = getFlowDestId(flow);
          return (
            originId === highlightedLocationId ||
            (selectedLocationIds && selectedLocationIds.indexOf(originId) >= 0) ||
            destId === highlightedLocationId ||
            (selectedLocationIds && selectedLocationIds.indexOf(destId) >= 0)
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

  getLocationAreaFillColorGetter: PropsSelector<(location: Location) => RGBA> = createSelector(
    [this.getColors, getSelectedLocationIds, getHighlightedLocationId, this.isLocationConnectedGetter],
    (colors, selectedLocationIds, highlightedLocationId, isLocationConnected) => {
      return (location: Location) => {
        const locationId = this.inputGetters.getLocationId(location);
        if (selectedLocationIds && selectedLocationIds.indexOf(locationId) >= 0) {
          return colors.locationAreas.selected;
        }

        if (locationId === highlightedLocationId) {
          return colors.locationAreas.highlighted;
        }

        if (isLocationConnected(locationId) === true) {
          return colors.locationAreas.connected;
        }

        return colors.locationAreas.normal;
      };
    },
  );

  setInputGetters(inputGetters: InputGetters) {
    this.inputGetters = inputGetters;
  }

  getInputGetters() {
    return this.inputGetters;
  }
}

export default Selectors;
