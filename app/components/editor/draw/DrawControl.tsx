'use client';

import { useRef, useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { X, Check } from 'lucide-react';
import { useVideo } from '@/context/video-context';
import { Point, Drawing, DrawingFrame } from '@/types/draw';
import { drawPath,  } from '@/lib/utils';
import FrameGrid from './FrameGrid';


export const DrawControl = () => {
  const { videoBlob, croppedVideoUrl, frames, setFrames, selectedFrame, setSelectedFrame } = useVideo();
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentColor, setCurrentColor] = useState('#FF0000');
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [penSize, setPenSize] = useState(2);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const penTools = [
    { size: 2, name: 'Fine' },
    { size: 4, name: 'Medium' },
    { size: 8, name: 'Thick' },
    { size: 12, name: 'Extra Thick' },
  ];

  // Extract frames from video
  useEffect(() => {
    if (!videoBlob) {
      console.log('No videoBlob available');
      return;
    }

    console.log('Starting frame extraction', { videoBlob, croppedVideoUrl });
    const video = document.createElement('video');
    
    const handleVideoLoad = () => {
      // Wait for metadata and ensure duration is valid
      const waitForValidDuration = () => {
        return new Promise<void>((resolve) => {
          const checkDuration = () => {
            if (video.duration && isFinite(video.duration)) {
              resolve();
            } else if (video.readyState >= 2) {
              // Try seeking to the end to get duration
              video.currentTime = Number.MAX_SAFE_INTEGER;
              setTimeout(checkDuration, 50);
            }
          };
          checkDuration();
        });
      };

      waitForValidDuration()
        .then(() => video.play())
        .then(() => {
          video.pause();
          console.log('Video loaded', { 
            duration: video.duration, 
            width: video.videoWidth, 
            height: video.videoHeight,
            readyState: video.readyState 
          });
          
          const fps = 5; // 5 frames per second
          const frameCount = Math.min(Math.floor(video.duration * fps), 100); // Cap at 100 frames
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d')!;
          
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          
          const newFrames: DrawingFrame[] = [];
          let currentFrame = 0;

          const extractNextFrame = async () => {
            if (currentFrame >= frameCount) {
              video.remove();
              console.log('Frame extraction complete', newFrames.length);
              setFrames(newFrames);
              return;
            }

            return new Promise<void>((resolve) => {
              const timeStamp = (currentFrame * video.duration) / frameCount;
              video.currentTime = timeStamp;

              video.onseeked = () => {
                try {
                  ctx.drawImage(video, 0, 0);
                  
                  newFrames.push({
                    id: currentFrame,
                    imageData: canvas.toDataURL('image/jpeg'),
                    drawings: [],
                    width: video.videoWidth,
                    height: video.videoHeight,
                    timestamp: timeStamp
                  });

                  currentFrame++;
                  resolve();
                } catch (error) {
                  console.error('Error extracting frame:', error);
                  resolve();
                }
              };
            });
          };

          // Extract frames sequentially
          const extractAllFrames = async () => {
            for (let i = 0; i < frameCount; i++) {
              await extractNextFrame();
            }
            video.remove();
            console.log('Frame extraction complete', newFrames);
            setFrames(newFrames);
          };

          extractAllFrames().catch(error => {
            console.error('Error during frame extraction:', error);
            video.remove();
            if (newFrames.length > 0) {
              setFrames(newFrames);
            }
          });
        })
        .catch(error => {
          console.error('Error playing video:', error);
        });
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
    
    setFrames((prev: DrawingFrame[]) => {
      const newFrames = [...prev];
      const currentDrawing: Drawing = {
        points: [...currentPoints],
        color: currentColor,
        penSize: penSize
      };
      
      // Find the index of the frame we want to update
      const frameIndex = newFrames.findIndex((frame) => frame.id === selectedFrame.id);
      if (frameIndex !== -1) {
        // Update the frame at the found index
        newFrames[frameIndex] = {
          ...selectedFrame,
          drawings: [...selectedFrame.drawings, currentDrawing]
        };
      }
      
      return newFrames;
    });
    
    discardDrawing();
  };

  const discardDrawing = () => {
    setCurrentPoints([]);
    setSelectedFrame(null);
  };


  // Draw frame with previous frame's drawings and current drawing
  const drawFrame = (frame: DrawingFrame) => {
    const frameIndex = frames.findIndex((f) => f.id === frame.id);
    
    if (!canvasRef.current || frameIndex === -1) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    const img = document.createElement('img');
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      // Draw previous frame's drawings with reduced opacity
      if (frameIndex > 0) {
        ctx.globalAlpha = 0.3;
        frames[frameIndex-1].drawings.forEach(drawing => {
            drawPath(ctx, drawing.points, drawing.color, drawing.penSize);
        });
        ctx.globalAlpha = 1;
      }

      // Draw current frame's drawings
      frame.drawings.forEach(drawing => {
        drawPath(ctx, drawing.points, drawing.color, drawing.penSize);
      });

      // Draw current temp drawing if exists
      if (currentPoints.length > 0) {
        drawPath(ctx, currentPoints, currentColor, penSize);
      }
    };

    img.src = frames[frameIndex].imageData;
  };


  useEffect(() => {
    if (selectedFrame !== null) {
      drawFrame(selectedFrame);
    }
  }, [selectedFrame, currentPoints]); // Add currentPoints dependency to redraw when it changes

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
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1 space-y-2">
              <div className="text-sm font-medium text-gray-600">
                Frame {selectedFrame.id + 1}
              </div>
              <div className="relative aspect-video bg-black/5 rounded-lg overflow-hidden">
                <canvas
                  ref={canvasRef}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={endDrawing}
                  onMouseLeave={endDrawing}
                  className="w-full h-full cursor-crosshair"
                />
              </div>
            </div>
            <div className="w-24 space-y-2">
              <div className="text-sm font-medium text-gray-600">Tools</div>
              <div className="space-y-2">
                {penTools.map((pen) => (
                  <button
                    key={pen.size}
                    onClick={() => setPenSize(pen.size)}
                    className={`w-full p-2 text-xs rounded-lg transition-all ${
                      penSize === pen.size
                        ? 'bg-rose-500 text-white'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                    }`}
                  >
                    {pen.name}
                  </button>
                ))}
              </div>
            </div>
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
              disabled={currentPoints.length < 2}
            >
              <Check className="h-4 w-4 mr-2" />
              Save
            </Button>
          </div>
        </div>
      ) : (
        <FrameGrid />
          
      )}
    </div>
  );
}; 