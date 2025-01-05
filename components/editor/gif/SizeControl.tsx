import { Slider } from "@/components/ui/slider";
import { useVideo } from "@/context/video-context";
import { useState, useEffect } from "react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

const sizeLabels: Record<number, string> = {
  240: 'Extra Small',
  320: 'Small',
  400: 'Medium',
  480: 'Large',
  560: 'Extra Large',
  640: '2X Large',
  720: '3X Large',
};
const getSizeLabel = (size: number) => {
  return sizeLabels[size];
};

const SizeControl = () => {
  const { gifSize, setGifSize, processes } = useVideo();
  const [localSize, setLocalSize] = useState(gifSize);

  useEffect(() => {
    setLocalSize(gifSize);
  }, [gifSize]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (localSize !== gifSize) {
        setGifSize(localSize);
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [localSize, gifSize, setGifSize]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Size</span>
          <div className="flex items-center gap-2">
            {localSize !== gifSize && (
              <span className="text-xs text-rose-500 animate-pulse">•</span>
            )}
            <Tooltip>
            <TooltipTrigger>
            <span className={`text-sm text-gray-500 ${processes.isGeneratingGif ? 'animate-pulse' : ''}`}>
              {getSizeLabel(localSize)}
            </span>
            </TooltipTrigger>
            <TooltipContent>
                {localSize}px
            </TooltipContent>
            </Tooltip>
          </div>
        </div>
        <Slider
          value={[localSize]}
          onValueChange={([value]) => setLocalSize(value)}
          min={240}
          max={720}
          step={80}
          className="w-full"
          disabled={processes.isGeneratingGif}
        />
        <p className="text-xs text-gray-400 text-justify">
          Adjust the width. Height will scale proportionally.
          Smaller sizes result in smaller file sizes.
        </p>
      </div>
    </div>
  );
}; 

export default SizeControl;