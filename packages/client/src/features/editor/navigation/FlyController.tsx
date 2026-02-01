import { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Vector3, Euler, Quaternion } from 'three';
import { useInputState } from './useInputState';

const MOVE_SPEED = 10;
const LOOK_SPEED = 0.002;
const SHIFT_MULTIPLIER = 2.5;

export const FlyController: React.FC<{ enabled: boolean }> = ({ enabled }) => {
  const { camera, gl } = useThree();
  const keys = useInputState((state) => state.keys);

  // Refs for physics state to avoid re-renders
  const rotation = useRef(new Euler(0, 0, 0, 'YXZ'));

  // Initialize rotation from current camera quaternion
  useEffect(() => {
    if (enabled) {
      rotation.current.setFromQuaternion(camera.quaternion, 'YXZ');
    }
  }, [enabled, camera]);

  // Pointer Lock & Mouse Look
  useEffect(() => {
    if (!enabled) return;

    const canvas = gl.domElement;

    const handleMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== canvas) return;

      rotation.current.y -= e.movementX * LOOK_SPEED;
      rotation.current.x -= e.movementY * LOOK_SPEED;

      // Clamp pitch
      rotation.current.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, rotation.current.x));

      camera.quaternion.setFromEuler(rotation.current);
    };

    const requestLock = () => {
      canvas.requestPointerLock();
    };

    // We assume the lock is triggered externally or on mount for now,
    // but typically it requires a user gesture.
    // For this implementation, let's listen to mouse move only if locked.

    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      if (document.pointerLockElement === canvas) {
        document.exitPointerLock();
      }
    };
  }, [enabled, gl, camera]);

  // Movement Logic (60fps)
  useFrame((_, delta) => {
    if (!enabled) return;

    const speed = MOVE_SPEED * delta * (keys['ShiftLeft'] || keys['ShiftRight'] ? SHIFT_MULTIPLIER : 1);
    const direction = new Vector3();

    // WASD Movement (Relative to camera view)
    if (keys['KeyW']) direction.z -= 1;
    if (keys['KeyS']) direction.z += 1;
    if (keys['KeyA']) direction.x -= 1;
    if (keys['KeyD']) direction.x += 1;

    // Apply rotation to direction
    direction.applyQuaternion(camera.quaternion);

    // Q/E Vertical Movement (Global Up/Down)
    if (keys['KeyE']) direction.y += 1;
    if (keys['KeyQ']) direction.y -= 1;

    // Normalize if moving diagonally to maintain consistent speed
    if (direction.lengthSq() > 0) {
      direction.normalize().multiplyScalar(speed);
      camera.position.add(direction);
    }
  });

  return null;
};
