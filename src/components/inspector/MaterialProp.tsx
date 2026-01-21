import React from 'react';

export const MaterialProp: React.FC<{ objectId: string }> = ({ objectId }) => {
  return (
    <div className="bg-[#0c0e14] border border-[#2d333f] p-3 rounded-sm">
      <div className="flex items-center space-x-3 mb-3">
        <div className="w-8 h-8 rounded bg-[#008b8b] border border-white/10"></div>
        <div className="flex-1 overflow-hidden">
            <div className="text-[10px] text-[#cccccc] truncate">Mat_Industrial_Steel_01</div>
            <div className="text-[8px] text-[#64748b]">PBR Shader</div>
        </div>
        <span className="material-symbols-outlined text-[12px] text-[#64748b] cursor-pointer hover:text-white">edit</span>
      </div>

      <div className="space-y-3">
        <div>
            <div className="flex justify-between text-[9px] text-[#64748b] mb-1">
                <span>基础粗糙度</span>
                <span>0.42</span>
            </div>
            <div className="h-1 bg-[#1e222d] rounded-full overflow-hidden">
                <div className="bg-[#3b82f6] h-full w-[42%]"></div>
            </div>
        </div>
        <div>
            <div className="flex justify-between text-[9px] text-[#64748b] mb-1">
                <span>金属性度</span>
                <span>0.15</span>
            </div>
            <div className="h-1 bg-[#1e222d] rounded-full overflow-hidden">
                <div className="bg-[#f59e0b] h-full w-[15%]"></div>
            </div>
        </div>
      </div>
    </div>
  );
};
