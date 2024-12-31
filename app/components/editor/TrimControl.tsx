'use client';

import { RangeSlider } from '../RangeSlider';
import { useVideo } from '@/context/video-context';

export const TrimControl = () => {
  const {
    duration,
    videoFilters,
    setTrimStart,
    setTrimEnd,
  } = useVideo();

  return (
    <div className="w-full space-y-2">
      <div className="flex justify-between text-sm font-medium">
        <span className="text-gray-600">Trim Duration</span>
        <span className="text-gray-500">{videoFilters.trim.start.toFixed(1)}s - {videoFilters.trim.end.toFixed(1)}s</span>
      </div>
      
      <RangeSlider
        min={0}
        max={duration}
        startValue={videoFilters.trim.start}
        endValue={videoFilters.trim.end}
        onStartChange={setTrimStart}
        onEndChange={setTrimEnd}
      />
    </div>
  );
}; 