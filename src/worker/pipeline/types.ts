import type { Project } from '@prisma/client';

export type PipelineContext = {
  project: Project;
  sourcePath: string;
  /** Update the coarse progress bar and current stage shown in the UI. */
  setStage: (stage: string, progress: number, message: string) => Promise<void>;
  /** Append a line to the project timeline without moving progress. */
  log: (stage: string, message: string, level?: 'info' | 'warn') => Promise<void>;
};

export type PipelineOutput = {
  kind: 'VIDEO' | 'SUBTITLE' | 'TRANSCRIPT' | 'AUDIO';
  label: string;
  path: string;
  mimeType: string;
  durationSec?: number;
  width?: number;
  height?: number;
};

export type PipelineResult = {
  title: string;
  outputs: PipelineOutput[];
};
