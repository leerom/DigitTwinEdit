# 04 - 异常处理与技术风险

## 1. 异常处理策略

### 1.1 文件校验阶段

| 错误场景 | 错误提示 | 处理方式 |
|---------|---------|---------|
| 非 .fbx 文件 | 「仅支持 FBX 格式文件」 | 文件选择器 `accept=".fbx"` + JS 后缀名双重校验 |
| 文件超过 500MB | 「文件过大（XXMb），最大支持 500MB」 | `file.size` 检查，在 Worker 启动前中断 |
| 文件大小为 0 | 「文件为空，请重新选择」 | `file.size === 0` 检查 |

### 1.2 Worker 转换阶段

| 错误场景 | 错误提示 | 处理方式 |
|---------|---------|---------|
| FBX 文件损坏/格式错误 | 「文件解析失败，请检查文件完整性」 | Worker `try/catch` FBXLoader.parse() |
| 纹理资源缺失 | 「部分纹理丢失，已使用默认材质替代」 | GLTFExporter 导出成功但在结束时检查材质 |
| 转换超时（>60s） | 「导入超时，请尝试优化文件后重新导入」 | Worker 超时计时器 + `worker.terminate()` |
| Worker 崩溃 | 「转换过程中发生错误，请重试」 | `worker.onerror` 捕获 |

### 1.3 文件上传阶段

| 错误场景 | 错误提示 | 处理方式 |
|---------|---------|---------|
| 网络中断 | 「上传失败，请检查网络连接」 + 重试按钮 | HTTP 错误捕获 |
| 服务器存储失败 | 「服务器保存失败，请稍后重试」 | API 返回 500 时的处理 |
| FBX 上传成功但 GLB 上传失败 | 「模型转换成功但保存失败，请重试」 | 记录失败，提供重试；不删除已上传的 FBX |

### 1.4 进度对话框设计

```
[导入中...]
  解析文件...      ████████░░ 40%

  [取消]
```

- 支持取消操作（`worker.terminate()` + 清理已上传的 FBX 文件）
- 各阶段进度分配：
  - 读取文件：0% → 5%
  - FBX 解析：5% → 35%
  - 格式转换：35% → 65%
  - 上传 FBX：65% → 75%
  - 上传 GLB：75% → 100%

---

## 2. 技术风险评估

### 风险 1：Three.js FBXLoader 在 Web Worker 中不可用

**可能性：中**

**原因：** FBXLoader 内部可能依赖 `document`、`window` 或 `XMLHttpRequest` 等浏览器 API。

**验证方法（实现前先验证）：**
```ts
// 在 fbxWorker.ts 开头添加测试
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
console.log('FBXLoader imported successfully in Worker');
```
在 Worker 中运行，检查是否报错。

**缓解方案：**
- 如果 Worker 中不可用，改用主线程处理 FBX 解析，仅用 Worker 做 GLTFExporter 的导出
- 或使用 `three-stdlib` 替代（该库对 SSR/Worker 环境更友好）

---

### 风险 2：fflate 依赖缺失导致 FBX 二进制格式解压失败

**可能性：低**

**原因：** Three.js FBXLoader 使用 `fflate` 解压 FBX 二进制格式（zlib 压缩）。若未安装会报错。

**验证方法：**
```bash
# 检查 Three.js 是否已捆绑
grep -r "fflate" node_modules/three/examples/jsm/loaders/FBXLoader.js
```

**缓解方案：**
```bash
pnpm --filter client add fflate
```

---

### 风险 3：大文件导致 Worker 内存溢出

**可能性：中**

**原因：** 100MB 的 FBX 文件在解析后可能产生更大的 Three.js 对象图，Worker 可能因内存不足崩溃。

**缓解方案：**
- 500MB 的文件上限本身是保护
- 额外警告：文件 > 100MB 时提示「大文件可能导致导入较慢，建议预先压缩模型」
- Worker 崩溃时提供清晰错误信息

---

### 风险 4：GLB 包含嵌入纹理时体积超过 multer 上传限制

**可能性：低**

**原因：** 如果 FBX 包含大量高分辨率纹理，嵌入后 GLB 可能远超原始 FBX 大小，可能触发 multer 的上传大小限制。

**缓解方案：**
检查并调整 `upload.ts` 中 multer 的 `fileSize` 限制（GLB 可以设置更大的限制，如 1GB）。

---

### 风险 5：重新导入时 FBX 资产被用户误删

**可能性：低**

**原因：** 如果用户通过其他方式删除了原始 FBX 资产（即 `isSourceFbx=true` 的资产），重新导入功能会失败。

**缓解方案：**
- Inspector 中检测 sourceFbxAssetId 对应的资产是否存在
- 若不存在，「重新导入」按钮变为禁用，提示「原始 FBX 文件已丢失，无法重新导入」

---

## 3. 非功能需求实现路径

| 需求 | 实现方式 |
|------|---------|
| 支持 10 万面模型 | Three.js 原生支持，FBXLoader 会自动处理 |
| 50MB 文件 < 10 秒 | Web Worker 保证不阻塞 UI；实际性能取决于客户端 CPU |
| 不阻塞编辑器其他操作 | Web Worker 隔离计算线程 |
| 支持 Chrome/Firefox/Edge 90+ | ES Module Worker 在上述浏览器均支持 |
| Three.js r150+ | 当前安装版本 r173，满足要求 |
| 支持骨骼动画 | Three.js FBXLoader 支持骨骼动画；GLTFExporter 支持动画导出 |
