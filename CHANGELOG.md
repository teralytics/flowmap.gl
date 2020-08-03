# Change log

## [7.3.1] - 2020-08-03
### Added
- Added locationTotalsExtent 

## [7.3.0] - 2020-08-02
### Added
- Added flowMagnitudeExtent 
- Added animationTailLength 

## [7.2.4] - 2020-08-01
### Fixed
- Upgrade deps 

## [7.2.2] - 2020-05-07
### Fixed
- Upgraded all deps to latest to prevent vulnerabilities warnings 

## [7.2.1] - 2020-03-17
### Fixed
- Upgraded all deps to latest to prevent vulnerabilities warnings  

## [7.2.0] - 2020-03-07
### Fixed
- Added missing DOUBLE type for the instanceSourcePositions and instanceTargetPositions
  attributes in FlowLineLayer: this led to incorrect projection when zooming in beyond level 12
- Upgraded deck.gl to 8.0.17  
- Upgraded all deps to latest  

## [7.1.0] - 2020-02-17
### Fixed
- Flow lines didn't render correctly with non-zero bearing/pitch
### Added
- Support for Layer props (pickable, opacity etc)
- Using getSubLayerPros for updateTriggers

## [7.0.0] - 2020-01-27
### Upgraded
- Upgrading all dependencies to latest
- Making shaders work with deck.gl v8
### Fixed
- selectedLocationIds didn't accept `undefined`

## [6.1.1] - 2019-11-19
### Added
- Added maxLocationCircleSize
- Added getAnimatedFlowLineStaggering
### Fixed
- ClusterIndex.makeLocationWeightGetter didn't correctly calculate outgoing totals

## [6.1.0] - 2019-11-05
### Added
- Yarn for building
- Upgraded deck.gl
- Improved highlighted location area coloring; drawing location areas outline above arrows
- Added staggering to animated flow lines
- Added highlightedLocationAreaId for pre-hovering
- Added maxFlowThickness
- Added minPickableFlowThickness 


## [6.0.0] - 2019-08-20
### Added
- Automated clustering
- Upgraded to deck.gl@7
- Color schemes support
- Improved rendering



## [5.2.0] - 2019-03-11
### Added
- Flow color overriding via `getFlowColor`

### Fixed
- Disabling depth test to prevent z-fighting causing rendering issues with non-zero pitch/bearing
- Specified selected color wasn't used for location areas
