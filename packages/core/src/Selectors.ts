// tslint:disable:member-ordering

import { ascending, extent, max } from 'd3-array';
import { nest } from 'd3-collection';
import { scaleLinear, scalePow } from 'd3-scale';
import { createSelector } from 'reselect';
import {
  colorAsRgba,
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
  FlowAccessors,
  isFeatureCollection,
  Location,
  LocationAccessors,
  LocationCircle,
  LocationCircleType,
  NumberScale,
} from './types';

export type InputAccessors = LocationAccessors & FlowAccessors;

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

const CIRCLE_OUTLINE_THICKNESS = 1;
export type LocationByIdGetter = (id: string) => Location | undefined;

const getDiffMode = (props: Props) => props.diffMode;
const getColorsProp = (props: Props) => props.colors;
const getAnimate = (props: Props) => props.animate;
const getLocationFeatures = (props: Props) =>
  isFeatureCollection(props.locations) ? props.locations.features : props.locations;
const getFlows = (props: Props) => props.flows;
const getHighlightedFlow = (props: Props) => props.highlightedFlow;
const getHighlightedLocationId = (props: Props) => props.highlightedLocationId;
const getSelectedLocationIds = (props: Props) => props.selectedLocationIds;
const getShowOnlyTopFlows = (props: Props) => props.showOnlyTopFlows;
const getMaxLocationCircleSize = (props: Props) =>
  props.maxLocationCircleSize != null ? props.maxLocationCircleSize : FlowMapLayer.defaultProps.maxLocationCircleSize;

class Selectors {
  constructor(private inputAccessors: InputAccessors) {}

  getColors: PropsSelector<ColorsRGBA | DiffColorsRGBA> = createSelector(
    [getColorsProp, getDiffMode],
    (colors, diffMode) => {
      if (diffMode) {
        return getDiffColorsRGBA(colors);
      }
      return getColorsRGBA(colors);
    },
  );

  getLocationByIdGetter: PropsSelector<LocationByIdGetter> = createSelector([getLocationFeatures], locations => {
    const locationsById = nest<Location, Location | undefined>()
      .key(this.inputAccessors.getLocationId)
      .rollup(([d]) => d)
      .object(locations);
    return (id: string) => {
      const location = locationsById[id];
      if (!location) {
        console.warn(`No location found for id '${id}'`);
      }
      return location;
    };
  });

  private getFilteredFlows: PropsSelector<Flow[]> = createSelector(
    [getFlows, getSelectedLocationIds],
    (flows, selectedLocationIds) => {
      const { getFlowOriginId, getFlowDestId } = this.inputAccessors;

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

  private getNonSelfFlows: PropsSelector<Flow[]> = createSelector([this.getFilteredFlows], flows => {
    const { getFlowOriginId, getFlowDestId } = this.inputAccessors;
    return flows.filter(flow => getFlowOriginId(flow) !== getFlowDestId(flow));
  });

  getSortedNonSelfFlows: PropsSelector<Flow[]> = createSelector([this.getNonSelfFlows], flows => {
    // const comparator = (f1: Flow, f2: Flow) =>
    //   Math.abs(this.inputAccessors.getFlowMagnitude(f1)) - Math.abs(this.inputAccessors.getFlowMagnitude(f2));
    // return flows.slice().sort(comparator);
    return flows;
  });

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
      const { getFlowOriginId, getFlowDestId } = this.inputAccessors;

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
    [this.getNonSelfFlows, props => props.flowMagnitudeExtent],
    (flows, flowMagnitudeExtent) => {
      if (flowMagnitudeExtent != null) return flowMagnitudeExtent;
      return extent(flows, f => this.inputAccessors.getFlowMagnitude(f));
    },
  );

  getFlowThicknessScale: PropsSelector<(magnitude: number) => number | undefined> = createSelector(
    [this.getFlowMagnitudeExtent],
    ([minMagnitude, maxMagnitude]) => {
      const scale = scaleLinear()
        .range([0.05, 0.5])
        .domain([0, Math.max(Math.abs(minMagnitude || 0), Math.abs(maxMagnitude || 0))]);

      return (magnitude: number) => scale(Math.abs(magnitude));
    },
  );

  getFlowColorScale: PropsSelector<ColorScale> = createSelector(
    [this.getColors, this.getFlowMagnitudeExtent, getAnimate],
    (colors, [minMagnitude, maxMagnitude], animate) => {
      if (isDiffColorsRGBA(colors)) {
        const posScale = createFlowColorScale([0, maxMagnitude || 0], colors.positive.flows.scheme, animate);
        const negScale = createFlowColorScale([0, minMagnitude || 0], colors.negative.flows.scheme, animate);

        return (magnitude: number) => (magnitude >= 0 ? posScale(magnitude) : negScale(magnitude));
      }

      const scale = createFlowColorScale([0, maxMagnitude || 0], colors.flows.scheme, animate);
      return (magnitude: number) => scale(magnitude);
    },
  );

  getFlowLinesColorGetter(
    colors: ColorsRGBA | DiffColorsRGBA,
    flowColorScale: ColorScale,
    highlighted: boolean,
    dimmed: boolean,
  ) {
    const { getFlowMagnitude, getFlowColor } = this.inputAccessors;
    return (flow: Flow) => {
      if (getFlowColor) {
        const color = getFlowColor(flow);
        if (color) {
          return colorAsRgba(color);
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
      const { getFlowOriginId, getFlowDestId, getFlowMagnitude } = this.inputAccessors;
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
    const { getLocationTotalIn, getLocationId } = this.inputAccessors;
    if (getLocationTotalIn) {
      return getLocationTotalIn;
    }

    const { incoming } = this.getLocationTotals(props);
    return (location: Location) => incoming[getLocationId(location)] || 0;
  };

  getLocationTotalOutGetter = (props: Props) => {
    const { getLocationTotalOut, getLocationId } = this.inputAccessors;
    if (getLocationTotalOut) {
      return getLocationTotalOut;
    }

    const { outgoing } = this.getLocationTotals(props);
    return (location: Location) => outgoing[getLocationId(location)] || 0;
  };

  getLocationTotalWithinGetter = (props: Props) => {
    const { getLocationTotalWithin, getLocationId } = this.inputAccessors;
    if (getLocationTotalWithin) {
      return getLocationTotalWithin;
    }

    const { within } = this.getLocationTotals(props);
    return (location: Location) => within[getLocationId(location)] || 0;
  };

  private getLocationMaxAbsTotalGetter: PropsSelector<(location: Location) => number> = createSelector(
    [
      getLocationFeatures,
      this.getLocationTotalInGetter,
      this.getLocationTotalOutGetter,
      this.getLocationTotalWithinGetter,
    ],
    (locations, getLocationTotalIn, getLocationTotalOut, getLocationTotalWithin) => {
      return (location: Location) =>
        Math.max(
          Math.abs(getLocationTotalIn(location) + getLocationTotalWithin(location)),
          Math.abs(getLocationTotalOut(location) + getLocationTotalWithin(location)),
        );
    },
  );

  private getMaxLocationMaxAbsTotal: PropsSelector<number> = createSelector(
    [getLocationFeatures, this.getLocationMaxAbsTotalGetter, props => props.locationTotalsExtent],
    (locations, getLocationMaxAbsTotal, locationTotalsExtent) => {
      if (locationTotalsExtent != null) {
        return max(locationTotalsExtent, Math.abs) || 0;
      }
      return max(locations, getLocationMaxAbsTotal) || 0;
    },
  );

  getLocationCircles: PropsSelector<LocationCircle[]> = createSelector(
    [getLocationFeatures, this.getLocationMaxAbsTotalGetter],
    (locations, getLocationMaxAbsTotalGetter) => {
      const circles = [];
      const sorted = locations
        .slice()
        .sort((a, b) => ascending(getLocationMaxAbsTotalGetter(a), getLocationMaxAbsTotalGetter(b)));

      for (const location of sorted) {
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

  private getSizeScale: PropsSelector<(v: number) => number> = createSelector(
    [getMaxLocationCircleSize, this.getMaxLocationMaxAbsTotal],
    (maxLocationCircleSize, maxTotal) => {
      const scale = scalePow()
        .exponent(1 / 2)
        .domain([0, maxTotal])
        .range([0, maxTotal > 0 ? maxLocationCircleSize : 1]);

      return (v: number) => scale(Math.abs(v)) || 0;
    },
  );

  getLocationCircleRadiusGetter: PropsSelector<(locCircle: LocationCircle) => number> = createSelector(
    [
      this.getSizeScale,
      this.getLocationTotalInGetter,
      this.getLocationTotalOutGetter,
      this.getLocationTotalWithinGetter,
    ],
    (sizeScale, getLocationTotalIn, getLocationTotalOut, getLocationTotalWithin) => {
      return ({ location, type }: LocationCircle) => {
        const getSide = type === LocationCircleType.INNER ? Math.min : Math.max;
        const totalIn = getLocationTotalIn(location);
        const totalOut = getLocationTotalOut(location);
        const totalWithin = getLocationTotalWithin(location);
        const r = sizeScale(getSide(Math.abs(totalIn + totalWithin), Math.abs(totalOut + totalWithin)));
        if (type === LocationCircleType.OUTLINE) {
          return r + CIRCLE_OUTLINE_THICKNESS;
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
      const { getLocationId } = this.inputAccessors;

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
          return isIncoming ? circleColors.incoming : circleColors.inner;
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
      const { getFlowOriginId, getFlowDestId } = this.inputAccessors;

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
    [this.getColors, getSelectedLocationIds, this.isLocationConnectedGetter],
    (colors, selectedLocationIds, isLocationConnected) => {
      return (location: Location) => {
        const locationId = this.inputAccessors.getLocationId(location);
        if (selectedLocationIds && selectedLocationIds.indexOf(locationId) >= 0) {
          return colors.locationAreas.selected;
        }

        if (isLocationConnected(locationId)) {
          return colors.locationAreas.connected;
        }

        return colors.locationAreas.normal;
      };
    },
  );

  setInputAccessors(inputAccessors: InputAccessors) {
    this.inputAccessors = inputAccessors;
  }

  getInputAccessors() {
    return this.inputAccessors;
  }
}

export default Selectors;
