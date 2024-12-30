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
  imageData: string;
  drawings: Drawing[];
  width: number;
  height: number;
} 