import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { Drawing, DrawingFrame } from "@/types/draw";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface DrawClearButtonProps {
  selectedFrame: DrawingFrame;
  currentPoints: Drawing[];
  onClear: () => void;
}

export function DrawClearButton({ selectedFrame, currentPoints, onClear }: DrawClearButtonProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="text-rose-500 gap-2"
          disabled={selectedFrame.drawings.length === 0 && currentPoints.length === 0}
        >
          <Trash2 className="h-4 w-4" />
          Clear
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Clear all drawings?</AlertDialogTitle>
          <AlertDialogDescription>
            This will remove all drawings from this frame. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onClear} className="bg-rose-500 hover:bg-rose-600">
            Clear All
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
