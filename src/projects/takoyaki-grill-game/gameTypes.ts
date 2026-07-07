export type GamePhase = "ready" | "playing" | "success" | "fail";
export type PieceLocation = "pan" | "plate" | "completed";
export type PlateResult = "none" | "accepted" | "rejected" | "not-full";

export type TakoyakiPieceState = {
  id: string;
  location: PieceLocation;
  panHoleId: string | null;
  plateIndex: number | null;
  plateSlotIndex: number | null;
  rotationIndex: number;
  panelStateLevels: number[];
  revealTimer: number;
};

export type GameConstants = {
  panWidthCount: number;
  panHeightCount: number;
  takoyakiCount: number;
  plateCapacity: number;
  targetPlateCount: number;
  surfacePanelCount: number;
  contactRatio: number;
  initialStateLevel: number;
  maxStateLevel: number;
  targetStateMin: number;
  targetStateMax: number;
  overdoneThreshold: number;
  requiredDoneCoverage: number;
  maxOverdoneCoverage: number;
  timeLimit: number;
  stateChangeRate: number;
  revealDuration: number;
  rotationStep: number;
};

export type PlateEvaluation = {
  accepted: boolean;
  doneCoverageMin: number;
  overdoneCoverageMax: number;
};

export type GameSnapshot = {
  phase: GamePhase;
  remainingTime: number;
  pieces: TakoyakiPieceState[];
  platePieceIds: string[];
  completedPlateCount: number;
  selectedPieceId: string | null;
  lastPlateResult: PlateResult;
};

export type GameStore = GameSnapshot & {
  startGame: () => void;
  resetGame: () => void;
  tick: (deltaSeconds: number) => void;
  rotatePiece: (pieceId: string) => void;
  movePieceToPlate: (pieceId: string, plateIndex: number) => boolean;
  returnPieceToPan: (pieceId: string, panHoleId: string) => boolean;
  submitPlate: (plateIndex?: number) => PlateEvaluation | null;
  clearPlateResult: () => void;
};
