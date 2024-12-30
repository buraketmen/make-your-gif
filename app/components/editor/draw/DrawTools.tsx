'use client';

interface DrawToolsProps {
  currentColor: string;
  setCurrentColor: (color: string) => void;
  penSize: number;
  setPenSize: (size: number) => void;
}

export const DrawTools = ({ currentColor, setCurrentColor, penSize, setPenSize }: DrawToolsProps) => {
  const penTools = [
    { size: 2, name: 'Fine' },
    { size: 4, name: 'Medium' },
    { size: 8, name: 'Thick' },
    { size: 12, name: 'Extra Thick' },
  ];

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Color</label>
        <input
          type="color"
          value={currentColor}
          onChange={(e) => setCurrentColor(e.target.value)}
          className="w-full h-8 cursor-pointer"
        />
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Pen Size</label>
        <div className="grid grid-cols-2 gap-2">
          {penTools.map((tool) => (
            <button
              key={tool.size}
              onClick={() => setPenSize(tool.size)}
              className={`p-2 text-sm rounded ${
                penSize === tool.size
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              {tool.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}; 