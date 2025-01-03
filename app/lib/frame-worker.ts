interface WorkerFrameData {
  width: number;
  height: number;
  format: string;
  quality: number;
}

interface WorkerMessage {
  type: 'process-frame';
  canvas: OffscreenCanvas;
  frameData: WorkerFrameData;
}

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  if (e.data.type === 'process-frame') {
    const { canvas, frameData } = e.data;
    const { format, quality } = frameData;

    try {
      const bitmap = await createImageBitmap(canvas);
      const tempCanvas = new OffscreenCanvas(canvas.width, canvas.height);
      const tempCtx = tempCanvas.getContext('2d')!;
      tempCtx.drawImage(bitmap, 0, 0);
      
      const blob = await tempCanvas.convertToBlob({ type: format, quality });
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