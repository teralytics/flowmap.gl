// @flow

export type { ODFlow, ODZone, OriginDest } from '../../../types'

import type { ODZone } from '../../../types'

export type ZoneCircle = {
  zone: ODZone,
  kind: 'inner' | 'outer'
}

export type PickingKind = 'flow' | 'zone' | 'zone-area'

export type PickInfo = {
  kind: string,
  object: any,
  index: number,
  x: number,
  y: number
}
