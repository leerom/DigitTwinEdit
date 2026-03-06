import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Scene } from '../../../types';

/**
 * 应用场景配置的 Hook。
 * 目前仅同步背景色；环境光贴图由 SceneEnvironment 负责异步加载与清理。
 */
export function useSceneConfig(scene: Scene) {
  const { scene: threeScene } = useThree();

  useEffect(() => {
    if (scene.settings.backgroundColor) {
      threeScene.background = new THREE.Color(scene.settings.backgroundColor);
    }
  }, [scene.settings.backgroundColor, threeScene]);
}
