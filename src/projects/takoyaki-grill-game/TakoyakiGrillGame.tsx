import { ContactShadows, Environment, OrthographicCamera, RoundedBox } from "@react-three/drei";
import { Canvas, ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { BallCollider, CuboidCollider, Physics, RigidBody, RapierRigidBody } from "@react-three/rapier";
import { Check, CircleAlert, Flame, LoaderCircle, Play, RotateCcw, Sparkles } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { contactPanelsForQuaternion, colorForCookLevel, GAME_CONSTANTS, levelForPanel } from "./gameRules";
import { useTakoyakiGameStore } from "./gameStore";
import { GamePhase, QuaternionTuple, TakoyakiPieceState } from "./gameTypes";

const PAN_CENTER_X = -0.42;
const PAN_CENTER_Z = 0;
const HOLE_GAP_X = 0.75;
const HOLE_GAP_Z = 0.68;
const PAN_SURFACE_Y = 0.14;
const PIECE_RADIUS = 0.255;
const PIECE_Y = 0.43;
const PLATE_PIECE_SCALE = 0.62;
const PLATE_PIECE_Y = 0.2;
const PLATE_CENTERS = [
  new THREE.Vector3(1.34, 0.16, -1.52),
  new THREE.Vector3(1.34, 0.16, 0),
  new THREE.Vector3(1.34, 0.16, 1.52),
];
const PLATE_SIZE = { width: 0.92, depth: 1.18 };
const FLIP_DEAD_ZONE_DISTANCE = 12;
const FLIP_ASSIST_DISTANCE = 110;
const FLIP_ASSIST_STRENGTH = 0.36;
const FLIP_FULL_PULL_DISTANCE = 420;
const FLIP_MAX_EXTRA_TURNS = 2;
const FLIP_EXTRA_TURN_START_STRENGTH = 0.34;
const FLIP_FIRST_EXTRA_TURN_STRENGTH = 0.6;
const SMOKE_START_LEVEL = 5;
const TEMP_QUATERNION = new THREE.Quaternion();
const TEMP_BASE_QUATERNION = new THREE.Quaternion();
const TEMP_FLIP_QUATERNION = new THREE.Quaternion();
const TEMP_AXIS = new THREE.Vector3(1, 0, 0);
const FLAME_POSITIONS = [-1.18, -0.38, 0.38, 1.18];

type PressState = {
  pieceId: string;
  charge: number;
  startClient: { x: number; y: number };
  currentClient: { x: number; y: number };
};

type FlipIntent = {
  rotationStep: number;
  flipAxisX: number;
  flipAxisZ: number;
  flipAngle: number;
};

type PullVector = {
  dx: number;
  dy: number;
  distance: number;
  strength: number;
};

type GuideTone = "tip" | "ready" | "danger" | "success";

type GuideCue = {
  id: string;
  text: string;
  tone: GuideTone;
};

function holeIndexFromId(holeId: string | null) {
  if (!holeId) return -1;
  const parsed = Number(holeId.replace("hole-", ""));
  return Number.isFinite(parsed) ? parsed : -1;
}

function panHolePosition(index: number) {
  const col = index % GAME_CONSTANTS.panWidthCount;
  const row = Math.floor(index / GAME_CONSTANTS.panWidthCount);
  const x = PAN_CENTER_X + (col - (GAME_CONSTANTS.panWidthCount - 1) / 2) * HOLE_GAP_X;
  const z = PAN_CENTER_Z + (row - (GAME_CONSTANTS.panHeightCount - 1) / 2) * HOLE_GAP_Z;
  return new THREE.Vector3(x, PIECE_Y, z);
}

function plateSlotPosition(plateIndex: number | null, slotIndex: number | null) {
  const plateCenter = PLATE_CENTERS[plateIndex ?? 0] ?? PLATE_CENTERS[0];
  const safeIndex = slotIndex ?? 0;
  const col = safeIndex % 2;
  const row = Math.floor(safeIndex / 2);
  return new THREE.Vector3(
    plateCenter.x + (col - 0.5) * 0.32,
    PLATE_PIECE_Y,
    plateCenter.z + 0.08 + (row - 1) * 0.285,
  );
}

function firstAvailablePlateIndex(pieces: TakoyakiPieceState[], completedPlateIndexes: number[]) {
  for (let plateIndex = 0; plateIndex < GAME_CONSTANTS.targetPlateCount; plateIndex += 1) {
    if (completedPlateIndexes.includes(plateIndex)) continue;
    const count = pieces.filter((piece) => piece.location === "plate" && piece.plateIndex === plateIndex).length;
    if (count < GAME_CONSTANTS.plateCapacity) return plateIndex;
  }
  return null;
}

function firstOpenPanHoleId(pieces: TakoyakiPieceState[]) {
  const occupied = new Set(
    pieces.filter((piece) => piece.location === "pan" && piece.panHoleId).map((piece) => piece.panHoleId),
  );
  for (let index = 0; index < GAME_CONSTANTS.takoyakiCount; index += 1) {
    const holeId = `hole-${index}`;
    if (!occupied.has(holeId)) return holeId;
  }
  return null;
}

function strengthFromPullDistance(distance: number) {
  if (distance <= FLIP_DEAD_ZONE_DISTANCE) return 0;

  if (distance <= FLIP_ASSIST_DISTANCE) {
    const assistedStrength = THREE.MathUtils.clamp(
      (distance - FLIP_DEAD_ZONE_DISTANCE) / (FLIP_ASSIST_DISTANCE - FLIP_DEAD_ZONE_DISTANCE),
      0,
      1,
    );
    return FLIP_ASSIST_STRENGTH * (1 - (1 - assistedStrength) ** 2);
  }

  const heavyStrength = THREE.MathUtils.clamp(
    (distance - FLIP_ASSIST_DISTANCE) / (FLIP_FULL_PULL_DISTANCE - FLIP_ASSIST_DISTANCE),
    0,
    1,
  );
  return FLIP_ASSIST_STRENGTH + (1 - FLIP_ASSIST_STRENGTH) * heavyStrength ** 1.85;
}

function pullVectorFromClient(press: PressState, client = press.currentClient): PullVector {
  const dx = client.x - press.startClient.x;
  const dy = client.y - press.startClient.y;
  const distance = Math.hypot(dx, dy);
  return {
    dx,
    dy,
    distance,
    strength: strengthFromPullDistance(distance),
  };
}

function samplePress(press: PressState, client: { x: number; y: number }): PressState {
  const pull = pullVectorFromClient(press, client);
  return {
    ...press,
    currentClient: client,
    charge: pull.strength,
  };
}

function extraTurnsFromStrength(strength: number) {
  if (strength <= FLIP_EXTRA_TURN_START_STRENGTH) return 0;

  if (strength < FLIP_FIRST_EXTRA_TURN_STRENGTH) {
    const progress = THREE.MathUtils.clamp(
      (strength - FLIP_EXTRA_TURN_START_STRENGTH) /
        (FLIP_FIRST_EXTRA_TURN_STRENGTH - FLIP_EXTRA_TURN_START_STRENGTH),
      0,
      1,
    );
    return progress ** 0.62;
  }

  const heavyProgress = THREE.MathUtils.clamp(
    (strength - FLIP_FIRST_EXTRA_TURN_STRENGTH) / (1 - FLIP_FIRST_EXTRA_TURN_STRENGTH),
    0,
    1,
  );
  return 1 + (FLIP_MAX_EXTRA_TURNS - 1) * (heavyProgress * heavyProgress * (3 - heavyProgress * 2));
}

function randomizedRotationMagnitude(plannedMagnitude: number, strength: number) {
  if (plannedMagnitude <= 0) return 0;
  const varianceChance = GAME_CONSTANTS.rotationVarianceChance * (1 - strength * 0.35);
  if (Math.random() >= varianceChance) return plannedMagnitude;

  const variance = Math.random() < 0.5 ? -GAME_CONSTANTS.rotationVarianceStep : GAME_CONSTANTS.rotationVarianceStep;
  return THREE.MathUtils.clamp(plannedMagnitude + variance, 1, GAME_CONSTANTS.surfacePanelCount / 2);
}

function flipIntentFromPress(press: PressState): FlipIntent {
  const pull = pullVectorFromClient(press);
  const { dx, dy, distance, strength } = pull;
  const plannedMagnitude = strength <= 0 ? 0 : Math.min(4, Math.max(1, Math.ceil(strength * 4)));
  const rotationMagnitude = randomizedRotationMagnitude(plannedMagnitude, strength);
  const baseAngle = (rotationMagnitude / GAME_CONSTANTS.surfacePanelCount) * Math.PI * 2;
  const extraTurns = extraTurnsFromStrength(strength);
  const visualAngle = baseAngle + extraTurns * Math.PI * 2;
  const directionMovement = Math.max(distance, 0.001);
  const directionX = distance < FLIP_DEAD_ZONE_DISTANCE ? 0 : dx / directionMovement;
  const directionY = distance < FLIP_DEAD_ZONE_DISTANCE ? 1 : dy / directionMovement;
  const dominantDirection = Math.abs(directionX) >= Math.abs(directionY) ? directionX : directionY;
  const directionSign = dominantDirection >= 0 ? 1 : -1;

  return {
    rotationStep: rotationMagnitude * directionSign,
    flipAxisX: directionY,
    flipAxisZ: -directionX,
    flipAngle: visualAngle,
  };
}

function setQuaternionFromTuple(target: THREE.Quaternion, quaternion: QuaternionTuple) {
  target.set(quaternion[0], quaternion[1], quaternion[2], quaternion[3]).normalize();
}

function setFlipQuaternion(target: THREE.Quaternion, axisX: number, axisZ: number, angle: number) {
  TEMP_AXIS.set(axisX, 0, axisZ);
  if (TEMP_AXIS.lengthSq() < 0.0001) TEMP_AXIS.set(1, 0, 0);
  TEMP_AXIS.normalize();
  target.setFromAxisAngle(TEMP_AXIS, angle);
}

function panelGeometryArgs(panelIndex: number): [number, number, number, number, number, number, number] {
  const quadrant = panelIndex % 4;
  const isTop = panelIndex < 4;
  const phiLength = Math.PI / 2;
  const phiStart = quadrant * phiLength + 0.025;
  const thetaStart = isTop ? 0.025 : Math.PI / 2 + 0.025;
  const thetaLength = Math.PI / 2 - 0.05;
  return [PIECE_RADIUS * 1.026, 14, 8, phiStart, phiLength - 0.05, thetaStart, thetaLength];
}

function cookOverlayOpacity(level: number) {
  if (level < 0.35) return 0;
  return THREE.MathUtils.clamp(0.82 + level * 0.018, 0.82, 0.98);
}

function hottestContactLevel(piece: TakoyakiPieceState) {
  if (piece.location !== "pan") return 0;
  return Math.max(
    ...contactPanelsForQuaternion(piece.visualQuaternion).map((panelIndex) => levelForPanel(piece, panelIndex)),
  );
}

function smokeIntensityForLevel(level: number) {
  if (level < SMOKE_START_LEVEL) return 0;
  const overheatProgress = THREE.MathUtils.clamp(
    (level - SMOKE_START_LEVEL) / (GAME_CONSTANTS.maxStateLevel - SMOKE_START_LEVEL),
    0,
    1,
  );
  return 0.25 + overheatProgress * 0.75;
}

function pieceBasePosition(piece: TakoyakiPieceState) {
  if (piece.location === "plate") return plateSlotPosition(piece.plateIndex, piece.plateSlotIndex);
  const holeIndex = holeIndexFromId(piece.panHoleId);
  return panHolePosition(holeIndex >= 0 ? holeIndex : 0);
}

function seededNoise(seed: number) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function pieceSeed(id: string) {
  return id.split("").reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 3), 0);
}

function createFlameShape(scale = 1) {
  const shape = new THREE.Shape();
  shape.moveTo(0, -0.22 * scale);
  shape.bezierCurveTo(-0.23 * scale, -0.06 * scale, -0.16 * scale, 0.16 * scale, -0.04 * scale, 0.3 * scale);
  shape.bezierCurveTo(0.01 * scale, 0.18 * scale, 0.11 * scale, 0.09 * scale, 0.12 * scale, -0.03 * scale);
  shape.bezierCurveTo(0.24 * scale, 0.08 * scale, 0.23 * scale, -0.13 * scale, 0, -0.22 * scale);
  return shape;
}

function createBreadBallGeometry(seed: number) {
  const geometry = new THREE.SphereGeometry(PIECE_RADIUS, 24, 16);
  const positions = geometry.attributes.position as THREE.BufferAttribute;
  const vertex = new THREE.Vector3();

  for (let index = 0; index < positions.count; index += 1) {
    vertex.fromBufferAttribute(positions, index);
    const normal = vertex.clone().normalize();
    const wave =
      Math.sin(normal.x * 8.5 + seed * 0.07) * 0.012 +
      Math.cos(normal.y * 9.4 + seed * 0.11) * 0.01 +
      (seededNoise(seed + index * 1.73) - 0.5) * 0.014;
    vertex.multiplyScalar(1 + wave);
    positions.setXYZ(index, vertex.x, vertex.y * 1.01, vertex.z);
  }

  geometry.computeVertexNormals();
  return geometry;
}

function pieceIllustrationDetails(id: string) {
  const seed = pieceSeed(id);
  const tangentSource = new THREE.Vector3(0, 0, 1);
  const spots = Array.from({ length: 10 }, (_, index) => {
    const theta = Math.PI * 0.18 + seededNoise(seed + index * 8.73) * Math.PI * 0.7;
    const phi = seededNoise(seed + 30 + index * 4.21) * Math.PI * 2;
    const normal = new THREE.Vector3(
      Math.cos(phi) * Math.sin(theta),
      Math.cos(theta),
      Math.sin(phi) * Math.sin(theta),
    ).normalize();
    const rotation = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(tangentSource, normal));
    return {
      position: normal.multiplyScalar(PIECE_RADIUS * 1.016),
      rotation,
      radius: 0.028 + seededNoise(seed + 50 + index * 6.19) * 0.048,
      opacity: 0.28 + seededNoise(seed + 90 + index * 5.44) * 0.32,
    };
  });

  const crumbs = Array.from({ length: 12 }, (_, index) => {
    const theta = Math.PI * 0.12 + seededNoise(seed + index * 10.17) * Math.PI * 0.76;
    const phi = seededNoise(seed + 150 + index * 3.77) * Math.PI * 2;
    const normal = new THREE.Vector3(
      Math.cos(phi) * Math.sin(theta),
      Math.cos(theta),
      Math.sin(phi) * Math.sin(theta),
    ).normalize();
    const rotation = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(tangentSource, normal));
    return {
      position: normal.multiplyScalar(PIECE_RADIUS * 1.02),
      rotation,
      radius: 0.008 + seededNoise(seed + 190 + index * 4.39) * 0.012,
    };
  });
  const highlightNormal = new THREE.Vector3(-0.26, 0.93, -0.14).normalize();
  const highlightRotation = new THREE.Euler().setFromQuaternion(
    new THREE.Quaternion().setFromUnitVectors(tangentSource, highlightNormal),
  );

  return {
    geometry: createBreadBallGeometry(seed),
    highlightPosition: highlightNormal.multiplyScalar(PIECE_RADIUS * 1.024),
    highlightRotation,
    spots,
    crumbs,
  };
}

function smokePuffDetails(id: string) {
  const seed = pieceSeed(id);
  return Array.from({ length: 6 }, (_, index) => ({
    x: (seededNoise(seed + index * 12.7) - 0.5) * 0.18,
    y: seededNoise(seed + index * 7.9) * 0.08,
    delay: seededNoise(seed + index * 15.3),
    radius: 0.095 + seededNoise(seed + index * 5.1) * 0.055,
    speed: 0.34 + seededNoise(seed + index * 8.8) * 0.22,
    drift: (seededNoise(seed + index * 11.6) - 0.5) * 0.16,
  }));
}

function SmokeWisps({ pieceId, intensity }: { pieceId: string; intensity: number }) {
  const puffRefs = useRef<Array<THREE.Mesh | null>>([]);
  const puffs = useMemo(() => smokePuffDetails(pieceId), [pieceId]);

  useFrame(({ clock }) => {
    puffs.forEach((puff, index) => {
      const mesh = puffRefs.current[index];
      if (!mesh) return;

      const cycle = (clock.elapsedTime * puff.speed + puff.delay) % 1;
      const rise = cycle;
      mesh.position.set(
        puff.x + puff.drift * rise,
        puff.y + 0.12 + rise * (0.42 + intensity * 0.24),
        0,
      );
      mesh.scale.setScalar((0.5 + rise * 1.25) * (0.7 + intensity * 0.9));

      const material = mesh.material as THREE.MeshBasicMaterial;
      material.opacity = (1 - rise) ** 1.2 * (0.12 + intensity * 0.38);
    });
  });

  return (
    <>
      {puffs.map((puff, index) => (
        <mesh
          key={`smoke-${pieceId}-${index}`}
          renderOrder={18}
          ref={(mesh) => {
            puffRefs.current[index] = mesh;
          }}
        >
          <circleGeometry args={[puff.radius, 18]} />
          <meshBasicMaterial color="#ede7dd" transparent opacity={0} depthWrite={false} depthTest={false} />
        </mesh>
      ))}
    </>
  );
}

function GameTicker() {
  const tick = useTakoyakiGameStore((state) => state.tick);
  useFrame((_, delta) => tick(Math.min(delta, 0.05)));
  return null;
}

function Lighting() {
  return (
    <>
      <ambientLight intensity={0.82} color="#d8e2db" />
      <hemisphereLight intensity={0.7} color="#f2ddbc" groundColor="#122522" />
      <directionalLight castShadow intensity={1.7} color="#ffe0ae" position={[-2.8, 6.4, 2.2]} shadow-mapSize={[2048, 2048]} />
      <pointLight intensity={1.2} color="#ff9d42" position={[PAN_CENTER_X, 0.5, 2.2]} distance={3.2} />
      <Environment preset="warehouse" environmentIntensity={0.13} />
    </>
  );
}

function CameraRig() {
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);

  useEffect(() => {
    const isPortrait = size.height > size.width;
    const portraitRatio = size.height / Math.max(size.width, 1);
    const targetX = isPortrait ? 0.12 : 0.08;
    const targetZ = isPortrait
      ? THREE.MathUtils.clamp(0.72 + (portraitRatio - 1.7) * 0.42, 0.66, 1.02)
      : -0.02;
    if (camera instanceof THREE.OrthographicCamera) {
      camera.zoom = isPortrait
        ? THREE.MathUtils.clamp(Math.min(size.width / 4.05, size.height / 6.15), 92, 224)
        : THREE.MathUtils.clamp(Math.min(size.width / 4.7, size.height / 4.65), 96, 150);
    }
    camera.position.set(targetX, 8.8, 5.6);
    camera.lookAt(targetX, 0, targetZ);
    camera.updateProjectionMatrix();
  }, [camera, size.height, size.width]);

  return null;
}

function MascotTakoyakiStick() {
  return (
    <group position={[-2.26, -0.1, 0.18]} rotation={[0, 0, -0.08]} scale={[0.9, 0.9, 0.9]}>
      <mesh castShadow receiveShadow position={[0, 0.08, 0.58]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.024, 0.012, 1.04, 14]} />
        <meshStandardMaterial color="#161310" roughness={0.72} metalness={0.08} />
      </mesh>

      <mesh castShadow receiveShadow position={[0, 0.085, -0.2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.13, 0.16, 0.98, 22]} />
        <meshStandardMaterial color="#efc462" roughness={0.62} metalness={0.01} flatShading />
      </mesh>
      <mesh position={[-0.045, 0.18, -0.36]} rotation={[-Math.PI / 2, 0, -0.18]} scale={[0.44, 0.2, 1]}>
        <circleGeometry args={[0.18, 20]} />
        <meshBasicMaterial color="#ffe7a2" transparent opacity={0.5} />
      </mesh>

      <group position={[0, 0.2, -0.86]}>
        <mesh castShadow receiveShadow scale={[1.06, 0.78, 1]}>
          <sphereGeometry args={[0.21, 20, 14]} />
          <meshStandardMaterial color="#d93e34" roughness={0.68} metalness={0.01} flatShading />
        </mesh>
        <mesh position={[-0.06, 0.035, -0.035]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.014, 10]} />
          <meshBasicMaterial color="#2a1714" />
        </mesh>
        <mesh position={[0.06, 0.035, -0.035]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.014, 10]} />
          <meshBasicMaterial color="#2a1714" />
        </mesh>
        <mesh position={[0, 0.037, 0.025]} rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.026, 0.007, 8, 18]} />
          <meshBasicMaterial color="#fff0df" />
        </mesh>

        {[-0.13, -0.045, 0.045, 0.13].map((x, index) => (
          <mesh key={`mascot-leg-${index}`} castShadow receiveShadow position={[x, -0.01, 0.19]} scale={[1, 0.66, 1]}>
            <sphereGeometry args={[0.052, 10, 8]} />
            <meshStandardMaterial color="#c9312e" roughness={0.72} metalness={0.01} flatShading />
          </mesh>
        ))}
        <mesh castShadow receiveShadow position={[0.06, 0.11, -0.19]} rotation={[0, 0, 0.45]}>
          <coneGeometry args={[0.045, 0.105, 10]} />
          <meshStandardMaterial color="#ffebe0" roughness={0.74} metalness={0.01} flatShading />
        </mesh>
        <mesh position={[-0.035, 0.19, -0.12]} rotation={[-Math.PI / 2, 0, -0.22]} scale={[0.56, 0.2, 1]}>
          <circleGeometry args={[0.15, 16]} />
          <meshBasicMaterial color="#ff7e6c" transparent opacity={0.22} />
        </mesh>
      </group>
    </group>
  );
}

function CookingStation() {
  return (
    <group>
      <RoundedBox receiveShadow args={[4.55, 0.14, 5.18]} radius={0.16} smoothness={5} position={[0.24, -0.39, 0]}>
        <meshStandardMaterial color="#27443e" roughness={0.76} metalness={0.28} />
      </RoundedBox>
      <RoundedBox receiveShadow args={[1.1, 0.12, 4.8]} radius={0.16} smoothness={5} position={[1.35, -0.28, 0]}>
        <meshStandardMaterial color="#31564e" roughness={0.7} metalness={0.18} />
      </RoundedBox>
      <mesh receiveShadow position={[1.35, -0.205, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.9, 4.42]} />
        <meshStandardMaterial color="#17332e" roughness={0.74} metalness={0.18} />
      </mesh>
    </group>
  );
}

function FlameStrip({ active }: { active: boolean }) {
  const groupRef = useRef<THREE.Group | null>(null);
  const outerFlameShape = useMemo(() => createFlameShape(1), []);
  const innerFlameShape = useMemo(() => createFlameShape(0.58), []);

  useFrame(({ clock }) => {
    const group = groupRef.current;
    if (!group) return;
    const pulse = active ? 1 + Math.sin(clock.elapsedTime * 8.5) * 0.045 : 0.001;
    group.scale.set(1, pulse, 1);
  });

  return (
    <group ref={groupRef} visible={active} position={[PAN_CENTER_X, 0.13, 2.05]}>
      {FLAME_POSITIONS.map((x, index) => (
        <group
          key={`flame-${x}`}
          position={[x * 0.61, Math.sin(index * 1.8) * 0.016, 0.034]}
          scale={[1.12 + seededNoise(index + 1) * 0.14, 1.22 + seededNoise(index + 9) * 0.18, 1]}
        >
          <mesh rotation={[0, 0, (seededNoise(index + 3) - 0.5) * 0.22]}>
            <shapeGeometry args={[outerFlameShape]} />
            <meshBasicMaterial color="#ff7a1a" transparent opacity={0.98} side={THREE.DoubleSide} depthTest={false} />
          </mesh>
          <mesh position={[0.018, -0.035, 0.01]} rotation={[0, 0, (seededNoise(index + 11) - 0.5) * 0.16]}>
            <shapeGeometry args={[innerFlameShape]} />
            <meshBasicMaterial color="#ffd874" transparent opacity={0.94} side={THREE.DoubleSide} depthTest={false} />
          </mesh>
        </group>
      ))}
      <pointLight intensity={active ? 2.1 : 0} color="#ff9f35" distance={3.1} position={[0, 0.32, 0]} />
    </group>
  );
}

function GrillPan({ fireActive }: { fireActive: boolean }) {
  const holes = useMemo(
    () => Array.from({ length: GAME_CONSTANTS.takoyakiCount }, (_, index) => panHolePosition(index)),
    [],
  );

  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        <RoundedBox receiveShadow args={[2.92, 0.3, 4.7]} radius={0.14} smoothness={5} position={[PAN_CENTER_X, -0.02, PAN_CENTER_Z]}>
          <meshStandardMaterial color="#101513" roughness={0.82} metalness={0.42} />
        </RoundedBox>
        <RoundedBox receiveShadow args={[2.72, 0.24, 4.5]} radius={0.1} smoothness={5} position={[PAN_CENTER_X, 0.075, PAN_CENTER_Z]}>
          <meshStandardMaterial color="#202724" roughness={0.9} metalness={0.3} />
        </RoundedBox>
        <CuboidCollider args={[1.3, 0.12, 2.15]} position={[PAN_CENTER_X, 0, PAN_CENTER_Z]} />
      </RigidBody>

      {holes.map((position, index) => (
        <group key={`hole-${index}`} position={[position.x, PAN_SURFACE_Y + 0.016, position.z]}>
          <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.31, 34]} />
            <meshStandardMaterial color="#070a09" roughness={0.92} metalness={0.22} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.31, 0.356, 34]} />
            <meshStandardMaterial color="#3b413d" roughness={0.76} metalness={0.4} />
          </mesh>
          <mesh position={[-0.08, 0.012, -0.07]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.12, 16]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.055} />
          </mesh>
        </group>
      ))}

      {[
        [PAN_CENTER_X - 1.22, -2.17],
        [PAN_CENTER_X + 1.22, -2.17],
        [PAN_CENTER_X - 1.22, 2.17],
        [PAN_CENTER_X + 1.22, 2.17],
      ].map(([x, z], index) => (
        <group key={`pan-screw-${index}`} position={[x, 0.22, z]}>
          <mesh>
            <cylinderGeometry args={[0.055, 0.055, 0.025, 20]} />
            <meshStandardMaterial color="#9a8a72" roughness={0.42} metalness={0.72} />
          </mesh>
          <mesh position={[0, 0.014, 0]} rotation={[-Math.PI / 2, 0, index % 2 ? 0.72 : -0.72]}>
            <planeGeometry args={[0.065, 0.012]} />
            <meshBasicMaterial color="#403a33" />
          </mesh>
        </group>
      ))}
      <FlameStrip active={fireActive} />
    </group>
  );
}

type PlateVisualStatus = "idle" | "checking" | "accepted" | "rejected" | "completed";

function PlateDish({ plateIndex, status }: { plateIndex: number; status: PlateVisualStatus }) {
  const center = PLATE_CENTERS[plateIndex];
  const rimColor =
    status === "completed" || status === "accepted"
      ? "#d9a43e"
      : status === "rejected"
        ? "#b94735"
        : status === "checking"
          ? "#d98232"
          : "#1f7568";

  return (
    <RigidBody type="fixed" colliders={false}>
      <group position={center}>
        <mesh position={[0.035, -0.085, 0.045]} scale={[0.92, 1, 1.18]}>
          <cylinderGeometry args={[0.56, 0.51, 0.08, 64]} />
          <meshBasicMaterial color="#07120f" transparent opacity={0.3} />
        </mesh>
        <mesh receiveShadow scale={[0.92, 1, 1.18]}>
          <cylinderGeometry args={[0.54, 0.49, 0.1, 64]} />
          <meshStandardMaterial color={rimColor} roughness={0.62} metalness={0.08} />
        </mesh>
        <mesh position={[0, 0.065, 0]} scale={[0.84, 1, 1.08]}>
          <cylinderGeometry args={[0.51, 0.49, 0.035, 64]} />
          <meshStandardMaterial color="#fff2d4" roughness={0.72} metalness={0.02} />
        </mesh>
        <mesh position={[-0.11, 0.086, -0.19]} rotation={[-Math.PI / 2, 0, -0.2]} scale={[0.34, 0.5, 1]}>
          <circleGeometry args={[0.38, 32]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.22} />
        </mesh>
        <mesh position={[0, 0.09, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.28, 0.295, 48]} />
          <meshBasicMaterial
            color={status === "completed" || status === "accepted" ? "#d9a43e" : "#d7b966"}
            transparent
            opacity={status === "idle" ? 0.4 : 0.8}
          />
        </mesh>
      </group>
      <CuboidCollider args={[PLATE_SIZE.width / 2, 0.08, PLATE_SIZE.depth / 2]} position={center} />
    </RigidBody>
  );
}

function Plates() {
  const completedPlateIndexes = useTakoyakiGameStore((state) => state.completedPlateIndexes);
  const plateCheck = useTakoyakiGameStore((state) => state.plateCheck);

  return (
    <>
      {PLATE_CENTERS.map((_, plateIndex) => (
        <PlateDish
          key={plateIndex}
          plateIndex={plateIndex}
          status={
            completedPlateIndexes.includes(plateIndex)
              ? "completed"
              : plateCheck.plateIndex === plateIndex
                ? plateCheck.phase
                : "idle"
          }
        />
      ))}
    </>
  );
}

function TakoyakiPiece({
  piece,
  charging,
  charge,
  onPointerDown,
  onDoubleClick,
}: {
  piece: TakoyakiPieceState;
  charging: boolean;
  charge: number;
  onPointerDown: (piece: TakoyakiPieceState, event: ThreeEvent<PointerEvent>) => void;
  onDoubleClick: (piece: TakoyakiPieceState, event: ThreeEvent<MouseEvent>) => void;
}) {
  const bodyRef = useRef<RapierRigidBody | null>(null);
  const groupRef = useRef<THREE.Group | null>(null);
  const gaugeRef = useRef<THREE.Group | null>(null);
  const smokeRef = useRef<THREE.Group | null>(null);
  const camera = useThree((state) => state.camera);
  const targetPosition = pieceBasePosition(piece);
  const currentPositionRef = useRef(targetPosition.clone());
  const isRevealing = piece.revealTimer > 0;
  const illustration = useMemo(() => pieceIllustrationDetails(piece.id), [piece.id]);
  const smokeIntensity = smokeIntensityForLevel(hottestContactLevel(piece));
  const pieceScale = piece.location === "plate" ? PLATE_PIECE_SCALE : 1;

  useFrame((_, delta) => {
    const body = bodyRef.current;
    const group = groupRef.current;
    if (!body || !group) return;

    const current = currentPositionRef.current;
    current.lerp(targetPosition, 0.18);
    const lift = isRevealing ? Math.sin((piece.revealTimer / GAME_CONSTANTS.revealDuration) * Math.PI) * 0.12 : 0;
    const displayY = current.y + lift;
    body.setNextKinematicTranslation({ x: current.x, y: displayY, z: current.z });

    if (gaugeRef.current) {
      gaugeRef.current.position.set(current.x, displayY, current.z);
      gaugeRef.current.quaternion.copy(camera.quaternion);
    }

    if (smokeRef.current) {
      smokeRef.current.position.set(current.x, displayY + PIECE_RADIUS * 0.72, current.z);
      smokeRef.current.quaternion.copy(camera.quaternion);
    }

    if (isRevealing) {
      const progress = 1 - piece.revealTimer / GAME_CONSTANTS.revealDuration;
      const easedProgress = 1 - (1 - progress) ** 3;
      setQuaternionFromTuple(TEMP_BASE_QUATERNION, piece.previousVisualQuaternion);
      setFlipQuaternion(TEMP_FLIP_QUATERNION, piece.flipAxisX, piece.flipAxisZ, piece.flipAngle * easedProgress);
      TEMP_QUATERNION.copy(TEMP_FLIP_QUATERNION).multiply(TEMP_BASE_QUATERNION);
    } else {
      setQuaternionFromTuple(TEMP_QUATERNION, piece.visualQuaternion);
    }
    body.setNextKinematicRotation(TEMP_QUATERNION);

    group.scale.setScalar(pieceScale);
  });

  if (piece.location === "completed") return null;

  return (
    <>
      <RigidBody
        ref={bodyRef}
        type="kinematicPosition"
        colliders={false}
        position={[targetPosition.x, targetPosition.y, targetPosition.z]}
        enabledRotations={[true, true, true]}
      >
        <BallCollider args={[PIECE_RADIUS * pieceScale]} />
        <group
          ref={groupRef}
          onPointerDown={(event) => onPointerDown(piece, event)}
          onDoubleClick={(event) => onDoubleClick(piece, event)}
        >
          <mesh position={[0.035, -0.286, 0.04]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.16, 0.82, 1]}>
            <circleGeometry args={[PIECE_RADIUS * 0.98, 36]} />
            <meshBasicMaterial color="#100d0a" transparent opacity={piece.location === "plate" ? 0.08 : 0.18} />
          </mesh>

          <mesh castShadow>
            <primitive attach="geometry" object={illustration.geometry} />
            <meshStandardMaterial color="#f7dea1" roughness={0.88} metalness={0.01} />
          </mesh>

          {Array.from({ length: GAME_CONSTANTS.surfacePanelCount }, (_, panelIndex) => {
            const level = levelForPanel(piece, panelIndex);
            const opacity = cookOverlayOpacity(level);
            if (opacity <= 0) return null;
            return (
              <mesh key={`cook-panel-${piece.id}-${panelIndex}`} castShadow>
                <sphereGeometry args={panelGeometryArgs(panelIndex)} />
                <meshStandardMaterial
                  color={colorForCookLevel(level)}
                  roughness={0.9}
                  metalness={0.01}
                  transparent
                  opacity={opacity}
                  depthWrite={false}
                />
              </mesh>
            );
          })}

          <mesh position={illustration.highlightPosition} rotation={illustration.highlightRotation} scale={[1.28, 0.72, 1]}>
            <circleGeometry args={[0.098, 18]} />
            <meshBasicMaterial color="#fff3c8" transparent opacity={0.3} side={THREE.DoubleSide} />
          </mesh>

          {illustration.crumbs.map((crumb, index) => (
            <mesh key={`crumb-${piece.id}-${index}`} position={crumb.position} rotation={crumb.rotation}>
              <circleGeometry args={[crumb.radius, 9]} />
              <meshBasicMaterial color="#d9bb81" transparent opacity={0.16} side={THREE.DoubleSide} />
            </mesh>
          ))}
        </group>
      </RigidBody>

      {charging && piece.location === "pan" && !isRevealing && (
        <group ref={gaugeRef} position={[targetPosition.x, targetPosition.y, targetPosition.z]}>
          <mesh renderOrder={20}>
            <ringGeometry args={[0.32, 0.36, 48, 1, -Math.PI / 2, Math.max(0.02, charge) * Math.PI * 2]} />
            <meshBasicMaterial color="#f97316" transparent opacity={0.96} depthTest={false} />
          </mesh>
        </group>
      )}

      {smokeIntensity > 0 && (
        <group ref={smokeRef} position={[targetPosition.x, targetPosition.y + PIECE_RADIUS * 0.72, targetPosition.z]}>
          <SmokeWisps pieceId={piece.id} intensity={smokeIntensity} />
        </group>
      )}
    </>
  );
}

function SceneInteraction({
  press,
  setPress,
  onFlipRequest,
}: {
  press: PressState | null;
  setPress: React.Dispatch<React.SetStateAction<PressState | null>>;
  onFlipRequest: (pieceId: string, intent: FlipIntent) => void;
}) {
  const pressRef = useRef<PressState | null>(press);

  useEffect(() => {
    pressRef.current = press;
  }, [press]);

  useEffect(() => {
    if (!press) return undefined;

    function handlePointerMove(event: PointerEvent) {
      event.preventDefault();
      setPress((latest) => {
        if (!latest) return latest;
        const nextPress = samplePress(latest, { x: event.clientX, y: event.clientY });
        pressRef.current = nextPress;
        return nextPress;
      });
    }

    function handlePointerUp(event: PointerEvent) {
      event.preventDefault();
      const currentPress = pressRef.current;
      if (!currentPress) return;
      const sampledPress = samplePress(currentPress, { x: event.clientX, y: event.clientY });
      pressRef.current = null;
      setPress(null);
      onFlipRequest(sampledPress.pieceId, flipIntentFromPress(sampledPress));
    }

    window.addEventListener("pointermove", handlePointerMove, { passive: false });
    window.addEventListener("pointerup", handlePointerUp, { once: true, passive: false });
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [onFlipRequest, press, setPress]);

  return null;
}

function TakoyakiScene() {
  const pieces = useTakoyakiGameStore((state) => state.pieces);
  const phase = useTakoyakiGameStore((state) => state.phase);
  const completedPlateIndexes = useTakoyakiGameStore((state) => state.completedPlateIndexes);
  const plateCheck = useTakoyakiGameStore((state) => state.plateCheck);
  const remainingTime = useTakoyakiGameStore((state) => state.remainingTime);
  const rotatePiece = useTakoyakiGameStore((state) => state.rotatePiece);
  const movePieceToPlate = useTakoyakiGameStore((state) => state.movePieceToPlate);
  const returnPieceToPan = useTakoyakiGameStore((state) => state.returnPieceToPan);
  const [press, setPress] = useState<PressState | null>(null);
  const gasRatio = remainingTime / GAME_CONSTANTS.timeLimit;
  const gasActive = phase === "playing" && gasRatio > 0;

  const handleFlipRequest = useCallback(
    (pieceId: string, intent: FlipIntent) => {
      rotatePiece(pieceId, intent.rotationStep, intent.flipAxisX, intent.flipAxisZ, intent.flipAngle);
    },
    [rotatePiece],
  );

  const handlePiecePointerDown = useCallback(
    (piece: TakoyakiPieceState, event: ThreeEvent<PointerEvent>) => {
      if (phase !== "playing" || piece.location !== "pan") return;
      event.stopPropagation();
      event.nativeEvent.preventDefault();
      const target = event.nativeEvent.target;
      if (target instanceof Element && "setPointerCapture" in target) {
        target.setPointerCapture(event.nativeEvent.pointerId);
      }
      const client = { x: event.nativeEvent.clientX, y: event.nativeEvent.clientY };
      setPress({
        pieceId: piece.id,
        charge: 0,
        startClient: client,
        currentClient: client,
      });
    },
    [phase],
  );

  const handlePieceDoubleClick = useCallback(
    (piece: TakoyakiPieceState, event: ThreeEvent<MouseEvent>) => {
      if (phase !== "playing" || piece.location === "completed" || plateCheck.phase !== "idle") return;
      event.stopPropagation();
      setPress(null);

      if (piece.location === "pan") {
        const plateIndex = firstAvailablePlateIndex(pieces, completedPlateIndexes);
        if (plateIndex !== null) movePieceToPlate(piece.id, plateIndex);
        return;
      }

      if (piece.location === "plate") {
        if (piece.plateIndex !== null && completedPlateIndexes.includes(piece.plateIndex)) return;
        const panHoleId = firstOpenPanHoleId(pieces);
        if (panHoleId) returnPieceToPan(piece.id, panHoleId);
      }
    },
    [completedPlateIndexes, movePieceToPlate, phase, pieces, plateCheck.phase, returnPieceToPan],
  );

  return (
    <>
      <OrthographicCamera makeDefault position={[1.05, 8.2, 6.6]} zoom={118} />
      <CameraRig />
      <Lighting />
      <CookingStation />
      <Physics gravity={[0, -9.81, 0]} timeStep="vary">
        <GameTicker />
        <GrillPan fireActive={gasActive} />
        <Plates />
        {pieces.map((piece) => (
          <TakoyakiPiece
            key={piece.id}
            piece={piece}
            charging={press?.pieceId === piece.id}
            charge={press?.pieceId === piece.id ? press.charge : 0}
            onPointerDown={handlePiecePointerDown}
            onDoubleClick={handlePieceDoubleClick}
          />
        ))}
      </Physics>
      <ContactShadows position={[0, -0.29, 0.55]} opacity={0.26} scale={5.2} blur={2.2} far={2.1} />
      <SceneInteraction press={press} setPress={setPress} onFlipRequest={handleFlipRequest} />
    </>
  );
}

function GasSupplyOverlay() {
  const remainingTime = useTakoyakiGameStore((state) => state.remainingTime);
  const gasRatio = THREE.MathUtils.clamp(remainingTime / GAME_CONSTANTS.timeLimit, 0, 1);

  return (
    <>
      <span className="takoyaki-gas-hose" aria-hidden="true" />
      <div className="takoyaki-bottom-gas" aria-label={`남은 가스 ${Math.round(gasRatio * 100)}%`}>
        <div className="takoyaki-bottom-gas-tank" aria-hidden="true">
          <span className="takoyaki-bottom-gas-valve">
            <i />
          </span>
          <span className="takoyaki-bottom-gas-band band-left" />
          <span className="takoyaki-bottom-gas-band band-right" />
          <span className="takoyaki-bottom-gas-foot foot-left" />
          <span className="takoyaki-bottom-gas-foot foot-right" />
          <Flame className="takoyaki-bottom-gas-icon" size={17} strokeWidth={2.5} />
          <span className="takoyaki-bottom-gas-track">
            <span className="takoyaki-bottom-gas-fill" style={{ width: `${gasRatio * 100}%` }} />
            <span className="takoyaki-bottom-gas-glass" />
          </span>
        </div>
      </div>
    </>
  );
}

function GameHud() {
  const phase = useTakoyakiGameStore((state) => state.phase);
  const completedPlateIndexes = useTakoyakiGameStore((state) => state.completedPlateIndexes);
  const plateCheck = useTakoyakiGameStore((state) => state.plateCheck);
  const resetGame = useTakoyakiGameStore((state) => state.resetGame);

  return (
    <div className="takoyaki-hud">
      <div className="takoyaki-hud-bar">
        <div className="takoyaki-stat" aria-label={`완성 접시 ${completedPlateIndexes.length}/3`}>
          <span className="takoyaki-progress-label">완성</span>
          <span className="takoyaki-plate-progress" aria-hidden="true">
            {Array.from({ length: GAME_CONSTANTS.targetPlateCount }, (_, plateIndex) => {
              const completed = completedPlateIndexes.includes(plateIndex);
              const checking = plateCheck.plateIndex === plateIndex && plateCheck.phase !== "idle";
              return (
                <i
                  key={`hud-plate-${plateIndex}`}
                  className={`takoyaki-plate-progress-item${completed ? " completed" : ""}${checking ? ` ${plateCheck.phase}` : ""}`}
                >
                  {completed ? <Check size={12} strokeWidth={3} /> : plateIndex + 1}
                </i>
              );
            })}
          </span>
        </div>

        {phase !== "ready" && (
          <div className="takoyaki-actions">
            <button className="takoyaki-secondary-button" title="재시작" aria-label="재시작" onClick={resetGame}>
              <RotateCcw size={18} />
              <span>재시작</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function plateCheckCopy(reason: string | null) {
  if (reason === "overcooked") return "탄 면이 섞여 있어요";
  if (reason === "mixed") return "덜 익은 면과 탄 면이 함께 있어요";
  return "익힘이 아직 고르지 않아요";
}

function PlateCheckExperience() {
  const plateCheck = useTakoyakiGameStore((state) => state.plateCheck);
  const completedPlateCount = useTakoyakiGameStore((state) => state.completedPlateCount);
  const revealPlateCheck = useTakoyakiGameStore((state) => state.revealPlateCheck);
  const settlePlateCheck = useTakoyakiGameStore((state) => state.settlePlateCheck);

  useEffect(() => {
    if (plateCheck.phase === "checking") {
      const timer = window.setTimeout(revealPlateCheck, 900);
      return () => window.clearTimeout(timer);
    }
    if (plateCheck.phase === "accepted" || plateCheck.phase === "rejected") {
      const timer = window.setTimeout(settlePlateCheck, plateCheck.phase === "accepted" ? 1500 : 1900);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [plateCheck.phase, revealPlateCheck, settlePlateCheck]);

  if (plateCheck.phase === "idle" || plateCheck.plateIndex === null) return null;

  const plateNumber = plateCheck.plateIndex + 1;
  const accepted = plateCheck.phase === "accepted";
  const rejected = plateCheck.phase === "rejected";

  return (
    <div className={`takoyaki-plate-check ${plateCheck.phase}`} role="status" aria-live="assertive">
      <span className="takoyaki-plate-check-icon" aria-hidden="true">
        {plateCheck.phase === "checking" ? (
          <LoaderCircle size={22} />
        ) : accepted ? (
          <Check size={23} strokeWidth={3} />
        ) : (
          <CircleAlert size={22} />
        )}
      </span>
      <span className="takoyaki-plate-check-copy">
        <strong>
          {plateCheck.phase === "checking"
            ? `${plateNumber}번 접시 확인 중`
            : accepted
              ? "한 접시 완성!"
              : plateCheckCopy(plateCheck.reason)}
        </strong>
        <small>
          {plateCheck.phase === "checking"
            ? "여섯 개의 익힘 상태를 살펴보고 있어요"
            : accepted
              ? `완성 ${completedPlateCount + 1}/3 · 이 접시는 서빙 준비 완료`
              : rejected
                ? "잠시 후 빈 불판으로 돌려보냅니다"
                : ""}
        </small>
      </span>
    </div>
  );
}

function OctopusGuideMascot({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`takoyaki-guide-mascot${compact ? " compact" : ""}`} aria-hidden="true">
      <span className="takoyaki-guide-mascot-head">
        <i className="takoyaki-guide-eye left" />
        <i className="takoyaki-guide-eye right" />
        <i className="takoyaki-guide-mouth" />
      </span>
      <span className="takoyaki-guide-leg leg-one" />
      <span className="takoyaki-guide-leg leg-two" />
      <span className="takoyaki-guide-leg leg-three" />
      <span className="takoyaki-guide-leg leg-four" />
    </span>
  );
}

function GameplayGuide() {
  const phase = useTakoyakiGameStore((state) => state.phase);
  const remainingTime = useTakoyakiGameStore((state) => state.remainingTime);
  const pieces = useTakoyakiGameStore((state) => state.pieces);
  const plateCheck = useTakoyakiGameStore((state) => state.plateCheck);
  const [activeCue, setActiveCue] = useState<GuideCue | null>(null);
  const activeCueRef = useRef<GuideCue | null>(null);
  const cueQueueRef = useRef<GuideCue[]>([]);
  const seenCueIdsRef = useRef(new Set<string>());

  const enqueueCue = useCallback((cue: GuideCue) => {
    if (seenCueIdsRef.current.has(cue.id)) return;
    seenCueIdsRef.current.add(cue.id);

    if (!activeCueRef.current) {
      activeCueRef.current = cue;
      setActiveCue(cue);
      return;
    }
    cueQueueRef.current.push(cue);
  }, []);

  useEffect(() => {
    if (!activeCue) return undefined;
    const timer = window.setTimeout(() => {
      const nextCue = cueQueueRef.current.shift() ?? null;
      activeCueRef.current = nextCue;
      setActiveCue(nextCue);
    }, 4200);
    return () => window.clearTimeout(timer);
  }, [activeCue]);

  useEffect(() => {
    if (phase !== "ready") return;
    activeCueRef.current = null;
    cueQueueRef.current = [];
    seenCueIdsRef.current.clear();
    setActiveCue(null);
  }, [phase]);

  useEffect(() => {
    if (phase !== "playing") return undefined;
    const timer = window.setTimeout(() => {
      enqueueCue({
        id: "fire-started",
        tone: "tip",
        text: "불이 닿는 아래쪽 면부터 익어. 타코야끼를 누른 채 당겨 골고루 굴려보자!",
      });
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [enqueueCue, phase]);

  useEffect(() => {
    if (phase !== "playing") return;

    const panelLevels = pieces.flatMap((piece) => piece.panelStateLevels);
    const hottestLevel = panelLevels.length ? Math.max(...panelLevels) : 0;
    const platedPieceCount = pieces.filter((piece) => piece.location === "plate").length;

    if (hottestLevel >= SMOKE_START_LEVEL) {
      enqueueCue({
        id: "first-smoke",
        tone: "tip",
        text: "김이 오르기 시작했네. 이제부터 색이 빠르게 변할 거야.",
      });
    }
    if (hottestLevel >= GAME_CONSTANTS.targetStateMin) {
      enqueueCue({
        id: "first-ready-surface",
        tone: "ready",
        text: "노릇하게 익은 면이 생겼어! 다른 면도 이 색에 맞춰보자.",
      });
    }
    if (platedPieceCount > 0) {
      enqueueCue({
        id: "first-plated-piece",
        tone: "success",
        text: "좋아! 한 접시에 6개가 차면 바로 익힘 상태를 확인할게.",
      });
    }
    if (hottestLevel >= GAME_CONSTANTS.overdoneThreshold) {
      enqueueCue({
        id: "first-burnt-surface",
        tone: "danger",
        text: "어디서 타는 냄새가… 검게 변하기 전에 바로 뒤집어!",
      });
    }
    if (remainingTime <= 30) {
      enqueueCue({
        id: "low-gas",
        tone: "danger",
        text: "가스가 얼마 안 남았어. 익은 타코야끼부터 접시에 담자!",
      });
    }
  }, [enqueueCue, phase, pieces, remainingTime]);

  if (!activeCue || phase !== "playing" || plateCheck.phase !== "idle") return null;

  return (
    <div key={activeCue.id} className={`takoyaki-guide-dialogue ${activeCue.tone}`} role="status" aria-live="polite">
      <OctopusGuideMascot />
      <div className="takoyaki-guide-bubble">
        <span className="takoyaki-guide-speaker">
          {activeCue.tone === "danger" ? <Flame size={14} /> : <Sparkles size={14} />}
          타코 점장
        </span>
        <p>{activeCue.text}</p>
      </div>
    </div>
  );
}

function StartOverlay() {
  const phase = useTakoyakiGameStore((state) => state.phase);
  const startGame = useTakoyakiGameStore((state) => state.startGame);
  if (phase !== "ready") return null;

  return (
    <div className="takoyaki-start-overlay">
      <div className="takoyaki-start-content">
        <button className="takoyaki-start-button" onClick={startGame}>
          <Play size={24} />
          시작
        </button>
        <div className="takoyaki-start-guide">
          <OctopusGuideMascot compact />
          <div className="takoyaki-start-guide-copy">
            <strong>세 접시를 완성해볼까요?</strong>
            <ol>
              <li><b>1</b><span>타코야끼를 누른 채 당겨 뒤집기</span></li>
              <li><b>2</b><span>다 익으면 두 번 눌러 접시에 담기</span></li>
              <li><b>3</b><span>6개씩 세 접시 완성하기</span></li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResultOverlay() {
  const phase = useTakoyakiGameStore((state) => state.phase);
  const resetGame = useTakoyakiGameStore((state) => state.resetGame);
  if (phase !== "success" && phase !== "fail") return null;

  return (
    <div className="takoyaki-result-overlay">
      <div className="takoyaki-result-panel">
        <p>{phase === "success" ? "영업 완료" : "영업 종료"}</p>
        <h1>{phase === "success" ? "세 접시 완성!" : "가스가 다 떨어졌어요"}</h1>
        <button className="takoyaki-primary-button" onClick={resetGame}>
          <RotateCcw size={18} />
          <span>다시 굽기</span>
        </button>
      </div>
    </div>
  );
}

export function TakoyakiGrillGame() {
  return (
    <main className="takoyaki-game">
      <div className="takoyaki-shell">
        <section className="takoyaki-stage" aria-label="타코야끼 굽기 게임 화면">
          <div className="takoyaki-playfield">
            <GameHud />
            <GameplayGuide />
            <PlateCheckExperience />
            <div className="takoyaki-canvas-frame">
              <Canvas
                shadows
                dpr={[1, 1.7]}
                gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
                className="takoyaki-canvas"
              >
                <TakoyakiScene />
              </Canvas>
            </div>
            <GasSupplyOverlay />
            <StartOverlay />
            <ResultOverlay />
          </div>
        </section>
      </div>
    </main>
  );
}
