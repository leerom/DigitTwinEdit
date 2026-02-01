import React from 'react';
import { GizmoHelper, GizmoViewport } from '@react-three/drei';

export const ViewGizmo: React.FC = () => {
  return (
    <GizmoHelper
      alignment="bottom-right"
      margin={[80, 80]}
    >
      <GizmoViewport
        axisColors={['#ff3653', '#8adb00', '#2c8fdf']}
        labelColor="black"
      />
    </GizmoHelper>
  );
};
