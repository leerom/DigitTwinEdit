<!--
Sync Impact Report:
Version Change: 1.0.0 → 1.1.0
Constitution Type: MINOR version update - new principle added
Principles Defined: 6 core principles (added "Chinese Language First")
Templates Updated:
  ✅ spec-template.zh.md - Chinese version created
  ✅ plan-template.zh.md - Chinese version created
  ✅ tasks-template.zh.md - Chinese version created
  ✅ agent-file-template.zh.md - Chinese version created
  ✅ checklist-template.zh.md - Chinese version created
Follow-up Actions:
  - All Chinese templates (.zh.md) are now available
  - Original English templates (.md) retained for reference
  - Recommend using .zh.md templates for new features
-->

# 数字孪生三维场景编辑器 Constitution

## Core Principles

### I. 中文优先 (Chinese Language First)

所有项目文档、需求、计划、实现文档必须使用中文编写。

**规则**:
- MUST 所有需求文档(Specification)使用中文编写
- MUST 所有实现计划(Plan)使用中文编写
- MUST 所有任务列表(Tasks)使用中文编写
- MUST 所有设计文档(Design Documents)使用中文编写
- MUST 代码注释使用中文(除非项目规范明确要求英文)
- MUST 用户界面文本使用中文
- MUST 错误信息和日志使用中文
- MAY 代码标识符(变量名、函数名、类名)使用英文以保持代码可读性
- MAY 技术术语保留英文原文,但需附带中文解释

**理由**:
- 项目团队主要使用中文沟通,中文文档降低理解成本
- 中文需求文档更精确表达业务逻辑,减少歧义
- 统一语言规范提升团队协作效率
- 便于项目交接和知识传承

### II. 原生优先 (Native-First)

优先使用原生 Web API,避免非必要的第三方库依赖。

**规则**:
- MUST 优先评估原生 Web API 能否满足需求(Canvas API、WebGL、Pointer Events、ResizeObserver 等)
- MUST 为引入新的第三方库提供充分理由,包括原生方案不可行的技术原因
- MUST 确保核心渲染引擎(Three.js/Babylon.js)之外的依赖保持最小化
- MAY 使用成熟的 UI 框架(React/Vue)和样式工具(TailwindCSS),但不得引入冗余功能库

**理由**: 减少包体积、提升性能、降低维护成本、避免依赖地狱。原生 API 稳定性更高,浏览器优化更好。

### III. 测试驱动开发 (Test-Driven Development - NON-NEGOTIABLE)

所有代码 MUST 遵循 TDD 模式,测试覆盖率不低于 90%。

**规则**:
- MUST 先编写测试,用户批准后确保测试失败,然后实现功能(Red-Green-Refactor)
- MUST 为核心系统编写单元测试:工具系统(Q/W/E/R/Y)、渲染模式切换、选择系统、视图导航
- MUST 为交互流程编写集成测试:拖拽操作、快捷键响应、多选逻辑、撤销/重做
- MUST 为视觉反馈编写 UI 测试:工具激活状态、鼠标图标切换、Hierarchy 高亮同步
- MUST 测试覆盖率达到 90%,使用覆盖率工具(如 Istanbul/c8)持续监控
- MUST 在 CI/CD 流程中强制执行测试门禁,未通过不得合并

**理由**: 三维编辑器复杂度高,交互逻辑多,TDD 确保需求清晰、回归安全、重构可信。90% 覆盖率保证核心路径可靠。

### IV. 性能优先 (Performance-First)

UI 响应时间保持在 100ms 以内,渲染帧率保持 60fps。

**规则**:
- MUST UI 交互响应时间 ≤ 100ms(工具切换、对象选择、属性面板更新)
- MUST Scene View 渲染保持 60fps(≤16.67ms/帧),使用 requestAnimationFrame 调度
- MUST 实现大规模场景优化:视锥剔除(Frustum Culling)、LOD(Level of Detail)、对象池(Object Pooling)
- MUST 使用 Performance API 监控关键路径性能,记录 Draw Calls/Tris/Verts 统计
- MUST 避免主线程阻塞:使用 Web Workers 处理复杂计算,使用 OffscreenCanvas 进行离屏渲染
- MAY 使用 Chrome DevTools Performance Profiler 定期性能审计

**理由**: 编辑器流畅度直接影响用户体验。100ms 是人类感知即时响应的阈值,60fps 是流畅动画的行业标准。

### V. 架构清晰 (Clear Architecture)

遵循既定设计模式,保持代码可测试性与可维护性。

**规则**:
- MUST 工具系统采用策略模式(Strategy Pattern),每个工具(Q/W/E/R/Y)独立封装
- MUST 渲染模式采用状态模式(State Pattern),线框/标准/融合模式互斥切换
- MUST 选择系统采用观察者模式(Observer Pattern),Hierarchy 与 Scene View 状态同步
- MUST 编辑操作采用命令模式(Command Pattern),支持撤销/重做(Ctrl+Z/Ctrl+Y)
- MUST 场景对象采用 ECS 架构(Entity-Component-System),实体与组件解耦
- MUST 组件间依赖注入(Dependency Injection),避免单例模式(Singleton),提升可测试性

**理由**: 清晰的设计模式降低复杂度,提升代码可读性和团队协作效率。ECS 架构适配三维场景的灵活性需求。

### VI. 简单至上 (Simplicity First)

从最简单的可行方案开始,遵循 YAGNI(You Aren't Gonna Need It)原则。

**规则**:
- MUST 每个函数/类单一职责(Single Responsibility Principle)
- MUST 避免过早抽象(Premature Abstraction),三次重复后再提取公共逻辑
- MUST 优先选择无聊的解决方案(Boring Solutions),避免炫技式代码
- MUST 代码自解释优于注释,复杂逻辑必须配备清晰注释说明意图
- MUST 新功能先实现 MVP(Minimum Viable Product),验证后再扩展

**理由**: 过度设计增加维护成本,简单方案更易理解、测试和调试。YAGNI 避免实现不需要的功能。

## 技术约束

### 坐标系规范

- **世界坐标系**: X 右向(红色)、Y 上向(绿色)、Z 前向(蓝色)
- MUST 所有 3D 控件(Gizmo)颜色严格遵循 XYZ 轴颜色约定
- MUST 支持 Global/Local 坐标系切换,右下角坐标系辅助工具保持世界坐标系一致

### 文件格式标准

- **场景文件**: *.json(如 Scene1.json)
- **材质文件**: *.mat(如 Metal_Rough.mat)
- **模型文件**: *.fbx/*.glb/*.gltf
- MUST 场景文件使用 JSON 格式,包含对象层级、变换属性、组件数据、数字孪生元数据

### 快捷键约定

- MUST 快捷键操作即时响应(≤100ms),无延迟感知
- MUST Windows 使用 Ctrl/Alt 键,Mac 自动映射为 Command/Option
- MUST 核心快捷键: Q(抓手)/W(移动)/E(旋转)/R(缩放)/Y(综合变换)/F(聚焦)/Ctrl+Z(撤销)/Ctrl+Y(重做)

### 视觉反馈标准

- MUST 工具激活状态有明显视觉标识(高亮/箭头标注/背景变色)
- MUST 鼠标状态切换清晰可辨(箭头/抓手/眼睛图标)
- MUST 选中物体在 Hierarchy 中高亮显示,与 Scene View 保持同步

## 开发工作流

### 增量提交策略

- MUST 每完成一个独立功能单元(如单个工具实现、单个渲染模式)即提交
- MUST 提交信息清晰说明变更内容与理由,遵循 Conventional Commits 规范
- MUST 每次提交后代码能够编译通过,所有现有测试通过
- MUST 绝对禁止 git reset/revert/rebase 等回滚操作,仅允许使用 git status/diff/log 安全操作

### 质量门禁

- MUST 所有 PR 必须通过以下检查:
  - 单元测试覆盖率 ≥ 90%
  - 集成测试覆盖核心用户路径
  - 代码格式化检查(Prettier/ESLint)
  - 性能测试验证(UI 响应 ≤100ms,渲染 ≥60fps)
- MUST 代码审查(Code Review)关注:设计模式一致性、测试充分性、性能影响
- MUST 禁用测试视为技术债务,需创建 Issue 跟踪并在 2 个迭代内修复

### 遇到问题的处理流程

- MUST 每个问题最多尝试 3 次,第 3 次失败后停止并重新评估
- MUST 记录失败内容:尝试方案、错误信息、失败原因
- MUST 研究 2-3 个替代方案,分析不同方法优劣
- MUST 质疑根本问题:抽象级别是否正确?能否分解为更小问题?
- MUST 永远不要删除代码以绕过编译错误,必须修复根本原因

## 数字孪生特定约束

### Inspector 面板数据要求

- MUST 显示外部 ID(如 METRO-A1-42)
- MUST 显示实时数据(当前温度、连接状态、传感器读数等)
- MUST 显示孪生体元数据(创建时间、最后更新、数据源等)
- MUST 实时数据更新延迟 ≤ 1 秒(WebSocket 推送或 Polling)

### 场景对象层级要求

- MUST 支持深度嵌套的对象树(≥10 层)
- MUST Hierarchy 视图支持拖拽重组父子关系
- MUST 支持批量操作:全选(Ctrl+A)、复制(Ctrl+D)、删除(Delete)

## Governance

### 宪法权威

- 本宪法优先级高于所有其他开发实践文档
- 违反宪法原则的代码不得合并至主分支
- 宪法修订需团队讨论、技术负责人批准、版本号递增

### 复杂度审批

- 任何增加系统复杂度的决策(新设计模式、新依赖、新抽象层)MUST 在设计文档中说明理由
- 复杂度必须有明确收益(性能提升、可维护性改善、需求强制要求)
- 审查者有权要求简化方案

### 修订流程

- **MAJOR** 版本:移除或重新定义核心原则,需全员投票通过
- **MINOR** 版本:新增原则或重大扩展,需技术负责人批准
- **PATCH** 版本:文字修正、澄清说明,需 Code Review 批准

### 运行时指导

开发过程中参考以下文档:
- `CLAUDE.md`:项目概述、架构组件、技术实现建议
- `rawRequirements/`:详细功能需求与操作指南
- `.specify/templates/`:规范模板(spec/plan/tasks)

**Version**: 1.1.0 | **Ratified**: 2026-01-20 | **Last Amended**: 2026-01-20
