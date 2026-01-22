import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Scene } from '../../../types';
import { useEditorStore } from '../../../stores/editorStore';

/**
 * 应用场景配置的Hook
 * 根据Scene的settings和metadata应用渲染配置和相机设置
 */
export function useSceneConfig(scene: Scene) {
  const { gl, scene: threeScene } = useThree();
  const { setCamera } = useEditorStore();

  useEffect(() => {
    // 应用背景色
    if (scene.settings.backgroundColor) {
      threeScene.background = new THREE.Color(scene.settings.backgroundColor);
    }

    // 应用环境设置
    if (scene.settings.environment && scene.settings.environment !== 'default') {
      // 环境贴图加载将在后续实现
      console.log('环境贴图:', scene.settings.environment);
    }

    // 注: 相机配置在SceneLoader中已经应用
  }, [scene, threeScene, gl, setCamera]);
}
