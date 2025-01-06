'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { RecordingProgress } from './RecordingProgress';
import { RecordingControls } from './RecordingControls';
import { CameraError } from './CameraError';
import { RecordingIndicator } from './RecordingIndicator';
import { MAX_RECORDING_DURATION, useVideo } from '@/context/video-context';
import { Spinner, SpinnerText } from '@/components/Spinner';
import { getMediaDevices, getOptimalVideoConstraints } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export const VideoRecorder = ({ device }: { device: string | null }) => {
  const { toast } = useToast();
  const {
    isCameraAllowed,
    isRecording,
    isMirrored,
    mimeType,
    isLandscape,
    refreshCameras,
    handleStartRecording,
    handleStopRecording,
    handleVideoRecorded,
  } = useVideo();
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [isControlsVisible, setIsControlsVisible] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();
  const [recordingTime, setRecordingTime] = useState(0);
  const recordingTimerRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (error) {
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

  const cleanupCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((track) => {
        track.stop();
        track.enabled = false;
      });
      videoRef.current.srcObject = null;
    }
    if (stream) {
      stream.getTracks().forEach((track) => {
        track.stop();
        track.enabled = false;
      });
      setStream(null);
    }
  }, [stream]);

  useEffect(() => {
    if (!isCameraAllowed) {
      setPermissionError(
        'Camera access was denied. Please check your browser permissions and make sure your camera is connected.'
      );
    }
  }, [isCameraAllowed]);

  const initializeCamera = useCallback(async () => {
    try {
      setIsInitializing(true);
      setPermissionError(null);

      const mediaDevices = await getMediaDevices();
      const constraints = await getOptimalVideoConstraints(device, isLandscape);
      const mediaStream = await mediaDevices.getUserMedia({
        video: constraints,
      });

      if (!mediaStream.getVideoTracks().length) {
        setPermissionError(
          'No video tracks available. Please check your browser permissions and make sure your camera is connected.'
        );
        return;
      }

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await new Promise<void>((resolve) => {
          if (!videoRef.current) return;
          videoRef.current.onloadeddata = () => resolve();
          if (videoRef.current.readyState >= 2) resolve();
        });
      }
    } catch (error: unknown) {
      let errorMessage =
        'Camera access was denied. Please check your browser permissions and make sure your camera is connected.';
      if (error instanceof Error) {
        switch (error.name) {
          case 'NotFoundError':
          case 'DevicesNotFoundError':
            errorMessage = 'No camera device was found. Please connect a camera and try again.';
            break;
          case 'NotReadableError':
          case 'TrackStartError':
            errorMessage =
              'Your camera is in use by another application. Please close other applications and try again.';
            break;
          case 'OverconstrainedError':
            errorMessage = 'Could not find a suitable camera. Please try with a different camera.';
            break;
          case 'NotAllowedError':
            errorMessage =
              'Camera access was denied. Please check your browser permissions and make sure your camera is connected.';
            break;
          default:
            errorMessage = 'Error getting camera devices.';
            break;
        }
      }

      setPermissionError(errorMessage);
    } finally {
      setIsInitializing(false);
    }
  }, [device, isLandscape]);

  useEffect(() => {
    const refreshCamerasAction = async () => {
      await refreshCameras();
    };
    if (!device) {
      refreshCamerasAction();
      return;
    }

    cleanupCamera();

    const timeoutId = setTimeout(() => {
      initializeCamera();
    }, 500);

    return () => {
      clearTimeout(timeoutId);
      cleanupCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [device, isLandscape]);

  useEffect(() => {
    if (isRecording && stream) {
      startRecording();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording]);

  const finalizeRecording = useCallback(
    (duration: number) => {
      if (mediaRecorderRef.current?.state === 'recording') {
        try {
          mediaRecorderRef.current.requestData();
          mediaRecorderRef.current.stop();
          handleStopRecording();

          mediaRecorderRef.current.onstop = async () => {
            try {
              console.log('Recording stopped, creating blob...');
              const blob = new Blob(chunksRef.current, {
                type: mimeType,
              });
              console.log('Blob created:', blob.size, 'bytes');

              if (mediaRecorderRef.current) {
                mediaRecorderRef.current.ondataavailable = null;
                mediaRecorderRef.current.onstop = null;
                mediaRecorderRef.current = null;
              }

              if (stream) {
                const tracks = stream.getTracks();
                tracks.forEach((track) => {
                  if (track.readyState === 'live') {
                    track.stop();
                  }
                });
              }

              chunksRef.current = [];

              try {
                console.log('Handling recorded video...');
                await handleVideoRecorded(blob, duration);
                console.log('Video handled successfully');
              } catch (error) {
                setError('Error saving the recorded video. Please try again.' + error);
              }
            } catch (error) {
              setError('Error finalizing recording.' + error);
            }
          };
        } catch (error) {
          setError('Error stopping recording.' + error);
        }
      }
    },
    [handleStopRecording, handleVideoRecorded, mimeType, stream, toast]
  );

  const stopRecording = useCallback(() => {
    finalizeRecording(recordingTime);
  }, [finalizeRecording, recordingTime]);

  const startRecording = useCallback(() => {
    if (!stream || !videoRef.current) return;

    try {
      let recordingStream = stream;

      if (isMirrored) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;

        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;

        ctx.scale(-1, 1);
        ctx.translate(-canvas.width, 0);

        const canvasStream = canvas.captureStream();
        const audioTrack = stream.getAudioTracks()[0];
        if (audioTrack) {
          canvasStream.addTrack(audioTrack);
        }

        const drawFrame = () => {
          if (!videoRef.current) return;
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          if (mediaRecorderRef.current?.state === 'recording') {
            requestAnimationFrame(drawFrame);
          } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            canvas.width = 0;
            canvas.height = 0;
          }
        };

        recordingStream = canvasStream;
        requestAnimationFrame(drawFrame);
      }

      const options: MediaRecorderOptions = {
        mimeType,
        videoBitsPerSecond: 2500000,
      };

      const mediaRecorder = new MediaRecorder(recordingStream, options);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
          if (event.data instanceof Blob) {
            URL.revokeObjectURL(URL.createObjectURL(event.data));
          }
        }
      };

      mediaRecorder.start(100);

      setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording' && isRecording) {
          finalizeRecording(MAX_RECORDING_DURATION);
        }
      }, MAX_RECORDING_DURATION * 1000);
    } catch (error) {
      console.error(error);
      setPermissionError(
        'This browser or device might not support video recording. Please try using a different browser (like Chrome) or device.'
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stream, handleStopRecording, isRecording, stopRecording, isMirrored, finalizeRecording]);

  const handleMouseMove = useCallback(() => {
    setIsControlsVisible(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (!isRecording) {
        setIsControlsVisible(false);
      }
    }, 5000);
  }, [isRecording]);

  useEffect(() => {
    const video = videoRef.current;
    if (video && stream) {
      video.srcObject = stream;
    }
    return () => {
      if (video) {
        video.srcObject = null;
      }
    };
  }, [stream]);

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }

      if (stream) {
        stream.getTracks().forEach((track) => {
          track.stop();
        });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isRecording) {
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => Math.min(prev + 1, MAX_RECORDING_DURATION));
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
    return (
      <div className="h-full flex items-center justify-center min-h-[300px] md:min-h-[400px]">
        <CameraError errorMessage={permissionError} onRetry={initializeCamera} />
      </div>
    );
  }

  if (isInitializing) {
    return (
      <div className="h-full flex items-center justify-center min-h-[300px] md:min-h-[400px]">
        <div className="flex flex-col items-center justify-center gap-2">
          <Spinner size={12} />
          <SpinnerText text="Initializing camera..." />
        </div>
      </div>
    );
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
        className={`w-full h-full  bg-gray-100 rounded-lg ${isMirrored ? 'scale-x-[-1]' : ''} `}
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
