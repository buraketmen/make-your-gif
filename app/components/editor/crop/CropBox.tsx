import { useVideo } from '@/context/video-context';
import { useState, useEffect, useRef } from 'react';

interface CropBoxProps {
  aspectRatio?: number;
}

export const CropBox = ({ aspectRatio }: CropBoxProps) => {
  const { videoFilters: { crop: { coordinates } }, setCrop } = useVideo();
  const containerRef = useRef<HTMLDivElement>(null);
  const cropBoxRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [activeCorner, setActiveCorner] = useState<'nw' | 'ne' | 'sw' | 'se' | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const cropBox = cropBoxRef.current;
    if (!container || !cropBox) return;

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const target = e.target as HTMLElement;
      const corner = target.getAttribute('data-corner') as 'nw' | 'ne' | 'sw' | 'se' | null;
      
      if (corner) {
        setIsResizing(true);
        setActiveCorner(corner);
      } else if (target === cropBox) {
        setIsDragging(true);
      }
    };

    cropBox.addEventListener('touchstart', handleTouchStart, { passive: false });
    
    return () => {
      cropBox.removeEventListener('touchstart', handleTouchStart);
    };
  }, []);

  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!containerRef.current || (!isDragging && !isResizing)) return;

      const rect = containerRef.current.getBoundingClientRect();
      let clientX: number, clientY: number;

      if (e instanceof TouchEvent) {
        const touch = e.touches[0] || e.changedTouches[0];
        if (!touch) return;
        clientX = touch.clientX;
        clientY = touch.clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      const x = (clientX - rect.left) / rect.width * 100;
      const y = (clientY - rect.top) / rect.height * 100;

      if (isDragging) {
        const newX = Math.min(Math.max(x - coordinates.width / 2, 0), 100 - coordinates.width);
        const newY = Math.min(Math.max(y - coordinates.height / 2, 0), 100 - coordinates.height);
        setCrop({ ...coordinates, x: newX, y: newY });
      } else if (isResizing && activeCorner) {
        const minSize = 10;
        const maxSize = 100;
        const currentCrop = { ...coordinates };

        switch (activeCorner) {
          case 'se': {
            const width = Math.min(Math.max(x - currentCrop.x, minSize), maxSize - currentCrop.x);
            const height = aspectRatio ? width / aspectRatio : Math.min(Math.max(y - currentCrop.y, minSize), maxSize - currentCrop.y);
            setCrop({ ...currentCrop, width, height });
            break;
          }
          case 'sw': {
            const rawWidth = currentCrop.x + currentCrop.width - x;
            const width = Math.min(Math.max(rawWidth, minSize), currentCrop.x + currentCrop.width);
            const height = aspectRatio ? width / aspectRatio : Math.min(Math.max(y - currentCrop.y, minSize), maxSize - currentCrop.y);
            const newX = currentCrop.x + currentCrop.width - width;
            setCrop({ ...currentCrop, x: newX, width, height });
            break;
          }
          case 'ne': {
            const width = Math.min(Math.max(x - currentCrop.x, minSize), maxSize - currentCrop.x);
            const rawHeight = currentCrop.y + currentCrop.height - y;
            const height = aspectRatio ? width / aspectRatio : Math.min(Math.max(rawHeight, minSize), currentCrop.y + currentCrop.height);
            const newY = aspectRatio ? currentCrop.y + currentCrop.height - height : currentCrop.y + currentCrop.height - height;
            setCrop({ ...currentCrop, width, height, y: newY });
            break;
          }
          case 'nw': {
            const rawWidth = currentCrop.x + currentCrop.width - x;
            const width = Math.min(Math.max(rawWidth, minSize), currentCrop.x + currentCrop.width);
            const rawHeight = currentCrop.y + currentCrop.height - y;
            const height = aspectRatio ? width / aspectRatio : Math.min(Math.max(rawHeight, minSize), currentCrop.y + currentCrop.height);
            const newX = currentCrop.x + currentCrop.width - width;
            const newY = currentCrop.y + currentCrop.height - height;
            setCrop({ ...currentCrop, x: newX, y: newY, width, height });
            break;
          }
        }
      }
    };

    const handleEnd = () => {
      setIsDragging(false);
      setIsResizing(false);
      setActiveCorner(null);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('touchmove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchend', handleEnd);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, isResizing, activeCorner, coordinates, aspectRatio, setCrop]);

  const handleMouseStart = (e: React.MouseEvent, isResize = false, corner: 'nw' | 'ne' | 'sw' | 'se' | null = null) => {
    e.preventDefault();
    e.stopPropagation();
    if (isResize) {
      setIsResizing(true);
      setActiveCorner(corner);
    } else {
      setIsDragging(true);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full h-full touch-none select-none">
      <div className="absolute inset-0 bg-black/50" />
      <div
        ref={cropBoxRef}
        className="absolute cursor-move border-2 border-white touch-none select-none"
        style={{
          left: `${coordinates.x}%`,
          top: `${coordinates.y}%`,
          width: `${coordinates.width}%`,
          height: `${coordinates.height}%`,
          touchAction: 'none'
        }}
        onMouseDown={(e) => handleMouseStart(e)}
      >
        <div className="absolute inset-0">
          <div className="absolute left-1/3 top-0 bottom-0 w-[1px] bg-white/30" />
          <div className="absolute right-1/3 top-0 bottom-0 w-[1px] bg-white/30" />
          <div className="absolute top-1/3 left-0 right-0 h-[1px] bg-white/30" />
          <div className="absolute bottom-1/3 left-0 right-0 h-[1px] bg-white/30" />
        </div>

        {['nw', 'ne', 'sw', 'se'].map((corner) => (
          <div
            key={corner}
            data-corner={corner}
            className={`absolute w-8 h-8 md:w-6 md:h-6 bg-white rounded-full cursor-${corner}-resize touch-none select-none`}
            style={{
              top: corner.startsWith('n') ? 0 : '100%',
              left: corner.endsWith('w') ? 0 : '100%',
              transform: 'translate(-50%, -50%)',
              touchAction: 'none'
            }}
            onMouseDown={(e) => handleMouseStart(e, true, corner as 'nw' | 'ne' | 'sw' | 'se')}
          />
        ))}
      </div>
    </div>
  );
}; 