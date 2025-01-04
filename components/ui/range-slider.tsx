'use client';

import * as SliderPrimitive from '@radix-ui/react-slider';
import * as React from 'react';
import { cn } from '@/lib/utils';

interface RangeSliderProps extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> {
  min: number;
  max: number;
  step?: number;
  startValue: number;
  endValue: number;
  onStartChange: (value: number) => void;
  onEndChange: (value: number) => void;
}

export const RangeSlider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  RangeSliderProps
>(({
  className,
  min,
  max,
  step = 0.1,
  startValue,
  endValue,
  onStartChange,
  onEndChange,
  ...props
}, ref) => {
  const handleValueChange = (newValue: number[]) => {
    if (newValue[0] !== startValue) {
      onStartChange(newValue[0]);
    }
    if (newValue[1] !== endValue) {
      onEndChange(newValue[1]);
    }
  };

  return (
    <SliderPrimitive.Root
      ref={ref}
      className={cn(
        "relative flex w-full touch-none select-none items-center",
        className
      )}
      min={min}
      max={max}
      step={step}
      value={[startValue, endValue]}
      onValueChange={handleValueChange}
      minStepsBetweenThumbs={1}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-rose-500/10">
        <SliderPrimitive.Range className="absolute h-full bg-rose-500" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb 
        className="block h-4 w-4 rounded-full border-2 border-rose-500 bg-white transition-colors hover:border-rose-600 hover:bg-rose-500 cursor-grab focus:cursor-grabbing focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rose-500 disabled:pointer-events-none disabled:opacity-50"
        aria-label="Start time"
      />
      <SliderPrimitive.Thumb 
        className="block h-4 w-4 rounded-full border-2 border-rose-500 bg-white transition-colors hover:border-rose-600 hover:bg-rose-500 cursor-grab focus:cursor-grabbing focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rose-500 disabled:pointer-events-none disabled:opacity-50"
        aria-label="End time"
      />
    </SliderPrimitive.Root>
  );
});

RangeSlider.displayName = "RangeSlider"; 