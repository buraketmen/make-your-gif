"use client"
import { createContext, useContext, useState, useRef, useEffect, ReactNode } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

type Mode = 'record' | 'upload';

interface VideoContextType {
  // Video States
  videoBlob: Blob | null;
  setVideoBlob: (blob: Blob | null) => void;
  isRecording: boolean;
  setIsRecording: (value: boolean) => void;
  mode: Mode;
  setMode: (mode: Mode) => void;

  // GIF States
  gifUrl: string | null;
  isProcessing: boolean;

  // Editor States
  duration: number;
  setDuration: (value: number) => void;
  trimStart: number;
  trimEnd: number;
  setTrimStart: (value: number) => void;
  setTrimEnd: (value: number) => void;
  crop: { x: number; y: number; width: number; height: number };
  setCrop: (crop: { x: number; y: number; width: number; height: number }) => void;
  isCropMode: boolean;
  setIsCropMode: (value: boolean) => void;
  croppedVideoUrl: string | null;

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
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mode, setMode] = useState<Mode>('record');

  // GIF States
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Editor States
  const [duration, setDuration] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [crop, setCrop] = useState({ x: 20, y: 20, width: 60, height: 60 });
  const [isCropMode, setIsCropMode] = useState(false);
  const [croppedVideoUrl, setCroppedVideoUrl] = useState<string | null>(null);

  // Refs
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const previewTimeoutRef = useRef<NodeJS.Timeout>();

  // FFmpeg Loading
  const loadFFmpeg = async () => {
    if (!ffmpegRef.current) {
      const ffmpeg = new FFmpeg();
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.4/dist/umd';
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });
      ffmpegRef.current = ffmpeg;
    }
  };

  // Recording Handlers
  const handleStartRecording = () => {
    setIsRecording(true);
  };

  const handleStopRecording = () => {
    setIsRecording(false);
  };

  const handleVideoRecorded = async (blob: Blob, videoDuration: number) => {
    setVideoBlob(blob);
    setIsRecording(false);
    setDuration(videoDuration);
    setTrimEnd(videoDuration);

    // Generate GIF immediately
    try {
      setIsProcessing(true);
      await loadFFmpeg();
      const ffmpeg = ffmpegRef.current!;

      await ffmpeg.writeFile('input.webm', await fetchFile(blob));
      await ffmpeg.exec([
        '-i', 'input.webm',
        '-vf', 'fps=10,scale=480:-1:flags=lanczos',
        'output.gif'
      ]);

      const data = await ffmpeg.readFile('output.gif');
      const gifBlob = new Blob([data], { type: 'image/gif' });
      
      if (gifUrl) {
        URL.revokeObjectURL(gifUrl);
      }
      setGifUrl(URL.createObjectURL(gifBlob));
    } catch (error) {
      console.error('Error generating GIF:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // File Upload Handler
  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      setVideoBlob(file);
      
      // Get video duration
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.src = URL.createObjectURL(file);
      
      video.onloadedmetadata = async () => {
        const videoDuration = Math.floor(video.duration);
        setDuration(videoDuration);
        setTrimEnd(videoDuration);
        URL.revokeObjectURL(video.src);

        // Generate GIF immediately
        try {
          setIsProcessing(true);
          await loadFFmpeg();
          const ffmpeg = ffmpegRef.current!;

          await ffmpeg.writeFile('input.webm', await fetchFile(file));
          await ffmpeg.exec([
            '-i', 'input.webm',
            '-vf', 'fps=10,scale=480:-1:flags=lanczos',
            'output.gif'
          ]);

          const data = await ffmpeg.readFile('output.gif');
          const gifBlob = new Blob([data], { type: 'image/gif' });
          
          if (gifUrl) {
            URL.revokeObjectURL(gifUrl);
          }
          setGifUrl(URL.createObjectURL(gifBlob));
        } catch (error) {
          console.error('Error generating GIF:', error);
        } finally {
          setIsProcessing(false);
        }
      };
    }
  };

  // Navigation Handler
  const handleBack = () => {
    setVideoBlob(null);
    setMode('record');
    if (gifUrl) URL.revokeObjectURL(gifUrl);
    if (croppedVideoUrl) URL.revokeObjectURL(croppedVideoUrl);
    setGifUrl(null);
    setCroppedVideoUrl(null);
    setTrimStart(0);
    setTrimEnd(0);
    setCrop({ x: 20, y: 20, width: 60, height: 60 });
    setIsCropMode(false);
  };

  // Video Crop Handler
  const handleCropVideo = async () => {
    if (!videoBlob) return;

    try {
      setIsProcessing(true);
      await loadFFmpeg();
      const ffmpeg = ffmpegRef.current!;

      await ffmpeg.writeFile('input.webm', await fetchFile(videoBlob));

      const cropFilter = `crop=iw*${crop.width/100}:ih*${crop.height/100}:iw*${crop.x/100}:ih*${crop.y/100}`;
      await ffmpeg.exec([
        '-i', 'input.webm',
        '-vf', cropFilter,
        '-c:v', 'vp8',
        'output.webm'
      ]);

      const data = await ffmpeg.readFile('output.webm');
      const croppedBlob = new Blob([data], { type: 'video/webm' });
      
      if (croppedVideoUrl) {
        URL.revokeObjectURL(croppedVideoUrl);
      }
      setCroppedVideoUrl(URL.createObjectURL(croppedBlob));
      setIsCropMode(false);
    } catch (error) {
      console.error('Error cropping video:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Reset Crop Handler
  const handleResetCrop = () => {
    if (croppedVideoUrl) {
      URL.revokeObjectURL(croppedVideoUrl);
      setCroppedVideoUrl(null);
    }
    setCrop({ x: 20, y: 20, width: 60, height: 60 });
  };

  // GIF Preview Update
  const updatePreview = async () => {
    if (!videoBlob) return;
    
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
    }

    previewTimeoutRef.current = setTimeout(async () => {
      try {
        setIsProcessing(true);
        await loadFFmpeg();
        const ffmpeg = ffmpegRef.current!;

        const inputVideo = croppedVideoUrl ? await fetch(croppedVideoUrl).then(r => r.blob()) : videoBlob;
        await ffmpeg.writeFile('input.webm', await fetchFile(inputVideo));

        await ffmpeg.exec([
          '-i', 'input.webm',
          '-t', String(trimEnd - trimStart),
          '-ss', String(trimStart),
          '-vf', 'fps=10,scale=480:-1:flags=lanczos',
          'output.gif'
        ]);

        const data = await ffmpeg.readFile('output.gif');
        const gifBlob = new Blob([data], { type: 'image/gif' });
        
        if (gifUrl) {
          URL.revokeObjectURL(gifUrl);
        }
        setGifUrl(URL.createObjectURL(gifBlob));
      } catch (error) {
        console.error('Error updating preview:', error);
      } finally {
        setIsProcessing(false);
      }
    }, 500);
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

  // Effects
  useEffect(() => {
    updatePreview();
    return () => {
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
      }
    };
  }, [trimStart, trimEnd, croppedVideoUrl]);

  useEffect(() => {
    return () => {
      if (gifUrl) URL.revokeObjectURL(gifUrl);
      if (croppedVideoUrl) URL.revokeObjectURL(croppedVideoUrl);
    };
  }, []);

  const value = {
    // Video States
    videoBlob,
    setVideoBlob,
    isRecording,
    setIsRecording,
    mode,
    setMode,

    // GIF States
    gifUrl,
    isProcessing,

    // Editor States
    duration,
    setDuration,
    trimStart,
    trimEnd,
    setTrimStart,
    setTrimEnd,
    crop,
    setCrop,
    isCropMode,
    setIsCropMode,
    croppedVideoUrl,

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