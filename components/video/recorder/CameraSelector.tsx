import { Button } from "@/components/ui/button";
import { ChevronDown, SwitchCameraIcon } from 'lucide-react';
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
    const { isRecording, deviceId, cameras, setDeviceId } = useVideo();


    return (

        <DropdownMenu>
        <DropdownMenuTrigger asChild>
            {isController ? (
            <Button
            type="button"
            variant="outline"
            size="icon"
            className="bg-rose-700/25 backdrop-blur-sm border-rose-500/25 hover:bg-rose-700 hover:border-rose-500"
            disabled={isRecording}
            >
                <SwitchCameraIcon className="h-4 w-4 text-white/80 hover:text-white" />
            </Button>
            ) : (

                <Button
                type="button"   
                    variant="secondary"
                    className=" text-rose-500 hover:text-rose-600 gap-2"
                    >
                <span>Select camera</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            )}
        </DropdownMenuTrigger>
        {cameras.length > 0 ? (
        <DropdownMenuContent align="start" className="w-64">
            {cameras.map((camera) => (
            <DropdownMenuItem
                key={camera.deviceId}
                onClick={() => setDeviceId(camera.deviceId)}
                className={`${deviceId === camera.deviceId ? 'bg-rose-500/10 text-rose-500' : ''}`}
            >
                {camera.label || `Camera ${cameras.indexOf(camera) + 1}`}
            </DropdownMenuItem>
            ))}
        </DropdownMenuContent>
        ) : (
            <DropdownMenuContent>
                <DropdownMenuItem>No cameras found</DropdownMenuItem>
            </DropdownMenuContent>
        )}
        </DropdownMenu>
        
    );
}; 