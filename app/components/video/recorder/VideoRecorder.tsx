'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { RecordingProgress } from './RecordingProgress';
import { RecordingControls } from './RecordingControls';
import { CameraError } from './CameraError';
import { RecordingIndicator } from './RecordingIndicator';
import { MAX_RECORDING_DURATION, useVideo } from '@/context/video-context';
import {Spinner, SpinnerText} from '@/components/Spinner';
import { getMediaDevices, getOptimalVideoConstraints } from '@/lib/utils';

export const VideoRecorder = ({ device }: { device: string }) => {
    const {
        isRecording,
        isMirrored,
        mimeType,
        handleStartRecording,
        handleStopRecording,
        handleVideoRecorded,
    } = useVideo();
const [videoConstraints, setVideoConstraints] = useState<MediaTrackConstraints | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const streamRef = useRef<MediaStream | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [isControlsVisible, setIsControlsVisible] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();
  const [recordingTime, setRecordingTime] = useState(0);
  const recordingTimerRef = useRef<NodeJS.Timeout>();


  const initializeCamera = useCallback(async () => {
    try {
      setIsInitializing(true);
      setPermissionError(null);
      
      const mediaDevices = await getMediaDevices();
      const constraints = await getOptimalVideoConstraints(device);
      setVideoConstraints(constraints);
      const mediaStream = await mediaDevices.getUserMedia({
        video: constraints
      });

      if (!mediaStream.getVideoTracks().length) {
        throw new Error('No video tracks available');
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      streamRef.current = mediaStream;
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await new Promise<void>((resolve) => {
          if (!videoRef.current) return;
          videoRef.current.onloadeddata = () => resolve();
          if (videoRef.current.readyState >= 2) resolve();
        });
      }
    } catch (error: unknown) {
      console.error('Error accessing camera:', error);
      let errorMessage = 'Camera access was denied. Please check your browser permissions and make sure your camera is connected.';
      
      if (error instanceof Error) {
        switch (error.name) {
          case 'NotFoundError':
          case 'DevicesNotFoundError':
            errorMessage = 'No camera device was found. Please connect a camera and try again.';
            break;
          case 'NotReadableError':
          case 'TrackStartError':
            errorMessage = 'Your camera is in use by another application. Please close other applications and try again.';
            break;
          case 'OverconstrainedError':
            errorMessage = 'Could not find a suitable camera. Please try with a different camera.';
            break;
        }
      }
      
      setPermissionError(errorMessage);
    } finally {
      setIsInitializing(false);
    }
  }, [device]);

  
  useEffect(() => {
    initializeCamera();
    return () => {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop();
        })
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [device]);

  useEffect(() => {
    if (isRecording && streamRef.current) {
      startRecording();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording]);


  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      const finalTime = recordingTime;
      mediaRecorderRef.current.requestData();
      mediaRecorderRef.current.stop();
      handleStopRecording();
      
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { 
          type: mimeType
        });
        handleVideoRecorded(blob, finalTime);
      };
    }
  }, [handleStopRecording, handleVideoRecorded, recordingTime, mimeType]);

  const startRecording = useCallback(() => {
    if (!streamRef.current || !videoRef.current) return;

    try {
      let recordingStream = streamRef.current;

      if (isMirrored) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;

        ctx.scale(-1, 1);
        ctx.translate(-canvas.width, 0);

        const canvasStream = canvas.captureStream();
        const audioTrack = streamRef.current.getAudioTracks()[0];
        if (audioTrack) {
          canvasStream.addTrack(audioTrack);
        }

        const drawFrame = () => {
          if (!videoRef.current) return;
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          if (mediaRecorderRef.current?.state === 'recording') {
            requestAnimationFrame(drawFrame);
          }
        };

        recordingStream = canvasStream;
        requestAnimationFrame(drawFrame);
      }

      const options: MediaRecorderOptions = {
        mimeType,
        videoBitsPerSecond: 2500000
      };

      const mediaRecorder = new MediaRecorder(recordingStream, options);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(100);

      setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording' && isRecording) {
          mediaRecorderRef.current.requestData();
          mediaRecorderRef.current.stop();
          handleStopRecording();
          
          mediaRecorderRef.current.onstop = () => {
            const blob = new Blob(chunksRef.current, { 
              type: mimeType
            });
            handleVideoRecorded(blob, MAX_RECORDING_DURATION);
          };
        }
      }, MAX_RECORDING_DURATION * 1000);
    } catch (error) {
      console.error('Recording error:', error);
      setPermissionError('This browser or device might not support video recording. Please try using a different browser (like Chrome) or device.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamRef.current, handleStopRecording, isRecording, stopRecording, isMirrored]);

  const handleMouseMove = useCallback(() => {
    setIsControlsVisible(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (!isRecording) {
        setIsControlsVisible(false);
      }
    }, 3000);
  }, [isRecording]);

  useEffect(() => {
    const video = videoRef.current;
    if (video && streamRef.current) {
        video.srcObject = streamRef.current;
    }
    return () => {
        if (video) {
            video.srcObject = null;
        }
    };
  }, []);

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop();
        })
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isRecording) {
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => Math.min(prev + 1, MAX_RECORDING_DURATION));
      }, 1000);
    } else if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }

    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, [isRecording]);

  if (permissionError) {
    return <div className="h-full flex items-center justify-center min-h-[300px] md:min-h-[400px]">
        <CameraError errorMessage={permissionError} onRetry={initializeCamera} />
        </div>
  }

  if (isInitializing) {
    return <div className="h-full flex items-center justify-center min-h-[300px] md:min-h-[400px]">
        <div className="flex flex-col items-center justify-center gap-2">
            <Spinner size={12} />
            <SpinnerText text="Initializing camera..." />
        </div>
    </div>;
  }

  return (
    <div 
      className="relative h-full"
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsControlsVisible(true)}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full  bg-gray-100 rounded-lg ${isMirrored ? 'scale-x-[-1]' : ''} ${videoConstraints ? `aspect-${videoConstraints.aspectRatio}` : ''}`}
      />
      
      <AnimatePresence>
        <RecordingIndicator isRecording={isRecording} />
      </AnimatePresence>

      <AnimatePresence>
        {isRecording && (
          <RecordingProgress 
            recordingTime={recordingTime} 
            maxRecordingDuration={MAX_RECORDING_DURATION} 
          />
        )}
      </AnimatePresence>
      
      <AnimatePresence>
        {(isControlsVisible || isRecording) && (
          <RecordingControls
            isRecording={isRecording}
            onStartRecording={handleStartRecording}
            onStopRecording={stopRecording}
          />
        )}
      </AnimatePresence>
    </div>
  );
}; 