// tslint:disable:member-ordering

import * as d3Array from 'd3-array';
import * as d3Collection from 'd3-collection';
import * as d3Scale from 'd3-scale';
import { createSelector } from 'reselect';
import {
  colorAsArray,
  createFlowColorScale,
  getDefaultFlowHighlightedColor,
  getDefaultFlowMinColor,
  getDefaultLocationAreaConnectedColor,
  getDefaultLocationAreaHighlightedColor,
  getDefaultLocationAreaSelectedColor,
  getDimmedColor,
  getLocationCircleColors,
} from './colorUtils';
import { Props } from './FlowMapLayer';
import {
  ColorScale,
  Flow,
  FlowAccessor,
  isDiffColors,
  isFeatureCollection,
  Location,
  LocationAccessor,
  LocationCircle,
  LocationCircleType,
  NumberScale,
  RGBA,
} from './types';

export interface InputGetters {
  getLocationId: LocationAccessor<string>;
  getLocationTotalIn?: LocationAccessor<number>;
  getLocationTotalOut?: LocationAccessor<number>;
  getLocationTotalWithin?: LocationAccessor<number>;
  getFlowOriginId: FlowAccessor<string>;
  getFlowDestId: FlowAccessor<string>;
  getFlowMagnitude: FlowAccessor<number>;
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

export interface LocationsById {
  [key: string]: Location;
}

const getColors = (props: Props) => props.colors;
const getLocationFeatures = (props: Props) =>
  isFeatureCollection(props.locations) ? props.locations.features : props.locations;
const getFlows = (props: Props) => props.flows;
const getHighlightedFlow = (props: Props) => props.highlightedFlow;
const getHighlightedLocationId = (props: Props) => props.highlightedLocationId;
const getSelectedLocationIds = (props: Props) => props.selectedLocationIds;
const getVaryFlowColorByMagnitude = (props: Props) => props.varyFlowColorByMagnitude;

class Selectors {
  constructor(private inputGetters: InputGetters) {}

  getLocationByIdGetter: PropsSelector<LocationsById> = createSelector(
    [getLocationFeatures],
    locations => {
      const locationsById = d3Collection
        .nest<Location, Location | undefined>()
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
    flows => d3Array.extent(flows, this.inputGetters.getFlowMagnitude),
  );

  getFlowThicknessScale: PropsSelector<NumberScale> = createSelector(
    [this.getFlowMagnitudeExtent],
    ([minMagnitude, maxMagnitude]) => {
      const scale = d3Scale
        .scaleLinear()
        .range([0.05, 0.5])
        .domain([0, Math.max(Math.abs(minMagnitude || 0), Math.abs(maxMagnitude || 0))]);

      return (magnitude: number) => scale(Math.abs(magnitude));
    },
  );

  private getFlowColorScale: PropsSelector<ColorScale> = createSelector(
    [getColors, this.getFlowMagnitudeExtent, getVaryFlowColorByMagnitude],
    (colors, [minMagnitude, maxMagnitude], varyFlowColorByMagnitude) => {
      if (!varyFlowColorByMagnitude) {
        if (isDiffColors(colors)) {
          return (v: number) => (v >= 0 ? colors.positive.flows.max : colors.negative.flows.max);
        }

        return () => colors.flows.max;
      }

      if (isDiffColors(colors)) {
        const posScale = createFlowColorScale(
          [0, maxMagnitude || 0],
          [
            colors.positive.flows.min ? colors.positive.flows.min : getDefaultFlowMinColor(colors.positive.flows.max),
            colors.positive.flows.max,
          ],
        );
        const negScale = createFlowColorScale(
          [minMagnitude || 0, 0],
          [
            colors.negative.flows.max,
            colors.negative.flows.min ? colors.negative.flows.min : getDefaultFlowMinColor(colors.negative.flows.max),
          ],
        );

        return (magnitude: number) => (magnitude >= 0 ? posScale(magnitude) : negScale(magnitude));
      }

      const { max, min } = colors.flows;
      const scale = createFlowColorScale([0, maxMagnitude || 0], [min ? min : getDefaultFlowMinColor(max), max]);
      return (magnitude: number) => scale(magnitude);
    },
  );

  getMakeFlowLinesColorGetter: PropsSelector<
    (highlighted: boolean, dimmed: boolean) => ((flow: Flow) => RGBA) | RGBA
  > = createSelector(
    [getColors, this.getFlowColorScale],
    (colors, flowColorScale) => {
      const { getFlowMagnitude } = this.inputGetters;
      return (highlighted: boolean, dimmed: boolean) => {
        if (highlighted) {
          if (isDiffColors(colors)) {
            const positiveColor = colorAsArray(
              colors.positive.flows.highlighted || getDefaultFlowHighlightedColor(colors.positive.flows.max),
            );
            const negativeColor = colorAsArray(
              colors.negative.flows.highlighted || getDefaultFlowHighlightedColor(colors.negative.flows.max),
            );
            return (flow: Flow) => {
              const magnitude = getFlowMagnitude(flow);
              return magnitude >= 0 ? positiveColor : negativeColor;
            };
          } else {
            return colorAsArray(colors.flows.highlighted || getDefaultFlowHighlightedColor(colors.flows.max));
          }
        } else {
          return (flow: Flow) => {
            const magnitude = getFlowMagnitude(flow);
            const color = flowColorScale(magnitude);
            if (dimmed) {
              return getDimmedColor(color, colors.dimmedOpacity);
            }
            return colorAsArray(color);
          };
        }
      };
    },
  );

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
      const max = d3Array.max(locations, (location: Location) =>
        Math.max(
          Math.abs(getLocationTotalIn(location) + getLocationTotalWithin(location)),
          Math.abs(getLocationTotalOut(location) + getLocationTotalWithin(location)),
        ),
      );
      return max || 0;
    },
  );

  private getSizeScale: PropsSelector<NumberScale> = createSelector(
    [this.getLocationMaxAbsTotal],
    maxTotal => {
      const scale = d3Scale
        .scalePow()
        .exponent(1 / 2)
        .domain([0, maxTotal])
        .range([0, 15]);

      return (v: number) => scale(Math.abs(v));
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
        return sizeScale(getSide(totalIn + totalWithin, totalOut + totalWithin));
      };
    },
  );

  getLocationCircleColorGetter: PropsSelector<(flow: Flow) => RGBA> = createSelector(
    [
      getColors,
      getHighlightedLocationId,
      this.getLocationTotalInGetter,
      this.getLocationTotalOutGetter,
      this.getLocationTotalWithinGetter,
    ],
    (colors, highlightedLocationId, getLocationTotalIn, getLocationTotalOut, getLocationTotalWithin) => {
      const { getLocationId } = this.inputGetters;

      return ({ location, type }: Flow) => {
        const isHighlighted = highlightedLocationId && highlightedLocationId === getLocationId(location);
        const isDimmed = highlightedLocationId && highlightedLocationId !== getLocationId(location);

        const totalWithin = getLocationTotalWithin(location);
        const totalIn = getLocationTotalIn(location) + totalWithin;
        const totalOut = getLocationTotalOut(location) + totalWithin;
        const isIncoming = type === LocationCircleType.OUTER && Math.abs(totalIn) > Math.abs(totalOut);

        const isPositive = (isIncoming === true && totalIn >= 0) || totalOut >= 0;
        const circleColors = getLocationCircleColors(colors, isPositive);
        if (isHighlighted) {
          return colorAsArray(circleColors.highlighted);
        }

        if (isDimmed) {
          return getDimmedColor(circleColors.inner, colors.dimmedOpacity);
        }

        if (type === LocationCircleType.INNER) {
          return colorAsArray(circleColors.inner);
        }

        if (isIncoming === true) {
          return colorAsArray(circleColors.incoming);
        }

        return colorAsArray(circleColors.outgoing);
      };
    },
  );

  getLocationAreaLineColorGetter: PropsSelector<() => RGBA> = createSelector(
    [getColors],
    colors => {
      return () => colorAsArray(colors.locationAreas.outline);
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
    [getColors, getSelectedLocationIds, getHighlightedLocationId, this.isLocationConnectedGetter],
    (colors, selectedLocationIds, highlightedLocationId, isLocationConnected) => {
      return (location: Location) => {
        const locationId = this.inputGetters.getLocationId(location);
        const { normal, selected, highlighted, connected } = colors.locationAreas;
        if (selectedLocationIds && selectedLocationIds.indexOf(locationId) >= 0) {
          return colorAsArray(selected ? selected : getDefaultLocationAreaSelectedColor(normal));
        }

        if (locationId === highlightedLocationId) {
          return colorAsArray(highlighted ? highlighted : getDefaultLocationAreaHighlightedColor(normal));
        }

        if (isLocationConnected(locationId) === true) {
          return colorAsArray(connected ? connected : getDefaultLocationAreaConnectedColor(normal));
        }

        return colorAsArray(normal);
      };
    },
  );

  setInputGetters(inputGetters: InputGetters) {
    this.inputGetters = inputGetters;
  }
}

export default Selectors;
