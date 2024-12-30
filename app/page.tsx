'use client';

import { useState } from 'react';
import { VideoRecorder } from './components/VideoRecorder';
import { VideoEditor } from './components/VideoEditor';
import { Button } from "@/components/ui/button";
import { Upload, Camera } from 'lucide-react';

export default function Home() {
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const handleVideoRecorded = (blob: Blob) => {
    setVideoBlob(blob);
    setIsRecording(false);
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      setVideoBlob(file);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left Panel - Video Input */}
          <div className="bg-white rounded-lg shadow-lg p-4">
            <div className="mb-4 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Video Input</h2>
              <div className="flex gap-2">
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleFileSelected}
                  className="hidden"
                  id="video-input"
                />
                <Button
                  onClick={() => document.getElementById('video-input')?.click()}
                  variant="outline"
                  size="sm"
                  className="text-rose-500 hover:text-rose-600"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload
                </Button>
                <Button
                  onClick={() => setIsRecording(true)}
                  variant="outline"
                  size="sm"
                  className="text-rose-500 hover:text-rose-600"
                  disabled={isRecording}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Record
                </Button>
              </div>
            </div>

            <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
              <VideoRecorder
                onRecordingComplete={handleVideoRecorded}
                isRecording={isRecording}
                onStopRecording={() => setIsRecording(false)}
              />
            </div>
          </div>

          {/* Right Panel - Video Editor */}
          <div className="bg-white rounded-lg shadow-lg p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">GIF Editor</h2>
            {videoBlob ? (
              <VideoEditor
                videoBlob={videoBlob}
                onBack={() => setVideoBlob(null)}
              />
            ) : (
              <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                <p className="text-gray-500 text-center">
                  Record or upload a video to start editing
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
