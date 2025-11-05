import React from 'react';

/**
 * Global SVG filters for glass effects
 * This component should be rendered once at the app root level
 */
export const GlassFilters: React.FC = () => {
  return (
    <svg
      style={{
        position: 'absolute',
        width: 0,
        height: 0,
        overflow: 'hidden',
      }}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <filter id="glass-blur" x="-50%" y="-50%" width="200%" height="200%" filterUnits="objectBoundingBox">
          <feTurbulence type="fractalNoise" baseFrequency="0.003 0.007" numOctaves="1" result="turbulence" />
          <feDisplacementMap in="SourceGraphic" in2="turbulence" scale="200" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
    </svg>
  );
};
