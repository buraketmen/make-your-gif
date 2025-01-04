'use client';

import { useDraw } from "@/context/draw-context";
import { DRAWING_TOOLS } from "@/types/draw";
import { Slider } from "@/components/ui/slider";

export const DrawTools = () => {
  const { currentColor, setCurrentColor, penSize, setPenSize, currentTool, setCurrentTool } = useDraw();

  return (
    <div className="w-24 space-y-4">
      <div className="flex flex-col items-end gap-2">
        <input
          type="color"
          value={currentColor}
          onChange={(e) => setCurrentColor(e.target.value)}
          className="w-full max-w-8 h-8 cursor-pointer rounded-lg"
        />
      </div>

      <div className="space-y-2">
        <div className="text-xs font-medium text-gray-600 mb-1">Tools</div>
        <div className="grid grid-cols-1 gap-1">
          {Object.values(DRAWING_TOOLS).map((tool) => (
            <button
              key={tool.id}
              onClick={() => setCurrentTool(tool.id)}
              className={`p-2 text-xs rounded-lg transition-all flex items-center gap-1 ${
                currentTool === tool.id
                  ? 'bg-rose-500 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
              }`}
            >
              <tool.icon className="h-3 w-3" />
              <span className="text-xs">{tool.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="text-xs font-medium text-gray-600">Size</div>
          <div className="text-xs font-medium text-gray-500">{penSize}</div>
        </div>
        <Slider
          value={[penSize]}
          onValueChange={(value) => setPenSize(value[0])}
          min={2}
          max={32}
          step={1}
          className="w-full"
        />
      </div>
    </div>
  );
}; 