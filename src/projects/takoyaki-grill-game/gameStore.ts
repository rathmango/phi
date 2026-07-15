import { create } from "zustand";
import {
  contactPanelsForQuaternion,
  createInitialPieces,
  doneCoverage,
  GAME_CONSTANTS,
  isPlatePieceAccepted,
  overdoneCoverage,
} from "./gameRules";
import { GameSnapshot, GameStore, PlateCheckReason, PlateEvaluation, QuaternionTuple, TakoyakiPieceState } from "./gameTypes";

const IDENTITY_QUATERNION: QuaternionTuple = [0, 0, 0, 1];

function normalizeQuaternion(quaternion: QuaternionTuple): QuaternionTuple {
  const [x, y, z, w] = quaternion;
  const length = Math.hypot(x, y, z, w) || 1;
  return [x / length, y / length, z / length, w / length];
}

function multiplyQuaternion(left: QuaternionTuple, right: QuaternionTuple): QuaternionTuple {
  const [ax, ay, az, aw] = left;
  const [bx, by, bz, bw] = right;
  return normalizeQuaternion([
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
    aw * bw - ax * bx - ay * by - az * bz,
  ]);
}

function axisAngleQuaternion(axisX: number, axisZ: number, angle: number): QuaternionTuple {
  const length = Math.hypot(axisX, axisZ) || 1;
  const halfAngle = angle / 2;
  const sin = Math.sin(halfAngle);
  return normalizeQuaternion([(axisX / length) * sin, 0, (axisZ / length) * sin, Math.cos(halfAngle)]);
}

function initialSnapshot(): GameSnapshot {
  return {
    phase: "ready",
    remainingTime: GAME_CONSTANTS.timeLimit,
    pieces: createInitialPieces(),
    platePieceIds: [],
    completedPlateCount: 0,
    completedPlateIndexes: [],
    plateCheck: {
      plateIndex: null,
      phase: "idle",
      accepted: null,
      reason: null,
    },
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

function evaluatePlate(pieces: TakoyakiPieceState[], plateIndex: number): PlateEvaluation | null {
  const targetPlatePieceIds = platePieceIds(pieces, plateIndex);
  if (targetPlatePieceIds.length !== GAME_CONSTANTS.plateCapacity) {
    return null;
  }

  const platePieces = targetPlatePieceIds
    .map((id) => pieces.find((piece) => piece.id === id))
    .filter((piece): piece is TakoyakiPieceState => Boolean(piece));
  const accepted =
    platePieces.length === GAME_CONSTANTS.plateCapacity && platePieces.every((piece) => isPlatePieceAccepted(piece));
  return {
    accepted,
    doneCoverageMin: Math.min(...platePieces.map((piece) => doneCoverage(piece))),
    overdoneCoverageMax: Math.max(...platePieces.map((piece) => overdoneCoverage(piece))),
  };
}

function reasonForEvaluation(evaluation: PlateEvaluation): PlateCheckReason {
  if (evaluation.accepted) return null;
  const hasUndercookedPiece = evaluation.doneCoverageMin < GAME_CONSTANTS.requiredDoneCoverage;
  const hasOvercookedPiece = evaluation.overdoneCoverageMax > GAME_CONSTANTS.maxOverdoneCoverage;
  if (hasUndercookedPiece && hasOvercookedPiece) return "mixed";
  if (hasOvercookedPiece) return "overcooked";
  return "undercooked";
}

function emptyPanHoleIds(pieces: TakoyakiPieceState[]) {
  const occupied = new Set(
    pieces.filter((piece) => piece.location === "pan" && piece.panHoleId).map((piece) => piece.panHoleId),
  );
  return Array.from({ length: GAME_CONSTANTS.takoyakiCount }, (_, index) => `hole-${index}`).filter(
    (holeId) => !occupied.has(holeId),
  );
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

      const contact = new Set(contactPanelsForQuaternion(piece.visualQuaternion));
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

  rotatePiece: (pieceId: string, rotationStep: number, flipAxisX: number, flipAxisZ: number, flipAngle: number) => {
    const state = get();
    if (state.phase !== "playing") return;
    if (Math.round(Math.abs(rotationStep)) === 0) return;
    const sign = rotationStep < 0 ? -1 : 1;
    const safeStep = sign * Math.max(1, Math.min(GAME_CONSTANTS.surfacePanelCount / 2, Math.round(Math.abs(rotationStep))));
    const deltaQuaternion = axisAngleQuaternion(flipAxisX, flipAxisZ, flipAngle);

    set({
      selectedPieceId: null,
      lastPlateResult: "none",
      pieces: state.pieces.map((piece) => {
        if (piece.id !== pieceId || piece.location !== "pan" || piece.revealTimer > 0) return piece;
        const nextVisualQuaternion = multiplyQuaternion(deltaQuaternion, piece.visualQuaternion);
        return {
          ...piece,
          previousRotationIndex: piece.rotationIndex,
          previousVisualQuaternion: piece.visualQuaternion,
          rotationIndex:
            (piece.rotationIndex + safeStep + GAME_CONSTANTS.surfacePanelCount * 10) % GAME_CONSTANTS.surfacePanelCount,
          visualQuaternion: nextVisualQuaternion,
          flipAxisX,
          flipAxisZ,
          flipAngle,
          revealTimer: GAME_CONSTANTS.revealDuration,
        };
      }),
    });
  },

  movePieceToPlate: (pieceId: string, plateIndex: number) => {
    const state = get();
    if (state.phase !== "playing") return false;
    if (state.plateCheck.phase !== "idle") return false;
    if (plateIndex < 0 || plateIndex >= GAME_CONSTANTS.targetPlateCount) return false;
    if (state.completedPlateIndexes.includes(plateIndex)) return false;
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
            previousVisualQuaternion: IDENTITY_QUATERNION,
            visualQuaternion: IDENTITY_QUATERNION,
            flipAxisX: 1,
            flipAxisZ: 0,
            flipAngle: 0,
            revealTimer: 0,
          }
        : item,
    );

    const plateEvaluation = evaluatePlate(nextPieces, plateIndex);

    set({
      selectedPieceId: null,
      lastPlateResult: "none",
      platePieceIds: allPlatePieceIds(nextPieces),
      pieces: nextPieces,
      plateCheck: plateEvaluation
        ? {
            plateIndex,
            phase: "checking",
            accepted: plateEvaluation.accepted,
            reason: reasonForEvaluation(plateEvaluation),
          }
        : state.plateCheck,
    });
    return true;
  },

  returnPieceToPan: (pieceId: string, panHoleId: string) => {
    const state = get();
    if (state.phase !== "playing") return false;
    if (state.plateCheck.phase !== "idle") return false;
    if (isPanHoleOccupied(state.pieces, panHoleId)) return false;

    const piece = state.pieces.find((item) => item.id === pieceId);
    if (!piece || piece.location !== "plate") return false;
    if (piece.plateIndex !== null && state.completedPlateIndexes.includes(piece.plateIndex)) return false;

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
    if (state.plateCheck.phase !== "idle") return null;
    const targetPlateIndex =
      plateIndex ??
      Array.from({ length: GAME_CONSTANTS.targetPlateCount }, (_, index) => index).find(
        (index) =>
          !state.completedPlateIndexes.includes(index) &&
          platePieceIds(state.pieces, index).length === GAME_CONSTANTS.plateCapacity,
      );
    if (targetPlateIndex === undefined) {
      set({ lastPlateResult: "not-full" });
      return null;
    }
    if (state.completedPlateIndexes.includes(targetPlateIndex)) return null;
    const plateEvaluation = evaluatePlate(state.pieces, targetPlateIndex);
    if (!plateEvaluation) {
      set({ lastPlateResult: "not-full" });
      return null;
    }

    set({
      selectedPieceId: null,
      lastPlateResult: "none",
      plateCheck: {
        plateIndex: targetPlateIndex,
        phase: "checking",
        accepted: plateEvaluation.accepted,
        reason: reasonForEvaluation(plateEvaluation),
      },
    });
    return plateEvaluation;
  },

  revealPlateCheck: () => {
    const state = get();
    if (state.plateCheck.phase !== "checking" || state.plateCheck.accepted === null) return;
    set({
      plateCheck: {
        ...state.plateCheck,
        phase: state.plateCheck.accepted ? "accepted" : "rejected",
      },
      lastPlateResult: state.plateCheck.accepted ? "accepted" : "rejected",
    });
  },

  settlePlateCheck: () => {
    const state = get();
    const { plateCheck } = state;
    if (plateCheck.plateIndex === null || (plateCheck.phase !== "accepted" && plateCheck.phase !== "rejected")) {
      return;
    }

    if (plateCheck.phase === "accepted") {
      const completedPlateIndexes = [...state.completedPlateIndexes, plateCheck.plateIndex];
      const completedPlateCount = completedPlateIndexes.length;
      set({
        completedPlateIndexes,
        completedPlateCount,
        phase: completedPlateCount >= GAME_CONSTANTS.targetPlateCount ? "success" : "playing",
        plateCheck: {
          plateIndex: null,
          phase: "idle",
          accepted: null,
          reason: null,
        },
      });
      return;
    }

    const rejectedPieceIds = platePieceIds(state.pieces, plateCheck.plateIndex);
    const openHoleIds = emptyPanHoleIds(state.pieces);
    let nextHoleIndex = 0;
    const pieces = state.pieces.map((piece) => {
      if (!rejectedPieceIds.includes(piece.id)) return piece;
      const panHoleId = openHoleIds[nextHoleIndex] ?? `hole-${nextHoleIndex}`;
      nextHoleIndex += 1;
      return {
        ...piece,
        location: "pan" as const,
        panHoleId,
        plateIndex: null,
        plateSlotIndex: null,
        revealTimer: 0,
      };
    });
    set({
      pieces,
      platePieceIds: allPlatePieceIds(pieces),
      plateCheck: {
        plateIndex: null,
        phase: "idle",
        accepted: null,
        reason: null,
      },
    });
  },

  clearPlateResult: () => {
    set({ lastPlateResult: "none" });
  },
}));
