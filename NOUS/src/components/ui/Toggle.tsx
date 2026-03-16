import React from "react";

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
}

export const Toggle = ({ checked, onChange, label }: ToggleProps) => {
  return (
    <div className="flex items-center gap-3 cursor-pointer" onClick={() => onChange(!checked)}>
      <div
        className="relative shrink-0 rounded-full transition-all duration-200 ease-in-out"
        style={{
          width: 44,
          height: 26,
          background: checked
            ? 'linear-gradient(135deg, #7c7aff, #5e5ce6)'
            : 'rgba(255,255,255,0.06)',
          border: checked ? 'none' : '1px solid rgba(255,255,255,0.1)',
          boxShadow: checked ? '0 0 12px rgba(124,122,255,0.3)' : 'none',
        }}
      >
        <div
          className="absolute rounded-full shadow-md transition-all duration-200 ease-in-out"
          style={{
            width: 20,
            height: 20,
            top: '50%',
            transform: `translateY(-50%) translateX(${checked ? 20 : 3}px)`,
            background: '#ffffff',
            boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
          }}
        />
      </div>
      {label && (
        <span className="text-sm font-medium text-nous-primary">{label}</span>
      )}
    </div>
  );
};
