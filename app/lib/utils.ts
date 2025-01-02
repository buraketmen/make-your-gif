import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { Point, DrawingFrame } from '@/types/draw';
import { extractVideoFrames, convertToDrawingFrames } from './video-frames';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface CropCoordinates {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CropDimensions {
  pixels: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  ffmpegFilter: string;
  relativeFilter: string;
}

export const calculateCropDimensions = (
  coordinates: CropCoordinates,
  videoWidth: number,
  videoHeight: number
): CropDimensions => {
  const cropX = Math.round((coordinates.x / 100) * videoWidth);
  const cropY = Math.round((coordinates.y / 100) * videoHeight);
  const cropWidth = Math.round((coordinates.width / 100) * videoWidth);
  const cropHeight = Math.round((coordinates.height / 100) * videoHeight);

  return {
    pixels: {
      x: cropX,
      y: cropY,
      width: cropWidth,
      height: cropHeight
    },
    ffmpegFilter: `crop=${cropWidth}:${cropHeight}:${cropX}:${cropY}`,
    relativeFilter: `crop=iw*${coordinates.width/100}:ih*${coordinates.height/100}:iw*${coordinates.x/100}:ih*${coordinates.y/100}`
  };
};

export const drawPath = (ctx: CanvasRenderingContext2D, points: Point[], color: string, size: number) => { 
    if (!points || points.length < 2) return;
  
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

export const drawFrameToCanvas = (frame: DrawingFrame, canvas: HTMLCanvasElement) => {
  const ctx = canvas.getContext('2d')!;
  const img = document.createElement('img');
  
  return new Promise<void>((resolve, reject) => {
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      frame.drawings.forEach(drawing => {
        drawPath(ctx, drawing.points, drawing.color, drawing.penSize);
      });

      resolve();
    };

    img.onerror = () => {
      reject(new Error('Failed to load frame image'));
    };

    img.src = frame.imageData;
  });
};


export const extractFramesFromVideo = (
  video: HTMLVideoElement,
  fps: number = 24,
  maxFrames: number = 100,
  startTime?: number,
  endTime?: number
): Promise<DrawingFrame[]> => {
  return new Promise(async (resolve, reject) => {
    try {
      const effectiveStart = startTime ?? 0;
      const effectiveEnd = endTime ?? video.duration;
      
      const videoFrames = await extractVideoFrames({
        video,
        format: 'image/jpeg',
        quality: 1,
        startTime: effectiveStart,
        endTime: effectiveEnd,
        count: Math.min(Math.floor((effectiveEnd - effectiveStart) * fps), maxFrames),
        onProgress: (current, total) => {
          console.log(`Captured frame ${current}/${total} at ${video.currentTime.toFixed(2)}s`);
        }
      });

      const drawingFrames = convertToDrawingFrames(videoFrames);
      
      if (drawingFrames.length > 0) {
        const img = document.createElement('img');
        await new Promise<void>((resolve, reject) => {
          img.onload = () => {
            drawingFrames.forEach(frame => {
              frame.width = img.width;
              frame.height = img.height;
            });
            resolve();
          };
          img.onerror = () => reject(new Error('Failed to load frame image'));
          img.src = drawingFrames[0].imageData;
        });
      }

      console.log(`Frame extraction complete. Captured ${drawingFrames.length} frames.`);
      resolve(drawingFrames);
    } catch (error) {
      console.error('Error during frame extraction:', error);
      reject(error);
    }
  });
}; 