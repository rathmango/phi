import { ContactShadows, Environment, OrthographicCamera } from "@react-three/drei";
import { Canvas, ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { BallCollider, CuboidCollider, Physics, RigidBody, RapierRigidBody } from "@react-three/rapier";
import { Clock3, Flame, Play, RotateCcw, Send, Trophy } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import {
  colorForCookLevel,
  formatClock,
  GAME_CONSTANTS,
  levelForPanel,
} from "./gameRules";
import { useTakoyakiGameStore } from "./gameStore";
import { GamePhase, TakoyakiPieceState } from "./gameTypes";

const HOLE_GAP_X = 0.92;
const HOLE_GAP_Z = 0.82;
const PAN_SURFACE_Y = 0.18;
const PIECE_RADIUS = 0.31;
const PIECE_Y = 0.56;
const PLATE_CENTERS = [
  new THREE.Vector3(3.12, 0.2, -1.78),
  new THREE.Vector3(3.12, 0.2, 0),
  new THREE.Vector3(3.12, 0.2, 1.78),
];
const PLATE_SIZE = { width: 1.82, depth: 1.34 };
const FLIP_MAX_CHARGE_SECONDS = 0.95;
const TEMP_QUATERNION = new THREE.Quaternion();
const TEMP_FROM_QUATERNION = new THREE.Quaternion();
const TEMP_TO_QUATERNION = new THREE.Quaternion();
const TEMP_EULER = new THREE.Euler();
const FLAME_POSITIONS = [-1.18, -0.38, 0.38, 1.18];

type PressState = {
  pieceId: string;
  startedAt: number;
  charge: number;
  startClient: { x: number; y: number };
  currentClient: { x: number; y: number };
};

function holeIndexFromId(holeId: string | null) {
  if (!holeId) return -1;
  const parsed = Number(holeId.replace("hole-", ""));
  return Number.isFinite(parsed) ? parsed : -1;
}

function panHolePosition(index: number) {
  const col = index % GAME_CONSTANTS.panWidthCount;
  const row = Math.floor(index / GAME_CONSTANTS.panWidthCount);
  const x = (col - (GAME_CONSTANTS.panWidthCount - 1) / 2) * HOLE_GAP_X;
  const z = (row - (GAME_CONSTANTS.panHeightCount - 1) / 2) * HOLE_GAP_Z;
  return new THREE.Vector3(x, PIECE_Y, z);
}

function plateSlotPosition(plateIndex: number | null, slotIndex: number | null) {
  const plateCenter = PLATE_CENTERS[plateIndex ?? 0] ?? PLATE_CENTERS[0];
  const safeIndex = slotIndex ?? 0;
  const col = safeIndex % 3;
  const row = Math.floor(safeIndex / 3);
  return new THREE.Vector3(
    plateCenter.x + (col - 1) * 0.44,
    PIECE_Y,
    plateCenter.z + (row - 0.5) * 0.42,
  );
}

function firstAvailablePlateIndex(pieces: TakoyakiPieceState[]) {
  for (let plateIndex = 0; plateIndex < GAME_CONSTANTS.targetPlateCount; plateIndex += 1) {
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

function chargeFromElapsed(elapsedSeconds: number) {
  return THREE.MathUtils.clamp(elapsedSeconds / FLIP_MAX_CHARGE_SECONDS, 0, 1);
}

function rotationStepFromPress(press: PressState) {
  const power = 1 + Math.floor(THREE.MathUtils.clamp(press.charge, 0, 0.999) * 4);
  const dx = press.currentClient.x - press.startClient.x;
  const dy = press.currentClient.y - press.startClient.y;
  const movement = Math.hypot(dx, dy);
  if (movement < 6) return power;
  const dominantDirection = Math.abs(dx) >= Math.abs(dy) ? dx : dy;
  return dominantDirection >= 0 ? power : -power;
}

function setTakoyakiOrientation(target: THREE.Quaternion, rotationIndex: number) {
  TEMP_EULER.set(rotationIndex * 0.72, rotationIndex * 0.24, 0);
  target.setFromEuler(TEMP_EULER);
}

function pieceBasePosition(piece: TakoyakiPieceState) {
  if (piece.location === "plate") return plateSlotPosition(piece.plateIndex, piece.plateSlotIndex);
  const holeIndex = holeIndexFromId(piece.panHoleId);
  return panHolePosition(holeIndex >= 0 ? holeIndex : 0);
}

function seededNoise(seed: number) {
  return Math.sin(seed * 12.9898) * 43758.5453 % 1;
}

function pieceSeed(id: string) {
  return id.split("").reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 3), 0);
}

function pieceBlobDetails(id: string) {
  const seed = pieceSeed(id);
  const bumps = Array.from({ length: 9 }, (_, index) => {
    const a = seededNoise(seed + index * 7.1);
    const b = seededNoise(seed + index * 11.4);
    const theta = Math.PI * 0.18 + Math.abs(a) * Math.PI * 0.72;
    const phi = Math.abs(b) * Math.PI * 2;
    const radius = PIECE_RADIUS * (0.82 + Math.abs(seededNoise(seed + index * 3.9)) * 0.24);
    return {
      position: new THREE.Vector3(
        Math.cos(phi) * Math.sin(theta) * radius,
        Math.cos(theta) * radius * 0.7,
        Math.sin(phi) * Math.sin(theta) * radius,
      ),
      scale: 0.055 + Math.abs(seededNoise(seed + index * 5.6)) * 0.045,
    };
  });
  const spots = Array.from({ length: 7 }, (_, index) => {
    const a = seededNoise(seed + index * 13.2);
    const b = seededNoise(seed + index * 17.8);
    const theta = Math.PI * 0.22 + Math.abs(a) * Math.PI * 0.62;
    const phi = Math.abs(b) * Math.PI * 2;
    const radius = PIECE_RADIUS * 1.018;
    return {
      position: new THREE.Vector3(
        Math.cos(phi) * Math.sin(theta) * radius,
        Math.cos(theta) * radius * 0.72,
        Math.sin(phi) * Math.sin(theta) * radius,
      ),
      rotation: [Math.PI / 2 - theta, 0, phi] as [number, number, number],
      scale: 0.045 + Math.abs(seededNoise(seed + index * 4.3)) * 0.035,
    };
  });
  return { bumps, spots };
}

function GameTicker() {
  const tick = useTakoyakiGameStore((state) => state.tick);
  useFrame((_, delta) => tick(Math.min(delta, 0.05)));
  return null;
}

function Lighting() {
  return (
    <>
      <ambientLight intensity={0.72} />
      <directionalLight castShadow intensity={1.9} position={[3.5, 6, 4]} shadow-mapSize={[1024, 1024]} />
      <pointLight intensity={2.8} color="#ffb15f" position={[-2.6, 1.5, -2.7]} distance={5.4} />
      <Environment preset="apartment" environmentIntensity={0.18} />
    </>
  );
}

function CameraRig() {
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);

  useEffect(() => {
    const isPortrait = size.height > size.width;
    if (camera instanceof THREE.OrthographicCamera) {
      camera.zoom = isPortrait ? 82 : 118;
    }
    camera.position.set(isPortrait ? 0.85 : 1.05, 8.2, 6.6);
    camera.lookAt(isPortrait ? 0.85 : 1.05, 0, 0);
    camera.updateProjectionMatrix();
  }, [camera, size.height, size.width]);

  return null;
}

function FlameStrip({ active }: { active: boolean }) {
  const groupRef = useRef<THREE.Group | null>(null);

  useFrame(({ clock }) => {
    const group = groupRef.current;
    if (!group) return;
    const pulse = active ? 1 + Math.sin(clock.elapsedTime * 9) * 0.08 : 0.001;
    group.scale.set(1, pulse, 1);
  });

  return (
    <group ref={groupRef} visible={active} position={[-0.02, -0.42, 2.94]}>
      {FLAME_POSITIONS.map((x, index) => (
        <group key={`flame-${x}`} position={[x, 0, 0]}>
          <mesh rotation={[0, 0, Math.sin(index) * 0.08]} position={[0, 0.04, 0]}>
            <coneGeometry args={[0.2, 0.58, 4]} />
            <meshBasicMaterial color="#ff6b1a" />
          </mesh>
          <mesh rotation={[0, 0, -Math.sin(index) * 0.07]} position={[0, 0.09, 0.02]}>
            <coneGeometry args={[0.11, 0.4, 4]} />
            <meshBasicMaterial color="#ffd166" />
          </mesh>
        </group>
      ))}
      <pointLight intensity={active ? 4 : 0} color="#ff8a2a" distance={4.8} position={[0, 0.48, 0]} />
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
        <mesh receiveShadow position={[0, 0, 0]}>
          <boxGeometry args={[3.48, 0.34, 5.38]} />
          <meshStandardMaterial color="#151312" roughness={0.92} metalness={0.34} />
        </mesh>
        <CuboidCollider args={[1.68, 0.16, 2.62]} position={[0, 0, 0]} />
      </RigidBody>

      {holes.map((position, index) => (
        <group key={`hole-${index}`} position={[position.x, PAN_SURFACE_Y + 0.016, position.z]}>
          <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.395, 34]} />
            <meshStandardMaterial color="#050505" roughness={0.96} metalness={0.18} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.392, 0.454, 34]} />
            <meshStandardMaterial color="#2b2825" roughness={0.88} metalness={0.38} />
          </mesh>
          <mesh position={[-0.08, 0.012, -0.07]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.12, 16]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.055} />
          </mesh>
        </group>
      ))}

      <mesh receiveShadow position={[0, -0.18, 0]}>
        <boxGeometry args={[3.92, 0.18, 5.82]} />
        <meshStandardMaterial color="#27211c" roughness={0.9} metalness={0.24} />
      </mesh>
      <FlameStrip active={fireActive} />
    </group>
  );
}

function PlateDish({ plateIndex }: { plateIndex: number }) {
  const center = PLATE_CENTERS[plateIndex];
  const slots = Array.from({ length: GAME_CONSTANTS.plateCapacity }, (_, index) => plateSlotPosition(plateIndex, index));
  const plateShape = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-0.95, -0.03);
    shape.bezierCurveTo(-0.8, -0.56, -0.2, -0.72, 0.62, -0.58);
    shape.bezierCurveTo(1.06, -0.5, 1.23, -0.2, 1.08, 0.05);
    shape.bezierCurveTo(0.86, 0.44, 0.1, 0.62, -0.72, 0.45);
    shape.bezierCurveTo(-1.05, 0.38, -1.14, 0.18, -0.95, -0.03);
    return shape;
  }, []);

  return (
    <RigidBody type="fixed" colliders={false}>
      <group position={center}>
        <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} scale={[0.96, 0.8, 1]}>
          <shapeGeometry args={[plateShape]} />
          <meshStandardMaterial color="#ffd9a3" roughness={0.68} metalness={0.01} />
        </mesh>
        <mesh position={[0.03, 0.045, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[0.78, 0.55, 1]}>
          <shapeGeometry args={[plateShape]} />
          <meshStandardMaterial color="#fff3cf" roughness={0.7} metalness={0.01} />
        </mesh>
        <mesh position={[0.1, 0.078, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.62, 42]} />
          <meshStandardMaterial color="#ffd08f" roughness={0.76} metalness={0.01} />
        </mesh>
        <group position={[0.79, 0.14, -0.42]}>
          <mesh castShadow>
            <sphereGeometry args={[0.15, 20, 14]} />
            <meshStandardMaterial color="#ee3f28" roughness={0.35} />
          </mesh>
          <mesh position={[-0.08, -0.05, 0.08]} castShadow>
            <sphereGeometry args={[0.055, 12, 8]} />
            <meshStandardMaterial color="#ee3f28" roughness={0.45} />
          </mesh>
          <mesh position={[-0.08, -0.05, -0.08]} castShadow>
            <sphereGeometry args={[0.055, 12, 8]} />
            <meshStandardMaterial color="#ee3f28" roughness={0.45} />
          </mesh>
          <mesh position={[-0.04, 0.05, 0.065]}>
            <sphereGeometry args={[0.018, 8, 8]} />
            <meshStandardMaterial color="#131313" />
          </mesh>
        </group>
        {slots.map((slot, index) => (
          <mesh key={`plate-${plateIndex}-slot-${index}`} position={[slot.x - center.x, 0.115, slot.z - center.z]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.22, 24]} />
            <meshStandardMaterial color="#ffe6ba" roughness={0.78} metalness={0.01} />
          </mesh>
        ))}
      </group>
      <CuboidCollider args={[PLATE_SIZE.width / 2, 0.08, PLATE_SIZE.depth / 2]} position={center} />
    </RigidBody>
  );
}

function Plates() {
  return (
    <>
      {PLATE_CENTERS.map((_, plateIndex) => (
        <PlateDish key={plateIndex} plateIndex={plateIndex} />
      ))}
    </>
  );
}

function TakoyakiPiece({
  piece,
  selected,
  charge,
  onPointerDown,
  onDoubleClick,
}: {
  piece: TakoyakiPieceState;
  selected: boolean;
  charge: number;
  onPointerDown: (piece: TakoyakiPieceState, event: ThreeEvent<PointerEvent>) => void;
  onDoubleClick: (piece: TakoyakiPieceState, event: ThreeEvent<MouseEvent>) => void;
}) {
  const bodyRef = useRef<RapierRigidBody | null>(null);
  const groupRef = useRef<THREE.Group | null>(null);
  const targetPosition = pieceBasePosition(piece);
  const currentPositionRef = useRef(targetPosition.clone());
  const isRevealing = piece.revealTimer > 0;
  const blobDetails = useMemo(() => pieceBlobDetails(piece.id), [piece.id]);

  useFrame((_, delta) => {
    const body = bodyRef.current;
    const group = groupRef.current;
    if (!body || !group) return;

    const current = currentPositionRef.current;
    current.lerp(targetPosition, 0.18);
    const lift = isRevealing ? Math.sin((piece.revealTimer / GAME_CONSTANTS.revealDuration) * Math.PI) * 0.12 : 0;
    body.setNextKinematicTranslation({ x: current.x, y: current.y + lift, z: current.z });

    if (isRevealing) {
      const progress = 1 - piece.revealTimer / GAME_CONSTANTS.revealDuration;
      const easedProgress = THREE.MathUtils.smoothstep(progress, 0, 1);
      setTakoyakiOrientation(TEMP_FROM_QUATERNION, piece.previousRotationIndex);
      setTakoyakiOrientation(TEMP_TO_QUATERNION, piece.rotationIndex);
      TEMP_QUATERNION.copy(TEMP_FROM_QUATERNION).slerp(TEMP_TO_QUATERNION, easedProgress);
    } else {
      setTakoyakiOrientation(TEMP_QUATERNION, piece.rotationIndex);
    }
    body.setNextKinematicRotation(TEMP_QUATERNION);

    if (isRevealing) {
      group.scale.setScalar(THREE.MathUtils.lerp(group.scale.x, 1.08, delta * 16));
    } else {
      group.scale.setScalar(THREE.MathUtils.lerp(group.scale.x, selected ? 1.04 : 1, delta * 10));
    }
  });

  if (piece.location === "completed") return null;

  return (
    <RigidBody
      ref={bodyRef}
      type="kinematicPosition"
      colliders={false}
      position={[targetPosition.x, targetPosition.y, targetPosition.z]}
      enabledRotations={[true, true, true]}
    >
      <BallCollider args={[PIECE_RADIUS]} />
      <group
        ref={groupRef}
        onPointerDown={(event) => onPointerDown(piece, event)}
        onDoubleClick={(event) => onDoubleClick(piece, event)}
      >
        <mesh>
          <sphereGeometry args={[PIECE_RADIUS * 0.996, 32, 16]} />
          <meshStandardMaterial color="#8a542d" roughness={0.92} metalness={0.01} />
        </mesh>
        {Array.from({ length: GAME_CONSTANTS.surfacePanelCount }, (_, panelIndex) => {
          const level = levelForPanel(piece, panelIndex);
          const quadrant = panelIndex % 4;
          const isTop = panelIndex < 4;
          const phiLength = Math.PI / 2;
          const phiStart = quadrant * phiLength + 0.01;
          const thetaStart = isTop ? 0.01 : Math.PI / 2 + 0.01;
          const thetaLength = Math.PI / 2 - 0.02;
          const panelColor = level < 0.25 ? (panelIndex % 2 === 0 ? "#f5d18d" : "#eebf76") : colorForCookLevel(level);
          return (
            <mesh key={panelIndex} castShadow>
              <sphereGeometry args={[PIECE_RADIUS * 1.012, 10, 7, phiStart, phiLength - 0.02, thetaStart, thetaLength]} />
              <meshStandardMaterial color={panelColor} roughness={0.9} metalness={0.01} />
            </mesh>
          );
        })}
        {blobDetails.bumps.map((bump, index) => (
          <mesh key={`bump-${piece.id}-${index}`} position={bump.position} castShadow>
            <sphereGeometry args={[bump.scale, 10, 8]} />
            <meshStandardMaterial color={index % 2 === 0 ? "#f0bd6d" : "#d99751"} roughness={0.96} metalness={0.01} />
          </mesh>
        ))}
        {blobDetails.spots.map((spot, index) => (
          <mesh key={`spot-${piece.id}-${index}`} position={spot.position} rotation={spot.rotation}>
            <circleGeometry args={[spot.scale, 12]} />
            <meshBasicMaterial color={index % 3 === 0 ? "#7b3d21" : "#b9632d"} transparent opacity={0.7} />
          </mesh>
        ))}
        <mesh position={[-0.08, PIECE_RADIUS * 0.72, -0.03]} rotation={[-0.92, 0.2, -0.2]}>
          <circleGeometry args={[0.06, 14]} />
          <meshBasicMaterial color="#fff2cf" transparent opacity={0.38} />
        </mesh>
        {charge > 0 && (
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.268, 0]}>
            <ringGeometry args={[0.43, 0.475, 42, 1, -Math.PI / 2, Math.max(0.04, charge * Math.PI * 2)]} />
            <meshBasicMaterial color="#f97316" transparent opacity={0.88} />
          </mesh>
        )}
        {(selected || isRevealing) && (
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.275, 0]}>
            <ringGeometry args={[0.35, 0.39, 36]} />
            <meshBasicMaterial color={isRevealing ? "#f97316" : "#2563eb"} transparent opacity={0.72} />
          </mesh>
        )}
      </group>
    </RigidBody>
  );
}

function SceneInteraction({
  press,
  setPress,
  onFlipRequest,
}: {
  press: PressState | null;
  setPress: React.Dispatch<React.SetStateAction<PressState | null>>;
  onFlipRequest: (pieceId: string, rotationStep: number) => void;
}) {
  const pressRef = useRef<PressState | null>(press);

  useEffect(() => {
    pressRef.current = press;
  }, [press]);

  useFrame(() => {
    const current = pressRef.current;
    if (!current) return;
    const nextCharge = chargeFromElapsed((performance.now() - current.startedAt) / 1000);
    if (Math.abs(nextCharge - current.charge) < 0.015) return;
    setPress((latest) => {
      if (!latest || latest.pieceId !== current.pieceId) return latest;
      const nextPress = { ...latest, charge: nextCharge };
      pressRef.current = nextPress;
      return nextPress;
    });
  });

  useEffect(() => {
    if (!press) return undefined;

    function handlePointerMove(event: PointerEvent) {
      setPress((latest) => {
        if (!latest) return latest;
        const nextPress = {
          ...latest,
          currentClient: { x: event.clientX, y: event.clientY },
        };
        pressRef.current = nextPress;
        return nextPress;
      });
    }

    function handlePointerUp() {
      const currentPress = pressRef.current;
      if (!currentPress) return;
      pressRef.current = null;
      setPress(null);
      onFlipRequest(currentPress.pieceId, rotationStepFromPress(currentPress));
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp, { once: true });
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
  const selectedPieceId = useTakoyakiGameStore((state) => state.selectedPieceId);
  const rotatePiece = useTakoyakiGameStore((state) => state.rotatePiece);
  const movePieceToPlate = useTakoyakiGameStore((state) => state.movePieceToPlate);
  const returnPieceToPan = useTakoyakiGameStore((state) => state.returnPieceToPan);
  const [press, setPress] = useState<PressState | null>(null);

  const handleFlipRequest = useCallback(
    (pieceId: string, rotationStep: number) => {
      rotatePiece(pieceId, rotationStep);
    },
    [rotatePiece],
  );

  const handlePiecePointerDown = useCallback(
    (piece: TakoyakiPieceState, event: ThreeEvent<PointerEvent>) => {
      if (phase !== "playing" || piece.location !== "pan") return;
      event.stopPropagation();
      const client = { x: event.nativeEvent.clientX, y: event.nativeEvent.clientY };
      setPress({
        pieceId: piece.id,
        startedAt: performance.now(),
        charge: 0,
        startClient: client,
        currentClient: client,
      });
    },
    [phase],
  );

  const handlePieceDoubleClick = useCallback(
    (piece: TakoyakiPieceState, event: ThreeEvent<MouseEvent>) => {
      if (phase !== "playing" || piece.location === "completed") return;
      event.stopPropagation();
      setPress(null);

      if (piece.location === "pan") {
        const plateIndex = firstAvailablePlateIndex(pieces);
        if (plateIndex !== null) movePieceToPlate(piece.id, plateIndex);
        return;
      }

      if (piece.location === "plate") {
        const panHoleId = firstOpenPanHoleId(pieces);
        if (panHoleId) returnPieceToPan(piece.id, panHoleId);
      }
    },
    [movePieceToPlate, phase, pieces, returnPieceToPan],
  );

  return (
    <>
      <OrthographicCamera makeDefault position={[1.05, 8.2, 6.6]} zoom={118} />
      <CameraRig />
      <Lighting />
      <Physics gravity={[0, -9.81, 0]} timeStep="vary">
        <GameTicker />
        <RigidBody type="fixed" colliders={false}>
          <mesh receiveShadow position={[0.82, -0.31, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[8.2, 6.6]} />
            <meshStandardMaterial color="#f0ddc3" roughness={0.86} />
          </mesh>
          <CuboidCollider args={[4.1, 0.08, 3.3]} position={[0.82, -0.36, 0]} />
        </RigidBody>
        <GrillPan fireActive={phase === "playing"} />
        <Plates />
        {pieces.map((piece) => (
          <TakoyakiPiece
            key={piece.id}
            piece={piece}
            selected={selectedPieceId === piece.id || press?.pieceId === piece.id}
            charge={press?.pieceId === piece.id ? press.charge : 0}
            onPointerDown={handlePiecePointerDown}
            onDoubleClick={handlePieceDoubleClick}
          />
        ))}
      </Physics>
      <ContactShadows position={[0.6, -0.29, 0]} opacity={0.44} scale={7} blur={2.8} far={2.6} />
      <SceneInteraction press={press} setPress={setPress} onFlipRequest={handleFlipRequest} />
    </>
  );
}

function phaseLabel(phase: GamePhase, plateCount: number) {
  if (phase === "success") return "성공";
  if (phase === "fail") return "시간 종료";
  if (phase === "playing") return `${plateCount}/3 접시`;
  return "대기";
}

function resultMessage(phase: GamePhase, lastPlateResult: string) {
  if (phase === "success") return "접시 세 개가 모두 통과했습니다.";
  if (phase === "fail") return "제한 시간 안에 세 접시를 통과시키지 못했습니다.";
  if (lastPlateResult === "accepted") return "접시 통과";
  if (lastPlateResult === "rejected") return "접시 미완료";
  if (lastPlateResult === "not-full") return "접시 6칸 필요";
  return "";
}

function GameHud() {
  const phase = useTakoyakiGameStore((state) => state.phase);
  const remainingTime = useTakoyakiGameStore((state) => state.remainingTime);
  const pieces = useTakoyakiGameStore((state) => state.pieces);
  const completedPlateCount = useTakoyakiGameStore((state) => state.completedPlateCount);
  const lastPlateResult = useTakoyakiGameStore((state) => state.lastPlateResult);
  const startGame = useTakoyakiGameStore((state) => state.startGame);
  const resetGame = useTakoyakiGameStore((state) => state.resetGame);
  const submitPlate = useTakoyakiGameStore((state) => state.submitPlate);
  const message = resultMessage(phase, lastPlateResult);
  const plateCounts = Array.from({ length: GAME_CONSTANTS.targetPlateCount }, (_, plateIndex) =>
    pieces.filter((piece) => piece.location === "plate" && piece.plateIndex === plateIndex).length,
  );
  const fullPlateIndex = plateCounts.findIndex((count) => count === GAME_CONSTANTS.plateCapacity);
  const canSubmit = phase === "playing" && fullPlateIndex >= 0;

  return (
    <div className="takoyaki-hud">
      <div className="takoyaki-stat-strip">
        <div className="takoyaki-stat">
          <Clock3 size={17} />
          <span>{formatClock(remainingTime)}</span>
        </div>
        <div className="takoyaki-stat">
          <Trophy size={17} />
          <span>{phaseLabel(phase, completedPlateCount)}</span>
        </div>
        <div className="takoyaki-stat">
          <Flame size={17} />
          <span>{plateCounts.map((count) => `${count}/6`).join(" ")}</span>
        </div>
      </div>

      {message && <div className={`takoyaki-toast ${lastPlateResult}`}>{message}</div>}

      <div className="takoyaki-actions">
        {phase === "ready" ? (
          <button className="takoyaki-primary-button" onClick={startGame}>
            <Play size={18} />
            시작
          </button>
        ) : (
          <button className="takoyaki-secondary-button" onClick={resetGame}>
            <RotateCcw size={18} />
            재시작
          </button>
        )}
        <button className="takoyaki-primary-button" disabled={!canSubmit} onClick={() => submitPlate(fullPlateIndex)}>
          <Send size={18} />
          제출
        </button>
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
        <p>{phase === "success" ? "완성" : "실패"}</p>
        <h1>{phase === "success" ? "세 접시 제출 통과" : "시간 종료"}</h1>
        <button className="takoyaki-primary-button" onClick={resetGame}>
          <RotateCcw size={18} />
          다시 굽기
        </button>
      </div>
    </div>
  );
}

export function TakoyakiGrillGame() {
  return (
    <main className="takoyaki-game">
      <Canvas
        shadows
        dpr={[1, 1.7]}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        className="takoyaki-canvas"
      >
        <color attach="background" args={["#efe7dc"]} />
        <TakoyakiScene />
      </Canvas>
      <GameHud />
      <ResultOverlay />
    </main>
  );
}
