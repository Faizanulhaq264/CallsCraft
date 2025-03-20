import React from "react";

interface GaugeProps {
  label: string;
  value: number;
  color: string;
}

const Gauge: React.FC<GaugeProps> = ({ label, value, color }) => {
  // Calculate the angle for the gauge needle
  const angle = (value / 100) * 180 - 90;

  return (
    <div className="flex flex-col items-center">
      <div className="text-sm text-gray-400 mb-1">{label}</div>
      <div className="relative w-24 h-12 overflow-hidden">
        <div className="absolute w-24 h-24 bottom-0 rounded-full border-4 border-gray-800"></div>
        <div
          className={`absolute w-24 h-24 bottom-0 rounded-full border-4 border-transparent border-t-${color}-500`}
          style={{
            transform: `rotate(${angle}deg)`,
            borderTopColor: `var(--${color}-500, #8b5cf6)`, // Fallback to purple
          }}
        ></div>
        <div className="absolute inset-0 flex items-center justify-center bottom-1">
          <span className="text-lg font-bold">{value}%</span>
        </div>
      </div>
    </div>
  );
};

export default Gauge;