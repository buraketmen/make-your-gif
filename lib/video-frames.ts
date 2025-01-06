import { DrawingFrame } from '@/types/draw';

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

const defaultOptions = {
  format: 'image/png',
  offsets: [],
  startTime: 0,
  count: 1,
  quality: 1,
};

let frameWorker: Worker | null = null;

export const cleanupWorker = () => {
  if (frameWorker) {
    frameWorker.terminate();
    frameWorker = null;
  }
};

const getFrameWorker = () => {
  if (!frameWorker) {
    frameWorker = new Worker(new URL('./frame-worker.ts', import.meta.url));
  }
  return frameWorker;
};

const processFrameInWorker = async (
  sourceCanvas: OffscreenCanvas,
  frameData: { width: number; height: number; format: string; quality: number }
): Promise<string> => {
  const worker = getFrameWorker();

  const transferCanvas = new OffscreenCanvas(frameData.width, frameData.height);
  const transferCtx = transferCanvas.getContext('2d')!;
  const bitmap = await createImageBitmap(sourceCanvas);
  transferCtx.drawImage(bitmap, 0, 0);
  bitmap.close();

  const imageData = transferCtx.getImageData(0, 0, frameData.width, frameData.height);

  return new Promise((resolve, reject) => {
    const onMessage = (e: MessageEvent) => {
      if (e.data.type === 'frame-processed') {
        const blob = new Blob([e.data.buffer], { type: e.data.format });
        resolve(URL.createObjectURL(blob));
        worker.removeEventListener('message', onMessage);
      } else if (e.data.type === 'error') {
        reject(new Error(e.data.error));
        worker.removeEventListener('message', onMessage);
      }
    };

    worker.addEventListener('message', onMessage);
    worker.postMessage(
      {
        type: 'process-frame',
        imageData: imageData,
        frameData,
      },
      [imageData.data.buffer]
    );
  });
};

export const extractVideoFrames = async (
  options: VideoFrameOptions
): Promise<VideoFrameResult[]> => {
  try {
    const settings = { ...defaultOptions, ...options };
    const { video } = settings;

    if (!video.videoWidth || !video.videoHeight) {
      throw new Error('Video dimensions not available');
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

    const tasks = Array.from({ length: settings.count }, (_, i) => {
      const targetTime = useOffsets
        ? settings.offsets![i]
        : i === settings.count - 1
          ? settings.endTime!
          : settings.startTime! + i * interval;
      return { index: i, targetTime };
    });

    const batchSize = 4;
    const frames: VideoFrameResult[] = new Array(settings.count);

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

          const canvas = new OffscreenCanvas(settings.width!, settings.height!);
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          const frameData = {
            width: settings.width!,
            height: settings.height!,
            format: settings.format,
            quality: settings.quality,
          };

          try {
            const image = await processFrameInWorker(canvas, frameData);
            frames[index] = {
              offset: targetTime,
              image,
            };
          } catch (error) {
            console.error(error);
            const bitmap = await createImageBitmap(canvas);
            const tempCanvas = new OffscreenCanvas(canvas.width, canvas.height);
            const tempCtx = tempCanvas.getContext('2d')!;
            tempCtx.drawImage(bitmap, 0, 0);

            const blob = await tempCanvas.convertToBlob({
              type: settings.format,
              quality: settings.quality,
            });
            frames[index] = {
              offset: targetTime,
              image: URL.createObjectURL(blob),
            };
          }

          if (settings.onProgress) {
            settings.onProgress(index + 1, settings.count);
          }
        })
      );
    }

    cleanupWorker();

    return frames;
  } catch (error) {
    cleanupWorker();
    throw error;
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
