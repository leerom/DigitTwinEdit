# 研究：基于 React Three Fiber 的 Web 端 3D 场景编辑器架构

## 执行摘要

本文档分析了使用 React Three Fiber (R3F) 实现类似 Unity 的 3D 场景编辑器的最佳实践，重点关注将显著影响性能、可维护性和用户体验的四个关键架构决策。

## 1. React 中的 ECS：实体-组件-系统架构

### 决策：混合式 "React 组件作为系统" 方法

### 理由：
- **React 的声明式本质**：纯 ECS 与 React 的组件生命周期和声明式渲染模型冲突
- **开发体验**：利用现有的 React 模式，同时在适当的地方结合 ECS 的优势
- **性能平衡**：在不牺牲 React 开发人体工程学的情况下提供良好的性能
- **可维护性**：对于 React 开发人员来说更容易调试和理解

### 实现模式：
```typescript
// 实体作为 React 组件
const GameObject = ({ entity, children }) => {
  const { transform, renderer, physics } = entity.components;

  return (
    <group {...transform.props}>
      {renderer && <mesh geometry={renderer.geometry} material={renderer.material} />}
      {physics && <RigidBody {...physics.props} />}
      {children}
    </group>
  );
};

// 系统作为自定义 Hook
const useTransformSystem = (entities) => {
  useFrame(() => {
    entities.forEach(entity => {
      if (entity.components.transform?.needsUpdate) {
        // 更新变换逻辑
      }
    });
  });
};
```

### 考虑过的替代方案：
- **纯 ECS**：因与 React 渲染模型集成的复杂性而被拒绝
- **纯 React 组件**：因大型场景图的性能限制而被拒绝
- **Flux 架构**：考虑过，但 ECS 为 3D 应用程序提供了更好的关注点分离

---

## 2. 性能 (InstancedMesh)：管理 1000+ 交互对象

### 决策：混合 InstancedMesh 与选择性提升 (Promotion)

### 理由：
- **性能**：InstancedMesh 显著减少绘制调用（1000+ 对象 → 1 次绘制调用）
- **选择性交互**：仅将频繁交互的对象提升为独立网格
- **内存效率**：共享几何体和材质减少 GPU 内存使用
- **可扩展性**：经证明可处理工业级场景（10,000+ 对象）

### 实现策略：
```typescript
// 具有提升策略的实例管理器
class InstanceManager {
  private instancedMesh: InstancedMesh;
  private promotedObjects: Map<number, Mesh> = new Map();

  promoteToIndividual(instanceId: number) {
    // 为复杂交互创建独立网格
    const individualMesh = this.createIndividualMesh(instanceId);
    this.promotedObjects.set(instanceId, individualMesh);
    this.hideInstance(instanceId);
  }

  demoteToInstance(instanceId: number) {
    // 返回到实例化渲染
    this.showInstance(instanceId);
    this.promotedObjects.delete(instanceId);
  }
}
```

### 选择优化：
- **基于 GPU 的拾取**：使用渲染到纹理进行初始选择
- **空间索引**：Octree/BVH 用于高效的射线投射剔除
- **LOD 系统**：大型场景的基于距离的细节层次

### 考虑过的替代方案：
- **独立网格**：因绘制调用开销（1000+ 次绘制调用）而被拒绝
- **纯 GPU 计算**：对于基于 Web 的编辑器要求来说太复杂
- **合并几何体**：因无法变换单个对象而被拒绝

---

## 3. 撤销/重做系统：基于 Zustand 的命令模式

### 决策：与 Zustand 集成的不可变命令队列

### 理由：
- **类型安全**：TypeScript 集成用于健壮的命令定义
- **性能**：结构共享减少内存开销
- **调试**：清晰的命令历史用于故障排除
- **持久化**：易于序列化以实现保存/加载功能

### 实现架构：
```typescript
// 命令接口
interface Command {
  id: string;
  execute(): void;
  undo(): void;
  canMerge?(other: Command): boolean;
  merge?(other: Command): Command;
}

// 具有命令历史的 Zustand store
interface EditorStore {
  history: Command[];
  currentIndex: number;
  executeCommand: (command: Command) => void;
  undo: () => void;
  redo: () => void;
}

// 变换命令示例
class TransformCommand implements Command {
  constructor(
    private entityId: string,
    private oldTransform: Transform,
    private newTransform: Transform
  ) {}

  execute() {
    setEntityTransform(this.entityId, this.newTransform);
  }

  undo() {
    setEntityTransform(this.entityId, this.oldTransform);
  }

  canMerge(other: Command): boolean {
    return other instanceof TransformCommand &&
           other.entityId === this.entityId;
  }
}
```

### 内存优化：
- **命令合并**：连续的相似操作合并以防止历史记录膨胀
- **快照**：定期完整场景快照以限制撤销链长度
- **弱引用**：防止长时间编辑会话中的内存泄漏

### 考虑过的替代方案：
- **Immutable.js**：因包大小和学习曲线而被拒绝
- **Redux + Redux-Undo**：对于此特定用例来说过于沉重
- **简单状态栈**：不足以处理复杂的 3D 变换

---

## 4. Gizmo 实现：@react-three/drei TransformControls

### 决策：@react-three/drei TransformControls 配合自定义增强

### 理由：
- **久经考验**：在生产应用程序中使用的成熟实现
- **性能**：优化的渲染和交互处理
- **维护**：定期更新和社区支持
- **可扩展性**：易于使用自定义行为进行扩展

### 增强策略：
```typescript
// 增强的 TransformControls 包装器
const EnhancedTransformControls = ({
  object,
  mode,
  onObjectChange,
  snapSettings
}) => {
  const controlsRef = useRef();

  // 自定义吸附逻辑
  const handleChange = useCallback(() => {
    if (snapSettings.enabled) {
      applySnapping(object, snapSettings);
    }
    onObjectChange?.(object);
  }, [object, snapSettings, onObjectChange]);

  return (
    <TransformControls
      ref={controlsRef}
      object={object}
      mode={mode}
      onChange={handleChange}
      showX={mode !== 'scale'} // 自定义可见性逻辑
      showY={true}
      showZ={true}
    />
  );
};
```

### 自定义新增功能：
- **吸附系统**：网格/对象/角度吸附
- **多选**：同时处理多个对象
- **约束系统**：限制特定轴上的变换
- **视觉反馈**：不同模式的增强视觉提示

### 考虑过的替代方案：
- **自定义实现**：因开发时间和维护负担而被拒绝
- **Three.js TransformControls**：考虑过，但 drei 包装器提供更好的 React 集成
- **Babylon.js Gizmos**：与 React Three Fiber 生态系统不兼容

---

## 性能基准测试与考量

### 预期性能目标：
- **大型场景**：5,000+ 对象维持 60fps
- **交互编辑**：变换操作响应时间 <16ms
- **内存使用**：典型工业场景 <2GB
- **加载时间**：现代硬件上的复杂场景 <5s

### 关键优化：
1. **视锥体剔除**：仅渲染可见对象
2. **细节层次 (LOD)**：基于距离的质量降低
3. **批量更新**：每帧分组多个操作
4. **Web Workers**：从主线程卸载繁重计算

---

## 推荐技术栈

### 核心依赖：
- **React Three Fiber** (^8.15.0)：3D 渲染基础
- **@react-three/drei** (^9.88.0)：必要的 3D 实用工具
- **Zustand** (^4.4.0)：轻量级状态管理
- **Three.js** (^0.157.0)：底层 3D 引擎
- **@react-three/rapier** (^1.3.0)：物理集成（如果需要）

### 开发工具：
- **React Developer Tools**：组件调试
- **Three.js Inspector**：3D 场景调试
- **Performance Profiler**：帧率监控

---

## 实施时间表建议

### 第一阶段（第 1-2 周）：基础
- 基本 React Three Fiber 设置
- 带有层级的简单场景图
- 基本相机控制

### 第二阶段（第 3-4 周）：核心系统
- 实现混合 ECS 架构
- 基本变换 gizmos
- 简单选择系统

### 第三阶段（第 5-6 周）：性能优化
- InstancedMesh 实现
- 撤销/重做系统
- 性能分析和优化

### 第四阶段（第 7-8 周）：打磨
- 高级 gizmo 功能
- UI/UX 改进
- 测试和错误修复

---

## 风险缓解

### 技术风险：
- **浏览器兼容性**：尽早在目标浏览器上测试
- **性能下降**：从第一天起实施监控
- **内存泄漏**：定期使用 React DevTools Profiler
- **第三方依赖**：为关键库制定后备计划

### 缓解策略：
- **渐进增强**：从简单开始，逐步增加复杂性
- **性能预算**：设定并监控性能目标
- **模块化架构**：确保组件在需要时可以替换
- **全面测试**：核心系统的单元测试，工作流的集成测试
