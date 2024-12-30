import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Camera, StopCircle, Video } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MAX_RECORDING_DURATION = 15; // seconds

interface VideoRecorderProps {
  onRecordingComplete: (blob: Blob, duration: number) => void;
  isRecording: boolean;
  onStopRecording: () => void;
  onStartRecording: () => void;
}

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
      
      // Use the final recording time for the blob
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        onRecordingComplete(blob, finalTime);
      };
    }
  }, [onStopRecording, onRecordingComplete, recordingTime]);

  const startRecording = useCallback(() => {
    if (!stream) return;

    try {
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const duration = recordingTime;
        onRecordingComplete(blob, duration);
      };

      mediaRecorder.start();

      setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording' && isRecording) {
          stopRecording();
        }
      }, MAX_RECORDING_DURATION * 1000);
    } catch (error) {
      console.error('Error starting recording:', error);
      setPermissionError('Failed to start recording. Please try again.');
      onStopRecording();
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
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center p-4">
          <div className="mb-4">
            <Camera className="w-12 h-12 text-rose-500 mx-auto" />
          </div>
          <p className="text-sm text-red-500 mb-4">{permissionError}</p>
          <Button
            onClick={initializeCamera}
            variant="outline"
            className="text-rose-500 hover:text-rose-600"
          >
            Try Again
          </Button>
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
        className="w-full h-full object-cover rounded-lg"
      />
      
      {/* Progress bar */}
      <AnimatePresence>
        {isRecording && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-4 right-4 flex flex-col items-end gap-2"
          >
            <div className="relative w-48 h-1.5 bg-black/30 rounded-full overflow-hidden backdrop-blur-sm">
              <motion.div 
                className="absolute left-0 top-0 h-full bg-rose-500"
                initial={{ width: "0%" }}
                animate={{ width: `${(recordingTime / MAX_RECORDING_DURATION) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <p className="text-sm text-white bg-black/50 px-3 py-1 rounded-full backdrop-blur-sm">
              {recordingTime}s / {MAX_RECORDING_DURATION}s
            </p>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Recording controls and progress */}
      <AnimatePresence>
        {(isControlsVisible || isRecording) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex flex-col items-center"
          >
            {/* Record/Stop button */}
            <div className="p-2 rounded-full bg-black/50 backdrop-blur-sm">
              {!isRecording ? (
                <Button
                  onClick={onStartRecording}
                  variant="default"
                  size="lg"
                  className="bg-rose-500 hover:bg-rose-600 rounded-full"
                >
                  <Video className="h-8 w-8" />
                </Button>
              ) : (
                <Button
                  onClick={stopRecording}
                  variant="destructive"
                  size="lg"
                  className="rounded-full animate-pulse"
                >
                  <StopCircle className="h-8 w-8" />
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recording indicator */}
      <AnimatePresence>
        {isRecording && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute top-4 left-4 flex items-center gap-2 bg-rose-500 text-white px-3 py-1 rounded-full text-sm font-medium"
          >
            <motion.div
              className="w-2 h-2 bg-white rounded-full"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{
                duration: 1,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            Recording
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}; 