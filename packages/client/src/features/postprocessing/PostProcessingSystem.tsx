import { useEffect, useRef } from 'react';
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

export const PostProcessingSystem: React.FC = () => {
  const { gl, scene, camera, size } = useThree();
  const effects = useSceneStore((s) => s.scene.settings.postProcessing ?? []);
  const composerRef = useRef<EffectComposer | null>(null);

  useEffect(() => {
    const composer = new EffectComposer(gl);
    composer.addPass(new RenderPass(scene, camera));

    const enabledEffects = effects.filter((e) => e.enabled);
    for (const effect of enabledEffects) {
      const pass = buildPass(effect, scene, camera, size);
      if (pass) composer.addPass(pass);
    }
    composer.addPass(new OutputPass());
    composer.setSize(size.width, size.height);

    composerRef.current = composer;
    return () => {
      composer.dispose();
    };
  }, [effects, gl, scene, camera, size]);

  // 负优先级确保在 R3F 默认渲染之后接管（priority 越小越晚执行，-Infinity 在最后）
  useFrame(() => {
    composerRef.current?.render();
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
