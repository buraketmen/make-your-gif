export interface Point {
  x: number;
  y: number;
}

export interface Drawing {
  points: Point[];
  color: string;
  penSize: number;
}

export interface DrawingFrame {
  id: number;
  imageData: string;
  drawings: Drawing[];
  width: number;
  height: number;
  timestamp: number;
} 

export type Mode = 'record' | 'upload';