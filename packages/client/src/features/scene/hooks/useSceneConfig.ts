import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Scene } from '../../../types';

/**
 * 应用场景配置的 Hook。
 * 同步背景色与阴影算法类型；环境光贴图由 SceneEnvironment 负责异步加载与清理。
 */
export function useSceneConfig(scene: Scene) {
  const { scene: threeScene, gl } = useThree();

  useEffect(() => {
    if (scene.settings.backgroundColor) {
      threeScene.background = new THREE.Color(scene.settings.backgroundColor);
    }
  }, [scene.settings.backgroundColor, threeScene]);

  useEffect(() => {
    const typeMap: Record<string, THREE.ShadowMapType> = {
      PCFShadowMap: THREE.PCFShadowMap,
      PCFSoftShadowMap: THREE.PCFSoftShadowMap,
      VSMShadowMap: THREE.VSMShadowMap,
    };
    const type = typeMap[scene.settings.shadowMapType ?? 'PCFSoftShadowMap'] ?? THREE.PCFSoftShadowMap;
    gl.shadowMap.type = type;
    gl.shadowMap.needsUpdate = true;
  }, [scene.settings.shadowMapType, gl]);
}
