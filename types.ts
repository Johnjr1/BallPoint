export enum ShotResult {
  MAKE = 'MAKE',
  MISS = 'MISS'
}

export enum CourtPosition {
  LEFT = 'LEFT',
  CENTER = 'CENTER',
  RIGHT = 'RIGHT'
}

export interface Shot {
  id: string;
  result: ShotResult;
  position: CourtPosition;
  timestamp: number;
}

export interface DrillStep {
  position: CourtPosition;
  targetMakes?: number; // Optional: drill can be based on makes
  targetAttempts?: number; // Optional: drill can be based on attempts
}

export interface DrillSession {
  id: string;
  name: string;
  steps: DrillStep[];
  currentStepIndex: number;
  shots: Shot[];
  isActive: boolean;
  completed: boolean;
}

export enum AppView {
  HOME = 'HOME',
  ACTIVE_DRILL = 'ACTIVE_DRILL',
  STATS = 'STATS'
}