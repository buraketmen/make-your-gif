import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface LegacyNavigator extends Navigator {
  webkitGetUserMedia?: (
    constraints: MediaStreamConstraints,
    successCallback: (stream: MediaStream) => void,
    errorCallback: (error: Error) => void
  ) => void;
  mozGetUserMedia?: (
    constraints: MediaStreamConstraints,
    successCallback: (stream: MediaStream) => void,
    errorCallback: (error: Error) => void
  ) => void;
  msGetUserMedia?: (
    constraints: MediaStreamConstraints,
    successCallback: (stream: MediaStream) => void,
    errorCallback: (error: Error) => void
  ) => void;
}

export const getMediaDevices = async (): Promise<MediaDevices> => {
  if ((navigator as unknown as Record<string, unknown>).mediaDevices === undefined) {
    (navigator as unknown as Record<string, unknown>).mediaDevices = {};
  }

  if (navigator.mediaDevices.getUserMedia === undefined) {
    navigator.mediaDevices.getUserMedia = function (constraints: MediaStreamConstraints) {
      const getUserMedia =
        (navigator as unknown as LegacyNavigator).webkitGetUserMedia ||
        (navigator as unknown as LegacyNavigator).mozGetUserMedia ||
        (navigator as unknown as LegacyNavigator).msGetUserMedia;

      if (!getUserMedia) {
        return Promise.reject(new Error('getUserMedia is not implemented in this browser'));
      }

      return new Promise((resolve, reject) => {
        getUserMedia.call(navigator, constraints, resolve, reject);
      });
    };
  }
  return navigator.mediaDevices;
};

export const getCameras = async (): Promise<{
  cameras: MediaDeviceInfo[];
  deviceIds: string[];
}> => {
  try {
    const mediaDevices = await getMediaDevices();
    if (!mediaDevices || !mediaDevices.enumerateDevices) {
      return {
        cameras: [],
        deviceIds: [],
      };
    }
    await mediaDevices.getUserMedia({ video: true });
    const devices = await mediaDevices.enumerateDevices();
    const videoDevices = devices.filter((device) => device.kind === 'videoinput');
    return {
      cameras: videoDevices,
      deviceIds: videoDevices.map((device) => device.deviceId),
    };
  } catch (error) {
    console.error('Error getting camera devices.', error);
    return {
      cameras: [],
      deviceIds: [],
    };
  }
};

export const getSupportedMimeType = (): string => {
  const types = [
    'video/webm;codecs=h264',
    'video/webm',
    'video/mp4',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8',
    'video/webm;codecs=daala',
    'video/mpeg',
  ];

  if (typeof MediaRecorder === 'undefined') {
    console.warn('MediaRecorder is not supported in this browser');
    return types[0];
  }

  const supported = types.find((type) => {
    try {
      return MediaRecorder.isTypeSupported(type);
    } catch (e) {
      console.warn(`Error checking support for ${type}:`, e);
      return false;
    }
  });

  if (!supported) {
    console.warn('No supported video MIME types found');
    return types[0];
  }

  return supported;
};

interface VideoFormat {
  format: string;
  codec: string;
}

export const getVideoOutputFormat = (mimeType: string): VideoFormat => {
  if (mimeType.includes('webm')) {
    return {
      format: 'webm',
      codec: mimeType.includes('vp8') ? 'vp8' : mimeType.includes('vp9') ? 'vp9' : 'vp8',
    };
  } else if (mimeType.includes('mp4')) {
    return {
      format: 'mp4',
      codec: 'h264',
    };
  }
  return {
    format: 'webm',
    codec: 'vp8',
  };
};

export const getFFmpegCodecArgs = (codec: string): string[] => {
  switch (codec) {
    case 'vp8':
      return ['-c:v', 'vp8', '-b:v', '4000k', '-deadline', 'realtime', '-cpu-used', '0'];
    case 'vp9':
      return ['-c:v', 'vp9', '-b:v', '4000k', '-deadline', 'realtime', '-cpu-used', '0'];
    case 'h264':
      return ['-c:v', 'h264', '-crf', '23', '-threads', '0'];
    default:
      return ['-c:v', 'vp8', '-b:v', '4000k', '-deadline', 'realtime', '-cpu-used', '0'];
  }
};

interface VideoConstraints {
  width?: MediaTrackConstraints['width'];
  height?: MediaTrackConstraints['height'];
  frameRate: MediaTrackConstraints['frameRate'];
  deviceId?: MediaTrackConstraints['deviceId'];
  aspectRatio: MediaTrackConstraints['aspectRatio'];
  facingMode?: MediaTrackConstraints['facingMode'];
}

interface Resolution {
  min: number;
  ideal: number;
  max: number;
}

interface Resolutions {
  landscape: {
    height: Resolution;
    width: Resolution;
  };
  portrait: {
    height: Resolution;
    width: Resolution;
  };
}

export const getOptimalVideoConstraints = async (
  deviceId: string | null,
  isLandscape: boolean = true
): Promise<VideoConstraints> => {
  const resolutions: Resolutions = {
    landscape: {
      height: {
        min: 360,
        ideal: 720,
        max: 1080,
      },
      width: {
        min: 640,
        ideal: 1280,
        max: 1920,
      },
    },
    portrait: {
      height: {
        min: 640,
        ideal: 1280,
        max: 1920,
      },
      width: {
        min: 360,
        ideal: 720,
        max: 1080,
      },
    },
  };
  const constraints: VideoConstraints = {
    width: isLandscape ? resolutions.landscape.width : resolutions.portrait.width,
    height: isLandscape ? resolutions.landscape.height : resolutions.portrait.height,
    frameRate: { min: 15, ideal: 30, max: 60 },
    aspectRatio: { ideal: isLandscape ? 16 / 9 : 9 / 16 },
    facingMode: 'environment',
    ...(deviceId && { deviceId: { exact: deviceId } }),
  };

  try {
    const mediaDevices = await getMediaDevices();
    await mediaDevices.getUserMedia({ video: constraints });

    return constraints;
  } catch (error) {
    console.error('Error during video constraints:', error);
    return {
      frameRate: { min: 15, ideal: 30, max: 60 },
      aspectRatio: { ideal: isLandscape ? 16 / 9 : 9 / 16 },
      ...(deviceId && { deviceId: { exact: deviceId } }),
    };
  }
};
