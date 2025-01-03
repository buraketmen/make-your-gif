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
  const dragStartX = useRef<number>(0);
  const dragStartValue = useRef<number>(0);

  const calculateValue = (clientX: number) => {
    if (!sliderRef.current) return 0;
    
    const rect = sliderRef.current.getBoundingClientRect();
    const width = rect.width;
    const offset = clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, offset / width));
    const rawValue = min + (max - min) * percentage;
    return Math.round(rawValue / step) * step;
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !activeHandle || !sliderRef.current) return;

      const currentValue = calculateValue(e.clientX);
      const deltaX = e.clientX - dragStartX.current;
      const deltaPercentage = deltaX / sliderRef.current.getBoundingClientRect().width;
      const deltaValue = (max - min) * deltaPercentage;
      const newValue = Math.max(min, Math.min(max, dragStartValue.current + deltaValue));
      const roundedValue = Math.round(newValue / step) * step;

      if (activeHandle === 'start' && roundedValue < endValue) {
        onStartChange(roundedValue);
      } else if (activeHandle === 'end' && roundedValue > startValue) {
        onEndChange(roundedValue);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setActiveHandle(null);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, activeHandle, min, max, step, startValue, endValue, onStartChange, onEndChange]);

  const handleMouseDown = (handle: 'start' | 'end', e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setActiveHandle(handle);
    dragStartX.current = e.clientX;
    dragStartValue.current = handle === 'start' ? startValue : endValue;
  };

  return (
    <div ref={sliderRef} className="relative h-2">
      <div className="absolute inset-0 bg-gray-200 rounded-lg" />
      
      <div
        className="absolute h-full bg-rose-500 rounded-lg pointer-events-none"
        style={{
          left: `${((startValue - min) / (max - min)) * 100}%`,
          width: `${((endValue - startValue) / (max - min)) * 100}%`
        }}
      />

      <div
        className="absolute w-4 h-4 bg-rose-500 rounded-full -mt-[0.275rem] -ml-2 cursor-grab hover:ring-2 hover:ring-rose-500/20 active:cursor-grabbing touch-none"
        style={{ 
          left: `${((startValue - min) / (max - min)) * 100}%`,
          zIndex: activeHandle === 'start' ? 30 : 20,
          transform: 'translateZ(0)',
          willChange: 'left'
        }}
        onMouseDown={(e) => handleMouseDown('start', e)}
      />

      <div
        className="absolute w-4 h-4 bg-rose-500 rounded-full -mt-[0.275rem] -ml-2 cursor-grab hover:ring-2 hover:ring-rose-500/20 active:cursor-grabbing touch-none"
        style={{ 
          left: `${((endValue - min) / (max - min)) * 100}%`,
          zIndex: activeHandle === 'end' ? 30 : 20,
          transform: 'translateZ(0)',
          willChange: 'left'
        }}
        onMouseDown={(e) => handleMouseDown('end', e)}
      />
    </div>
  );
}; 