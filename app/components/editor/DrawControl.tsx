'use client';

import { useRef, useState, useEffect } from 'react';
import { Button } from "../ui/button";
import { X, Check } from 'lucide-react';
import { useVideo } from '@/context/video-context';

interface DrawingFrame {
  imageData: string;
  drawings: Path2D[];
  color: string;
}

export const DrawControl = () => {
  const { videoBlob, croppedVideoUrl } = useVideo();
  const [frames, setFrames] = useState<DrawingFrame[]>([]);
  const [selectedFrame, setSelectedFrame] = useState<number | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentColor, setCurrentColor] = useState('#FF0000');
  const [tempDrawing, setTempDrawing] = useState<Path2D | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const currentPath = useRef<Path2D | null>(null);

  // Extract frames from video
  useEffect(() => {
    if (!videoBlob) return;

    const video = document.createElement('video');
    video.src = croppedVideoUrl || URL.createObjectURL(videoBlob);
    
    video.onloadedmetadata = () => {
      const frameCount = Math.floor(video.duration * 5); // 5 frames per second
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      
      video.currentTime = 0;
      let currentFrame = 0;
      const newFrames: DrawingFrame[] = [];

      const extractFrame = () => {
        if (currentFrame >= frameCount) {
          video.remove();
          setFrames(newFrames);
          return;
        }

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        
        newFrames.push({
          imageData: canvas.toDataURL('image/jpeg'),
          drawings: [],
          color: '#FF0000'
        });

        currentFrame++;
        video.currentTime = currentFrame / 5;
      };

      video.onseeked = extractFrame;
      extractFrame();
    };

    video.load();
  }, [videoBlob, croppedVideoUrl]);

  // Handle drawing
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || selectedFrame === null) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setIsDrawing(true);
    currentPath.current = new Path2D();
    currentPath.current.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentPath.current || !canvasRef.current || selectedFrame === null) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    currentPath.current.lineTo(x, y);
    
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw current frame
    drawFrame(selectedFrame);
    
    // Draw current path
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = 2;
    ctx.stroke(currentPath.current);
    setTempDrawing(currentPath.current);
  };

  const endDrawing = () => {
    if (!isDrawing || !currentPath.current || selectedFrame === null) return;
    setIsDrawing(false);
    currentPath.current = null;
  };

  const saveDrawing = () => {
    if (selectedFrame === null || !tempDrawing) return;
    
    setFrames(prev => {
      const newFrames = [...prev];
      newFrames[selectedFrame] = {
        ...newFrames[selectedFrame],
        drawings: [...newFrames[selectedFrame].drawings, tempDrawing],
        color: currentColor
      };
      return newFrames;
    });
    
    setTempDrawing(null);
    setSelectedFrame(null);
  };

  const discardDrawing = () => {
    setTempDrawing(null);
    setSelectedFrame(null);
  };

  // Draw frame with previous frame's drawings
  const drawFrame = (frameIndex: number) => {
    if (!canvasRef.current || !frames[frameIndex]) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      // Draw previous frame's drawings with reduced opacity
      if (frameIndex > 0) {
        ctx.globalAlpha = 0.3;
        frames[frameIndex - 1].drawings.forEach(path => {
          ctx.strokeStyle = frames[frameIndex - 1].color;
          ctx.lineWidth = 2;
          ctx.stroke(path);
        });
        ctx.globalAlpha = 1;
      }

      // Draw current frame's drawings
      frames[frameIndex].drawings.forEach(path => {
        ctx.strokeStyle = frames[frameIndex].color;
        ctx.lineWidth = 2;
        ctx.stroke(path);
      });

      // Draw temp drawing if exists
      if (tempDrawing) {
        ctx.strokeStyle = currentColor;
        ctx.lineWidth = 2;
        ctx.stroke(tempDrawing);
      }
    };

    img.src = frames[frameIndex].imageData;
  };

  useEffect(() => {
    if (selectedFrame !== null) {
      drawFrame(selectedFrame);
    }
  }, [selectedFrame, frames, tempDrawing]);

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-white/50">
      <div className="flex justify-between items-center text-sm font-medium">
        <span>Draw on Frames</span>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={currentColor}
            onChange={(e) => setCurrentColor(e.target.value)}
            className="w-8 h-8 rounded cursor-pointer"
          />
        </div>
      </div>

      {selectedFrame !== null ? (
        <>
          <div className="relative aspect-video bg-black/5 rounded-lg overflow-hidden">
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={endDrawing}
              onMouseLeave={endDrawing}
              className="w-full h-full"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              onClick={discardDrawing}
              variant="outline"
              size="sm"
              className="text-gray-600"
            >
              <X className="h-4 w-4 mr-2" />
              Discard
            </Button>
            <Button
              onClick={saveDrawing}
              variant="default"
              size="sm"
              className="bg-rose-500 hover:bg-rose-600"
              disabled={!tempDrawing}
            >
              <Check className="h-4 w-4 mr-2" />
              Save
            </Button>
          </div>
        </>
      ) : (
        <div className="grid grid-cols-6 gap-2">
          {frames.map((frame, index) => (
            <div
              key={index}
              onClick={() => setSelectedFrame(index)}
              className="aspect-video bg-black/5 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-rose-500 transition-all"
            >
              <img
                src={frame.imageData}
                alt={`Frame ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}; 