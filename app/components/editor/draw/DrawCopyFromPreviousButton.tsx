import { Button } from "@/components/ui/button";
import { CopyPlusIcon } from "lucide-react";
import { Drawing, DrawingFrame } from "@/types/draw";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

interface DrawCopyFromPreviousButtonProps {
  frames: DrawingFrame[];
  selectedFrame: DrawingFrame | null;
  drawingHistory: Drawing[][];
  setDrawingHistory: (history: Drawing[][]) => void;
  setRedoHistory: (history: Drawing[][]) => void;
  setCurrentPoints: (points: Drawing[] | ((prev: Drawing[]) => Drawing[])) => void;
}

const getPreviousFrame = (frames: DrawingFrame[], selectedFrame: DrawingFrame | null) => {
    if (!selectedFrame || frames.length === 0) return null;
    const currentIndex = frames.findIndex(f => f.id === selectedFrame?.id);
    if (currentIndex <= 0) return null;
    return frames[currentIndex - 1] || null;
}

export function DrawCopyFromPreviousButton({
  frames,
  selectedFrame,
  drawingHistory,
  setDrawingHistory,
  setRedoHistory,
  setCurrentPoints
}: DrawCopyFromPreviousButtonProps) {
    const previousFrame = getPreviousFrame(frames, selectedFrame);
    const isDisabled = !previousFrame || !selectedFrame || !previousFrame.drawings.length;

  const copyFromPrevious = () => {
    if (isDisabled) return; 

    const newHistory = [...drawingHistory];
    previousFrame.drawings.forEach(drawing => {
      newHistory.push([drawing]);
      setCurrentPoints(prev => [...prev, drawing]);
    });
    
    setDrawingHistory(newHistory);
    setRedoHistory([]);
  };


  return (
     <Tooltip>
        <TooltipTrigger>
            <Button
                onClick={copyFromPrevious}
                variant="ghost"
                size="sm"
                disabled={isDisabled}
            >
                <CopyPlusIcon className="h-3 w-3" />
            </Button>
        </TooltipTrigger>
        <TooltipContent>
            Copy drawings from previous frame
        </TooltipContent>
    </Tooltip>
    
  );
} 