import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { Point, DrawingFrame } from '@/types/draw';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const drawPath = (ctx: CanvasRenderingContext2D, points: Point[], color: string, size: number) => { 
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

export const drawFrameToCanvas = (frame: DrawingFrame, canvas: HTMLCanvasElement) => {
  const ctx = canvas.getContext('2d')!;
  const img = document.createElement('img');
  
  return new Promise<void>((resolve, reject) => {
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      // Draw all drawings for this frame
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
  fps: number = 5,
  maxFrames: number = 100
): Promise<DrawingFrame[]> => {
  return new Promise((resolve, reject) => {
    if (!video.videoWidth || !video.videoHeight) {
      reject(new Error('Video dimensions not available'));
      return;
    }

    const frameCount = Math.min(Math.floor(video.duration * fps), maxFrames);
    if (!frameCount || frameCount <= 0) {
      reject(new Error('Invalid frame count'));
      return;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Failed to get canvas context'));
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const frames: DrawingFrame[] = [];
    let currentFrame = 0;
    let lastTime = -1;

    const extractFrame = async () => {
      if (currentFrame >= frameCount) {
        if (frames.length === 0) {
          reject(new Error('No frames were extracted'));
        } else {
          resolve(frames);
        }
        return;
      }

      try {
        // Calculate the target time for this frame
        const targetTime = (currentFrame * video.duration) / frameCount;
        
        // If we're at the same time as before, add a small delay and try again
        if (video.currentTime === lastTime) {
          await delay(50);
          video.currentTime = targetTime;
          return;
        }

        lastTime = video.currentTime;
        
        // Draw the frame
        ctx.drawImage(video, 0, 0);
        
        // Convert to base64 and create frame object
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        frames.push({
          id: currentFrame,
          imageData,
          drawings: [],
          width: video.videoWidth,
          height: video.videoHeight
        });

        currentFrame++;
        
        // Set the next frame time
        if (currentFrame < frameCount) {
          video.currentTime = (currentFrame * video.duration) / frameCount;
        }
      } catch (error) {
        console.error('Error extracting frame:', error);
        // If we have some frames, resolve with what we have
        if (frames.length > 0) {
          resolve(frames);
        } else {
          reject(error);
        }
      }
    };

    video.onseeked = extractFrame;
    video.onerror = (error) => {
      console.error('Video error during frame extraction:', error);
      if (frames.length > 0) {
        resolve(frames);
      } else {
        reject(new Error('Video error during frame extraction'));
      }
    };

    // Start extraction
    video.currentTime = 0;
  });
}; 