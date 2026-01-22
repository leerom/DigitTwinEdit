# Mock API 契约

由于本项目是纯前端应用，没有后端 API。本目录下的文件定义了前端模拟数据 (Mock Data) 的结构和生成规则，用于开发和测试阶段模拟外部数据源（如场景加载、数字孪生实时数据）。

## 文件列表

- `scene-schema.ts`: 定义场景 JSON 文件的 TypeScript 接口契约，与 `data-model.md` 中的定义对应。
- `twin-data-mock.ts`: 定义数字孪生实时数据的 WebSocket 消息格式契约。

---

### 1. 场景文件契约 (scene-schema.ts)

```typescript
// 场景文件 (.json) 的数据结构
export interface SceneFile {
  meta: {
    version: string;    // e.g., "1.0"
    generator: string;  // e.g., "DigitTwinEdit"
    createdAt: number;  // Timestamp
  };
  assets: AssetManifest[];
  sceneGraph: SerializedObject[];
}

export interface AssetManifest {
  id: string;
  type: 'model' | 'material' | 'texture';
  src: string;          // 相对路径
  label: string;
}

export interface SerializedObject {
  id: string;
  type: 'Group' | 'Mesh' | 'Light' | 'Camera';
  name: string;
  parentId?: string;    // undefined for root
  transform: {
    pos: [number, number, number];
    rot: [number, number, number]; // Euler keys
    scl: [number, number, number];
  };
  mesh?: {
    geometryId: string; // Refers to asset id
    materialId: string; // Refers to asset id
  };
  twin?: {
    id: string;         // External Twin ID
  };
  children?: string[];  // Child IDs for reconstruction convenience
}
```

### 2. 数字孪生实时数据契约 (twin-data-mock.ts)

```typescript
// 模拟 WebSocket 推送的消息格式

// 1. 初始连接确认
export interface ConnectionAck {
  type: 'ACK';
  sessionId: string;
  status: 'connected';
}

// 2. 实时数据更新 (1Hz 推送)
export interface TwinUpdateMessage {
  type: 'UPDATE';
  timestamp: number;
  data: TwinDataPoint[];
}

export interface TwinDataPoint {
  id: string;           // External Twin ID (e.g., "METRO-A1-42")
  status: 'online' | 'offline' | 'warning';
  metrics: {
    temperature?: number;
    pressure?: number;
    usage?: number;     // 0-100%
    power?: boolean;    // on/off
  };
}

// 3. 控制指令 (前端发送 -> 模拟后端)
export interface TwinControlCommand {
  type: 'COMMAND';
  targetId: string;
  action: 'reset' | 'power_toggle' | 'calibrate';
  params?: Record<string, any>;
}
```
