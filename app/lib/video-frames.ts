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
  format: 'image/jpeg',
  offsets: [],
  startTime: 0,
  count: 1,
  quality: 0.95
};

export const extractVideoFrames = async (options: VideoFrameOptions): Promise<VideoFrameResult[]> => {
  const settings = { ...defaultOptions, ...options };
  const { video } = settings;
  
  if (!video.videoWidth || !video.videoHeight) {
    throw new Error('Video dimensions not available');
  }

  while ((video.duration === Infinity || isNaN(video.duration)) && video.readyState < 2) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  if (!settings.endTime) {
    settings.endTime = video.duration;
  }

  settings.startTime = Math.max(0, Math.min(settings.startTime!, video.duration));
  settings.endTime = Math.max(settings.startTime, Math.min(settings.endTime, video.duration));
  
  const useOffsets = Array.isArray(settings.offsets) && settings.offsets.length > 0;
  if (useOffsets) {
    settings.offsets = settings.offsets.filter(offset => 
      typeof offset === 'number' && offset >= 0 && offset <= video.duration
    );
    settings.count = settings.offsets.length;
  }

  settings.count = Math.max(1, Math.floor(settings.count!));

  const interval = (settings.endTime - settings.startTime) / settings.count;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  const videoDimensionRatio = video.videoWidth / video.videoHeight;
  if (!settings.width && !settings.height) {
    settings.width = video.videoWidth;
    settings.height = video.videoHeight;
  } else if (settings.width && !settings.height) {
    settings.height = settings.width / videoDimensionRatio;
  } else if (!settings.width && settings.height) {
    settings.width = settings.height * videoDimensionRatio;
  }

  canvas.width = settings.width!;
  canvas.height = settings.height!;

  if (settings.onLoad) {
    settings.onLoad();
  }

  const frames: VideoFrameResult[] = [];
  let seekResolve: (() => void) | null = null;

  const onSeeked = () => {
    if (seekResolve) {
      seekResolve();
    }
  };

  video.addEventListener('seeked', onSeeked);

  try {
    for (let i = 0; i < settings.count; i++) {
      const targetTime = useOffsets 
        ? settings.offsets![i]
        : settings.startTime! + i * interval;

      video.currentTime = targetTime;
      await new Promise<void>(resolve => {
        seekResolve = resolve;
      });

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      frames.push({
        offset: video.currentTime,
        image: canvas.toDataURL(settings.format, settings.quality)
      });

      if (settings.onProgress) {
        settings.onProgress(i + 1, settings.count);
      }
    }

    return frames;
  } finally {
    video.removeEventListener('seeked', onSeeked);
  }
};

export const convertToDrawingFrames = (videoFrames: VideoFrameResult[]): DrawingFrame[] => {
  return videoFrames.map((frame, index) => ({
    id: index,
    imageData: frame.image,
    drawings: [],
    width: 0,
    height: 0, 
    timestamp: frame.offset
  }));
}; 