export type Tool =
  | 'select'
  | 'pen'
  | 'rect'
  | 'ellipse'
  | 'arrow'
  | 'text'
  | 'step'
  | 'pixelate'
  | 'crop';

export interface Point {
  x: number;
  y: number;
}

interface AnnotationBase {
  id: string;
  color: string;
  size: number;
}

export interface PenAnnotation extends AnnotationBase {
  kind: 'pen';
  points: Point[];
}

export interface ShapeAnnotation extends AnnotationBase {
  kind: 'rect' | 'ellipse';
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ArrowAnnotation extends AnnotationBase {
  kind: 'arrow';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface TextAnnotation extends AnnotationBase {
  kind: 'text';
  x: number;
  y: number;
  text: string;
}

export interface StepAnnotation extends AnnotationBase {
  kind: 'step';
  x: number;
  y: number;
  n: number;
}

export interface PixelateAnnotation extends AnnotationBase {
  kind: 'pixelate';
  points: Point[];
}

export type Annotation =
  | PenAnnotation
  | ShapeAnnotation
  | ArrowAnnotation
  | TextAnnotation
  | StepAnnotation
  | PixelateAnnotation;

export function nextStepNumber(annotations: Annotation[]): number {
  const steps = annotations.filter((a): a is StepAnnotation => a.kind === 'step');
  return steps.length === 0 ? 1 : Math.max(...steps.map((s) => s.n)) + 1;
}
