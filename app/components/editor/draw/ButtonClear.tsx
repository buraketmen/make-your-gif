'use client';

import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useVideo } from '@/context/video-context';
import { useDraw } from '@/context/draw-context';
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

export function DrawClearButton() {
  const { selectedFrame } = useVideo();
  const { currentPoints, clearDrawings } = useDraw();

  if (!selectedFrame) return null;

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
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
          <AlertDialogAction onClick={clearDrawings} className="bg-rose-500 hover:bg-rose-600">
            Clear All
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
