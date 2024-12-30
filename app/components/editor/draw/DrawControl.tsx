'use client';

import { useRef, useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { X, Check } from 'lucide-react';
import { useVideo } from '@/context/video-context';
import { Point, Drawing } from './types';
import { extractFramesFromVideo } from './utils';
import { DrawTools } from './DrawTools';
import { FrameGrid } from './FrameGrid';

export const DrawControl = () => {
  const { videoBlob, croppedVideoUrl, frames, setFrames } = useVideo();
  const [selectedFrame, setSelectedFrame] = useState<number | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentColor, setCurrentColor] = useState('#FF0000');
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [penSize, setPenSize] = useState(2);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Extract frames from video
  useEffect(() => {
    if (!videoBlob) {
      console.log('No videoBlob available');
      return;
    }

    console.log('Starting frame extraction', { videoBlob, croppedVideoUrl });
    const video = document.createElement('video');
    
    const handleVideoLoad = async () => {
      try {
        await video.play();
        video.pause();
        
        if (!video.duration || !isFinite(video.duration)) {
          console.error('Invalid video duration');
          return;
        }

        const newFrames = await extractFramesFromVideo(video);
        setFrames(newFrames);
      } catch (error) {
        console.error('Error processing video:', error);
      } finally {
        video.remove();
      }
    };

    video.preload = "auto";
    video.muted = true;
    video.onloadeddata = handleVideoLoad;
    video.onerror = (error) => {
      console.error('Error loading video:', error);
    };
    
    video.src = croppedVideoUrl || URL.createObjectURL(videoBlob);
    video.load();

    return () => {
      video.remove();
    };
  }, [videoBlob, croppedVideoUrl, setFrames]);

  // Handle drawing
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || selectedFrame === null) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    setIsDrawing(true);
    setCurrentPoints([{ x, y }]);

    // Start new path
    const ctx = canvas.getContext('2d')!;
    ctx.beginPath();
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = penSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current || selectedFrame === null) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    setCurrentPoints(prev => [...prev, { x, y }]);
    
    // Draw the line segment directly
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const endDrawing = () => {
    if (!isDrawing || selectedFrame === null) return;
    setIsDrawing(false);
  };

  const saveDrawing = () => {
    if (selectedFrame === null || currentPoints.length < 2) return;
    
    setFrames(prev => {
      const newFrames = [...prev];
      const currentDrawing: Drawing = {
        points: [...currentPoints],
        color: currentColor,
        penSize: penSize
      };
      
      newFrames[selectedFrame] = {
        ...newFrames[selectedFrame],
        drawings: [...newFrames[selectedFrame].drawings, currentDrawing]
      };
      
      return newFrames;
    });
    
    setCurrentPoints([]);
    setSelectedFrame(null);
  };

  const discardDrawing = () => {
    setCurrentPoints([]);
    setSelectedFrame(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-4 gap-4">
        {frames.map((frame, index) => (
          <FrameGrid
            key={index}
            frame={frame}
            index={index}
            isSelected={selectedFrame === index}
            onSelect={setSelectedFrame}
          />
        ))}
      </div>

      {selectedFrame !== null && (
        <div className="flex gap-4">
          <div className="flex-1">
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={endDrawing}
              onMouseLeave={endDrawing}
              className="w-full h-auto border border-gray-200"
            />
          </div>
          <div className="w-64">
            <DrawTools
              currentColor={currentColor}
              setCurrentColor={setCurrentColor}
              penSize={penSize}
              setPenSize={setPenSize}
            />
            <div className="flex gap-2 mt-4">
              <Button onClick={saveDrawing} className="flex-1">
                <Check className="w-4 h-4 mr-2" />
                Save
              </Button>
              <Button onClick={discardDrawing} variant="destructive" className="flex-1">
                <X className="w-4 h-4 mr-2" />
                Discard
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 