# Change log

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
