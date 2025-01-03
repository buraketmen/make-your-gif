"use client"
import { createContext, useContext, useState, useRef, useEffect, ReactNode, useCallback } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { DrawingFrame, Mode } from '@/types/draw';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { drawFrameToCanvas, extractFramesFromVideo, calculateCropDimensions } from '@/lib/utils';

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
  lastUpdatedAt: number;
  cameras: MediaDeviceInfo[];
  setCameras: (cameras: MediaDeviceInfo[]) => void;
  currentCameraId: string | null;
  onCameraChange: (cameraId: string) => void;
  baseVideoBlob: Blob | null;
  setBaseVideoBlob: (blob: Blob | null) => void;
  videoBlob: Blob | null;
  setVideoBlob: (blob: Blob | null) => void;
  videoFilters: VideoFilters;
  setVideoFilters: (filters: VideoFilters) => void;
  processes: {
    isConverting: boolean;
    isFrameExtracting: boolean;
    isCropping: boolean;
    isTrimming: boolean;
    isGeneratingGif: boolean;
  },
  frameProgress: {
    current: number;
    total: number;
  },
  isRecording: boolean;
  setIsRecording: (value: boolean) => void;
  isMirrored: boolean;
  setIsMirrored: (value: boolean) => void;
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
  handleVideoRecorded: (blob: Blob, videoDuration: number) => void;
  handleFileSelected: (file: File) => void;
  handleBack: () => void;
  handleCropVideo: () => Promise<void>;
  handleResetCrop: () => void;
  handleDownloadGif: () => void;
  gifSize: number;
  setGifSize: (size: number) => void;
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
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number>(0);
  const [baseVideoBlob, setBaseVideoBlob] = useState<Blob | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [currentCameraId, setCurrentCameraId] = useState<string | null>(null);
  const [videoFilters, setVideoFilters] = useState({
    trim: {
      start: 0,
      end: 0,
      isActive: false
    },
    crop: {
      coordinates: { x: 20, y: 20, width: 60, height: 60 },
      isActive: false,
      isCropMode: false
    }
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
  
  useEffect(() => {
    if (videoFilters.crop.isActive === false && videoFilters.trim.isActive === false) {
      setVideoBlob(baseVideoBlob);
    }
  }, [baseVideoBlob, videoFilters.crop.isActive, videoFilters.trim.isActive]);

  useEffect(() => {
    if (cameras.length > 0) {
      onCameraChange(cameras[0].deviceId);
    }
  }, [cameras]);

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

  const onCameraChange = (cameraId: string) => {
    setCurrentCameraId(cameraId);
  };

    const handleGifUrlChange = useCallback((newUrl: string | null) => {
        if (gifUrl) {
        URL.revokeObjectURL(gifUrl);
        }
        setGifUrl(newUrl);
    }, [gifUrl]);

  const generateGif = useCallback(async () => {
    if (!videoBlob || frames.length === 0) {
      return;
    }

    try {
      setProcesses(prev => ({ ...prev, isGeneratingGif: true }));
      await loadFFmpeg();
      const ffmpeg = ffmpegRef.current!;

      const canvas = document.createElement('canvas');
      canvas.width = frames[0].width;
      canvas.height = frames[0].height;

      for (let i = 0; i < frames.length; i++) {
        const frame = frames[i];
        await drawFrameToCanvas(frame, canvas);
        await new Promise<void>((resolve) => {
          canvas.toBlob(async (blob) => {
            if (blob) {
              await ffmpeg.writeFile(`frame${i}.jpg`, await fetchFile(blob));
              resolve();
            }
          }, 'image/jpeg');
        });
      }

      const filterCommands = [];
      if (videoFilters.trim.isActive) {
        filterCommands.push(`trim=start=${videoFilters.trim.start}:end=${videoFilters.trim.end}`);
      }
      filterCommands.push(`scale=${gifSize}:-1:flags=lanczos`);
      const filterComplex = filterCommands.join(',');

      await ffmpeg.exec([
        '-framerate', TARGET_FPS.toString(),
        '-i', 'frame%d.jpg',
        '-vf', filterComplex,
        '-r', TARGET_FPS.toString(),
        'output.gif'
      ]);

      const data = await ffmpeg.readFile('output.gif');
      const gifBlob = new Blob([data], { type: 'image/gif' });
      handleGifUrlChange(URL.createObjectURL(gifBlob));
    } catch (error) {
      console.error('Error generating GIF:', error);
    } finally {
      setProcesses(prev => ({ ...prev, isGeneratingGif: false }));
    }
  }, [videoBlob, frames, videoFilters, loadFFmpeg, handleGifUrlChange, gifSize]);

  useEffect(() => {
    if (!videoBlob || frames.length === 0) return;

    const timeoutId = setTimeout(() => {
      generateGif();
    }, 500);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoBlob, frames, lastUpdatedAt, gifSize]);

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

  const cropVideoToOriginalSize = async (blob: Blob): Promise<Blob> => {
    try {
      setProcesses(prev => ({ ...prev, isConverting: true }));
      const video = document.createElement('video');
      video.preload = 'metadata';
      
      await new Promise((resolve) => {
        video.onloadedmetadata = () => resolve(null);
        video.src = URL.createObjectURL(blob);
      });

      const width = video.videoWidth;
      const height = video.videoHeight;
      URL.revokeObjectURL(video.src);
      video.remove();


      await loadFFmpeg();
      const ffmpeg = ffmpegRef.current!;

      await ffmpeg.writeFile('input.webm', await fetchFile(blob));

      try {
        await ffmpeg.exec([
          '-i', 'input.webm',
          '-vf', `crop=${width}:${height}:0:0`,
          '-c:v', 'vp8',
          '-b:v', '1M',
          '-r', '30',
          '-deadline', 'realtime',
          '-cpu-used', '4',
          'output.webm'
        ]);
      } catch (execError) {
        console.error('FFmpeg execution error:', execError);
        throw execError;
      }

      const data = await ffmpeg.readFile('output.webm');
      
      return new Blob([data], { type: 'video/webm' });
    } catch (error) {
      console.error('Error cropping video to original size:', error);
      return blob;
    } finally {
      setProcesses(prev => ({ ...prev, isConverting: false }));
    }
  };

  const handleVideoRecorded = async (blob: Blob, videoDuration: number) => {
    try {
        const croppedBlob = await cropVideoToOriginalSize(blob);
        setBaseVideoBlob(croppedBlob);
        setVideoBlob(croppedBlob);
        setIsRecording(false);
        setDuration(videoDuration);
        setVideoFilters(prev => ({
            ...prev,
            trim: { ...prev.trim, end: videoDuration }
        }));
        await extractFramesForVideo(croppedBlob);
        } catch (error) {
        console.error('Error handling recorded video:', error);
        } finally {
        setProcesses(prev => ({ ...prev, isConverting: false }));
        }
  };

  const handleFileSelected = async (file: File) => {
    if (file && file.type.startsWith('video/')) {
      try {
        const croppedBlob = await cropVideoToOriginalSize(file);
        setBaseVideoBlob(croppedBlob);
        setVideoBlob(croppedBlob);
        
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.src = URL.createObjectURL(croppedBlob);
        
        video.onloadedmetadata = async () => {
          const videoDuration = Math.floor(video.duration);
          setDuration(videoDuration);
          setVideoFilters(prev => ({
            ...prev,
            trim: { ...prev.trim, end: videoDuration }
          }));
          URL.revokeObjectURL(video.src);
          await extractFramesForVideo(croppedBlob);
        };
      } catch (error) {
        console.error('Error handling selected file:', error);
      }
    }
  };

  const extractFramesForVideo = async (blob: Blob) => {
    if (!blob) {
      return;
    }

    const video = document.createElement('video');
    const handleVideoLoad = () => {
      const waitForValidDuration = () => {
        return new Promise<void>((resolve) => {
          const checkDuration = () => {
            if (video.duration && isFinite(video.duration) && video.videoWidth && video.videoHeight) {
              resolve();
            } else {
              setTimeout(checkDuration, 50);
            }
          };
          checkDuration();
        });
      };

      waitForValidDuration()
        .then(async () => {
          try {
            setProcesses(prev => ({ ...prev, isFrameExtracting: true }));
            const frames = await extractFramesFromVideo(
              video,
              TARGET_FPS,
              videoFilters.trim.isActive ? videoFilters.trim.start : undefined,
              videoFilters.trim.isActive ? videoFilters.trim.end : undefined,
              (current, total) => {
                setFrameProgress({ current, total });
              }
            );
            
            setFrames(frames);
          } catch (error) {
            console.error('Error extracting frames:', error);
          } finally {
            setProcesses(prev => ({ ...prev, isFrameExtracting: false }));
            video.remove();
            
          }
        })
        .catch(error => {
          console.error('Error loading video:', error);
          video.remove();
          setProcesses(prev => ({ ...prev, isFrameExtracting: false }));
        });
    };

    video.preload = "auto";
    video.muted = true;
    video.onloadeddata = handleVideoLoad;
    video.onerror = (error) => {
      console.error('Error loading video:', error);
    };
    
    video.src = URL.createObjectURL(blob);
    video.load();

    return () => {
      video.remove();
    };
  };

  const handleBack = () => {
    setMode('record');
    setBaseVideoBlob(null);
    setVideoBlob(null);
    setFrames([]);
    setSelectedFrame(null);
    setDuration(0);
    setVideoFilters({
      trim: {
        start: 0,
        end: 0,
        isActive: false
      },
      crop: {
        coordinates: { x: 20, y: 20, width: 60, height: 60 },
        isActive: false,
        isCropMode: false
      }
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
  };

  const handleCropVideo = async () => {
    if (!baseVideoBlob) return;
    try {
      setProcesses(prev => ({ ...prev, isCropping: true }));
      setSelectedFrame(null);
      await loadFFmpeg();
      const ffmpeg = ffmpegRef.current!;

      const video = document.createElement('video');
      video.preload = 'metadata';
      
      await new Promise((resolve) => {
        video.onloadedmetadata = () => resolve(null);
        video.src = URL.createObjectURL(baseVideoBlob);
      });

      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;
      URL.revokeObjectURL(video.src);
      video.remove();

      await ffmpeg.writeFile('input.webm', await fetchFile(baseVideoBlob));

      const cropDimensions = calculateCropDimensions(
        videoFilters.crop.coordinates,
        videoWidth,
        videoHeight
      );
      
      await ffmpeg.exec([
        '-i', 'input.webm',
        '-vf', cropDimensions.ffmpegFilter,
        '-c:v', 'vp8',
        'output.webm'
      ]);

      const data = await ffmpeg.readFile('output.webm');
      const croppedBlob = new Blob([data], { type: 'video/webm' });
      
      setVideoBlob(croppedBlob);
      setVideoFilters(prev => ({
        ...prev,
        crop: { ...prev.crop, isActive: true, isCropMode: false }
      }));

      await extractFramesForVideo(croppedBlob);
    } catch (error) {
      console.error('Error cropping video:', error);
    } finally {
      setProcesses(prev => ({ ...prev, isCropping: false }));
      setLastUpdatedAt(Date.now());
    }
  };

  const handleResetCrop = () => {
    if (videoBlob !== baseVideoBlob) {
      setSelectedFrame(null);
      setVideoBlob(baseVideoBlob);
      setVideoFilters(prev => ({
        ...prev,
        crop: {
          coordinates: { x: 20, y: 20, width: 60, height: 60 },
          isActive: false,
          isCropMode: false
        }
      }));
      extractFramesForVideo(baseVideoBlob!);
      setLastUpdatedAt(Date.now());
    }
  };

  const handleTrimStart = (value: number) => {
    setVideoFilters(prev => ({
      ...prev,
      trim: {
        ...prev.trim,
        start: value,
        isActive: value > 0 || prev.trim.end < duration
      }
    }));
    setLastUpdatedAt(Date.now());
  };

  const handleTrimEnd = (value: number) => {
    setVideoFilters(prev => ({
      ...prev,
      trim: {
        ...prev.trim,
        end: value,
        isActive: prev.trim.start > 0 || value < duration
      }
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

  const value = {
    lastUpdatedAt,
    gifUrl,
    processes,
    frameProgress,
    duration,
    setDuration,
    mode,
    setMode,
    cameras,
    setCameras,
    currentCameraId,
    onCameraChange,
    baseVideoBlob,
    setBaseVideoBlob,
    videoBlob,
    setVideoBlob,
    videoFilters,
    setVideoFilters,
    isRecording,
    setIsRecording,
    isMirrored,
    setIsMirrored,
    
    frames,
    setFrames,
    selectedFrame,
    setSelectedFrame,
    
    setTrimStart: handleTrimStart,
    setTrimEnd: handleTrimEnd,
    setCrop: (newCoordinates: { x: number; y: number; width: number; height: number }) => 
      setVideoFilters(prev => ({
        ...prev,
        crop: { ...prev.crop, coordinates: newCoordinates }
      })),
    setIsCropMode: (value: boolean) => 
      setVideoFilters(prev => ({
        ...prev,
        crop: { ...prev.crop, isCropMode: value }
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
  };

  return (
    <VideoContext.Provider value={value}>
      {children}
    </VideoContext.Provider>
  );
}; 