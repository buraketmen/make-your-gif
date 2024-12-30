import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Camera } from 'lucide-react';

interface VideoRecorderProps {
  onRecordingComplete: (blob: Blob) => void;
  isRecording: boolean;
  onStopRecording: () => void;
}

export const VideoRecorder = ({ onRecordingComplete, isRecording, onStopRecording }: VideoRecorderProps) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

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
        onRecordingComplete(blob);
      };

      mediaRecorder.start();

      // Stop recording after 10 seconds
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          stopRecording();
        }
      }, 10000);
    } catch (error) {
      console.error('Error starting recording:', error);
      setPermissionError('Failed to start recording. Please try again.');
      onStopRecording();
    }
  }, [stream, onRecordingComplete, onStopRecording]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      onStopRecording();
    }
  }, [onStopRecording]);

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
    <div className="relative h-full">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
      />
      {isRecording && (
        <div className="absolute top-4 right-4 bg-rose-500 text-white px-3 py-1 rounded-full text-sm font-medium animate-pulse">
          Recording...
        </div>
      )}
    </div>
  );
}; 