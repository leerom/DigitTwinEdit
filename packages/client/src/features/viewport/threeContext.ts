import React, { useEffect } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';

/**
 * 模块级引用，供 Canvas 外部的 onDrop 处理器访问 Three.js 相机。
 * 由 ThreeContextCapture 组件（放置在 Canvas 内部）填充。
 */
export const threeContextRef: { camera: THREE.Camera | null } = {
  camera: null,
};

/**
 * 放置在 R3F Canvas 内部，每帧同步相机引用到 threeContextRef。
 * 无渲染输出。
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
