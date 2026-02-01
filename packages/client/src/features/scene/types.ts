// 外部场景文件格式类型定义

export interface ExternalSceneFile {
  viewer?: {
    outputColorSpace?: string;
    toneMapping?: number;
    toneMappingExposure?: number;
    background?: string;
    environment?: string;
    environmentParams?: any;
    postProcessor?: any;
  };
  camera?: {
    position: [number, number, number];
    rotation?: [number, number, number, string];
    quaternion?: [number, number, number, number];
    spherical?: [number, number, number];
    target?: [number, number, number];
  };
  scene?: {
    name?: string;
    userData?: any;
  };
  lights?: any[];
  objects?: ExternalSceneObject[];
}

export interface ExternalSceneObject {
  name?: string;
  type?: string; // 3DTILES, MESH, GROUP, LIGHT, etc.
  position?: [number, number, number];
  rotation?: [number, number, number, string]; // [x, y, z, order]
  scale?: [number, number, number];
  visible?: boolean;
  userData?: {
    locked?: boolean;
    fileInfo?: {
      type: string; // 3DTILES, GLB, GLTF, etc.
      url: string;
    };
    [key: string]: any;
  };
  children?: ExternalSceneObject[];
}
