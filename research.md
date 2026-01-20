# Research: Web-based 3D Scene Editor Architecture with React Three Fiber

## Executive Summary

This research document analyzes best practices for implementing a Unity-like 3D scene editor using React Three Fiber (R3F), focusing on four critical architectural decisions that will significantly impact performance, maintainability, and user experience.

## 1. ECS in React: Entity-Component-System Architecture

### Decision: Hybrid "React Component as System" Approach

### Rationale:
- **React's Declarative Nature**: Pure ECS conflicts with React's component lifecycle and declarative rendering model
- **Developer Experience**: Leverages existing React patterns while incorporating ECS benefits where appropriate
- **Performance Balance**: Provides good performance without sacrificing React's development ergonomics
- **Maintainability**: Easier to debug and understand for React developers

### Implementation Pattern:
```typescript
// Entity as React component
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

// Systems as custom hooks
const useTransformSystem = (entities) => {
  useFrame(() => {
    entities.forEach(entity => {
      if (entity.components.transform?.needsUpdate) {
        // Update transform logic
      }
    });
  });
};
```

### Alternatives Considered:
- **Pure ECS**: Rejected due to complexity in integrating with React's rendering model
- **Pure React Components**: Rejected due to performance limitations with large scene graphs
- **Flux Architecture**: Considered but ECS provides better separation of concerns for 3D applications

---

## 2. Performance (InstancedMesh): Managing 1000+ Interactive Objects

### Decision: Hybrid InstancedMesh with Selective Promotion

### Rationale:
- **Performance**: InstancedMesh reduces draw calls dramatically (1000+ objects → 1 draw call)
- **Selective Interaction**: Only promote frequently-interacted objects to individual meshes
- **Memory Efficiency**: Shared geometry and materials reduce GPU memory usage
- **Scalability**: Proven to handle industrial-scale scenes (10,000+ objects)

### Implementation Strategy:
```typescript
// Instance manager with promotion strategy
class InstanceManager {
  private instancedMesh: InstancedMesh;
  private promotedObjects: Map<number, Mesh> = new Map();

  promoteToIndividual(instanceId: number) {
    // Create individual mesh for complex interactions
    const individualMesh = this.createIndividualMesh(instanceId);
    this.promotedObjects.set(instanceId, individualMesh);
    this.hideInstance(instanceId);
  }

  demoteToInstance(instanceId: number) {
    // Return to instanced rendering
    this.showInstance(instanceId);
    this.promotedObjects.delete(instanceId);
  }
}
```

### Selection Optimization:
- **GPU-based Picking**: Use render-to-texture for initial selection
- **Spatial Indexing**: Octree/BVH for efficient raycast culling
- **LOD System**: Distance-based level-of-detail for large scenes

### Alternatives Considered:
- **Individual Meshes**: Rejected due to draw call overhead (1000+ draw calls)
- **Pure GPU Compute**: Too complex for web-based editor requirements
- **Merged Geometry**: Rejected due to inability to transform individual objects

---

## 3. Undo/Redo System: Command Pattern with Zustand

### Decision: Immutable Command Queue with Zustand Integration

### Rationale:
- **Type Safety**: TypeScript integration for robust command definitions
- **Performance**: Structural sharing reduces memory overhead
- **Debugging**: Clear command history for troubleshooting
- **Persistence**: Easy serialization for save/load functionality

### Implementation Architecture:
```typescript
// Command interface
interface Command {
  id: string;
  execute(): void;
  undo(): void;
  canMerge?(other: Command): boolean;
  merge?(other: Command): Command;
}

// Zustand store with command history
interface EditorStore {
  history: Command[];
  currentIndex: number;
  executeCommand: (command: Command) => void;
  undo: () => void;
  redo: () => void;
}

// Transform command example
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

### Memory Optimization:
- **Command Merging**: Consecutive similar operations merge to prevent history bloat
- **Snapshots**: Periodic full scene snapshots to limit undo chain length
- **Weak References**: Prevent memory leaks in long editing sessions

### Alternatives Considered:
- **Immutable.js**: Rejected due to bundle size and learning curve
- **Redux with Redux-Undo**: Too heavyweight for this specific use case
- **Simple State Stack**: Insufficient for complex 3D transformations

---

## 4. Gizmo Implementation: @react-three/drei TransformControls

### Decision: @react-three/drei TransformControls with Custom Enhancements

### Rationale:
- **Battle-tested**: Proven implementation used in production applications
- **Performance**: Optimized rendering and interaction handling
- **Maintenance**: Regular updates and community support
- **Extensibility**: Easy to extend with custom behaviors

### Enhancement Strategy:
```typescript
// Enhanced TransformControls wrapper
const EnhancedTransformControls = ({
  object,
  mode,
  onObjectChange,
  snapSettings
}) => {
  const controlsRef = useRef();

  // Custom snapping logic
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
      showX={mode !== 'scale'} // Custom visibility logic
      showY={true}
      showZ={true}
    />
  );
};
```

### Custom Additions:
- **Snapping System**: Grid/object/angle snapping
- **Multi-selection**: Handle multiple objects simultaneously
- **Constraint System**: Limit transformations on specific axes
- **Visual Feedback**: Enhanced visual cues for different modes

### Alternatives Considered:
- **Custom Implementation**: Rejected due to development time and maintenance burden
- **Three.js TransformControls**: Considered but drei wrapper provides better React integration
- **Babylon.js Gizmos**: Not compatible with React Three Fiber ecosystem

---

## Performance Benchmarks and Considerations

### Expected Performance Targets:
- **Large Scenes**: 5,000+ objects at 60fps
- **Interactive Editing**: <16ms response time for transform operations
- **Memory Usage**: <2GB for typical industrial scenes
- **Load Time**: <5s for complex scenes on modern hardware

### Critical Optimizations:
1. **Frustum Culling**: Only render visible objects
2. **Level of Detail**: Distance-based quality reduction
3. **Batched Updates**: Group multiple operations per frame
4. **Web Workers**: Offload heavy computations from main thread

---

## Recommended Technology Stack

### Core Dependencies:
- **React Three Fiber** (^8.15.0): 3D rendering foundation
- **@react-three/drei** (^9.88.0): Essential 3D utilities
- **Zustand** (^4.4.0): Lightweight state management
- **Three.js** (^0.157.0): Underlying 3D engine
- **@react-three/rapier** (^1.3.0): Physics integration (if needed)

### Development Tools:
- **React Developer Tools**: Component debugging
- **Three.js Inspector**: 3D scene debugging
- **Performance Profiler**: Frame rate monitoring

---

## Implementation Timeline Recommendations

### Phase 1 (Weeks 1-2): Foundation
- Basic React Three Fiber setup
- Simple scene graph with hierarchy
- Basic camera controls

### Phase 2 (Weeks 3-4): Core Systems
- Implement hybrid ECS architecture
- Basic transform gizmos
- Simple selection system

### Phase 3 (Weeks 5-6): Performance Optimization
- InstancedMesh implementation
- Undo/redo system
- Performance profiling and optimization

### Phase 4 (Weeks 7-8): Polish
- Advanced gizmo features
- UI/UX refinements
- Testing and bug fixes

---

## Risk Mitigation

### Technical Risks:
- **Browser Compatibility**: Test on target browsers early
- **Performance Degradation**: Implement monitoring from day one
- **Memory Leaks**: Use React DevTools Profiler regularly
- **Third-party Dependencies**: Have fallback plans for critical libraries

### Mitigation Strategies:
- **Progressive Enhancement**: Start simple, add complexity incrementally
- **Performance Budgets**: Set and monitor performance targets
- **Modular Architecture**: Ensure components can be replaced if needed
- **Comprehensive Testing**: Unit tests for core systems, integration tests for workflows