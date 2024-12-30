import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Download, Scissors } from 'lucide-react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

interface VideoEditorProps {
  videoBlob: Blob;
  onBack: () => void;
}

export const VideoEditor = ({ videoBlob, onBack }: VideoEditorProps) => {
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(10);
  const [isProcessing, setIsProcessing] = useState(false);
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const ffmpegRef = useRef<FFmpeg | null>(null);

  useEffect(() => {
    if (videoBlob) {
      const videoUrl = URL.createObjectURL(videoBlob);
      if (videoRef.current) {
        videoRef.current.src = videoUrl;
      }
    }
  }, [videoBlob]);

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

  const convertToGif = async () => {
    try {
      setIsProcessing(true);
      await loadFFmpeg();
      const ffmpeg = ffmpegRef.current!;

      // Write the input video file
      await ffmpeg.writeFile('input.webm', await fetchFile(videoBlob));

      // Convert to GIF with specified duration
      await ffmpeg.exec([
        '-i', 'input.webm',
        '-t', String(trimEnd - trimStart),
        '-ss', String(trimStart),
        '-vf', 'fps=10,scale=480:-1:flags=lanczos',
        'output.gif'
      ]);

      // Read the output file
      const data = await ffmpeg.readFile('output.gif');
      const gifBlob = new Blob([data], { type: 'image/gif' });
      const gifUrl = URL.createObjectURL(gifBlob);
      setGifUrl(gifUrl);
    } catch (error) {
      console.error('Error converting to GIF:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (gifUrl) {
      const a = document.createElement('a');
      a.href = gifUrl;
      a.download = 'converted.gif';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-lg bg-white shadow-lg"
    >
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Button
            onClick={onBack}
            variant="outline"
            className="text-rose-500 hover:text-rose-600"
          >
            Back to Recording
          </Button>
        </div>
        
        <div className="aspect-video w-full max-w-2xl mx-auto rounded-lg overflow-hidden bg-gray-100">
          <video
            ref={videoRef}
            controls
            className="w-full h-full object-contain"
          />
        </div>

        <div className="max-w-2xl mx-auto space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Trim Duration (seconds)</label>
            <Slider
              value={[trimStart, trimEnd]}
              min={0}
              max={10}
              step={0.1}
              onValueChange={(values: number[]) => {
                setTrimStart(values[0]);
                setTrimEnd(values[1]);
              }}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-gray-500">
              <span>{trimStart.toFixed(1)}s</span>
              <span>{trimEnd.toFixed(1)}s</span>
            </div>
          </div>

          <div className="flex justify-center gap-4">
            <Button
              onClick={convertToGif}
              disabled={isProcessing}
              className="bg-rose-500 hover:bg-rose-600"
            >
              <Scissors className="mr-2 h-4 w-4" />
              {isProcessing ? 'Converting...' : 'Convert to GIF'}
            </Button>
            {gifUrl && (
              <Button
                onClick={handleDownload}
                className="bg-rose-500 hover:bg-rose-600"
              >
                <Download className="mr-2 h-4 w-4" />
                Download GIF
              </Button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}; 