import React, { useEffect } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';

/**
 * 模块级引用，供 Canvas 外部的 onDrop 处理器访问 Three.js 相机。
 * 由 ThreeContextCapture 组件（放置在 Canvas 内部）填充。
 */
// 单例引用：假设全局只有一个 R3F Canvas 实例。
export const threeContextRef: { camera: THREE.Camera | null } = {
  camera: null,
};

/**
 * 放置在 R3F Canvas 内部，挂载时将相机引用写入 threeContextRef；
 * 相机引用变更时重新同步，卸载时清除。无渲染输出。
 */
export const ThreeContextCapture: React.FC = () => {
  const { camera } = useThree();
  useEffect(() => {
    threeContextRef.camera = camera;
    return () => {
      threeContextRef.camera = null;
    };
  }, [camera]);
  return null;
};
