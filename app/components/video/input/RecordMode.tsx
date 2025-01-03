'use client';

import { motion } from 'framer-motion';
import { VideoRecorder } from '@/components/video/recorder/VideoRecorder';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useVideo } from '@/context/video-context';

export const RecordMode = () => {
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const { currentCameraId, setCameras } = useVideo();
    const [cameraKey, setCameraKey] = useState('default');

    const getCameras = useCallback(async () => {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        if(videoDevices.length > 0) {
            const firstCamera = videoDevices[0];
            if (!firstCamera || !firstCamera.deviceId) {
                timeoutRef.current = setTimeout(() => {
                    getCameras();
                }, 1000);
            } else {
                setCameras(videoDevices);
            }
        }
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        getCameras();
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        setCameraKey(prev => {
            if(prev !== currentCameraId) {
                return currentCameraId || 'default';
            }
            return prev;
        });
    }, [currentCameraId]);


  return (
    <motion.div
      key="record-mode"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
    >
      <div className="aspect-video  rounded-xl overflow-hidden ">
        <VideoRecorder key={cameraKey}/>
      </div>
    </motion.div>
  );
}; 