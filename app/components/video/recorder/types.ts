export interface VideoRecorderProps {
  onRecordingComplete: (blob: Blob, duration: number) => void;
  isRecording: boolean;
  onStopRecording: () => void;
  onStartRecording: () => void;
}

export interface RecordingProgressProps {
  recordingTime: number;
  maxRecordingDuration: number;
}

export interface RecordingControlsProps {
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  isControlsVisible: boolean;
}

export interface CameraErrorProps {
  errorMessage: string;
  onRetry: () => void;
} 