import { Pencil, Square, Circle, Minus } from "lucide-react";

export interface Point {
  x: number;
  y: number;
}

export interface Drawing {
  points: Point[];
  color: string;
  penSize: number;
  tool: string;
}

export interface DrawingFrame {
  id: number;
  imageData: string;
  drawings: Drawing[];
  width: number;
  height: number;

} 

export type Mode = 'record' | 'upload';

export type PenSize = number;

export const DRAWING_TOOLS = {
    PEN: {
        id: 'pen',
        icon: Pencil,
        name: 'Pen'
    },
    LINE: {
        id: 'line',
        icon: Minus,
        name: 'Line'
    },
    RECTANGLE: {
        id: 'rectangle',
        icon: Square,
        name: 'Rectangle'
    },
    CIRCLE: {
        id: 'circle',
        icon: Circle,
        name: 'Circle'
    }
} as const;

export type DrawingTool = typeof DRAWING_TOOLS[keyof typeof DRAWING_TOOLS]['id'];