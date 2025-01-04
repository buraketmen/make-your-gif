'use client';
import {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  ReactNode,
  useCallback,
} from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { DrawingFrame, Mode } from '@/types/draw';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import debounce from 'lodash/debounce';
import {
  getSupportedMimeType,
  getVideoOutputFormat,
  getFFmpegCodecArgs,
  getCameras,
} from '@/lib/utils';
import {
  drawFrameToCanvas,
  calculateCropDimensions,
  extractFramesFromVideo,
} from '@/lib/video-frames';
import { dbService } from '@/lib/indexed-db';

export const TARGET_FPS = 30;
export const MAX_RECORDING_DURATION = 10;

interface VideoFilters {
  trim: {
    start: number;
    end: number;
    isActive: boolean;
  };
  crop: {
    coordinates: { x: number; y: number; width: number; height: number };
    isActive: boolean;
    isCropMode: boolean;
  };
}

interface VideoContextType {
  mimeType: string;
  lastUpdatedAt: number;
  deviceId: string | null;
  setDeviceId: (deviceId: string | null) => void;
  cameras: MediaDeviceInfo[];
  refreshCameras: () => Promise<void>;
  blobIds: {
    baseVideo: string | null;
    currentVideo: string | null;
  };
  setBaseVideoBlob: (blob: Blob | null) => Promise<void>;
  getBaseVideoBlob: () => Promise<Blob | null>;
  setVideoBlob: (blob: Blob | null) => Promise<void>;
  getVideoBlob: () => Promise<Blob | null>;
  videoFilters: VideoFilters;
  setVideoFilters: (filters: VideoFilters) => void;
  processes: {
    isConverting: boolean;
    isFrameExtracting: boolean;
    isCropping: boolean;
    isTrimming: boolean;
    isGeneratingGif: boolean;
  };
  frameProgress: {
    current: number;
    total: number;
  };
  videoProgress: number;
  isRecording: boolean;
  setIsRecording: (value: boolean) => void;
  isMirrored: boolean;
  setIsMirrored: (value: boolean) => void;
  isLandscape: boolean;
  setIsLandscape: (value: boolean) => void;
  mode: Mode;
  setMode: (mode: Mode) => void;
  gifUrl: string | null;
  duration: number;
  setDuration: (value: number) => void;
  setTrimStart: (value: number) => void;
  setTrimEnd: (value: number) => void;
  setCrop: (newCoordinates: { x: number; y: number; width: number; height: number }) => void;
  setIsCropMode: (value: boolean) => void;
  frames: DrawingFrame[];
  setFrames: (frames: DrawingFrame[] | ((prev: DrawingFrame[]) => DrawingFrame[])) => void;
  selectedFrame: DrawingFrame | null;
  setSelectedFrame: (frame: DrawingFrame | null) => void;
  handleStartRecording: () => void;
  handleStopRecording: () => void;
  handleVideoRecorded: (blob: Blob, videoDuration: number) => Promise<void>;
  handleFileSelected: (file: File) => Promise<void>;
  handleBack: () => void;
  handleCropVideo: () => Promise<void>;
  handleResetCrop: () => Promise<void>;
  handleDownloadGif: () => void;
  gifSize: number;
  setGifSize: (size: number) => void;
  isLoadingFrames: boolean;
  totalFrames: number;
  generateGif: () => Promise<void>;
}

const VideoContext = createContext<VideoContextType | null>(null);

export const useVideo = () => {
  const context = useContext(VideoContext);
  if (!context) {
    throw new Error('useVideo must be used within a VideoProvider');
  }
  return context;
};

interface VideoProviderProps {
  children: ReactNode;
}

export const VideoProvider = ({ children }: VideoProviderProps) => {
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const mimeType = getSupportedMimeType();
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number>(0);
  const [blobIds, setBlobIds] = useState<{
    baseVideo: string | null;
    currentVideo: string | null;
  }>({
    baseVideo: null,
    currentVideo: null,
  });
  const [isLandscape, setIsLandscape] = useState(true);
  const [videoFilters, setVideoFilters] = useState({
    trim: {
      start: 0,
      end: 0,
      isActive: false,
    },
    crop: {
      coordinates: { x: 20, y: 20, width: 60, height: 60 },
      isActive: false,
      isCropMode: false,
    },
  });
  const [processes, setProcesses] = useState({
    isConverting: false,
    isFrameExtracting: false,
    isCropping: false,
    isTrimming: false,
    isGeneratingGif: false,
  });
  const [frameProgress, setFrameProgress] = useState({
    current: 0,
    total: 0,
  });
  const [isRecording, setIsRecording] = useState(false);
  const [mode, setMode] = useState<Mode>('record');
  const [isMirrored, setIsMirrored] = useState(true);

  const [gifUrl, setGifUrl] = useState<string | null>(null);

  const [duration, setDuration] = useState(0);
  const [frames, setFrames] = useState<DrawingFrame[]>([]);
  const [selectedFrame, setSelectedFrame] = useState<DrawingFrame | null>(null);
  const [gifSize, setGifSize] = useState(480);
  const [videoProgress, setVideoProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingFrames, setIsLoadingFrames] = useState(false);
  const [totalFrames, setTotalFrames] = useState(0);
  const frameLoadingRef = useRef<number>(0);

  const getBaseVideoBlob = useCallback(async () => {
    return blobIds.baseVideo ? await dbService.getBlob(blobIds.baseVideo) : null;
  }, [blobIds.baseVideo]);

  const getVideoBlob = useCallback(async () => {
    return blobIds.currentVideo ? await dbService.getBlob(blobIds.currentVideo) : null;
  }, [blobIds.currentVideo]);

  const setBaseVideoBlob = useCallback(async (blob: Blob | null) => {
    if (blob) {
      await dbService.saveBlob('baseVideo', blob);
      setBlobIds((prev) => ({ ...prev, baseVideo: 'baseVideo' }));
    } else {
      setBlobIds((prev) => ({ ...prev, baseVideo: null }));
    }
    setLastUpdatedAt(Date.now());
  }, []);

  const setVideoBlob = useCallback(async (blob: Blob | null) => {
    if (blob) {
      await dbService.saveBlob('currentVideo', blob);
      setBlobIds((prev) => ({ ...prev, currentVideo: 'currentVideo' }));
    } else {
      setBlobIds((prev) => ({ ...prev, currentVideo: null }));
    }
    setLastUpdatedAt(Date.now());
  }, []);

  useEffect(() => {
    if (videoFilters.crop.isActive === false && videoFilters.trim.isActive === false) {
      const syncBlobs = async () => {
        const baseBlob = await getBaseVideoBlob();
        if (baseBlob) {
          await setVideoBlob(baseBlob);
        }
      };
      syncBlobs();
    }
  }, [blobIds.baseVideo, videoFilters.crop.isActive, videoFilters.trim.isActive]);

  useEffect(() => {
    const fetchCameras = async () => {
      const allCameras = await getCameras();

      if (allCameras.deviceIds.length > 0) {
        const newDeviceId = allCameras.deviceIds[0];
        if (newDeviceId) {
          setCameras(allCameras.cameras);
          setDeviceId(newDeviceId);
        }
      }
    };
    fetchCameras();
  }, []);

  const refreshCameras = useCallback(async () => {
    try {
      const allCameras = await getCameras();

      if (allCameras.deviceIds.length > 0 && !deviceId) {
        if (allCameras.deviceIds[0]) {
          setDeviceId(allCameras.deviceIds[0]);
          setCameras(allCameras.cameras);
        }
      }
    } catch (error) {
      console.error('Error getting camera devices:', error);
    }
  }, [deviceId]);

  useEffect(() => {
    refreshCameras();

    navigator.mediaDevices?.addEventListener('devicechange', refreshCameras);

    return () => {
      navigator.mediaDevices?.removeEventListener('devicechange', refreshCameras);
    };
  }, [refreshCameras]);

  const loadFFmpeg = useCallback(async () => {
    if (!ffmpegRef.current) {
      const ffmpeg = new FFmpeg();
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.4/dist/umd';
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });
      ffmpegRef.current = ffmpeg;
    }
  }, [ffmpegRef]);

  const handleGifUrlChange = useCallback(
    (newUrl: string | null) => {
      if (gifUrl) {
        URL.revokeObjectURL(gifUrl);
      }
      setGifUrl(newUrl);
    },
    [gifUrl]
  );

  const generateGif = useCallback(async () => {
    if (!blobIds.currentVideo || frames.length === 0) {
      return;
    }

    try {
      setProcesses((prev) => ({ ...prev, isGeneratingGif: true }));
      await loadFFmpeg();
      const ffmpeg = ffmpegRef.current!;

      const canvas = document.createElement('canvas');
      canvas.width = frames[0].width;
      canvas.height = frames[0].height;

      for (let i = 0; i < frames.length; i++) {
        const frame = frames[i];
        await drawFrameToCanvas(frame, canvas);
        await new Promise<void>((resolve) => {
          canvas.toBlob(
            async (blob) => {
              if (blob) {
                await ffmpeg.writeFile(`frame${i}.jpg`, await fetchFile(blob));
                resolve();
              }
            },
            'image/jpeg',
            1.0
          );
        });
      }

      const filterCommands = [];
      if (videoFilters.trim.isActive) {
        filterCommands.push(`trim=start=${videoFilters.trim.start}:end=${videoFilters.trim.end}`);
      }
      filterCommands.push(`scale=${gifSize}:-1:flags=lanczos`);
      const filterComplex = filterCommands.join(',');

      await ffmpeg.exec([
        '-framerate',
        TARGET_FPS.toString(),
        '-i',
        'frame%d.jpg',
        '-vf',
        filterComplex,
        '-r',
        TARGET_FPS.toString(),
        'output.gif',
      ]);

      const data = await ffmpeg.readFile('output.gif');
      const gifBlob = new Blob([data], { type: 'image/gif' });
      handleGifUrlChange(URL.createObjectURL(gifBlob));
    } catch (error) {
      console.error('Error generating GIF:', error);
    } finally {
      setProcesses((prev) => ({ ...prev, isGeneratingGif: false }));
    }
  }, [blobIds.currentVideo, frames, videoFilters, loadFFmpeg, handleGifUrlChange, gifSize]);

  const debouncedGenerateGif = useCallback(
    debounce(
      () => {
        if (blobIds.currentVideo && frames.length > 0) {
          generateGif();
        }
      },
      100,
      { maxWait: 1000 }
    ),
    [blobIds.currentVideo, frames]
  );

  useEffect(() => {
    if (!blobIds.currentVideo || frames.length === 0) return;
    debouncedGenerateGif();
    return () => debouncedGenerateGif.cancel();
  }, [blobIds.currentVideo, frames, lastUpdatedAt, gifSize]);

  useEffect(() => {
    return () => {
      if (gifUrl) URL.revokeObjectURL(gifUrl);
    };
  }, [gifUrl]);

  const handleStartRecording = () => {
    setIsRecording(true);
  };

  const handleStopRecording = () => {
    setIsRecording(false);
  };

  const cropVideoToOriginalSize = async (blob: Blob, videoDuration: number): Promise<Blob> => {
    let video: HTMLVideoElement | null = null;
    let videoUrl: string | null = null;
    try {
      setProcesses((prev) => ({ ...prev, isConverting: true }));
      setVideoProgress(0);

      const videoElement = document.createElement('video');
      video = videoElement;
      video.preload = 'metadata';
      videoUrl = URL.createObjectURL(blob);

      const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
        if (!videoElement) return reject(new Error('Video element is null'));

        videoElement.onloadedmetadata = () => {
          resolve({
            width: videoElement.videoWidth,
            height: videoElement.videoHeight,
          });
        };
        videoElement.onerror = () => reject(new Error('Failed to load video metadata'));
        videoElement.src = videoUrl || '';
      });

      await loadFFmpeg();
      const ffmpeg = ffmpegRef.current!;

      const progressCallback = ({ message }: { message: string }) => {
        const timeMatch = message.match(/time=(\d+:\d+:\d+.\d+)/);
        if (timeMatch && video) {
          const [hours, minutes, seconds] = timeMatch[1].split(':').map(Number);
          const currentTime = hours * 3600 + minutes * 60 + seconds;
          const progress = (currentTime / videoDuration) * 100;
          setVideoProgress(Math.min(Math.round(isNaN(progress) ? 0 : progress), 100));
        }
      };

      ffmpeg.on('log', progressCallback);

      const { format, codec } = getVideoOutputFormat(mimeType);
      const fileNames = {
        input: `input.${format}`,
        output: `output.${format}`,
      };

      await ffmpeg.writeFile(fileNames.input, await fetchFile(blob));

      // Optimize FFmpeg command with better parameters
      await ffmpeg.exec([
        '-i',
        fileNames.input,

        '-vf',
        `crop=${dimensions.width}:${dimensions.height}:0:0`,
        ...getFFmpegCodecArgs(codec),

        '-r',
        TARGET_FPS.toString(),
        fileNames.output,
      ]);

      const data = await ffmpeg.readFile(fileNames.output);
      await ffmpeg.deleteFile(fileNames.input).catch(() => {});
      await ffmpeg.deleteFile(fileNames.output).catch(() => {});

      // Remove the progress listener
      ffmpeg.off('log', progressCallback);
      setVideoProgress(100);

      return new Blob([data], { type: mimeType });
    } catch (error) {
      console.error('Error cropping video to original size:', error);
      return blob;
    } finally {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
      if (video) {
        video.src = '';
        video.load();
        video.remove();
      }
      video = null;
      setProcesses((prev) => ({ ...prev, isConverting: false }));
    }
  };

  const handleVideoRecorded = async (blob: Blob, videoDuration: number) => {
    try {
      // Clear existing data before processing new video
      await dbService.deleteDatabase();
      await dbService.init();

      // Process video in batches
      const processInBatches = async (inputBlob: Blob) => {
        // First batch: Crop video to original size
        setProcesses((prev) => ({ ...prev, isConverting: true }));
        const croppedBlob = await cropVideoToOriginalSize(inputBlob, videoDuration);
        setProcesses((prev) => ({ ...prev, isConverting: false }));

        // Second batch: Save blobs
        await setBaseVideoBlob(croppedBlob);
        await setVideoBlob(croppedBlob);
        setIsRecording(false);
        setDuration(videoDuration);
        setVideoFilters((prev) => ({
          ...prev,
          trim: { ...prev.trim, end: videoDuration },
        }));

        // Third batch: Extract frames
        await extractFrames(croppedBlob);
      };

      await processInBatches(blob);
    } catch (error) {
      console.error('Error handling recorded video:', error);
    }
  };

  const handleFileSelected = async (file: File) => {
    if (file && file.type.startsWith('video/')) {
      try {
        // Clear existing data before processing new video
        await dbService.deleteDatabase();
        await dbService.init();

        const croppedBlob = await cropVideoToOriginalSize(file, MAX_RECORDING_DURATION);
        await setBaseVideoBlob(croppedBlob);
        await setVideoBlob(croppedBlob);

        const video = document.createElement('video');
        video.preload = 'metadata';
        const videoUrl = URL.createObjectURL(croppedBlob);
        video.src = videoUrl;

        video.onloadedmetadata = async () => {
          const videoDuration = Math.floor(video.duration);
          setDuration(videoDuration);
          setVideoFilters((prev) => ({
            ...prev,
            trim: { ...prev.trim, end: videoDuration },
          }));
          URL.revokeObjectURL(videoUrl);
          await extractFrames(croppedBlob);
        };
      } catch (error) {
        console.error('Error handling selected file:', error);
      }
    }
  };

  const extractFrames = async (blob: Blob) => {
    if (!blob) {
      return;
    }

    const video = document.createElement('video');
    let isCleanedUp = false;

    const cleanupVideo = () => {
      if (isCleanedUp) return;
      isCleanedUp = true;

      if (video) {
        video.removeEventListener('loadeddata', handleVideoLoad);
        video.removeEventListener('error', handleVideoError);
        video.pause();
        video.src = '';
        video.load();
        URL.revokeObjectURL(video.src);
        video.remove();
      }
    };

    const handleVideoLoad = () => {
      const waitForValidDuration = () => {
        return new Promise<void>((resolve, reject) => {
          let attempts = 0;
          const maxAttempts = 50;

          const checkDuration = () => {
            attempts++;
            if (
              video.duration &&
              isFinite(video.duration) &&
              video.videoWidth &&
              video.videoHeight
            ) {
              resolve();
            } else if (attempts >= maxAttempts) {
              reject(new Error('Video metadata loading timeout'));
            } else {
              setTimeout(checkDuration, 100);
            }
          };
          checkDuration();
        });
      };

      waitForValidDuration()
        .then(async () => {
          try {
            setProcesses((prev) => ({ ...prev, isFrameExtracting: true }));

            // Calculate video duration and validate
            const duration = videoFilters.trim.isActive
              ? videoFilters.trim.end - videoFilters.trim.start
              : video.duration;

            if (duration > MAX_RECORDING_DURATION) {
              throw new Error(`Video duration exceeds ${MAX_RECORDING_DURATION} seconds limit`);
            }

            const frames = await extractFramesFromVideo(
              video,
              TARGET_FPS,
              videoFilters.trim.isActive ? videoFilters.trim.start : 0,
              videoFilters.trim.isActive ? videoFilters.trim.end : video.duration,
              (current, total) => {
                setFrameProgress({ current, total });
              }
            );

            setFrames(frames);
          } catch (error) {
            console.error('Error extracting frames:', error);
            setError(error instanceof Error ? error.message : 'Failed to process video');
          } finally {
            cleanupVideo();
            setProcesses((prev) => ({ ...prev, isFrameExtracting: false }));
          }
        })
        .catch((error) => {
          console.error('Error loading video:', error);
          cleanupVideo();
          setProcesses((prev) => ({ ...prev, isFrameExtracting: false }));
          setError('Failed to load video');
        });
    };

    const handleVideoError = (error: Event) => {
      console.error('Error loading video:', error);
      cleanupVideo();
      setError('Failed to load video');
    };

    video.preload = 'auto';
    video.muted = true;
    video.addEventListener('loadeddata', handleVideoLoad);
    video.addEventListener('error', handleVideoError);

    const videoUrl = URL.createObjectURL(blob);
    video.src = videoUrl;
    video.load();

    return cleanupVideo;
  };

  const handleBack = async () => {
    try {
      await dbService.deleteDatabase();
      setMode('record');
      setBlobIds({ baseVideo: null, currentVideo: null });
      setFrames([]);
      setSelectedFrame(null);
      setDuration(0);
      setVideoFilters({
        trim: {
          start: 0,
          end: 0,
          isActive: false,
        },
        crop: {
          coordinates: { x: 20, y: 20, width: 60, height: 60 },
          isActive: false,
          isCropMode: false,
        },
      });
      setProcesses({
        isConverting: false,
        isFrameExtracting: false,
        isCropping: false,
        isTrimming: false,
        isGeneratingGif: false,
      });
      handleGifUrlChange(null);
      setLastUpdatedAt(Date.now());
    } catch (error) {
      console.error('Error clearing IndexedDB:', error);
    }
  };

  const handleCropVideo = async () => {
    const baseVideoBlob = await getBaseVideoBlob();
    if (!baseVideoBlob) return;

    try {
      setProcesses((prev) => ({ ...prev, isCropping: true }));
      setSelectedFrame(null);
      await loadFFmpeg();
      const ffmpeg = ffmpegRef.current!;

      const video = document.createElement('video');
      video.preload = 'metadata';

      const videoUrl = URL.createObjectURL(baseVideoBlob);

      await new Promise((resolve) => {
        video.onloadedmetadata = () => resolve(null);
        video.src = videoUrl;
      });

      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;

      // Clean up resources
      URL.revokeObjectURL(videoUrl);
      video.src = '';
      video.remove();

      const { format, codec } = getVideoOutputFormat(mimeType);
      const fileNames = {
        input: `input.${format}`,
        output: `output.${format}`,
      };

      try {
        await ffmpeg.writeFile(fileNames.input, await fetchFile(baseVideoBlob));

        const cropDimensions = calculateCropDimensions(
          videoFilters.crop.coordinates,
          videoWidth,
          videoHeight
        );

        await ffmpeg.exec([
          '-i',
          fileNames.input,
          '-vf',
          cropDimensions.ffmpegFilter,
          ...getFFmpegCodecArgs(codec),
          '-r',
          '30',
          fileNames.output,
        ]);

        const data = await ffmpeg.readFile(fileNames.output);
        const croppedBlob = new Blob([data], { type: mimeType });

        await ffmpeg.deleteFile(fileNames.input);
        await ffmpeg.deleteFile(fileNames.output);

        await setVideoBlob(croppedBlob);
        setVideoFilters((prev) => ({
          ...prev,
          crop: { ...prev.crop, isActive: true, isCropMode: false },
        }));

        await extractFrames(croppedBlob);
      } catch (error) {
        console.error('Error during FFmpeg operations:', error);
        return;
      }
    } catch (error) {
      console.error('Error cropping video:', error);
    } finally {
      setProcesses((prev) => ({ ...prev, isCropping: false }));
      setLastUpdatedAt(Date.now());
    }
  };

  const handleResetCrop = async () => {
    const [baseBlob, currentBlob] = await Promise.all([getBaseVideoBlob(), getVideoBlob()]);

    if (baseBlob && currentBlob && baseBlob !== currentBlob) {
      try {
        setSelectedFrame(null);
        await setVideoBlob(baseBlob);
        setVideoFilters((prev) => ({
          ...prev,
          crop: {
            coordinates: { x: 20, y: 20, width: 60, height: 60 },
            isActive: false,
            isCropMode: false,
          },
        }));
        await extractFrames(baseBlob);
        setLastUpdatedAt(Date.now());
      } catch (error) {
        console.error('Error resetting crop:', error);
      }
    }
  };

  const handleTrimStart = (value: number) => {
    setVideoFilters((prev) => ({
      ...prev,
      trim: {
        ...prev.trim,
        start: value,
        isActive: value > 0 || prev.trim.end < duration,
      },
    }));
    setLastUpdatedAt(Date.now());
  };

  const handleTrimEnd = (value: number) => {
    setVideoFilters((prev) => ({
      ...prev,
      trim: {
        ...prev.trim,
        end: value,
        isActive: prev.trim.start > 0 || value < duration,
      },
    }));
    setLastUpdatedAt(Date.now());
  };

  const handleDownloadGif = () => {
    if (gifUrl) {
      const a = document.createElement('a');
      a.href = gifUrl;
      a.download = 'converted.gif';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  // Load initial frames
  useEffect(() => {
    const loadInitialFrames = async () => {
      try {
        setIsLoadingFrames(true);
        const count = await dbService.getFrameCount();
        setTotalFrames(count);

        if (count > 0) {
          const firstFrame = await dbService.getFirstFrame();
          if (firstFrame) {
            setFrames([firstFrame]);
            frameLoadingRef.current = 1;
            loadMoreFrames();
          }
        }
      } catch (error) {
        console.error('Error loading initial frames:', error);
      } finally {
        setIsLoadingFrames(false);
      }
    };
    loadInitialFrames();
  }, []);

  // Load more frames in the background
  const loadMoreFrames = useCallback(async () => {
    if (frameLoadingRef.current >= totalFrames) return;

    try {
      const batch = await dbService.getFramesBatch(frameLoadingRef.current);
      if (batch.length > 0) {
        setFrames((prev) => [...prev, ...batch]);
        frameLoadingRef.current += batch.length;

        // Continue loading if there are more frames
        if (frameLoadingRef.current < totalFrames) {
          setTimeout(loadMoreFrames, 100);
        }
      }
    } catch (error) {
      console.error('Error loading more frames:', error);
    }
  }, [totalFrames]);

  // Save frames to IndexedDB when they change
  useEffect(() => {
    if (frames.length > 0 && !isLoadingFrames) {
      dbService.saveFrames(frames).catch((error) => {
        console.error('Error saving frames to IndexedDB:', error);
      });
    }
  }, [frames, isLoadingFrames]);

  // Clean up IndexedDB when component unmounts
  useEffect(() => {
    return () => {
      dbService.deleteDatabase().catch((error) => {
        console.error('Error clearing IndexedDB on unmount:', error);
      });
    };
  }, []);

  const value = {
    mimeType,
    deviceId,
    setDeviceId,
    cameras,
    refreshCameras,
    lastUpdatedAt,
    gifUrl,
    processes,
    frameProgress,
    duration,
    setDuration,
    mode,
    setMode,
    blobIds,
    setBaseVideoBlob,
    getBaseVideoBlob,
    setVideoBlob,
    getVideoBlob,
    videoFilters,
    setVideoFilters,
    isRecording,
    setIsRecording,
    isMirrored,
    setIsMirrored,
    isLandscape,
    setIsLandscape,
    frames,
    setFrames,
    selectedFrame,
    setSelectedFrame,
    setTrimStart: handleTrimStart,
    setTrimEnd: handleTrimEnd,
    setCrop: (newCoordinates: { x: number; y: number; width: number; height: number }) =>
      setVideoFilters((prev) => ({
        ...prev,
        crop: { ...prev.crop, coordinates: newCoordinates },
      })),
    setIsCropMode: (value: boolean) =>
      setVideoFilters((prev) => ({
        ...prev,
        crop: { ...prev.crop, isCropMode: value },
      })),
    handleStartRecording,
    handleStopRecording,
    handleVideoRecorded,
    handleFileSelected,
    handleBack,
    handleCropVideo,
    handleResetCrop,
    handleDownloadGif,
    gifSize,
    setGifSize,
    videoProgress,
    isLoadingFrames,
    totalFrames,
    generateGif,
  };

  return <VideoContext.Provider value={value}>{children}</VideoContext.Provider>;
};
