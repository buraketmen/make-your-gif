import { DRAWING_TOOLS, DrawingFrame, DrawingTool } from '@/types/draw';

interface VideoFrameOptions {
  video: HTMLVideoElement;
  format?: string;
  offsets?: number[];
  startTime?: number;
  endTime?: number;
  count?: number;
  width?: number;
  height?: number;
  quality?: number;
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
  startTime?: number,
  endTime?: number,
  onProgress?: (current: number, total: number) => void
): Promise<DrawingFrame[]> => {
  let canvas: HTMLCanvasElement | null = null;
  return new Promise(async (resolve, reject) => {
    try {
      const effectiveStart = startTime ?? 0;
      const effectiveEnd = endTime ?? video.duration;

      canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', {
        alpha: false,
        desynchronized: true,
        willReadFrequently: false,
      })!;
      if (!ctx) {
        console.error('Failed to create canvas context');
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const frameCount = Math.floor((effectiveEnd - effectiveStart) * fps);
      const videoFrames = await extractVideoFrames({
        video,
        format: 'image/jpeg',
        quality: 1.0,
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
            img.src = '';
            resolve();
          };
          img.onerror = () => reject(null);
          img.src = drawingFrames[0].imageData;
        });
      }

      resolve(drawingFrames);
    } catch (error) {
      console.error('Error during frame extraction:', error);
      reject(error);
    } finally {
      if (canvas) {
        canvas.width = 0;
        canvas.height = 0;
        canvas = null;
      }
      if (window.gc) {
        try {
          window.gc();
        } catch (error) {
          console.error('Error during garbage collection:', error);
        }
      }
    }
  });
};

const processFrame = async (
  sourceCanvas: HTMLCanvasElement,
  frameData: { width: number; height: number; format: string; quality: number }
): Promise<string> => {
  try {
    return new Promise((resolve) => {
      sourceCanvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(URL.createObjectURL(blob));
          }
        },
        frameData.format,
        frameData.quality
      );
    });
  } catch (error) {
    console.error('Error processing frame:', error);
    return '';
  }
};

export const extractVideoFrames = async (
  options: VideoFrameOptions
): Promise<VideoFrameResult[]> => {
  const defaultOptions = {
    format: 'image/jpeg',
    offsets: [],
    startTime: 0,
    count: 1,
    quality: 1.0,
  };
  const settings = { ...defaultOptions, ...options };
  const { video } = settings;
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

    const useOffsets = Array.isArray(settings.offsets) && settings.offsets.length > 0;
    if (useOffsets) {
      settings.offsets = settings.offsets
        .filter((offset) => typeof offset === 'number' && offset >= 0 && offset <= video.duration)
        .sort((a, b) => a - b);
      settings.count = settings.offsets.length;
    }

    settings.count = Math.max(1, Math.floor(settings.count!));

    const interval = (settings.endTime - settings.startTime) / (settings.count - 1);

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

    const tasks = Array.from({ length: settings.count }, (_, i) => {
      const targetTime = useOffsets
        ? settings.offsets![i]
        : i === settings.count - 1
          ? settings.endTime!
          : settings.startTime! + i * interval;
      return { index: i, targetTime };
    });

    const batchSize = 4;
    for (let i = 0; i < tasks.length; i += batchSize) {
      const batch = tasks.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async ({ index, targetTime }) => {
          video.currentTime = targetTime;
          await new Promise<void>((resolve) => {
            const onSeeked = () => {
              video.removeEventListener('seeked', onSeeked);
              resolve();
            };
            video.addEventListener('seeked', onSeeked);
          });

          if (!ctx || !canvas) return;

          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          let image: string;

          try {
            image = await processFrame(canvas, frameData);
          } catch (error) {
            console.error('Error processing frame:', error);
            const tempCanvas = document.createElement('canvas');
            try {
              tempCanvas.width = canvas.width;
              tempCanvas.height = canvas.height;
              const tempCtx = tempCanvas.getContext('2d')!;
              tempCtx.drawImage(canvas, 0, 0);
              image = await processFrame(tempCanvas, frameData);
            } finally {
              tempCanvas.width = 0;
              tempCanvas.height = 0;
            }
          }

          frames[index] = {
            offset: targetTime,
            image,
          };

          if (settings.onProgress) {
            settings.onProgress(index + 1, settings.count);
          }
        })
      );
    }

    return frames;
  } catch (error) {
    console.error('Error extracting frames:', error);
    frames.forEach((frame) => {
      if (frame?.image) {
        URL.revokeObjectURL(frame.image);
      }
    });
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
