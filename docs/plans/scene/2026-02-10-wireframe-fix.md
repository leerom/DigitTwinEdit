# Wireframe RenderMode Fix Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在 renderMode=wireframe 时，所有 Mesh 统一线框，Camera/Light 保持实体显示；非 wireframe 时恢复材质自身 wireframe 配置。

**Architecture:** 在 SceneRenderer 中新增一个可测试的线框覆盖计算函数；用 useEffect 在 renderMode/materialSpec 变化时同步材质 wireframe 与 needsUpdate；相机/灯光可视化网格固定非线框。

**Tech Stack:** React + TypeScript, @react-three/fiber, Three.js, Zustand, Vitest

---

### Task 1: 添加线框覆盖逻辑的失败用例

**Files:**
- Create: `packages/client/src/features/scene/SceneRenderer.test.ts`
- Modify: `packages/client/src/features/scene/SceneRenderer.tsx`（仅导出待测函数，不改逻辑）

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { resolveWireframeOverride } from './SceneRenderer';
import type { MaterialSpec } from '@/types';

describe('resolveWireframeOverride', () => {
  it('forces wireframe when renderMode=wireframe', () => {
    const spec: MaterialSpec = { type: 'standard', props: { wireframe: false } };
    expect(resolveWireframeOverride('wireframe', spec)).toBe(true);
  });

  it('falls back to material wireframe when not wireframe', () => {
    const spec: MaterialSpec = { type: 'standard', props: { wireframe: true } };
    expect(resolveWireframeOverride('shaded', spec)).toBe(true);
  });

  it('defaults to false when material wireframe missing', () => {
    const spec: MaterialSpec = { type: 'standard', props: {} };
    expect(resolveWireframeOverride('hybrid', spec)).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C "C:/2026/DigitTwinEdit/.worktrees/fix-wireframe-mode" --filter client test -- src/features/scene/SceneRenderer.test.ts`

Expected: FAIL（找不到 resolveWireframeOverride 或未导出）

**Step 3: Commit**

如需提交：`git add packages/client/src/features/scene/SceneRenderer.test.ts packages/client/src/features/scene/SceneRenderer.tsx` 然后提交。

---

### Task 2: 实现线框覆盖与相机/灯光保持实体显示

**Files:**
- Modify: `packages/client/src/features/scene/SceneRenderer.tsx`

**Step 1: Write minimal implementation**

- 在 `SceneRenderer.tsx` 添加并导出 `resolveWireframeOverride(renderMode, materialSpec)`：
  - renderMode=wireframe → `true`
  - 否则 → `materialSpec.props?.wireframe ?? false`
- 新增 `useEffect`：当 `renderMode` 或 `materialSpec` 变化时，设置 `materialRef.current.wireframe` 并 `needsUpdate = true`。
- 移除相机/灯光 `meshBasicMaterial` 上的 `wireframe={isWireframe}` 绑定。

**Step 2: Run test to verify it passes**

Run: `pnpm -C "C:/2026/DigitTwinEdit/.worktrees/fix-wireframe-mode" --filter client test -- src/features/scene/SceneRenderer.test.ts`

Expected: PASS

**Step 3: Commit**

如需提交：`git add packages/client/src/features/scene/SceneRenderer.tsx packages/client/src/features/scene/SceneRenderer.test.ts` 然后提交。

---

### Task 3: 客户端回归验证

**Files:**
- None

**Step 1: Run client tests (optional)**

Run: `pnpm -C "C:/2026/DigitTwinEdit/.worktrees/fix-wireframe-mode" --filter client test`

Expected: PASS（如有已知失败请记录）

**Step 2: Manual check**

- 切换 wireframe：所有 Mesh 线框显示，Camera/Light 保持实体。
- 切回 shaded：Mesh 恢复材质显示。
- hybrid：边线显示不受影响。

**Step 3: Commit**

如需提交：`git add` 对应变更后提交。

---

## Notes
- 已暂停 server 测试环境修复，当前 worktree 中包含与测试环境相关的改动（cross-env、tsconfig、jest config）。如需剔除，请先确认是否要回退这些改动。
- 基线 server 测试仍不通过，后续执行以 client 测试与手动验证为主。