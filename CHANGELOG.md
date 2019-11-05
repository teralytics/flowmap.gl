# Change log

## [6.1.0] - 2019-11-05
### Added
- Yarn for building
- Upgraded deck.gl
- Added staggering to animated flow lines
- Added pickingOnlyTopFlows for specifying the number of top flows which are pickable 
- Added highlightedLocationAreaId for pre-hovering


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
