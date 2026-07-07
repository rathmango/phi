import { create } from "zustand";
import {
  contactPanels,
  createInitialPieces,
  doneCoverage,
  GAME_CONSTANTS,
  isPlatePieceAccepted,
  overdoneCoverage,
} from "./gameRules";
import { GameSnapshot, GameStore, TakoyakiPieceState } from "./gameTypes";

function initialSnapshot(): GameSnapshot {
  return {
    phase: "ready",
    remainingTime: GAME_CONSTANTS.timeLimit,
    pieces: createInitialPieces(),
    platePieceIds: [],
    completedPlateCount: 0,
    selectedPieceId: null,
    lastPlateResult: "none",
  };
}

function platePieceIds(pieces: TakoyakiPieceState[], plateIndex: number) {
  return pieces.filter((piece) => piece.location === "plate" && piece.plateIndex === plateIndex).map((piece) => piece.id);
}

function allPlatePieceIds(pieces: TakoyakiPieceState[]) {
  return pieces.filter((piece) => piece.location === "plate").map((piece) => piece.id);
}

function nextFreePlateSlot(pieces: TakoyakiPieceState[], plateIndex: number) {
  const occupied = new Set(
    pieces
      .filter((piece) => piece.location === "plate" && piece.plateIndex === plateIndex && piece.plateSlotIndex !== null)
      .map((piece) => piece.plateSlotIndex),
  );
  for (let index = 0; index < GAME_CONSTANTS.plateCapacity; index += 1) {
    if (!occupied.has(index)) return index;
  }
  return null;
}

function isPanHoleOccupied(pieces: TakoyakiPieceState[], panHoleId: string) {
  return pieces.some((piece) => piece.location === "pan" && piece.panHoleId === panHoleId);
}

export const useTakoyakiGameStore = create<GameStore>((set, get) => ({
  ...initialSnapshot(),

  startGame: () => {
    set({
      ...initialSnapshot(),
      phase: "playing",
    });
  },

  resetGame: () => {
    set(initialSnapshot());
  },

  tick: (deltaSeconds: number) => {
    const state = get();
    if (state.phase !== "playing") return;

    const remainingTime = Math.max(0, state.remainingTime - deltaSeconds);
    const timeIsOver = remainingTime <= 0;

    const pieces = state.pieces.map((piece) => {
      if (piece.location !== "pan") return piece;

      const nextRevealTimer = Math.max(0, piece.revealTimer - deltaSeconds);
      if (piece.revealTimer > 0) {
        return {
          ...piece,
          revealTimer: nextRevealTimer,
        };
      }

      const contact = new Set(contactPanels(piece.rotationIndex));
      const panelContactSeconds = piece.panelContactSeconds.map((seconds, panelIndex) =>
        contact.has(panelIndex) ? seconds + deltaSeconds : seconds,
      );
      return {
        ...piece,
        revealTimer: nextRevealTimer,
        panelContactSeconds,
        panelStateLevels: panelContactSeconds.map((seconds) =>
          Math.min(GAME_CONSTANTS.maxStateLevel, seconds * GAME_CONSTANTS.stateChangeRate),
        ),
      };
    });

    set({
      pieces,
      remainingTime,
      phase: timeIsOver && state.completedPlateCount < GAME_CONSTANTS.targetPlateCount ? "fail" : state.phase,
      lastPlateResult: timeIsOver ? "none" : state.lastPlateResult,
    });
  },

  rotatePiece: (pieceId: string, rotationStep: number) => {
    const state = get();
    if (state.phase !== "playing") return;
    const sign = rotationStep < 0 ? -1 : 1;
    const safeStep = sign * Math.max(1, Math.min(GAME_CONSTANTS.surfacePanelCount / 2, Math.round(Math.abs(rotationStep))));

    set({
      selectedPieceId: pieceId,
      lastPlateResult: "none",
      pieces: state.pieces.map((piece) => {
        if (piece.id !== pieceId || piece.location !== "pan" || piece.revealTimer > 0) return piece;
        return {
          ...piece,
          previousRotationIndex: piece.rotationIndex,
          rotationIndex:
            (piece.rotationIndex + safeStep + GAME_CONSTANTS.surfacePanelCount) % GAME_CONSTANTS.surfacePanelCount,
          revealTimer: GAME_CONSTANTS.revealDuration,
        };
      }),
    });
  },

  movePieceToPlate: (pieceId: string, plateIndex: number) => {
    const state = get();
    if (state.phase !== "playing") return false;
    if (plateIndex < 0 || plateIndex >= GAME_CONSTANTS.targetPlateCount) return false;
    if (platePieceIds(state.pieces, plateIndex).length >= GAME_CONSTANTS.plateCapacity) {
      set({ lastPlateResult: "not-full", selectedPieceId: pieceId });
      return false;
    }

    const piece = state.pieces.find((item) => item.id === pieceId);
    if (!piece || piece.location !== "pan") return false;

    const slot = nextFreePlateSlot(state.pieces, plateIndex);
    if (slot === null) return false;

    const nextPieces = state.pieces.map((item) =>
      item.id === pieceId
        ? {
            ...item,
            location: "plate" as const,
            panHoleId: null,
            plateIndex,
            plateSlotIndex: slot,
            revealTimer: 0,
          }
        : item,
    );

    set({
      selectedPieceId: pieceId,
      lastPlateResult: "none",
      platePieceIds: allPlatePieceIds(nextPieces),
      pieces: nextPieces,
    });
    return true;
  },

  returnPieceToPan: (pieceId: string, panHoleId: string) => {
    const state = get();
    if (state.phase !== "playing") return false;
    if (isPanHoleOccupied(state.pieces, panHoleId)) return false;

    const piece = state.pieces.find((item) => item.id === pieceId);
    if (!piece || piece.location !== "plate") return false;

    set({
      selectedPieceId: pieceId,
      lastPlateResult: "none",
      platePieceIds: state.platePieceIds.filter((id) => id !== pieceId),
      pieces: state.pieces.map((item) =>
        item.id === pieceId
          ? {
              ...item,
              location: "pan",
              panHoleId,
              plateIndex: null,
              plateSlotIndex: null,
              revealTimer: 0,
            }
          : item,
      ),
    });
    return true;
  },

  submitPlate: (plateIndex?: number) => {
    const state = get();
    if (state.phase !== "playing") return null;
    const targetPlateIndex =
      plateIndex ??
      Array.from({ length: GAME_CONSTANTS.targetPlateCount }, (_, index) => index).find(
        (index) => platePieceIds(state.pieces, index).length === GAME_CONSTANTS.plateCapacity,
      );
    if (targetPlateIndex === undefined) {
      set({ lastPlateResult: "not-full" });
      return null;
    }
    const targetPlatePieceIds = platePieceIds(state.pieces, targetPlateIndex);
    if (targetPlatePieceIds.length !== GAME_CONSTANTS.plateCapacity) {
      set({ lastPlateResult: "not-full" });
      return null;
    }

    const platePieces = targetPlatePieceIds
      .map((id) => state.pieces.find((piece) => piece.id === id))
      .filter((piece): piece is TakoyakiPieceState => Boolean(piece));
    const accepted =
      platePieces.length === GAME_CONSTANTS.plateCapacity && platePieces.every((piece) => isPlatePieceAccepted(piece));

    const evaluation = {
      accepted,
      doneCoverageMin: Math.min(...platePieces.map((piece) => doneCoverage(piece))),
      overdoneCoverageMax: Math.max(...platePieces.map((piece) => overdoneCoverage(piece))),
    };

    if (!accepted) {
      set({ lastPlateResult: "rejected" });
      return evaluation;
    }

    const completedPlateCount = state.completedPlateCount + 1;
    const phase = completedPlateCount >= GAME_CONSTANTS.targetPlateCount ? "success" : "playing";
    const nextPieces = state.pieces.map((piece) =>
      targetPlatePieceIds.includes(piece.id)
        ? {
            ...piece,
            location: "completed" as const,
            plateIndex: null,
            plateSlotIndex: null,
            panHoleId: null,
            revealTimer: 0,
          }
        : piece,
    );
    set({
      phase,
      completedPlateCount,
      selectedPieceId: null,
      lastPlateResult: "accepted",
      platePieceIds: allPlatePieceIds(nextPieces),
      pieces: nextPieces,
    });
    return evaluation;
  },

  clearPlateResult: () => {
    set({ lastPlateResult: "none" });
  },
}));
