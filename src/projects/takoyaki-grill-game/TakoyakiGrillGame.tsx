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
  hottestVisibleLevel,
  sauceColorForLevel,
  visibleLevel,
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
const TEMP_QUATERNION = new THREE.Quaternion();
const TEMP_EULER = new THREE.Euler();

type DragState = {
  pieceId: string;
  origin: "pan" | "plate";
  startPoint: THREE.Vector3;
  point: THREE.Vector3;
  moved: boolean;
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

function plateIndexFromPoint(point: THREE.Vector3) {
  let nearest = { index: -1, distance: Number.POSITIVE_INFINITY };
  PLATE_CENTERS.forEach((center, index) => {
    const normalizedX = Math.abs(point.x - center.x) / (PLATE_SIZE.width * 0.72);
    const normalizedZ = Math.abs(point.z - center.z) / (PLATE_SIZE.depth * 0.72);
    const inside = normalizedX <= 1 && normalizedZ <= 1;
    const distance = Math.hypot(normalizedX, normalizedZ);
    if (inside && distance < nearest.distance) nearest = { index, distance };
  });
  return nearest.index >= 0 ? nearest.index : null;
}

function nearestPanHole(point: THREE.Vector3, pieces: TakoyakiPieceState[]) {
  const occupied = new Set(
    pieces
      .filter((piece) => piece.location === "pan" && piece.panHoleId)
      .map((piece) => piece.panHoleId),
  );

  let nearest = { id: "", distance: Number.POSITIVE_INFINITY };
  for (let index = 0; index < GAME_CONSTANTS.takoyakiCount; index += 1) {
    const id = `hole-${index}`;
    if (occupied.has(id)) continue;
    const position = panHolePosition(index);
    const distance = Math.hypot(position.x - point.x, position.z - point.z);
    if (distance < nearest.distance) nearest = { id, distance };
  }

  return nearest.distance <= 0.78 ? nearest.id : nearest.id || null;
}

function pieceBasePosition(piece: TakoyakiPieceState) {
  if (piece.location === "plate") return plateSlotPosition(piece.plateIndex, piece.plateSlotIndex);
  const holeIndex = holeIndexFromId(piece.panHoleId);
  return panHolePosition(holeIndex >= 0 ? holeIndex : 0);
}

function GameTicker() {
  const tick = useTakoyakiGameStore((state) => state.tick);
  useFrame((_, delta) => tick(Math.min(delta, 0.05)));
  return null;
}

function Lighting() {
  return (
    <>
      <ambientLight intensity={0.42} />
      <directionalLight castShadow intensity={2.15} position={[3.5, 6, 4]} shadow-mapSize={[1024, 1024]} />
      <pointLight intensity={3.2} color="#ffb15f" position={[-2.6, 1.8, -2.7]} distance={5.4} />
      <Environment preset="city" environmentIntensity={0.34} />
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

function GrillPan() {
  const holes = useMemo(
    () => Array.from({ length: GAME_CONSTANTS.takoyakiCount }, (_, index) => panHolePosition(index)),
    [],
  );

  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        <mesh receiveShadow position={[0, 0, 0]}>
          <boxGeometry args={[3.35, 0.32, 5.25]} />
          <meshStandardMaterial color="#25221f" roughness={0.76} metalness={0.48} />
        </mesh>
        <CuboidCollider args={[1.68, 0.16, 2.62]} position={[0, 0, 0]} />
      </RigidBody>

      {holes.map((position, index) => (
        <group key={`hole-${index}`} position={[position.x, PAN_SURFACE_Y + 0.016, position.z]}>
          <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.39, 40]} />
            <meshStandardMaterial color="#11100f" roughness={0.9} metalness={0.26} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.395, 0.445, 40]} />
            <meshStandardMaterial color="#4c4740" roughness={0.8} metalness={0.42} />
          </mesh>
        </group>
      ))}

      <mesh receiveShadow position={[0, -0.18, 0]}>
        <boxGeometry args={[3.82, 0.18, 5.72]} />
        <meshStandardMaterial color="#5b5046" roughness={0.72} metalness={0.25} />
      </mesh>
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
          <meshStandardMaterial color="#f5e5bd" roughness={0.5} metalness={0.03} />
        </mesh>
        <mesh position={[0.03, 0.045, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[0.78, 0.55, 1]}>
          <shapeGeometry args={[plateShape]} />
          <meshStandardMaterial color="#fff7df" roughness={0.42} metalness={0.02} />
        </mesh>
        <mesh position={[0.1, 0.075, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.25, 0.14]} />
          <meshStandardMaterial color="#fffdf3" transparent opacity={0.78} roughness={0.3} />
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
            <ringGeometry args={[0.24, 0.27, 28]} />
            <meshStandardMaterial color="#cdbb8e" transparent opacity={0.42} />
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
  draggedPoint,
  selected,
  onPointerDown,
}: {
  piece: TakoyakiPieceState;
  draggedPoint: THREE.Vector3 | null;
  selected: boolean;
  onPointerDown: (piece: TakoyakiPieceState, event: ThreeEvent<PointerEvent>) => void;
}) {
  const bodyRef = useRef<RapierRigidBody | null>(null);
  const groupRef = useRef<THREE.Group | null>(null);
  const targetPosition = draggedPoint ? new THREE.Vector3(draggedPoint.x, 0.9, draggedPoint.z) : pieceBasePosition(piece);
  const currentPositionRef = useRef(targetPosition.clone());
  const averageVisibleLevel = visibleLevel(piece);
  const hottestLevel = hottestVisibleLevel(piece);
  const color = colorForCookLevel(averageVisibleLevel);
  const sauceColor = sauceColorForLevel(hottestLevel);
  const isRevealing = piece.revealTimer > 0;

  useFrame((_, delta) => {
    const body = bodyRef.current;
    const group = groupRef.current;
    if (!body || !group) return;

    const current = currentPositionRef.current;
    current.lerp(targetPosition, draggedPoint ? 0.42 : 0.18);
    const lift = isRevealing ? Math.sin((piece.revealTimer / GAME_CONSTANTS.revealDuration) * Math.PI) * 0.12 : 0;
    body.setNextKinematicTranslation({ x: current.x, y: current.y + lift, z: current.z });

    const roll = piece.rotationIndex * 0.72 + (isRevealing ? (1 - piece.revealTimer / GAME_CONSTANTS.revealDuration) * Math.PI : 0);
    TEMP_EULER.set(roll, piece.rotationIndex * 0.24, selected ? 0.14 : 0);
    TEMP_QUATERNION.setFromEuler(TEMP_EULER);
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
      <group ref={groupRef} onPointerDown={(event) => onPointerDown(piece, event)}>
        <mesh castShadow>
          <sphereGeometry args={[PIECE_RADIUS, 36, 22]} />
          <meshStandardMaterial color={color} roughness={0.72} metalness={0.02} />
        </mesh>
        <mesh castShadow position={[0, 0.21, 0.09]} rotation={[-0.7, 0.2, 0.12]}>
          <sphereGeometry args={[0.118, 16, 8]} />
          <meshStandardMaterial color={sauceColor} roughness={0.84} metalness={0.02} />
        </mesh>
        <mesh position={[0, 0.235, -0.09]} rotation={[-0.55, -0.35, 0]}>
          <sphereGeometry args={[0.06, 12, 8]} />
          <meshStandardMaterial color={hottestLevel >= 9 ? "#101010" : "#f6ead1"} roughness={0.9} />
        </mesh>
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
  drag,
  setDrag,
}: {
  drag: DragState | null;
  setDrag: React.Dispatch<React.SetStateAction<DragState | null>>;
}) {
  const camera = useThree((state) => state.camera);
  const gl = useThree((state) => state.gl);
  const pieces = useTakoyakiGameStore((state) => state.pieces);
  const rotatePiece = useTakoyakiGameStore((state) => state.rotatePiece);
  const movePieceToPlate = useTakoyakiGameStore((state) => state.movePieceToPlate);
  const returnPieceToPan = useTakoyakiGameStore((state) => state.returnPieceToPan);
  const dragRef = useRef<DragState | null>(drag);

  useEffect(() => {
    dragRef.current = drag;
  }, [drag]);

  useEffect(() => {
    if (!drag) return undefined;

    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.62);
    const pointer = new THREE.Vector2();
    const raycaster = new THREE.Raycaster();
    const intersection = new THREE.Vector3();

    function pointFromEvent(event: PointerEvent) {
      const rect = gl.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
      raycaster.setFromCamera(pointer, camera);
      raycaster.ray.intersectPlane(plane, intersection);
      return intersection.clone();
    }

    function handlePointerMove(event: PointerEvent) {
      const nextPoint = pointFromEvent(event);
      setDrag((current) => {
        if (!current) return current;
        const nextDrag = {
          ...current,
          point: nextPoint,
          moved: current.moved || nextPoint.distanceTo(current.startPoint) > 0.16,
        };
        dragRef.current = nextDrag;
        return nextDrag;
      });
    }

    function handlePointerUp(event: PointerEvent) {
      const currentDrag = dragRef.current;
      if (!currentDrag) return;

      const dropPoint = pointFromEvent(event);
      dragRef.current = null;
      setDrag(null);

      if (!currentDrag.moved) {
        if (currentDrag.origin === "pan") rotatePiece(currentDrag.pieceId);
        return;
      }

      const targetPlateIndex = plateIndexFromPoint(dropPoint);
      if (currentDrag.origin === "pan" && targetPlateIndex !== null) {
        movePieceToPlate(currentDrag.pieceId, targetPlateIndex);
        return;
      }

      if (currentDrag.origin === "plate") {
        const holeId = nearestPanHole(dropPoint, pieces);
        if (holeId) returnPieceToPan(currentDrag.pieceId, holeId);
      }
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp, { once: true });
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [camera, drag, gl.domElement, movePieceToPlate, pieces, returnPieceToPan, rotatePiece, setDrag]);

  return null;
}

function TakoyakiScene() {
  const pieces = useTakoyakiGameStore((state) => state.pieces);
  const phase = useTakoyakiGameStore((state) => state.phase);
  const selectedPieceId = useTakoyakiGameStore((state) => state.selectedPieceId);
  const [drag, setDrag] = useState<DragState | null>(null);

  const handlePiecePointerDown = useCallback(
    (piece: TakoyakiPieceState, event: ThreeEvent<PointerEvent>) => {
      if (phase !== "playing" || piece.location === "completed") return;
      event.stopPropagation();
      const point = event.point.clone();
      setDrag({
        pieceId: piece.id,
        origin: piece.location === "plate" ? "plate" : "pan",
        startPoint: point,
        point,
        moved: false,
      });
    },
    [phase],
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
            <meshStandardMaterial color="#ebe5dc" roughness={0.84} />
          </mesh>
          <CuboidCollider args={[4.1, 0.08, 3.3]} position={[0.82, -0.36, 0]} />
        </RigidBody>
        <GrillPan />
        <Plates />
        {pieces.map((piece) => (
          <TakoyakiPiece
            key={piece.id}
            piece={piece}
            draggedPoint={drag?.pieceId === piece.id ? drag.point : null}
            selected={selectedPieceId === piece.id || drag?.pieceId === piece.id}
            onPointerDown={handlePiecePointerDown}
          />
        ))}
      </Physics>
      <ContactShadows position={[0.6, -0.29, 0]} opacity={0.44} scale={7} blur={2.8} far={2.6} />
      <SceneInteraction drag={drag} setDrag={setDrag} />
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
