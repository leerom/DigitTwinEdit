import React, { useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useSceneStore } from '@/stores/sceneStore';
import type { PostProcessEffect, PostProcessEffectType, PostProcessParams } from '@/types';

// ── 效果显示名映射 ─────────────────────────────────────────────
const EFFECT_LABELS: Record<PostProcessEffectType, string> = {
  UnrealBloom: 'Unreal Bloom（辉光）',
  Film: 'Film（胶片颗粒）',
  Bokeh: 'Bokeh（景深）',
  SSAO: 'SSAO（环境光遮蔽）',
};

const ALL_EFFECT_TYPES: PostProcessEffectType[] = ['UnrealBloom', 'Film', 'Bokeh', 'SSAO'];

// ── 通用参数行（label + slider + 数字输入）─────────────────────
interface ParamRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}

const ParamRow: React.FC<ParamRowProps> = ({ label, value, min, max, step, onChange }) => (
  <div className="flex items-center justify-between gap-2">
    <span className="text-slate-500 text-[11px] shrink-0 w-20">{label}</span>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="flex-1 accent-primary h-1"
    />
    <input
      type="number"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => {
        const v = parseFloat(e.target.value);
        if (!isNaN(v)) onChange(v);
      }}
      className="w-14 bg-[#0c0e14] border border-border-dark text-white text-[11px] px-1.5 py-0.5 rounded focus:outline-none focus:ring-1 focus:ring-primary/50 text-right font-mono"
    />
  </div>
);

// ── 单个效果参数编辑 ────────────────────────────────────────────
interface EffectParamsEditorProps {
  effect: PostProcessEffect;
  onChange: (id: string, params: Partial<PostProcessParams>) => void;
}

const EffectParamsEditor: React.FC<EffectParamsEditorProps> = ({ effect, onChange }) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = effect.params as any;
  const update = (key: string, value: unknown) =>
    onChange(effect.id, { [key]: value } as Partial<PostProcessParams>);

  switch (effect.type) {
    case 'UnrealBloom':
      return (
        <div className="space-y-2 mt-2">
          <ParamRow label="Threshold" value={p.threshold} min={0} max={1}   step={0.01} onChange={(v) => update('threshold', v)} />
          <ParamRow label="Strength"  value={p.strength}  min={0} max={3}   step={0.05} onChange={(v) => update('strength', v)} />
          <ParamRow label="Radius"    value={p.radius}    min={0} max={1}   step={0.01} onChange={(v) => update('radius', v)} />
        </div>
      );
    case 'Film':
      return (
        <div className="space-y-2 mt-2">
          <ParamRow label="Intensity" value={p.intensity} min={0} max={1} step={0.01} onChange={(v) => update('intensity', v)} />
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-500 text-[11px]">Grayscale</span>
            <input
              type="checkbox"
              checked={p.grayscale}
              onChange={(e) => update('grayscale', e.target.checked)}
              className="w-3.5 h-3.5 accent-primary cursor-pointer"
            />
          </div>
        </div>
      );
    case 'Bokeh':
      return (
        <div className="space-y-2 mt-2">
          <ParamRow label="Focus"    value={p.focus}    min={0}   max={10}  step={0.1}   onChange={(v) => update('focus', v)} />
          <ParamRow label="Aperture" value={p.aperture} min={0}   max={0.1} step={0.001} onChange={(v) => update('aperture', v)} />
          <ParamRow label="Max Blur" value={p.maxblur}  min={0}   max={0.05} step={0.001} onChange={(v) => update('maxblur', v)} />
        </div>
      );
    case 'SSAO':
      return (
        <div className="space-y-2 mt-2">
          <ParamRow label="Kernel R."    value={p.kernelRadius} min={0}  max={32}   step={0.5}    onChange={(v) => update('kernelRadius', v)} />
          <ParamRow label="Min Dist"     value={p.minDistance}  min={0}  max={0.01} step={0.0001} onChange={(v) => update('minDistance', v)} />
          <ParamRow label="Max Dist"     value={p.maxDistance}  min={0}  max={1}    step={0.01}   onChange={(v) => update('maxDistance', v)} />
        </div>
      );
    default:
      return null;
  }
};

// ── 可排序效果卡片 ─────────────────────────────────────────────
interface SortableEffectCardProps {
  effect: PostProcessEffect;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onParamsChange: (id: string, params: Partial<PostProcessParams>) => void;
}

const SortableEffectCard: React.FC<SortableEffectCardProps> = ({
  effect, onToggle, onRemove, onParamsChange,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: effect.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded border border-border-dark bg-header-dark/30 overflow-hidden"
    >
      {/* 卡片头部 */}
      <div className="flex items-center gap-2 px-3 py-2">
        {/* 拖拽手柄 */}
        <button
          {...attributes}
          {...listeners}
          className="text-slate-600 hover:text-slate-400 cursor-grab active:cursor-grabbing shrink-0"
          title="拖拽排序"
        >
          <span className="material-symbols-outlined text-sm">drag_indicator</span>
        </button>

        {/* 启用 checkbox */}
        <input
          type="checkbox"
          checked={effect.enabled}
          onChange={() => onToggle(effect.id)}
          className="w-3.5 h-3.5 accent-primary cursor-pointer shrink-0"
        />

        {/* 效果名称 */}
        <span className={`text-[11px] flex-1 font-medium ${effect.enabled ? 'text-slate-300' : 'text-slate-600'}`}>
          {EFFECT_LABELS[effect.type]}
        </span>

        {/* 删除按钮 */}
        <button
          onClick={() => onRemove(effect.id)}
          className="text-slate-600 hover:text-red-400 transition-colors shrink-0"
          title="删除效果"
        >
          <span className="material-symbols-outlined text-sm">close</span>
        </button>
      </div>

      {/* 参数编辑（仅启用时展示，禁用时折叠） */}
      {effect.enabled && (
        <div className="px-3 pb-3 border-t border-border-dark/50">
          <EffectParamsEditor effect={effect} onChange={onParamsChange} />
        </div>
      )}
    </div>
  );
};

// ── 主组件 ─────────────────────────────────────────────────────
export const PostProcessingProp: React.FC = () => {
  const effects      = useSceneStore((s) => s.scene.settings.postProcessing ?? []);
  const addEffect    = useSceneStore((s) => s.addPostProcessEffect);
  const removeEffect = useSceneStore((s) => s.removePostProcessEffect);
  const toggleEffect = useSceneStore((s) => s.togglePostProcessEffect);
  const updateEffect = useSceneStore((s) => s.updatePostProcessEffect);
  const reorderEffects = useSceneStore((s) => s.reorderPostProcessEffects);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        const oldIndex = effects.findIndex((e) => e.id === active.id);
        const newIndex = effects.findIndex((e) => e.id === over.id);
        reorderEffects(arrayMove(effects, oldIndex, newIndex));
      }
    },
    [effects, reorderEffects]
  );

  return (
    <div>
      {/* 分区标题 */}
      <div className="flex items-center gap-2 mb-3">
        <span className="material-symbols-outlined text-xs text-primary">auto_fix_high</span>
        <h3 className="text-[11px] font-bold text-slate-300">后处理效果 (Post-Processing)</h3>
      </div>

      {/* 添加按钮 */}
      <div className="mb-3">
        <select
          value=""
          onChange={(e) => {
            if (e.target.value) {
              addEffect(e.target.value as PostProcessEffectType);
              e.target.value = '';
            }
          }}
          className="w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-slate-400 text-[11px] focus:outline-none focus:border-blue-500 cursor-pointer"
        >
          <option value="">+ 添加后处理效果...</option>
          {ALL_EFFECT_TYPES.map((type) => (
            <option key={type} value={type}>{EFFECT_LABELS[type]}</option>
          ))}
        </select>
      </div>

      {/* 效果列表 */}
      {effects.length === 0 ? (
        <p className="text-slate-600 text-[10px] text-center py-2">
          暂无后处理效果，从上方下拉菜单添加。
        </p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={effects.map((e) => e.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {effects.map((effect) => (
                <SortableEffectCard
                  key={effect.id}
                  effect={effect}
                  onToggle={toggleEffect}
                  onRemove={removeEffect}
                  onParamsChange={updateEffect}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
};
