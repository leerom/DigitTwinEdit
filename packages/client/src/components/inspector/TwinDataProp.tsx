import React from 'react';

export const TwinDataProp: React.FC<{ objectId: string }> = ({ objectId }) => {
  return (
    <div className="grid grid-cols-2 gap-2 text-[10px]">
        <span className="text-[#64748b]">外部 ID:</span>
        <span className="text-white text-right font-mono">METRO-A1-42</span>
        <span className="text-[#64748b]">当前温度:</span>
        <span className="text-green-400 text-right font-mono">24.5 °C</span>
        <span className="text-[#64748b]">连接状态:</span>
        <span className="text-blue-400 text-right">在线</span>
    </div>
  );
};
