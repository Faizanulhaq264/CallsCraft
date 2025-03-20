import React from "react";

interface GaugeProps {
  label: string;
  value: number;
  color: string;
}

const Gauge: React.FC<GaugeProps> = ({ label, value, color }) => {
  // Calculate the angle for the gauge needle
  const angle = (value / 100) * 180 - 90;
  
  // Define color mapping
  const colorMap: Record<string, string> = {
    'purple': '#8b5cf6',
    'cyan': '#06b6d4',
    // Add other colors as needed
  };
  
  // Get the actual color from the map or use purple as fallback
  const actualColor = colorMap[color] || '#8b5cf6';

  return (
    <div className="flex flex-col items-center">
      <div className="text-sm text-gray-400 mb-1">{label}</div>
      <div className="relative w-24 h-12 overflow-hidden">
        {/* Static background semicircle */}
        <div className="absolute w-24 h-24 bottom-0 rounded-full border-4 border-gray-800"></div>
        
        {/* Rotating colored needle/gauge */}
        <div
          className="absolute w-24 h-24 bottom-0 rounded-full border-4 border-transparent"
          style={{
            transform: `rotate(${angle}deg)`,
            borderTopColor: actualColor,
            transformOrigin: 'center bottom',
            transition: 'transform 0.5s ease-out'
          }}
        ></div>
        
        {/* Value label */}
        <div className="absolute inset-0 flex items-center justify-center bottom-1">
          <span className="text-lg font-bold">{value}%</span>
        </div>
      </div>
    </div>
  );
};

export default Gauge;