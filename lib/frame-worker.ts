interface WorkerFrameData {
  width: number;
  height: number;
  format: string;
  quality: number;
}

interface WorkerMessage {
  type: 'process-frame';
  imageData: ImageData;
  frameData: WorkerFrameData;
}

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  if (e.data.type === 'process-frame') {
    const { imageData, frameData } = e.data;
    const { format, quality, width, height } = frameData;

    try {
      const canvas = new OffscreenCanvas(width, height);
      const ctx = canvas.getContext('2d')!;
      ctx.putImageData(imageData, 0, 0);
      
      const blob = await canvas.convertToBlob({ type: format, quality });
      const arrayBuffer = await blob.arrayBuffer();
      
      self.postMessage({ 
        type: 'frame-processed',
        buffer: arrayBuffer,
        format
      }, { transfer: [arrayBuffer] });
    } catch (error) {
      self.postMessage({ 
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}; 