import { useVideo } from '@/context/video-context';
import { useState, useEffect, useRef } from 'react';

interface CropBoxProps {
  aspectRatio?: number;
}

export const CropBox = ({ aspectRatio }: CropBoxProps) => {
const { videoFilters: { crop: { coordinates } }, setCrop } = useVideo();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [activeCorner, setActiveCorner] = useState<'nw' | 'ne' | 'sw' | 'se' | null>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current || (!isDragging && !isResizing)) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width * 100;
      const y = (e.clientY - rect.top) / rect.height * 100;

      if (isDragging) {
        // Handle dragging
        const newX = Math.min(Math.max(x - coordinates.width / 2, 0), 100 - coordinates.width);
        const newY = Math.min(Math.max(y - coordinates.height / 2, 0), 100 - coordinates.height);
        const newCrop = { ...coordinates, x: newX, y: newY };
        setCrop(newCrop);
      } else if (isResizing && activeCorner) {
        // Handle resizing
        const minSize = 10;
        const maxSize = 100;
        const currentCrop = { ...coordinates };

        switch (activeCorner) {
          case 'se': {
            const width = Math.min(Math.max(x - currentCrop.x, minSize), maxSize - currentCrop.x);
            const height = aspectRatio ? width / aspectRatio : Math.min(Math.max(y - currentCrop.y, minSize), maxSize - currentCrop.y);
            const newCrop = { ...currentCrop, width, height };
            setCrop(newCrop);
            break;
          }
          case 'sw': {
            const rawWidth = currentCrop.x + currentCrop.width - x;
            const width = Math.min(Math.max(rawWidth, minSize), currentCrop.x + currentCrop.width);
            const height = aspectRatio ? width / aspectRatio : Math.min(Math.max(y - currentCrop.y, minSize), maxSize - currentCrop.y);
            const newX = currentCrop.x + currentCrop.width - width;
            const newCrop = { ...currentCrop, x: newX, width, height };
            setCrop(newCrop);
            break;
          }
          case 'ne': {
            const width = Math.min(Math.max(x - currentCrop.x, minSize), maxSize - currentCrop.x);
            const rawHeight = currentCrop.y + currentCrop.height - y;
            const height = aspectRatio ? width / aspectRatio : Math.min(Math.max(rawHeight, minSize), currentCrop.y + currentCrop.height);
            const newY = aspectRatio ? currentCrop.y + currentCrop.height - height : currentCrop.y + currentCrop.height - height;
            const newCrop = { ...currentCrop, width, height, y: newY };
            setCrop(newCrop);
            break;
          }
          case 'nw': {
            const rawWidth = currentCrop.x + currentCrop.width - x;
            const width = Math.min(Math.max(rawWidth, minSize), currentCrop.x + currentCrop.width);
            const rawHeight = currentCrop.y + currentCrop.height - y;
            const height = aspectRatio ? width / aspectRatio : Math.min(Math.max(rawHeight, minSize), currentCrop.y + currentCrop.height);
            const newX = currentCrop.x + currentCrop.width - width;
            const newY = currentCrop.y + currentCrop.height - height;
            const newCrop = { ...currentCrop, x: newX, y: newY, width, height };
            setCrop(newCrop);
            break;
          }
        }
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
      setActiveCorner(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchend', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, isResizing, activeCorner, coordinates, aspectRatio]);

  return (
    <div ref={containerRef} className="relative w-full h-full">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Crop Box */}
      <div
        className="absolute cursor-move border-2 border-white"
        style={{
          left: `${coordinates.x}%`,
          top: `${coordinates.y}%`,
          width: `${coordinates.width}%`,
          height: `${coordinates.height}%`,
        }}
        onMouseDown={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
      >
        {/* Grid Lines */}
        <div className="absolute inset-0">
          {/* Vertical lines */}
          <div className="absolute left-1/3 top-0 bottom-0 w-[1px] bg-white/30" />
          <div className="absolute right-1/3 top-0 bottom-0 w-[1px] bg-white/30" />
          
          {/* Horizontal lines */}
          <div className="absolute top-1/3 left-0 right-0 h-[1px] bg-white/30" />
          <div className="absolute bottom-1/3 left-0 right-0 h-[1px] bg-white/30" />
        </div>

        {/* Resize Handles */}
        {['nw', 'ne', 'sw', 'se'].map((corner) => (
          <div
            key={corner}
            className={`absolute w-3 h-3 bg-white rounded-full cursor-${corner}-resize`}
            style={{
              top: corner.startsWith('n') ? 0 : '100%',
              left: corner.endsWith('w') ? 0 : '100%',
              transform: 'translate(-50%, -50%)',
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsResizing(true);
              setActiveCorner(corner as 'nw' | 'ne' | 'sw' | 'se');
            }}
          />
        ))}
      </div>
    </div>
  );
}; 