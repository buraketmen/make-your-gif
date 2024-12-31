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

  // Wait for video metadata to load if duration is not available
  while ((video.duration === Infinity || isNaN(video.duration)) && video.readyState < 2) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Set default end time after duration is available
  if (!settings.endTime) {
    settings.endTime = video.duration;
  }

  // Validate timestamps
  settings.startTime = Math.max(0, Math.min(settings.startTime!, video.duration));
  settings.endTime = Math.max(settings.startTime, Math.min(settings.endTime, video.duration));
  
  // Handle offsets if provided
  const useOffsets = Array.isArray(settings.offsets) && settings.offsets.length > 0;
  if (useOffsets) {
    settings.offsets = settings.offsets.filter(offset => 
      typeof offset === 'number' && offset >= 0 && offset <= video.duration
    );
    settings.count = settings.offsets.length;
  }

  // Ensure count is valid
  settings.count = Math.max(1, Math.floor(settings.count!));

  // Calculate interval between frames
  const interval = (settings.endTime - settings.startTime) / settings.count;

  // Set up canvas
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Handle dimensions
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

  // Notify load if callback provided
  if (settings.onLoad) {
    settings.onLoad();
  }

  const frames: VideoFrameResult[] = [];
  let seekResolve: (() => void) | null = null;

  // Set up video event handlers
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

      // Seek to target time
      video.currentTime = targetTime;
      await new Promise<void>(resolve => {
        seekResolve = resolve;
      });

      // Capture frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      frames.push({
        offset: video.currentTime,
        image: canvas.toDataURL(settings.format, settings.quality)
      });

      // Report progress
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
    width: 0, // Will be set when image loads
    height: 0, // Will be set when image loads
    timestamp: frame.offset
  }));
}; 