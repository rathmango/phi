import { GameConstants, QuaternionTuple, TakoyakiPieceState } from "./gameTypes";

const TARGET_CONTACT_SECONDS = 44;

export const GAME_CONSTANTS: GameConstants = {
  panWidthCount: 3,
  panHeightCount: 6,
  takoyakiCount: 18,
  plateCapacity: 6,
  targetPlateCount: 3,
  surfacePanelCount: 8,
  contactRatio: 0.5,
  initialStateLevel: 0,
  maxStateLevel: 10,
  targetStateMin: 7,
  targetStateMax: 8,
  overdoneThreshold: 9,
  requiredDoneCoverage: 0.75,
  maxOverdoneCoverage: 0,
  timeLimit: 120,
  stateChangeRate: 7 / TARGET_CONTACT_SECONDS,
  revealDuration: 0.32,
  rotationStep: 2,
  rotationVarianceChance: 0.26,
  rotationVarianceStep: 1,
};

export function panHoleId(index: number) {
  return `hole-${index}`;
}

export function createInitialPieces(constants = GAME_CONSTANTS): TakoyakiPieceState[] {
  return Array.from({ length: constants.takoyakiCount }, (_, index) => ({
    id: `takoyaki-${index + 1}`,
    location: "pan",
    panHoleId: panHoleId(index),
    plateIndex: null,
    plateSlotIndex: null,
    rotationIndex: 0,
    previousRotationIndex: 0,
    visualQuaternion: [0, 0, 0, 1],
    previousVisualQuaternion: [0, 0, 0, 1],
    flipAxisX: 1,
    flipAxisZ: 0,
    flipAngle: 0,
    panelContactSeconds: Array.from({ length: constants.surfacePanelCount }, () => 0),
    panelStateLevels: Array.from({ length: constants.surfacePanelCount }, () => constants.initialStateLevel),
    revealTimer: 0,
  }));
}

export function clampLevel(value: number, constants = GAME_CONSTANTS) {
  return Math.max(constants.initialStateLevel, Math.min(constants.maxStateLevel, value));
}

export function contactPanels(rotationIndex: number, constants = GAME_CONSTANTS) {
  const count = Math.round(constants.surfacePanelCount * constants.contactRatio);
  const baseBottomStart = constants.surfacePanelCount / 2;
  const start =
    ((baseBottomStart + rotationIndex) % constants.surfacePanelCount + constants.surfacePanelCount) %
    constants.surfacePanelCount;
  return Array.from({ length: count }, (_, offset) => (start + offset) % constants.surfacePanelCount);
}

function panelLocalNormal(panelIndex: number) {
  const quadrant = panelIndex % 4;
  const phi = quadrant * (Math.PI / 2) + Math.PI / 4;
  const theta = panelIndex < 4 ? Math.PI / 4 : (Math.PI * 3) / 4;
  return {
    x: -Math.cos(phi) * Math.sin(theta),
    y: Math.cos(theta),
    z: Math.sin(phi) * Math.sin(theta),
  };
}

function rotatedWorldY(
  vector: { x: number; y: number; z: number },
  [qx, qy, qz, qw]: QuaternionTuple,
) {
  const ix = qw * vector.x + qy * vector.z - qz * vector.y;
  const iy = qw * vector.y + qz * vector.x - qx * vector.z;
  const iz = qw * vector.z + qx * vector.y - qy * vector.x;
  const iw = -qx * vector.x - qy * vector.y - qz * vector.z;
  return iy * qw + iw * -qy + iz * -qx - ix * -qz;
}

export function contactPanelsForQuaternion(quaternion: QuaternionTuple, constants = GAME_CONSTANTS) {
  const contactCount = Math.round(constants.surfacePanelCount * constants.contactRatio);
  return Array.from({ length: constants.surfacePanelCount }, (_, panelIndex) => ({
    panelIndex,
    worldY: rotatedWorldY(panelLocalNormal(panelIndex), quaternion),
  }))
    .sort((left, right) => left.worldY - right.worldY)
    .slice(0, contactCount)
    .map(({ panelIndex }) => panelIndex);
}

export function visiblePanels(rotationIndex: number, constants = GAME_CONSTANTS) {
  const contact = new Set(contactPanels(rotationIndex, constants));
  return Array.from({ length: constants.surfacePanelCount }, (_, index) => index).filter((index) => !contact.has(index));
}

export function doneCoverage(piece: TakoyakiPieceState, constants = GAME_CONSTANTS) {
  const doneCount = piece.panelStateLevels.filter(
    (level) => level >= constants.targetStateMin && level <= constants.targetStateMax,
  ).length;
  return doneCount / constants.surfacePanelCount;
}

export function overdoneCoverage(piece: TakoyakiPieceState, constants = GAME_CONSTANTS) {
  const overdoneCount = piece.panelStateLevels.filter((level) => level >= constants.overdoneThreshold).length;
  return overdoneCount / constants.surfacePanelCount;
}

export function isPlatePieceAccepted(piece: TakoyakiPieceState, constants = GAME_CONSTANTS) {
  return (
    doneCoverage(piece, constants) >= constants.requiredDoneCoverage &&
    overdoneCoverage(piece, constants) <= constants.maxOverdoneCoverage
  );
}

export function visibleLevel(piece: TakoyakiPieceState, constants = GAME_CONSTANTS) {
  const visible = visiblePanels(piece.rotationIndex, constants);
  const total = visible.reduce((sum, panelIndex) => sum + piece.panelStateLevels[panelIndex], 0);
  return total / visible.length;
}

export function hottestVisibleLevel(piece: TakoyakiPieceState, constants = GAME_CONSTANTS) {
  return Math.max(...visiblePanels(piece.rotationIndex, constants).map((panelIndex) => piece.panelStateLevels[panelIndex]));
}

export function levelForPanel(piece: TakoyakiPieceState, panelIndex: number) {
  return piece.panelStateLevels[panelIndex] ?? 0;
}

export function colorForCookLevel(level: number) {
  if (level >= 9.5) return "#1d1714";
  if (level >= 9) return "#3a2920";
  if (level >= 8) return "#9d522b";
  if (level >= 7) return "#c97938";
  if (level >= 5) return "#df9c4c";
  if (level >= 3) return "#edbf62";
  if (level >= 1.2) return "#e9b457";
  if (level >= 0.35) return "#f1cf7c";
  return "#f7dea1";
}

export function sauceColorForLevel(level: number) {
  if (level >= 9) return "#15100d";
  if (level >= 7) return "#7d2e1f";
  if (level >= 4) return "#a94925";
  return "#d76d33";
}

export function formatClock(seconds: number) {
  const safeSeconds = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}
