import { Button } from "@/components/ui/button";
import { ChevronDown, Settings } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useVideo } from "@/context/video-context";

interface CameraSelectorProps {
    isController?: boolean;
}

export const CameraSelector = ({ isController = true }: CameraSelectorProps) => {
    const { isRecording, cameras, currentCameraId, onCameraChange } = useVideo();
  if (!cameras || cameras.length === 0) return null;
  return (

    <DropdownMenu>
    <DropdownMenuTrigger asChild>
        {isController ? (
        <Button
        variant="outline"
        size="icon"
        className="bg-rose-700/25 backdrop-blur-sm border-rose-500/25 hover:bg-rose-700 hover:border-rose-500"
        disabled={isRecording}
        >
            <Settings className="h-4 w-4 text-white/80 hover:text-white" />
        </Button>
        ) : (

            <Button
                variant="secondary"
                className=" text-rose-500 hover:text-rose-600 gap-2"
                >
            <span>Select camera</span>
            <ChevronDown className="h-4 w-4" />
          </Button>
        )}
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start" className="w-64">
        {cameras.map((camera) => (
        <DropdownMenuItem
            key={camera.deviceId}
            onClick={() => onCameraChange(camera.deviceId)}
            className={`${currentCameraId === camera.deviceId ? 'bg-rose-500/10 text-rose-500' : ''}`}
        >
            {camera.label || `Camera ${cameras.indexOf(camera) + 1}`}
        </DropdownMenuItem>
        ))}
    </DropdownMenuContent>
    </DropdownMenu>
        
  );
}; 