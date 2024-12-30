'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { VideoRecorderProps } from './types';
import { RecordingProgress } from './RecordingProgress';
import { RecordingControls } from './RecordingControls';
import { CameraError } from './CameraError';
import { RecordingIndicator } from './RecordingIndicator';

const MAX_RECORDING_DURATION = 15; // seconds

export const VideoRecorder = ({ 
  onRecordingComplete, 
  isRecording, 
  onStopRecording,
  onStartRecording 
}: VideoRecorderProps) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
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
      setPermissionError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      if (mediaStream.getVideoTracks().length === 0) {
        throw new Error('No video tracks available');
      }

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        // Wait for video metadata to load
        await new Promise<void>((resolve) => {
          if (!videoRef.current) return;
          if (videoRef.current.readyState >= 2) {
            resolve();
          } else {
            videoRef.current.onloadeddata = () => resolve();
          }
        });
      }
    } catch (error: unknown) {
      console.error('Error accessing camera:', error);
      let errorMessage = 'Camera access was denied. Please check your browser permissions and make sure your camera is connected.';
      
      if (error instanceof Error) {
        if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
          errorMessage = 'No camera device was found. Please connect a camera and try again.';
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
          errorMessage = 'Your camera is in use by another application. Please close other applications and try again.';
        } else if (error.name === 'OverconstrainedError') {
          errorMessage = 'Could not find a suitable camera. Please try with a different camera.';
        }
      }
      
      setPermissionError(errorMessage);
    }
  }, []);

  useEffect(() => {
    initializeCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (isRecording && stream) {
      startRecording();
    }
  }, [isRecording]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      const finalTime = recordingTime;
      mediaRecorderRef.current.requestData();
      mediaRecorderRef.current.stop();
      onStopRecording();
      
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { 
          type: 'video/webm;codecs=h264' 
        });
        onRecordingComplete(blob, finalTime);
      };
    }
  }, [onStopRecording, onRecordingComplete, recordingTime]);

  const startRecording = useCallback(() => {
    if (!stream) return;

    try {
      const options = { 
        mimeType: 'video/webm;codecs=h264',
        videoBitsPerSecond: 2500000 // 2.5 Mbps for better quality
      };

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      // Request data every second for more reliable recording
      mediaRecorder.start(1000);

      setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording' && isRecording) {
          stopRecording();
        }
      }, MAX_RECORDING_DURATION * 1000);
    } catch (error) {
      console.error('Error starting recording:', error);
      // Try fallback codec if h264 is not supported
      try {
        const fallbackOptions = { 
          mimeType: 'video/webm',
          videoBitsPerSecond: 2500000
        };
        const mediaRecorder = new MediaRecorder(stream, fallbackOptions);
        mediaRecorderRef.current = mediaRecorder;
        chunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            chunksRef.current.push(event.data);
          }
        };

        mediaRecorder.start(1000);

        setTimeout(() => {
          if (mediaRecorderRef.current?.state === 'recording' && isRecording) {
            stopRecording();
          }
        }, MAX_RECORDING_DURATION * 1000);
      } catch (fallbackError) {
        console.error('Error with fallback recording:', fallbackError);
        setPermissionError('Failed to start recording. Your browser might not support video recording.');
        onStopRecording();
      }
    }
  }, [stream, onRecordingComplete, onStopRecording, isRecording, stopRecording]);

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
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
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
    return <CameraError errorMessage={permissionError} onRetry={initializeCamera} />;
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
        className="w-full h-full object-cover rounded-lg"
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
            onStartRecording={onStartRecording}
            onStopRecording={stopRecording}
            isControlsVisible={isControlsVisible}
          />
        )}
      </AnimatePresence>
    </div>
  );
}; 