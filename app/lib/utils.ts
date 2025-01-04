import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { DRAWING_TOOLS, DrawingFrame, DrawingTool } from '@/types/draw';
import { extractVideoFrames, convertToDrawingFrames } from './video-frames';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);


interface LegacyNavigator extends Navigator {
  webkitGetUserMedia?: (
    constraints: MediaStreamConstraints,
    successCallback: (stream: MediaStream) => void,
    errorCallback: (error: Error) => void
  ) => void;
  mozGetUserMedia?: (
    constraints: MediaStreamConstraints,
    successCallback: (stream: MediaStream) => void,
    errorCallback: (error: Error) => void
  ) => void;
  msGetUserMedia?: (
    constraints: MediaStreamConstraints,
    successCallback: (stream: MediaStream) => void,
    errorCallback: (error: Error) => void
  ) => void;
}


export const getMediaDevices = async (): Promise<MediaDevices> => {
     if ((navigator as unknown as Record<string, unknown>).mediaDevices === undefined) {
        (navigator as unknown as Record<string, unknown>).mediaDevices = {};
      }

      if (navigator.mediaDevices.getUserMedia === undefined) {
        navigator.mediaDevices.getUserMedia = function(constraints: MediaStreamConstraints) {
          const getUserMedia = ((navigator as unknown as LegacyNavigator).webkitGetUserMedia ||
            (navigator as unknown as LegacyNavigator).mozGetUserMedia ||
            (navigator as unknown as LegacyNavigator).msGetUserMedia);

          if (!getUserMedia) {
            return Promise.reject(new Error('getUserMedia is not implemented in this browser'));
          }

          return new Promise((resolve, reject) => {
            getUserMedia.call(navigator, constraints, resolve, reject);
          });
        }
      }
      return navigator.mediaDevices;
}

export const getCameras = async (): Promise<{cameras: MediaDeviceInfo[], deviceIds: string[]}> => {
  const mediaDevices = await getMediaDevices();
  if (!mediaDevices || !mediaDevices.enumerateDevices) {
    return {
      cameras: [],
      deviceIds: []
    };
  }
  const devices = await mediaDevices.enumerateDevices();
  const videoDevices = devices.filter(device => device.kind === 'videoinput');
  return {
    cameras: videoDevices,
    deviceIds: videoDevices.map(device => device.deviceId)
  };
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
  coordinates: {
  x: number;
  y: number;
  width: number;
  height: number;
},
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

export const drawPath = (
  ctx: CanvasRenderingContext2D,
  points: { x: number; y: number }[],
  color: string,
  penSize: number,
  tool: DrawingTool = DRAWING_TOOLS.PEN.id
) => {
  if (!points || points.length < 2) return;

  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = penSize;
  
  switch (tool) {
    case DRAWING_TOOLS.PEN.id:
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(points[0].x, points[0].y);
      
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      break;
    case DRAWING_TOOLS.LINE.id:
      ctx.moveTo(points[0].x, points[0].y);
      ctx.lineTo(points[1].x, points[1].y);
      break;
    case DRAWING_TOOLS.RECTANGLE.id:
      ctx.rect(points[0].x, points[0].y, points[1].x - points[0].x, points[1].y - points[0].y);
      break;
    case DRAWING_TOOLS.CIRCLE.id:
      ctx.arc(points[0].x, points[0].y, Math.sqrt(Math.pow(points[1].x - points[0].x, 2) + Math.pow(points[1].y - points[0].y, 2)), 0, 2 * Math.PI);
      break;
    default:
      break;
  }
  ctx.stroke();
};

export const drawFrameToCanvas = (frame: DrawingFrame, canvas: HTMLCanvasElement) => {
  const ctx = canvas.getContext('2d')!;
  const img = document.createElement('img');
  
  return new Promise<void>((resolve, reject) => {
    img.onload = () => {
      const width = frame.width || img.naturalWidth;
      const height = frame.height || img.naturalHeight;
      
      canvas.width = width;
      canvas.height = height;
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      frame.drawings.forEach(drawing => {
        if (drawing.tool === DRAWING_TOOLS.PEN.id) {
          drawPath(ctx, drawing.points, drawing.color, drawing.penSize);
        } else if (drawing.points.length === 2) {
          ctx.beginPath();
          ctx.strokeStyle = drawing.color;
          ctx.lineWidth = drawing.penSize;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';

          const [start, end] = drawing.points;
          switch (drawing.tool) {
            case DRAWING_TOOLS.LINE.id:
              ctx.moveTo(start.x, start.y);
              ctx.lineTo(end.x, end.y);
              break;
            case DRAWING_TOOLS.RECTANGLE.id:
              const rectWidth = end.x - start.x;
              const rectHeight = end.y - start.y;
              ctx.rect(start.x, start.y, rectWidth, rectHeight);
              break;
            case DRAWING_TOOLS.CIRCLE.id:
              const radius = Math.sqrt(
                Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
              );
              ctx.arc(start.x, start.y, radius, 0, 2 * Math.PI);
              break;
          }
          ctx.stroke();
        }
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
  fps: number = 30,
  startTime?: number,
  endTime?: number,
  onProgress?: (current: number, total: number) => void
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
        count: Math.floor((effectiveEnd - effectiveStart) * fps),
        onProgress: (current, total) => {
          if (onProgress) {
            onProgress(current, total);
          }
        },
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

      resolve(drawingFrames);
    } catch (error) {
      console.error('Error during frame extraction:', error);
      reject(error);
    }
  });
};

export const getSupportedMimeType = (): string => {
  const types = [
    'video/webm;codecs=h264',
    'video/webm',
    'video/mp4',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8',
    'video/webm;codecs=daala',
    'video/mpeg'
  ];

  if (typeof MediaRecorder === 'undefined') {
    console.warn('MediaRecorder is not supported in this browser');
    return types[0];
  }

  const supported = types.find(type => {
    try {
      return MediaRecorder.isTypeSupported(type);
    } catch (e) {
      console.warn(`Error checking support for ${type}:`, e);
      return false;
    }
  });

  if (!supported) {
    console.warn('No supported video MIME types found');
    return types[0];
  }

  return supported;
};

interface VideoFormat {
  format: string;
  codec: string;
}

export const getVideoOutputFormat = (mimeType: string): VideoFormat => {
  if (mimeType.includes('webm')) {
    return {
      format: 'webm',
      codec: mimeType.includes('vp8') ? 'vp8' : 
             mimeType.includes('vp9') ? 'vp9' : 'vp8'
    };
  } else if (mimeType.includes('mp4')) {
    return {
      format: 'mp4',
      codec: 'h264'
    };
  }
  // Default to WebM/VP8 as fallback
  return {
    format: 'webm',
    codec: 'vp8'
  };
};

export const getFFmpegCodecArgs = (codec: string): string[] => {
  switch (codec) {
    case 'vp8':
      return [
        '-c:v', 'vp8',
        '-b:v', '1M',
        '-deadline', 'realtime',
        '-cpu-used', '4'
      ];
    case 'vp9':
      return [
        '-c:v', 'vp9',
        '-b:v', '1M',
        '-deadline', 'realtime',
        '-cpu-used', '4'
      ];
    case 'h264':
      return [
        '-c:v', 'h264',
        '-preset', 'ultrafast',
        '-crf', '23'
      ];
    default:
      return [
        '-c:v', 'vp8',
        '-b:v', '1M',
        '-deadline', 'realtime',
        '-cpu-used', '4'
      ];
  }
}; 

interface VideoConstraints {
  width: MediaTrackConstraints['width'];
  height: MediaTrackConstraints['height'];
  deviceId?: MediaTrackConstraints['deviceId'];
  aspectRatio?: MediaTrackConstraints['aspectRatio'];
  facingMode?: MediaTrackConstraints['facingMode'];
}

export const getOptimalVideoConstraints = async (deviceId: string | null, isLandscape: boolean = true): Promise<VideoConstraints> => {
  const constraints: VideoConstraints = {
    width: isLandscape 
      ? { min: 720, ideal: 1280, max: 1920 }
      : { min: 640, ideal: 1024, max: 1440 },
    height: isLandscape 
      ? { min: 480, ideal: 720, max: 1080 }
      : { min: 480, ideal: 768, max: 1080 },
    aspectRatio: { ideal: isLandscape ? 16/9 : 4/3 },
    facingMode: 'environment',
    ...(deviceId && { deviceId: { exact: deviceId } })
  };

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: constraints });
    const track = stream.getVideoTracks()[0];
    const settings = track.getSettings();
    stream.getTracks().forEach(track => track.stop());

    const baseConstraints = constraints.width as { min: number; ideal: number; max: number };
    const baseHeightConstraints = constraints.height as { min: number; ideal: number; max: number };

    return {
      aspectRatio: constraints.aspectRatio,
      facingMode: constraints.facingMode,
      deviceId: constraints.deviceId,
      width: {
        min: baseConstraints.min,
        max: baseConstraints.max,
        ideal: settings.width || (isLandscape ? 1280 : 1024)
      },
      height: {
        min: baseHeightConstraints.min,
        max: baseHeightConstraints.max,
        ideal: settings.height || (isLandscape ? 720 : 768)
      }
    };
  } catch (error) {
    console.warn('Error getting optimal video constraints:', error);
    return constraints;
  }
}; 