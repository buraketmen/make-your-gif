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
    <div className="space-y-4 p-4 border rounded-lg bg-white/50">
      <div className="flex justify-between text-sm font-medium">
        <span>Trim Duration</span>
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