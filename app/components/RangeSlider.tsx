import { useState, useEffect, useRef } from 'react';

interface RangeSliderProps {
  min: number;
  max: number;
  step?: number;
  startValue: number;
  endValue: number;
  onStartChange: (value: number) => void;
  onEndChange: (value: number) => void;
}

export const RangeSlider = ({
  min,
  max,
  step = 0.1,
  startValue,
  endValue,
  onStartChange,
  onEndChange
}: RangeSliderProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [activeHandle, setActiveHandle] = useState<'start' | 'end' | null>(null);
  const sliderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseUp = () => {
      setIsDragging(false);
      setActiveHandle(null);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !activeHandle || !sliderRef.current) return;

      const rect = sliderRef.current.getBoundingClientRect();
      const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const value = min + (max - min) * percent;
      const roundedValue = Math.round(value / step) * step;

      if (activeHandle === 'start' && roundedValue < endValue) {
        onStartChange(roundedValue);
      } else if (activeHandle === 'end' && roundedValue > startValue) {
        onEndChange(roundedValue);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchend', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, activeHandle, min, max, step, startValue, endValue, onStartChange, onEndChange]);

  return (
    <div ref={sliderRef} className="relative h-2">
      {/* Track */}
      <div className="absolute inset-0 bg-gray-200 rounded-lg" />
      
      {/* Selected Range */}
      <div
        className="absolute h-full bg-rose-500 rounded-lg pointer-events-none"
        style={{
          left: `${((startValue - min) / (max - min)) * 100}%`,
          width: `${((endValue - startValue) / (max - min)) * 100}%`
        }}
      />

      {/* Start Handle */}
      <div
        className="absolute w-4 h-4 bg-rose-500 rounded-full -mt-[0.275rem] -ml-2 cursor-grab hover:ring-2 hover:ring-rose-500/20 active:cursor-grabbing touch-none"
        style={{ 
          left: `${((startValue - min) / (max - min)) * 100}%`,
          zIndex: activeHandle === 'start' ? 30 : 20,
          transform: 'translateZ(0)',
          willChange: 'left'
        }}
        onMouseDown={(e) => {
          e.preventDefault();
          setIsDragging(true);
          setActiveHandle('start');
        }}
      />

      {/* End Handle */}
      <div
        className="absolute w-4 h-4 bg-rose-500 rounded-full -mt-[0.275rem] -ml-2 cursor-grab hover:ring-2 hover:ring-rose-500/20 active:cursor-grabbing touch-none"
        style={{ 
          left: `${((endValue - min) / (max - min)) * 100}%`,
          zIndex: activeHandle === 'end' ? 30 : 20,
          transform: 'translateZ(0)',
          willChange: 'left'
        }}
        onMouseDown={(e) => {
          e.preventDefault();
          setIsDragging(true);
          setActiveHandle('end');
        }}
      />
    </div>
  );
}; 