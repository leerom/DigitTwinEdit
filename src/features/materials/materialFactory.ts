import * as THREE from 'three';
import type { MaterialSpec } from '@/types';

export function createThreeMaterial(spec: MaterialSpec): THREE.Material {
  switch (spec.type) {
    case 'MeshPhysicalMaterial':
      return new THREE.MeshPhysicalMaterial();
    case 'MeshPhongMaterial':
      return new THREE.MeshPhongMaterial();
    case 'MeshLambertMaterial':
      return new THREE.MeshLambertMaterial();
    case 'MeshBasicMaterial':
      return new THREE.MeshBasicMaterial();
    case 'MeshStandardMaterial':
    default:
      return new THREE.MeshStandardMaterial();
  }
}
