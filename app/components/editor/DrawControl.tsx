'use client';

import { useRef, useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { X, Check } from 'lucide-react';
import { useVideo } from '@/context/video-context';

interface Point {
  x: number;
  y: number;
}

interface Drawing {
  points: Point[];
  color: string;
  penSize: number;
}

interface DrawingFrame {
  imageData: string;
  drawings: Drawing[];
  width: number;
  height: number;
}

export const DrawControl = () => {
  const { videoBlob, croppedVideoUrl, frames, setFrames } = useVideo();
  const [selectedFrame, setSelectedFrame] = useState<number | null>(null);
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
      video.play().then(() => {
        video.pause();
        console.log('Video loaded', { duration: video.duration, width: video.videoWidth, height: video.videoHeight });
        
        if (!video.duration || !isFinite(video.duration)) {
          console.error('Invalid video duration');
          return;
        }

        const fps = 5; // 5 frames per second
        const frameCount = Math.min(Math.floor(video.duration * fps), 100); // Cap at 100 frames
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        
        video.currentTime = 0;
        let currentFrame = 0;
        const newFrames: DrawingFrame[] = [];

        const extractFrame = () => {
          if (currentFrame >= frameCount) {
            video.remove();
            console.log('Frame extraction complete', newFrames.length);
            setFrames(newFrames);
            return;
          }

          try {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0);
            
            newFrames.push({
              imageData: canvas.toDataURL('image/jpeg'),
              drawings: [],
              width: video.videoWidth,
              height: video.videoHeight
            });

            currentFrame++;
            video.currentTime = (currentFrame * video.duration) / frameCount;
          } catch (error) {
            console.error('Error extracting frame:', error);
            video.remove();
            setFrames(newFrames);
          }
        };

        video.onseeked = extractFrame;
        extractFrame();
      }).catch(error => {
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
      
      // Create a new array with all existing drawings plus the new one
      const updatedDrawings = [...newFrames[selectedFrame].drawings, currentDrawing];
      
      newFrames[selectedFrame] = {
        ...newFrames[selectedFrame],
        drawings: updatedDrawings
      };
      
      return newFrames;
    });
    
    // Clear current points and close the frame
    setCurrentPoints([]);
    setSelectedFrame(null);
  };

  const discardDrawing = () => {
    setCurrentPoints([]);
    setSelectedFrame(null);
  };

  const drawPath = (ctx: CanvasRenderingContext2D, points: Point[], color: string, size: number) => {
    if (points.length < 2) return;
    
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();
  };

  // Function to draw frame with its drawings
  const drawFrameToCanvas = (frame: DrawingFrame, canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d')!;
    const img = document.createElement('img');
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      // Draw all drawings for this frame
      frame.drawings.forEach(drawing => {
        drawPath(ctx, drawing.points, drawing.color, drawing.penSize);
      });
    };

    img.src = frame.imageData;
  };

  // Draw frame with previous frame's drawings and current drawing
  const drawFrame = (frameIndex: number) => {
    if (!canvasRef.current || !frames[frameIndex]) return;

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
        frames[frameIndex - 1].drawings.forEach(drawing => {
          drawPath(ctx, drawing.points, drawing.color, drawing.penSize);
        });
        ctx.globalAlpha = 1;
      }

      // Draw current frame's drawings
      frames[frameIndex].drawings.forEach(drawing => {
        drawPath(ctx, drawing.points, drawing.color, drawing.penSize);
      });

      // Draw current temp drawing if exists
      if (currentPoints.length > 0) {
        drawPath(ctx, currentPoints, currentColor, penSize);
      }
    };

    img.src = frames[frameIndex].imageData;
  };

  // Grid frame component
  const GridFrame = ({ frame, index }: { frame: DrawingFrame; index: number }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
      if (canvasRef.current) {
        drawFrameToCanvas(frame, canvasRef.current);
      }
    }, [frame]);

    return (
      <div className="space-y-1">
        <div
          onClick={() => setSelectedFrame(index)}
          className="relative aspect-video bg-black/5 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-rose-500 transition-all"
        >
          <canvas
            ref={canvasRef}
            className="w-full h-full"
          />
        </div>
        <div className="text-xs text-center text-gray-600 font-medium">
          Frame {index + 1}
        </div>
      </div>
    );
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
                Frame {selectedFrame + 1}
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
        <div className="grid grid-cols-4 gap-4">
          {frames.map((frame, index) => (
            <GridFrame key={index} frame={frame} index={index} />
          ))}
        </div>
      )}
    </div>
  );
}; 