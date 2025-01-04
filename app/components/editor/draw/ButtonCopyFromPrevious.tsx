import { Button } from "@/components/ui/button";
import { useVideo } from '@/context/video-context';
import { useDraw } from '@/context/draw-context';
import { CopyPlusIcon } from "lucide-react";
import { DrawingFrame } from "@/types/draw";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";


const getPreviousFrame = (frames: DrawingFrame[], selectedFrame: DrawingFrame | null) => {
    if (!selectedFrame || frames.length === 0) return null;
    const currentIndex = frames.findIndex(f => f.id === selectedFrame?.id);
    if (currentIndex <= 0) return null;
    return frames[currentIndex - 1] || null;
}


export function DrawCopyFromPreviousButton() {
  const { frames, selectedFrame } = useVideo();
  const { copyFromPrevious } = useDraw();
  const previousFrame = getPreviousFrame(frames, selectedFrame);
  const isDisabled = !previousFrame || !selectedFrame || !previousFrame.drawings.length;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          onClick={copyFromPrevious}
          variant="ghost"
          size="sm"
          disabled={isDisabled}
        >
          <CopyPlusIcon className="h-2 w-2 md:h-4 md:w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        Copy drawings from previous frame
      </TooltipContent>
    </Tooltip>
  );
} 