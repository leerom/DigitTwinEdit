import React from 'react';

export const MaterialProp: React.FC<{ objectId: string }> = ({ objectId }) => {
  return (
    <div className="flex flex-col gap-3">
      <div className="text-xs font-bold text-gray-200">MATERIAL</div>
      <div className="text-xs text-gray-500 italic">Material editing pending...</div>
    </div>
  );
};
