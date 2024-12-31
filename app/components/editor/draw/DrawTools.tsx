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
     <div className="w-24 space-y-2">
        <div className="flex flex-col items-end gap-2">
        <input
            type="color"
            value={currentColor}
            onChange={(e) => setCurrentColor(e.target.value)}
            className="w-full max-w-8 h-8 cursor-pointer rounded-lg"
        />
        </div>

        <div className="space-y-2">
        {penTools.map((pen) => (
            <button
            key={pen.size}
            onClick={() => setPenSize(pen.size)}
            className={`w-full p-2 text-xs rounded-lg transition-all ${
                penSize === pen.size
                ? 'bg-rose-500 text-white'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
            }`}
            >
            {pen.name}
            </button>
        ))}
        </div>
    </div>
  );
}; 