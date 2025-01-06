interface WorkerFrameData {
  width: number;
  height: number;
  format: 'image/jpeg' | 'image/png';
  quality: number;
}

interface WorkerMessage {
  type: 'process-frame';
  imageData: ImageData;
  frameData: WorkerFrameData;
}

let cachedCanvas: OffscreenCanvas | null = null;
let cachedCtx: OffscreenCanvasRenderingContext2D | null = null;

const getCanvas = (width: number, height: number) => {
  if (!cachedCanvas || cachedCanvas.width !== width || cachedCanvas.height !== height) {
    cachedCanvas = new OffscreenCanvas(width, height);
    cachedCtx = cachedCanvas.getContext('2d', {
      alpha: false,
      desynchronized: true,
      willReadFrequently: false,
    });
  }
  return { canvas: cachedCanvas, ctx: cachedCtx! };
};

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  if (e.data.type === 'process-frame') {
    const { imageData, frameData } = e.data;
    const { format, quality, width, height } = frameData;

    try {
      const { canvas, ctx } = getCanvas(width, height);

      ctx.globalCompositeOperation = 'copy';
      ctx.putImageData(imageData, 0, 0);

      const blob = await canvas.convertToBlob({
        type: format,
        quality: format === 'image/jpeg' ? quality : undefined,
      });

      const arrayBuffer = await blob.arrayBuffer();

      self.postMessage(
        {
          type: 'frame-processed',
          buffer: arrayBuffer,
          format,
        },
        { transfer: [arrayBuffer] }
      );
    } catch (error) {
      self.postMessage({
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
};

// Clean up function for worker termination
self.addEventListener('unload', () => {
  if (cachedCanvas) {
    cachedCanvas.width = 0;
    cachedCanvas.height = 0;
    cachedCanvas = null;
  }
  cachedCtx = null;
});
