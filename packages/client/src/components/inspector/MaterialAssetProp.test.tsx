import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MaterialAssetProp } from './MaterialAssetProp';

vi.mock('@/stores/materialStore', () => ({
  useMaterialStore: (selector: any) =>
    selector({
      saveError: null,
      clearSaveError: vi.fn(),
      updateMaterialSpec: vi.fn().mockResolvedValue(undefined),
    }),
}));

vi.mock('@/api/assets', () => ({
  materialsApi: {
    getMaterial: vi.fn().mockResolvedValue({
      id: '1',
      name: '测试材质',
      type: 'MeshStandardMaterial',
      properties: { color: '#ff0000', roughness: 0.5 },
    }),
  },
}));

// MaterialFieldRenderer 依赖 TexturePicker（需要 Canvas），全部 mock
vi.mock('./MaterialFieldRenderer', () => ({
  MaterialFieldRenderer: ({ field }: any) => <div data-testid={`field-${field.key}`} />,
}));

describe('MaterialAssetProp', () => {
  it('加载后显示材质类型选择器', async () => {
    render(<MaterialAssetProp assetId={1} projectId={1} />);
    const select = await screen.findByRole('combobox');
    expect(select).toHaveValue('MeshStandardMaterial');
  });
});
