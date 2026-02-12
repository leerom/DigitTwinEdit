interface SceneListItem {
  id: number;
  name: string;
  is_active: boolean;
  updated_at: string;
}

/**
 * 生成唯一的场景名称
 * 如果名称已存在，则添加后缀 (1), (2), (3) 等
 * @param baseName - 基础名称
 * @param existingScenes - 现有场景列表
 * @returns 唯一的场景名称
 */
export function getUniqueSceneName(
  baseName: string,
  existingScenes: SceneListItem[]
): string {
  // 处理空白输入
  const trimmedName = baseName.trim();
  const name = trimmedName || '新建场景';

  const existingNames = existingScenes.map((s) => s.name);

  // 如果名称不存在，直接返回
  if (!existingNames.includes(name)) {
    return name;
  }

  // 找到第一个可用的编号
  let counter = 1;
  while (existingNames.includes(`${name} (${counter})`)) {
    counter++;
  }

  return `${name} (${counter})`;
}
