import React, { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { useEditorStore } from '@/stores/editorStore';
import * as THREE from 'three';

export const FlyControls: React.FC = () => {
  const { camera } = useThree();
  const setCamera = useEditorStore((state) => state.setCamera);
  const isFlying = useRef(false);
  const moveState = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
    up: false,
    down: false,
    speed: 10, // Units per second
    boost: 1, // Shift multiplier
  });

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 2) { // Right click
        isFlying.current = true;
        document.body.style.cursor = 'none'; // Hide cursor or change to eye
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 2) {
        isFlying.current = false;
        document.body.style.cursor = 'default';
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isFlying.current) return;

      switch (e.code) {
        case 'KeyW': moveState.current.forward = true; break;
        case 'KeyS': moveState.current.backward = true; break;
        case 'KeyA': moveState.current.left = true; break;
        case 'KeyD': moveState.current.right = true; break;
        case 'KeyQ': moveState.current.down = true; break;
        case 'KeyE': moveState.current.up = true; break;
        case 'ShiftLeft': case 'ShiftRight': moveState.current.boost = 3; break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW': moveState.current.forward = false; break;
        case 'KeyS': moveState.current.backward = false; break;
        case 'KeyA': moveState.current.left = false; break;
        case 'KeyD': moveState.current.right = false; break;
        case 'KeyQ': moveState.current.down = false; break;
        case 'KeyE': moveState.current.up = false; break;
        case 'ShiftLeft': case 'ShiftRight': moveState.current.boost = 1; break;
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (!isFlying.current) return;

        // Simple FPS look logic
        // Note: For production, PointerLockControls is better, but right-drag is requested.
        // We might need to manually rotate camera based on movement deltas.

        const sensitivity = 0.002;
        camera.rotation.y -= e.movementX * sensitivity;
        camera.rotation.x -= e.movementY * sensitivity;

        // Clamp vertical look if needed, or use Quaternion for full 6DOF
        camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.rotation.x));
    };

    // Attach listeners
    // Note: We're attaching to window for global capture during fly mode
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [camera]);

  useFrame((state, delta) => {
    if (!isFlying.current) return;

    const moveSpeed = moveState.current.speed * moveState.current.boost * delta;

    if (moveState.current.forward) camera.translateZ(-moveSpeed);
    if (moveState.current.backward) camera.translateZ(moveSpeed);
    if (moveState.current.left) camera.translateX(-moveSpeed);
    if (moveState.current.right) camera.translateX(moveSpeed);
    if (moveState.current.up) camera.translateY(moveSpeed);
    if (moveState.current.down) camera.translateY(-moveSpeed);
  });

  return null;
};
