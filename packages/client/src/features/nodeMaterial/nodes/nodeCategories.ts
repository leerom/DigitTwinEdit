// packages/client/src/features/nodeMaterial/nodes/nodeCategories.ts

export interface NodeCategory {
  key: string;
  label: string;
  color: string;      // 节点卡片头部颜色
  icon: string;       // material-symbols-outlined 图标名
}

export const NODE_CATEGORIES: NodeCategory[] = [
  { key: 'input',   label: 'Inputs（输入）',    color: '#2563eb', icon: 'input' },
  { key: 'math',    label: 'Math（数学运算）',  color: '#16a34a', icon: 'calculate' },
  { key: 'mesh',    label: 'Mesh（网格数据）',  color: '#9333ea', icon: 'view_in_ar' },
  { key: 'output',  label: 'Output（输出）',    color: '#dc2626', icon: 'output' },
  { key: 'pbr',     label: 'PBR（物理渲染）',   color: '#d97706', icon: 'water_drop' },
];

export const CATEGORY_MAP = new Map<string, NodeCategory>(
  NODE_CATEGORIES.map((c) => [c.key, c])
);
