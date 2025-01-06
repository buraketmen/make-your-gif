import { DRAWING_TOOLS, DrawingFrame, DrawingTool } from '@/types/draw';

interface VideoFrameOptions {
  video: HTMLVideoElement;
  format?: string;
  offsets?: number[];
  startTime?: number;
  endTime?: number;
  width?: number;
  height?: number;
  quality?: number;
  fps?: number;
  onLoad?: () => void;
  onProgress?: (current: number, total: number) => void;
}

interface VideoFrameResult {
  offset: number;
  image: string;
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
  startTime: number,
  endTime: number,
  onProgress?: (current: number, total: number) => void,
  onError?: (error: Error | string) => void
): Promise<DrawingFrame[]> => {
  let canvas: HTMLCanvasElement | null = null;
  let ctx: CanvasRenderingContext2D | null = null;

  return new Promise(async (resolve, reject) => {
    try {
      canvas = document.createElement('canvas');
      ctx = canvas.getContext('2d', {
        alpha: false,
        desynchronized: true,
        willReadFrequently: true,
      });

      if (!ctx) {
        if (onError) {
          onError('Failed to create canvas context.');
        }
        return reject();
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const videoFrames = await extractVideoFrames(
        {
          video,
          format: 'image/jpeg',
          quality: 0.95,
          startTime,
          endTime,
          fps,
          onProgress,
        },
        onError
      );

      const drawingFrames = convertToDrawingFrames(videoFrames);

      if (drawingFrames.length > 0) {
        try {
          const dimensions = await getImageDimensions(drawingFrames[0].imageData, onError);
          drawingFrames.forEach((frame) => {
            frame.width = dimensions.width;
            frame.height = dimensions.height;
          });
        } catch (error) {
          console.error('Failed to get frame dimensions.', error);
          if (onError) {
            onError('Failed to get frame dimensions.');
          }
        }
      }

      resolve(drawingFrames);
    } catch (error) {
      if (onError) {
        onError(error as Error);
      }
      reject(error);
    } finally {
      if (canvas) {
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
        canvas.width = 0;
        canvas.height = 0;
        canvas = null;
        ctx = null;
      }
    }
  });
};

const processFrame = async (
  sourceCanvas: HTMLCanvasElement,
  frameData: { width: number; height: number; format: string; quality: number },
  onError?: (error: Error | string) => void
): Promise<string> => {
  try {
    return new Promise((resolve) => {
      sourceCanvas.toBlob(
        (blob) => {
          if (blob) {
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64data = reader.result as string;
              resolve(base64data);
            };
            reader.readAsDataURL(blob);
          } else {
            resolve('');
          }
        },
        frameData.format,
        frameData.quality
      );
    });
  } catch (error) {
    if (onError) {
      onError(error as Error);
    }
    return '';
  }
};

export const extractVideoFrames = async (
  options: VideoFrameOptions,
  onError?: (error: Error | string) => void
): Promise<VideoFrameResult[]> => {
  const defaultOptions = {
    format: 'image/jpeg',
    quality: 0.95,
    offsets: [],
    startTime: 0,
    fps: 30,
  };
  const settings = { ...defaultOptions, ...options };
  const { video, fps } = settings;
  const frames: VideoFrameResult[] = [];
  let canvas: HTMLCanvasElement | null = null;
  let ctx: CanvasRenderingContext2D | null = null;

  try {
    if (!video.videoWidth || !video.videoHeight) {
      return [];
    }

    while ((video.duration === Infinity || isNaN(video.duration)) && video.readyState < 2) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    if (!settings.endTime) {
      settings.endTime = video.duration;
    }

    settings.startTime = Math.max(0, Math.min(settings.startTime!, video.duration));
    settings.endTime = Math.max(settings.startTime, Math.min(settings.endTime, video.duration));

    const totalFrames = Math.floor((settings.endTime - settings.startTime) * fps);

    const interval = (settings.endTime - settings.startTime) / (totalFrames - 1);

    const videoDimensionRatio = video.videoWidth / video.videoHeight;
    if (!settings.width && !settings.height) {
      settings.width = video.videoWidth;
      settings.height = video.videoHeight;
    } else if (settings.width && !settings.height) {
      settings.height = settings.width / videoDimensionRatio;
    } else if (!settings.width && settings.height) {
      settings.width = settings.height * videoDimensionRatio;
    }

    if (settings.onLoad) {
      settings.onLoad();
    }

    canvas = document.createElement('canvas');
    canvas.width = settings.width!;
    canvas.height = settings.height!;
    ctx = canvas.getContext('2d')!;

    const frameData = {
      width: settings.width!,
      height: settings.height!,
      format: settings.format,
      quality: settings.quality,
    };

    const tasks = Array.from({ length: totalFrames }, (_, i) => {
      const targetTime = settings.startTime! + i * interval;
      return { index: i, targetTime };
    });

    for (let i = 0; i < tasks.length; i++) {
      const { index, targetTime } = tasks[i];

      video.currentTime = targetTime;
      await new Promise<void>((resolve) => {
        const onSeeked = () => {
          video.removeEventListener('seeked', onSeeked);
          resolve();
        };
        video.addEventListener('seeked', onSeeked);
      });

      if (!ctx || !canvas) continue;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const image = await processFrame(canvas, frameData, onError);

      frames[index] = {
        offset: targetTime,
        image,
      };

      if (settings.onProgress) {
        settings.onProgress(index + 1, totalFrames);
      }
    }

    return frames;
  } catch (error) {
    if (onError) {
      onError(error as Error);
    }
    return [];
  } finally {
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
      canvas = null;
      ctx = null;
    }
  }
};

export const convertToDrawingFrames = (
  videoFrames: VideoFrameResult[],
  width?: number,
  height?: number
): DrawingFrame[] => {
  return videoFrames.map((frame, index) => ({
    id: index,
    imageData: frame.image,
    drawings: [],
    width: width || 0,
    height: height || 0,
    timestamp: frame.offset,
  }));
};

const getImageDimensions = (
  imageData: string,
  onError?: (error: Error | string) => void
): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };

    img.onerror = (error) => {
      console.error('Failed to load frame image.', error);
      if (onError) {
        onError('Failed to load frame image.');
      }
      reject();
    };

    if (!imageData.startsWith('data:')) {
      console.error('Invalid image data format.');
      if (onError) {
        onError('Invalid image data format.');
      }
      reject();
      return;
    }

    img.src = imageData;
  });
};
