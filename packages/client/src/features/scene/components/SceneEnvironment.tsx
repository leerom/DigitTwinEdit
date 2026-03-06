import { useEffect, useRef } from 'react';
import { Environment } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { Asset } from '@digittwinedit/shared';
import { useAssetStore } from '@/stores/assetStore';
import { useSceneStore } from '@/stores/sceneStore';
import { assetsApi } from '@/api/assets';
import { normalizeSceneEnvironmentSettings } from '@/types';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';

const environmentCache = new Map<string, Promise<THREE.Texture>>();
let ktx2Loader: KTX2Loader | null = null;

function getKTX2Loader(renderer: THREE.WebGLRenderer): KTX2Loader {
  if (!ktx2Loader) {
    ktx2Loader = new KTX2Loader()
      .setTranscoderPath('/basis/')
      .setWithCredentials(true)
      .detectSupport(renderer);
  }

  return ktx2Loader;
}

function isEnvironmentAsset(asset: Asset | undefined): asset is Asset {
  return asset?.type === 'texture'
    && asset.mime_type === 'image/ktx2'
    && asset.metadata?.usage === 'ibl';
}

function getEnvironmentCacheKey(asset: Asset): string {
  return `${asset.id}:${asset.updated_at}`;
}

function loadEnvironmentTexture(asset: Asset, renderer: THREE.WebGLRenderer): Promise<THREE.Texture> {
  const cacheKey = getEnvironmentCacheKey(asset);
  const cached = environmentCache.get(cacheKey);
  if (cached) return cached;

  const texturePromise = getKTX2Loader(renderer)
    .loadAsync(`${assetsApi.getAssetDownloadUrl(asset.id)}?v=${encodeURIComponent(asset.updated_at)}`)
    .then((texture) => {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      texture.colorSpace = THREE.LinearSRGBColorSpace;
      texture.needsUpdate = true;
      return texture;
    })
    .catch((error) => {
      environmentCache.delete(cacheKey);
      throw error;
    });

  environmentCache.set(cacheKey, texturePromise);
  return texturePromise;
}

export function SceneEnvironment() {
  const { gl, scene: threeScene } = useThree();
  const sceneEnvironment = useSceneStore((state) => normalizeSceneEnvironmentSettings(state.scene.settings.environment));
  const assets = useAssetStore((state) => state.assets);
  const appliedEnvironmentRef = useRef<THREE.Texture | null>(null);
  const pmremTextureRef = useRef<THREE.Texture | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (sceneEnvironment.mode !== 'asset' || sceneEnvironment.assetId == null) {
      if (pmremTextureRef.current) {
        pmremTextureRef.current.dispose();
        pmremTextureRef.current = null;
      }
      threeScene.environment = null;
      appliedEnvironmentRef.current = null;
      requestIdRef.current += 1;
      return;
    }

    const selectedAsset = assets.find((asset) => asset.id === sceneEnvironment.assetId);
    if (!isEnvironmentAsset(selectedAsset)) {
      if (pmremTextureRef.current) {
        pmremTextureRef.current.dispose();
        pmremTextureRef.current = null;
      }
      threeScene.environment = null;
      appliedEnvironmentRef.current = null;
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    const pmremGenerator = new THREE.PMREMGenerator(gl);
    pmremGenerator.compileEquirectangularShader();

    loadEnvironmentTexture(selectedAsset, gl)
      .then((texture) => {
        if (requestIdRef.current !== requestId) return;

        const nextPmremTexture = pmremGenerator.fromEquirectangular(texture).texture;
        const previousPmremTexture = pmremTextureRef.current;

        pmremTextureRef.current = nextPmremTexture;
        appliedEnvironmentRef.current = texture;
        threeScene.environment = nextPmremTexture;

        if (previousPmremTexture && previousPmremTexture !== nextPmremTexture) {
          previousPmremTexture.dispose();
        }
      })
      .catch((error) => {
        if (requestIdRef.current !== requestId) return;
        console.warn('[SceneEnvironment] Failed to load IBL environment', error);
        if (pmremTextureRef.current) {
          pmremTextureRef.current.dispose();
          pmremTextureRef.current = null;
        }
        threeScene.environment = null;
        appliedEnvironmentRef.current = null;
      });

    return () => {
      requestIdRef.current += 1;
      pmremGenerator.dispose();
    };
  }, [assets, gl, sceneEnvironment, threeScene]);

  if (sceneEnvironment.mode === 'default') {
    return <Environment preset="city" background={false} />;
  }

  return null;
}
