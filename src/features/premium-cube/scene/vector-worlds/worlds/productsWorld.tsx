import type { WorldProps } from '../types'
import { PlaceholderWorld } from './_placeholder'

// TODO: design a world that visualizes shipped products — e.g. a constellation
// of glowing nodes connected by faint lines, each node a product card.
export function ProductsWorld(props: WorldProps = {}) {
  return <PlaceholderWorld {...props} />
}
