'use client';

import { Button } from "@/components/ui/button";
import { VideoEditor } from './VideoEditor';
import { useVideo } from "@/context/video-context";

export const EditorSection = () => {
    const { mode, handleBack } = useVideo();

  return (
    <div className="h-full">
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-gray-900">Editor</h2>
        <Button
          onClick={handleBack}
          variant="outline"
          size="sm"
          className="text-rose-500 hover:text-rose-600"
        >
          Back to {mode === 'record' ? 'Recording' : 'Upload'}
        </Button>
      </div>
      
      <VideoEditor />
    </div>
  );
}; 