import { useEffect, useMemo } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { FilmPass } from 'three/examples/jsm/postprocessing/FilmPass.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';
import { useSceneStore } from '@/stores/sceneStore';
import type {
  PostProcessEffect,
  UnrealBloomParams,
  FilmParams,
  BokehParams,
  SSAOParams,
} from '@/types';

// 稳定的空数组引用，避免 ?? [] 每次产生新引用导致 useMemo 不必要地重建 composer
const EMPTY_EFFECTS: PostProcessEffect[] = [];

export const PostProcessingSystem: React.FC = () => {
  const { gl, scene, camera, size } = useThree();
  const effects = useSceneStore((s) => s.scene.settings.postProcessing ?? EMPTY_EFFECTS);

  // 使用 useMemo 同步创建 composer，确保首帧就可用（避免首帧黑屏）
  // 在 R3F 中，useFrame(fn, priority!=0) 会禁用 R3F 的默认 gl.render()，
  // 必须由 useFrame 回调负责渲染。如果用 useEffect 创建 composer，
  // 则首帧 composer 还未创建，useFrame 执行 null?.render() 为 no-op，
  // 导致整帧为黑屏。
  const composer = useMemo(() => {
    const c = new EffectComposer(gl);
    c.addPass(new RenderPass(scene, camera));

    const enabledEffects = effects.filter((e) => e.enabled);
    for (const effect of enabledEffects) {
      const pass = buildPass(effect, scene, camera, size);
      if (pass) c.addPass(pass);
    }
    c.addPass(new OutputPass());
    c.setSize(size.width, size.height);
    return c;
  }, [effects, gl, scene, camera, size]);

  // 当 composer 被替换时，dispose 旧的（释放 GPU 资源）
  useEffect(() => {
    return () => {
      composer.dispose();
    };
  }, [composer]);

  // priority=1: R3F 将渲染控制权交给此回调（跳过默认 gl.render）
  useFrame((_, delta) => {
    composer.render(delta);
  }, 1);

  return null;
};

function buildPass(
  effect: PostProcessEffect,
  scene: THREE.Scene,
  camera: THREE.Camera,
  size: { width: number; height: number }
) {
  switch (effect.type) {
    case 'UnrealBloom': {
      const p = effect.params as UnrealBloomParams;
      return new UnrealBloomPass(
        new THREE.Vector2(size.width, size.height),
        p.strength,
        p.radius,
        p.threshold
      );
    }
    case 'Film': {
      const p = effect.params as FilmParams;
      return new FilmPass(p.intensity, p.grayscale);
    }
    case 'Bokeh': {
      const p = effect.params as BokehParams;
      return new BokehPass(scene, camera, {
        focus: p.focus,
        aperture: p.aperture,
        maxblur: p.maxblur,
      });
    }
    case 'SSAO': {
      const p = effect.params as SSAOParams;
      const pass = new SSAOPass(scene, camera, size.width, size.height);
      pass.kernelRadius = p.kernelRadius;
      pass.minDistance = p.minDistance;
      pass.maxDistance = p.maxDistance;
      return pass;
    }
    default:
      return null;
  }
}
