import * as THREE from 'three';
import type { MaterialSpec } from '@/types';

export function createThreeMaterial(spec: MaterialSpec): THREE.Material {
  const props = spec.props ?? {};

  switch (spec.type) {
    case 'MeshPhysicalMaterial':
      return new THREE.MeshPhysicalMaterial(props as any);
    case 'MeshPhongMaterial':
      return new THREE.MeshPhongMaterial(props as any);
    case 'MeshLambertMaterial':
      return new THREE.MeshLambertMaterial(props as any);
    case 'MeshBasicMaterial':
      return new THREE.MeshBasicMaterial(props as any);
    case 'MeshStandardMaterial':
    default:
      return new THREE.MeshStandardMaterial(props as any);
  }
}
