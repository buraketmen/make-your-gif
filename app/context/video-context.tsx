"use client"
import { createContext, useContext, useState, useRef, useEffect, ReactNode, useCallback } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { DrawingFrame, Mode } from '@/types/draw';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { drawFrameToCanvas, extractFramesFromVideo } from '@/lib/utils';

// Constants
const TARGET_FPS = 24; // Base FPS
const MAX_FRAMES = 60; // Maximum number of frames to extract

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
  // Video States
  lastUpdatedAt: number;
  baseVideoBlob: Blob | null;
  setBaseVideoBlob: (blob: Blob | null) => void;
  videoBlob: Blob | null;
  setVideoBlob: (blob: Blob | null) => void;
  videoFilters: VideoFilters;
  setVideoFilters: (filters: VideoFilters) => void;
  processes: {
    isConverting: boolean; // Used for converting recording to original size
    isFrameExtracting: boolean;
    isCropping: boolean;
    isTrimming: boolean;
    isGeneratingGif: boolean;
  },
  isRecording: boolean;
  setIsRecording: (value: boolean) => void;
  mode: Mode;
  setMode: (mode: Mode) => void;

  // GIF States
  gifUrl: string | null;

  // Editor States
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

  // Handlers
  handleStartRecording: () => void;
  handleStopRecording: () => void;
  handleVideoRecorded: (blob: Blob, videoDuration: number) => void;
  handleFileSelected: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleBack: () => void;
  handleCropVideo: () => Promise<void>;
  handleResetCrop: () => void;
  handleDownloadGif: () => void;
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
  // Video States
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number>(0);
  const [baseVideoBlob, setBaseVideoBlob] = useState<Blob | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
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
  const [isRecording, setIsRecording] = useState(false);
  const [mode, setMode] = useState<Mode>('record');

  // GIF States
  const [gifUrl, setGifUrl] = useState<string | null>(null);

  // Editor States
  const [duration, setDuration] = useState(0);
  const [frames, setFrames] = useState<DrawingFrame[]>([]);
  const [selectedFrame, setSelectedFrame] = useState<DrawingFrame | null>(null);
  

  // Refs
  const ffmpegRef = useRef<FFmpeg | null>(null);

  useEffect(() => {
    if (videoFilters.crop.isActive === false && videoFilters.trim.isActive === false) {
      setVideoBlob(baseVideoBlob);
    }
  }, [baseVideoBlob, videoFilters.crop.isActive, videoFilters.trim.isActive]);

  // FFmpeg Loading
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

    const handleGifUrlChange = useCallback((newUrl: string | null) => {
        if (gifUrl) {
        URL.revokeObjectURL(gifUrl);
        }
        setGifUrl(newUrl);
    }, [gifUrl]);

  // Generate GIF function
  const generateGif = useCallback(async () => {
    if (!videoBlob) {
      return;
    }

    // If frames are not ready yet, wait for them
    if (frames.length === 0) {
      return;
    }

    try {
      setProcesses(prev => ({ ...prev, isGeneratingGif: true }));
      await loadFFmpeg();
      const ffmpeg = ffmpegRef.current!;

      // Create a temporary canvas for drawing frames
      const canvas = document.createElement('canvas');
      canvas.width = frames[0].width;
      canvas.height = frames[0].height;

      // Process each frame with its drawings
      for (let i = 0; i < frames.length; i++) {
        const frame = frames[i];
        
        // Draw frame using utility function
        await drawFrameToCanvas(frame, canvas);

        // Save frame to file
        await new Promise<void>((resolve) => {
          canvas.toBlob(async (blob) => {
            if (blob) {
              await ffmpeg.writeFile(`frame${i}.jpg`, await fetchFile(blob));
              resolve();
            }
          }, 'image/jpeg');
        });
      }

      // Build the filter complex command
      const filterCommands = [];
      
      // Add trim filter if needed
      if (videoFilters.trim.isActive) {
        filterCommands.push(`trim=start=${videoFilters.trim.start}:end=${videoFilters.trim.end}`);
      }

      // Add crop filter if video is cropped
      if (videoFilters.crop.isActive) {
        const { x, y, width, height } = videoFilters.crop.coordinates;
        filterCommands.push(`crop=iw*${width/100}:ih*${height/100}:iw*${x/100}:ih*${y/100}`);
      }

      // Add standard GIF conversion filters
      filterCommands.push('scale=480:-1:flags=lanczos');

      // Combine all filters
      const filterComplex = filterCommands.join(',');

      // Create GIF from processed frames using constant FPS
      await ffmpeg.exec([
        '-framerate', TARGET_FPS.toString(),
        '-i', 'frame%d.jpg',
        '-vf', filterComplex,
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
  }, [videoBlob, frames, videoFilters, loadFFmpeg, handleGifUrlChange]);

  // Single effect to handle GIF updates
  useEffect(() => {
    if (!videoBlob || frames.length === 0) return;

    const timeoutId = setTimeout(() => {
      generateGif();
    }, 500);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoBlob, frames,  lastUpdatedAt]);

  useEffect(() => {
    return () => {
      if (gifUrl) URL.revokeObjectURL(gifUrl);
    };
  }, [gifUrl]);

  // Recording Handlers
  const handleStartRecording = () => {
    setIsRecording(true);
  };

  const handleStopRecording = () => {
    setIsRecording(false);
  };

  const cropVideoToOriginalSize = async (blob: Blob): Promise<Blob> => {
    try {
      // Get video dimensions first
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

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      try {
        const croppedBlob = await cropVideoToOriginalSize(file);
        setBaseVideoBlob(croppedBlob);
        setVideoBlob(croppedBlob);
        
        // Get video duration
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

  // Frame extraction function
  const extractFramesForVideo = async (blob: Blob) => {
    if (!blob) {
      return;
    }

    const video = document.createElement('video');
    
    const handleVideoLoad = () => {
      // Wait for metadata and ensure duration is valid
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
              MAX_FRAMES,
              videoFilters.trim.isActive ? videoFilters.trim.start : undefined,
              videoFilters.trim.isActive ? videoFilters.trim.end : undefined
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

  // Navigation Handler
  const handleBack = () => {
    // Reset all states
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

  // Video Crop Handler
  const handleCropVideo = async () => {
    if (!baseVideoBlob) return;
    try {
      setProcesses(prev => ({ ...prev, isCropping: true }));
      await loadFFmpeg();
      const ffmpeg = ffmpegRef.current!;

      await ffmpeg.writeFile('input.webm', await fetchFile(baseVideoBlob));

      const { x, y, width, height } = videoFilters.crop.coordinates;
      const cropFilter = `crop=iw*${width/100}:ih*${height/100}:iw*${x/100}:ih*${y/100}`;
      await ffmpeg.exec([
        '-i', 'input.webm',
        '-vf', cropFilter,
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

  // Reset Crop Handler
  const handleResetCrop = () => {
    if (videoBlob !== baseVideoBlob) {
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

  // Update setTrimStart and setTrimEnd to track trim state
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

  // GIF Download Handler
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
    // Video States
    lastUpdatedAt,
    baseVideoBlob,
    setBaseVideoBlob,
    videoBlob,
    setVideoBlob,
    videoFilters,
    setVideoFilters,
    processes,
    isRecording,
    setIsRecording,
    mode,
    setMode,

    // GIF States
    gifUrl,

    // Editor States
    duration,
    setDuration,
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
    frames,
    setFrames,
    selectedFrame,
    setSelectedFrame,

    // Handlers
    handleStartRecording,
    handleStopRecording,
    handleVideoRecorded,
    handleFileSelected,
    handleBack,
    handleCropVideo,
    handleResetCrop,
    handleDownloadGif
  };

  return (
    <VideoContext.Provider value={value}>
      {children}
    </VideoContext.Provider>
  );
}; 