import React from 'react';

export const TwinDataProp: React.FC<{ objectId: string }> = ({ objectId }) => {
  return (
    <div className="flex flex-col gap-3">
      <div className="text-xs font-bold text-gray-200">DIGITAL TWIN DATA</div>
      <div className="text-xs text-gray-500 italic">No external data source linked.</div>
    </div>
  );
};
