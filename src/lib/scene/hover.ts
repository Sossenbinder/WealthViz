import type * as THREE from 'three';
import type { HoverRow } from '../data/context';

export interface HoverInfo {
  title: string;
  /** amount · height · note count line */
  meta: string;
  rows: HoverRow[];
  gold?: boolean;
}

export interface HoverHit {
  info: HoverInfo;
  /** world-space bounds for the highlight box */
  center: THREE.Vector3;
  size: THREE.Vector3;
}

export interface Pickable {
  object: THREE.Object3D;
  resolve: (hit: THREE.Intersection) => HoverHit | null;
}
