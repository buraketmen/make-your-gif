import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { DRAWING_TOOLS, DrawingFrame, DrawingTool } from '@/types/draw';
import { extractVideoFrames, convertToDrawingFrames } from './video-frames';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

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
    navigator.mediaDevices.getUserMedia = function (constraints: MediaStreamConstraints) {
      const getUserMedia =
        (navigator as unknown as LegacyNavigator).webkitGetUserMedia ||
        (navigator as unknown as LegacyNavigator).mozGetUserMedia ||
        (navigator as unknown as LegacyNavigator).msGetUserMedia;

      if (!getUserMedia) {
        return Promise.reject(new Error('getUserMedia is not implemented in this browser'));
      }

      return new Promise((resolve, reject) => {
        getUserMedia.call(navigator, constraints, resolve, reject);
      });
    };
  }
  return navigator.mediaDevices;
};

export const getCameras = async (): Promise<{
  cameras: MediaDeviceInfo[];
  deviceIds: string[];
}> => {
  const mediaDevices = await getMediaDevices();
  if (!mediaDevices || !mediaDevices.enumerateDevices) {
    return {
      cameras: [],
      deviceIds: [],
    };
  }
  await mediaDevices.getUserMedia({ video: true });
  const devices = await mediaDevices.enumerateDevices();
  const videoDevices = devices.filter((device) => device.kind === 'videoinput');
  return {
    cameras: videoDevices,
    deviceIds: videoDevices.map((device) => device.deviceId),
  };
};

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
      height: cropHeight,
    },
    ffmpegFilter: `crop=${cropWidth}:${cropHeight}:${cropX}:${cropY}`,
    relativeFilter: `crop=iw*${coordinates.width / 100}:ih*${coordinates.height / 100}:iw*${coordinates.x / 100}:ih*${coordinates.y / 100}`,
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
      ctx.arc(
        points[0].x,
        points[0].y,
        Math.sqrt(Math.pow(points[1].x - points[0].x, 2) + Math.pow(points[1].y - points[0].y, 2)),
        0,
        2 * Math.PI
      );
      break;
    default:
      break;
  }
  ctx.stroke();
};

export const drawFrameToCanvas = (frame: DrawingFrame, canvas: HTMLCanvasElement) => {
  const ctx = canvas.getContext('2d', {
    alpha: false,
    desynchronized: true,
    willReadFrequently: false,
  })!;

  const img = new Image();
  img.decoding = 'async';

  return new Promise<void>((resolve, reject) => {
    img.onload = () => {
      const width = frame.width || img.naturalWidth;
      const height = frame.height || img.naturalHeight;

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.globalCompositeOperation = 'copy';
      ctx.drawImage(img, 0, 0, width, height);
      ctx.globalCompositeOperation = 'source-over';

      if (frame.drawings.length > 0) {
        const hasComplexDrawings = frame.drawings.some(
          (d) => d.tool !== DRAWING_TOOLS.PEN.id && d.points.length === 2
        );

        if (hasComplexDrawings) {
          frame.drawings.forEach((drawing) => {
            ctx.beginPath();
            ctx.strokeStyle = drawing.color;
            ctx.lineWidth = drawing.penSize;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            if (drawing.tool === DRAWING_TOOLS.PEN.id) {
              if (drawing.points.length >= 2) {
                ctx.moveTo(drawing.points[0].x, drawing.points[0].y);
                for (let i = 1; i < drawing.points.length; i++) {
                  ctx.lineTo(drawing.points[i].x, drawing.points[i].y);
                }
              }
            } else if (drawing.points.length === 2) {
              const [start, end] = drawing.points;
              switch (drawing.tool) {
                case DRAWING_TOOLS.LINE.id:
                  ctx.moveTo(start.x, start.y);
                  ctx.lineTo(end.x, end.y);
                  break;
                case DRAWING_TOOLS.RECTANGLE.id:
                  ctx.rect(start.x, start.y, end.x - start.x, end.y - start.y);
                  break;
                case DRAWING_TOOLS.CIRCLE.id:
                  const radius = Math.hypot(end.x - start.x, end.y - start.y);
                  ctx.arc(start.x, start.y, radius, 0, 2 * Math.PI);
                  break;
              }
            }
            ctx.stroke();
          });
        } else {
          ctx.beginPath();
          let currentColor = '';
          let currentSize = 0;

          frame.drawings.forEach((drawing) => {
            if (drawing.color !== currentColor || drawing.penSize !== currentSize) {
              if (currentColor) ctx.stroke();
              ctx.beginPath();
              ctx.strokeStyle = drawing.color;
              ctx.lineWidth = drawing.penSize;
              currentColor = drawing.color;
              currentSize = drawing.penSize;
            }

            if (drawing.points.length >= 2) {
              ctx.moveTo(drawing.points[0].x, drawing.points[0].y);
              for (let i = 1; i < drawing.points.length; i++) {
                ctx.lineTo(drawing.points[i].x, drawing.points[i].y);
              }
            }
          });
          if (currentColor) ctx.stroke();
        }
      }

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

      const canvas = document.createElement('canvas');
      canvas.getContext('2d', {
        alpha: false,
        desynchronized: true,
        willReadFrequently: false,
      })!;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Pre-allocate arrays for better memory management
      const frameCount = Math.floor((effectiveEnd - effectiveStart) * fps);
      const videoFrames = await extractVideoFrames({
        video,
        format: 'image/png',
        quality: 1,
        startTime: effectiveStart,
        endTime: effectiveEnd,
        count: frameCount,
        onProgress,
      });

      const drawingFrames = convertToDrawingFrames(videoFrames);

      if (drawingFrames.length > 0) {
        const img = new Image();
        img.decoding = 'async';

        await new Promise<void>((resolve, reject) => {
          img.onload = () => {
            const width = img.width;
            const height = img.height;
            drawingFrames.forEach((frame) => {
              frame.width = width;
              frame.height = height;
            });
            resolve();
          };
          img.onerror = () => reject(new Error('Failed to load frame image'));
          img.src = drawingFrames[0].imageData;
        });
      }

      canvas.width = 0;
      canvas.height = 0;

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
    'video/mpeg',
  ];

  if (typeof MediaRecorder === 'undefined') {
    console.warn('MediaRecorder is not supported in this browser');
    return types[0];
  }

  const supported = types.find((type) => {
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
      codec: mimeType.includes('vp8') ? 'vp8' : mimeType.includes('vp9') ? 'vp9' : 'vp8',
    };
  } else if (mimeType.includes('mp4')) {
    return {
      format: 'mp4',
      codec: 'h264',
    };
  }
  return {
    format: 'webm',
    codec: 'vp8',
  };
};

export const getFFmpegCodecArgs = (codec: string): string[] => {
  switch (codec) {
    case 'vp8':
      return ['-c:v', 'vp8', '-b:v', '1M', '-deadline', 'realtime', '-cpu-used', '0'];
    case 'vp9':
      return ['-c:v', 'vp9', '-b:v', '1M', '-deadline', 'realtime', '-cpu-used', '0'];
    case 'h264':
      return ['-c:v', 'h264', '-deadline', 'realtime', '-crf', '23', '-threads', '0'];
    default:
      return ['-c:v', 'vp8', '-b:v', '1M', '-deadline', 'realtime', '-cpu-used', '0'];
  }
};

interface VideoConstraints {
  width?: MediaTrackConstraints['width'];
  height?: MediaTrackConstraints['height'];
  frameRate: MediaTrackConstraints['frameRate'];
  deviceId?: MediaTrackConstraints['deviceId'];
  aspectRatio: MediaTrackConstraints['aspectRatio'];
  facingMode?: MediaTrackConstraints['facingMode'];
}

interface Resolution {
  min: number;
  ideal: number;
  max: number;
}

interface Resolutions {
  landscape: {
    height: Resolution;
    width: Resolution;
  };
  portrait: {
    height: Resolution;
    width: Resolution;
  };
}

export const getOptimalVideoConstraints = async (
  deviceId: string | null,
  isLandscape: boolean = true
): Promise<VideoConstraints> => {
  const resolutions: Resolutions = {
    landscape: {
      height: {
        min: 360,
        ideal: 720,
        max: 1080,
      },
      width: {
        min: 640,
        ideal: 1280,
        max: 1920,
      },
    },
    portrait: {
      height: {
        min: 640,
        ideal: 1280,
        max: 1920,
      },
      width: {
        min: 360,
        ideal: 720,
        max: 1080,
      },
    },
  };
  const constraints: VideoConstraints = {
    width: isLandscape ? resolutions.landscape.width : resolutions.portrait.width,
    height: isLandscape ? resolutions.landscape.height : resolutions.portrait.height,
    frameRate: { min: 15, ideal: 30, max: 60 },
    aspectRatio: { ideal: isLandscape ? 16 / 9 : 9 / 16 },
    facingMode: 'environment',
    ...(deviceId && { deviceId: { exact: deviceId } }),
  };

  try {
    const mediaDevices = await getMediaDevices();
    await mediaDevices.getUserMedia({ video: constraints });

    return constraints;
  } catch (error) {
    console.error('Error during video constraints:', error);
    return {
      frameRate: { min: 15, ideal: 30, max: 60 },
      aspectRatio: { ideal: isLandscape ? 16 / 9 : 9 / 16 },
      ...(deviceId && { deviceId: { exact: deviceId } }),
    };
  }
};
