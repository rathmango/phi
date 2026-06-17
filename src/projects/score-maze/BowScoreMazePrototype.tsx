import Matter from "matter-js";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { RotateCcw, Sparkles, Zap } from "lucide-react";

type ScoreNote = {
  pitch: string;
  midi: number;
  time: number;
  duration: number;
  velocity: number;
};

type MazePoint = ScoreNote & {
  x: number;
  y: number;
};

type RunStatus = "idle" | "charging" | "running" | "stalled" | "complete";

const VIEWBOX = { width: 1000, height: 680 };
const MAX_PULL = 420;
const MIN_RUN_PULL = 16;

const WINTER_NOTES: ScoreNote[] = [
  { pitch: "A#5", midi: 82, time: 0, duration: 0.214, velocity: 0.709 },
  { pitch: "A#5", midi: 82, time: 0.214, duration: 0.214, velocity: 0.709 },
  { pitch: "A#5", midi: 82, time: 0.429, duration: 0.214, velocity: 0.709 },
  { pitch: "A#5", midi: 82, time: 0.643, duration: 0.214, velocity: 0.709 },
  { pitch: "A#5", midi: 82, time: 0.857, duration: 0.214, velocity: 0.709 },
  { pitch: "A#5", midi: 82, time: 1.071, duration: 0.214, velocity: 0.709 },
  { pitch: "A#5", midi: 82, time: 1.286, duration: 0.214, velocity: 0.709 },
  { pitch: "A#5", midi: 82, time: 1.5, duration: 0.214, velocity: 0.709 },
  { pitch: "A#5", midi: 82, time: 1.714, duration: 0.214, velocity: 0.709 },
  { pitch: "A#5", midi: 82, time: 1.929, duration: 0.214, velocity: 0.709 },
  { pitch: "A#5", midi: 82, time: 2.143, duration: 0.214, velocity: 0.709 },
  { pitch: "A#5", midi: 82, time: 2.357, duration: 0.214, velocity: 0.709 },
  { pitch: "A#5", midi: 82, time: 2.571, duration: 0.214, velocity: 0.709 },
  { pitch: "A#5", midi: 82, time: 2.786, duration: 0.214, velocity: 0.709 },
  { pitch: "A#5", midi: 82, time: 3, duration: 0.214, velocity: 0.709 },
  { pitch: "A#5", midi: 82, time: 3.214, duration: 0.214, velocity: 0.709 },
  { pitch: "G#5", midi: 80, time: 3.429, duration: 0.214, velocity: 0.709 },
  { pitch: "G#5", midi: 80, time: 3.643, duration: 0.214, velocity: 0.709 },
  { pitch: "G#5", midi: 80, time: 3.857, duration: 0.214, velocity: 0.709 },
  { pitch: "G#5", midi: 80, time: 4.071, duration: 0.214, velocity: 0.709 },
  { pitch: "G#5", midi: 80, time: 4.286, duration: 0.214, velocity: 0.709 },
  { pitch: "G#5", midi: 80, time: 4.5, duration: 0.214, velocity: 0.709 },
  { pitch: "G#5", midi: 80, time: 4.714, duration: 0.214, velocity: 0.709 },
  { pitch: "G#5", midi: 80, time: 4.929, duration: 0.214, velocity: 0.709 },
  { pitch: "C#5", midi: 73, time: 5.143, duration: 0.214, velocity: 0.709 },
  { pitch: "C#5", midi: 73, time: 5.357, duration: 0.214, velocity: 0.709 },
  { pitch: "C#5", midi: 73, time: 5.571, duration: 0.214, velocity: 0.709 },
  { pitch: "C#5", midi: 73, time: 5.786, duration: 0.214, velocity: 0.709 },
  { pitch: "C#5", midi: 73, time: 6, duration: 0.214, velocity: 0.709 },
  { pitch: "C#5", midi: 73, time: 6.214, duration: 0.214, velocity: 0.709 },
  { pitch: "C#5", midi: 73, time: 6.429, duration: 0.214, velocity: 0.709 },
  { pitch: "C#5", midi: 73, time: 6.643, duration: 0.214, velocity: 0.709 },
  { pitch: "D#5", midi: 75, time: 6.857, duration: 0.214, velocity: 0.709 },
  { pitch: "D#5", midi: 75, time: 7.071, duration: 0.214, velocity: 0.709 },
  { pitch: "D#5", midi: 75, time: 7.286, duration: 0.214, velocity: 0.709 },
  { pitch: "D#5", midi: 75, time: 7.5, duration: 0.214, velocity: 0.709 },
  { pitch: "D#5", midi: 75, time: 7.714, duration: 0.214, velocity: 0.709 },
  { pitch: "D#5", midi: 75, time: 7.929, duration: 0.214, velocity: 0.709 },
  { pitch: "D#5", midi: 75, time: 8.143, duration: 0.214, velocity: 0.709 },
  { pitch: "D#5", midi: 75, time: 8.357, duration: 0.214, velocity: 0.709 },
  { pitch: "D5", midi: 74, time: 8.571, duration: 0.214, velocity: 0.709 },
  { pitch: "D5", midi: 74, time: 8.786, duration: 0.214, velocity: 0.709 },
  { pitch: "D5", midi: 74, time: 9, duration: 0.214, velocity: 0.709 },
  { pitch: "D5", midi: 74, time: 9.214, duration: 0.214, velocity: 0.709 },
  { pitch: "D5", midi: 74, time: 9.429, duration: 0.214, velocity: 0.709 },
  { pitch: "D5", midi: 74, time: 9.643, duration: 0.214, velocity: 0.709 },
  { pitch: "D5", midi: 74, time: 9.857, duration: 0.214, velocity: 0.709 },
  { pitch: "D5", midi: 74, time: 10.071, duration: 0.214, velocity: 0.709 },
  { pitch: "D#5", midi: 75, time: 10.286, duration: 0.214, velocity: 0.709 },
  { pitch: "D#5", midi: 75, time: 10.5, duration: 0.214, velocity: 0.709 },
  { pitch: "D#5", midi: 75, time: 10.714, duration: 0.214, velocity: 0.709 },
  { pitch: "D#5", midi: 75, time: 10.929, duration: 0.214, velocity: 0.709 },
  { pitch: "D#5", midi: 75, time: 11.143, duration: 0.214, velocity: 0.709 },
  { pitch: "D#5", midi: 75, time: 11.357, duration: 0.214, velocity: 0.709 },
  { pitch: "D#5", midi: 75, time: 11.571, duration: 0.214, velocity: 0.709 },
  { pitch: "D#5", midi: 75, time: 11.786, duration: 0.214, velocity: 0.709 },
  { pitch: "D5", midi: 74, time: 12, duration: 0.214, velocity: 0.709 },
  { pitch: "D5", midi: 74, time: 12.214, duration: 0.214, velocity: 0.709 },
  { pitch: "D5", midi: 74, time: 12.429, duration: 0.214, velocity: 0.709 },
  { pitch: "D5", midi: 74, time: 12.643, duration: 0.214, velocity: 0.709 },
  { pitch: "D5", midi: 74, time: 12.857, duration: 0.214, velocity: 0.709 },
  { pitch: "D5", midi: 74, time: 13.071, duration: 0.214, velocity: 0.709 },
  { pitch: "D5", midi: 74, time: 13.286, duration: 0.214, velocity: 0.709 },
  { pitch: "D5", midi: 74, time: 13.5, duration: 0.214, velocity: 0.709 },
];

function buildMazePoints(): MazePoint[] {
  const rows = [
    { count: 13, y: 470, width: 660 },
    { count: 11, y: 420, width: 580 },
    { count: 10, y: 370, width: 500 },
    { count: 9, y: 320, width: 420 },
    { count: 8, y: 270, width: 340 },
    { count: 6, y: 220, width: 260 },
    { count: 4, y: 170, width: 180 },
    { count: 3, y: 120, width: 90 },
  ];

  const points: Array<{ x: number; y: number }> = [];
  rows.forEach((row, rowIndex) => {
    const startX = 500 - row.width / 2;
    const step = row.count === 1 ? 0 : row.width / (row.count - 1);
    const rowPoints = Array.from({ length: row.count }, (_, index) => ({
      x: startX + step * index,
      y: row.y + Math.sin(index * 1.7 + rowIndex) * 9,
    }));
    if (rowIndex % 2 === 1) rowPoints.reverse();
    points.push(...rowPoints);
  });

  return WINTER_NOTES.map((note, index) => ({ ...note, ...points[index] }));
}

function midiToFrequency(midi: number) {
  return 440 * 2 ** ((midi - 69) / 12);
}

function bulbColor(midi: number, alpha = 1) {
  const hue = 205 + (midi - 70) * 7;
  return `hsla(${hue}, 88%, 62%, ${alpha})`;
}

function statusText(status: RunStatus, litCount: number, targetCount: number) {
  if (status === "running") return "전개 중";
  if (status === "charging") return "에너지 설정 중";
  if (status === "complete") return "완성";
  if (status === "stalled") return `미완성 ${litCount}/${targetCount}`;
  return "대기";
}

export function BowScoreMazePrototype() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const engineRef = useRef(Matter.Engine.create({ gravity: { x: 0, y: 0, scale: 0 } }));
  const orbRef = useRef(
    Matter.Bodies.circle(500, 610, 10, {
      frictionAir: 0.11,
      restitution: 0.35,
      density: 0.0008,
    }),
  );
  const dragRef = useRef({
    startClientY: 0,
    startPull: 0,
  });
  const stateRef = useRef({
    status: "idle" as RunStatus,
    pull: 0,
    litCount: 0,
    activeIndex: 0,
    targetCount: WINTER_NOTES.length,
    dragging: false,
    pulse: 0,
    lastFrame: 0,
  });
  const [telemetry, setTelemetry] = useState({
    status: "idle" as RunStatus,
    pull: 0,
    litCount: 0,
    targetCount: WINTER_NOTES.length,
  });

  const maze = useMemo(buildMazePoints, []);

  useEffect(() => {
    const engine = engineRef.current;
    Matter.Composite.add(engine.world, [orbRef.current]);
    Matter.Body.setPosition(orbRef.current, { x: 500, y: 610 });

    return () => {
      Matter.Composite.clear(engine.world, false);
      Matter.Engine.clear(engine);
      audioRef.current?.close();
    };
  }, []);

  useEffect(() => {
    let animationId = 0;
    let frameCount = 0;

    function loop(now: number) {
      const canvas = canvasRef.current;
      const shell = shellRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx || !shell) {
        animationId = requestAnimationFrame(loop);
        return;
      }

      resizeCanvas(canvas, shell);
      updatePhysics(now, maze);
      drawScene(ctx, maze);

      frameCount += 1;
      if (frameCount % 6 === 0) {
        const current = stateRef.current;
        setTelemetry({
          status: current.status,
          pull: current.pull,
          litCount: current.litCount,
          targetCount: current.targetCount,
        });
      }

      animationId = requestAnimationFrame(loop);
    }

    animationId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationId);
  }, [maze]);

  function ensureAudio() {
    if (audioRef.current) return audioRef.current;
    const AudioCtor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioRef.current = new AudioCtor();
    return audioRef.current;
  }

  function playNote(note: ScoreNote, intensity = 1) {
    const audio = ensureAudio();
    const now = audio.currentTime;
    const duration = Math.max(0.12, note.duration * 0.95);
    const gain = audio.createGain();
    const osc = audio.createOscillator();
    const shimmer = audio.createOscillator();
    const filter = audio.createBiquadFilter();

    osc.type = "triangle";
    shimmer.type = "sine";
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(4200, now);
    osc.frequency.setValueAtTime(midiToFrequency(note.midi), now);
    shimmer.frequency.setValueAtTime(midiToFrequency(note.midi + 12), now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.12 * note.velocity * intensity, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(filter);
    shimmer.connect(filter);
    filter.connect(gain);
    gain.connect(audio.destination);
    osc.start(now);
    shimmer.start(now);
    osc.stop(now + duration + 0.05);
    shimmer.stop(now + duration + 0.05);
  }

  function playFinalChord() {
    [65, 68, 73, 77].forEach((midi, index) => {
      window.setTimeout(() => playNote({ pitch: "", midi, time: 0, duration: 0.8, velocity: 0.82 }, 0.82), index * 48);
    });
  }

  function startRun(pull: number) {
    const current = stateRef.current;
    const normalized = Math.max(0, Math.min(1, pull / MAX_PULL));
    const targetCount = Math.max(1, Math.min(maze.length, Math.round(normalized * maze.length)));

    current.status = "running";
    current.pull = pull;
    current.litCount = 0;
    current.activeIndex = 0;
    current.targetCount = targetCount;
    current.dragging = false;
    current.pulse = 0;
    Matter.Body.setPosition(orbRef.current, { x: 500, y: 610 });
    Matter.Body.setVelocity(orbRef.current, { x: (maze[0].x - 500) * 0.014, y: -10.5 - normalized * 4 });
    Matter.Body.setAngularVelocity(orbRef.current, 0);
  }

  function reset() {
    const current = stateRef.current;
    current.status = "idle";
    current.pull = 0;
    current.litCount = 0;
    current.activeIndex = 0;
    current.targetCount = maze.length;
    current.dragging = false;
    current.pulse = 0;
    Matter.Body.setPosition(orbRef.current, { x: 500, y: 610 });
    Matter.Body.setVelocity(orbRef.current, { x: 0, y: 0 });
    setTelemetry({
      status: "idle",
      pull: 0,
      litCount: 0,
      targetCount: maze.length,
    });
  }

  function autoComplete() {
    startRun(MAX_PULL);
  }

  function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    const point = pointerToView(event);
    if (!point) return;
    if (point.y < 490) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    ensureAudio();
    const current = stateRef.current;
    current.status = "charging";
    current.dragging = true;
    current.litCount = 0;
    current.activeIndex = 0;
    current.pull = 0;
    dragRef.current = {
      startClientY: event.clientY,
      startPull: 0,
    };
  }

  function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    const current = stateRef.current;
    if (!current.dragging) return;
    current.pull = pullFromPointer(event);
    Matter.Body.setPosition(orbRef.current, { x: 500, y: 610 + current.pull * 0.12 });
  }

  function handlePointerUp(event: React.PointerEvent<HTMLCanvasElement>) {
    const current = stateRef.current;
    if (!current.dragging) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    const pull = current.pull;
    if (pull < MIN_RUN_PULL) {
      reset();
      return;
    }
    startRun(pull);
  }

  function pullFromPointer(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return 0;
    const rect = canvas.getBoundingClientRect();
    const viewScale = VIEWBOX.height / rect.height;
    const dragDistance = (event.clientY - dragRef.current.startClientY) * viewScale;
    return Math.max(0, Math.min(MAX_PULL, dragRef.current.startPull + dragDistance));
  }

  function pointerToView(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * VIEWBOX.width,
      y: ((event.clientY - rect.top) / rect.height) * VIEWBOX.height,
    };
  }

  function updatePhysics(now: number, points: MazePoint[]) {
    const current = stateRef.current;
    const engine = engineRef.current;
    const orb = orbRef.current;
    const delta = current.lastFrame ? Math.min(32, now - current.lastFrame) : 16.66;
    current.lastFrame = now;

    if (current.status === "running") {
      const target = points[current.activeIndex];
      if (target) {
        const dx = target.x - orb.position.x;
        const dy = target.y - orb.position.y;
        const distance = Math.hypot(dx, dy);
        const speed = Math.hypot(orb.velocity.x, orb.velocity.y);
        const forceScale = 0.000034 * (1 + current.pull / MAX_PULL);
        Matter.Body.applyForce(orb, orb.position, { x: dx * forceScale, y: dy * forceScale });

        if (speed > 18) {
          Matter.Body.setVelocity(orb, { x: orb.velocity.x * 0.94, y: orb.velocity.y * 0.94 });
        }

        if (distance < 18 || (distance < 34 && speed < 2.2)) {
          playNote(target, 0.9 + current.pull / MAX_PULL);
          current.litCount = current.activeIndex + 1;
          current.activeIndex += 1;
          current.pulse = 1;

          if (current.activeIndex >= current.targetCount) {
            current.status = current.targetCount >= points.length ? "complete" : "stalled";
            Matter.Body.setVelocity(orb, { x: 0, y: 0 });
            if (current.status === "complete") playFinalChord();
          }
        }
      }
    } else if (current.status === "idle") {
      Matter.Body.setVelocity(orb, {
        x: (500 - orb.position.x) * 0.02,
        y: (610 - orb.position.y) * 0.02,
      });
    }

    current.pulse *= 0.88;
    Matter.Engine.update(engine, delta);
  }

  function drawScene(ctx: CanvasRenderingContext2D, points: MazePoint[]) {
    const current = stateRef.current;
    const { width, height } = VIEWBOX;
    ctx.save();
    ctx.clearRect(0, 0, width, height);

    const bg = ctx.createLinearGradient(0, 0, width, height);
    bg.addColorStop(0, "#081626");
    bg.addColorStop(0.48, "#102b32");
    bg.addColorStop(1, "#22173a");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    drawStars(ctx, current.litCount);
    drawTree(ctx);
    drawMaze(ctx, points, current.litCount);
    drawOrb(ctx, current);
    drawBow(ctx, current.pull, current.status === "charging");
    drawHud(ctx, current);

    ctx.restore();
  }

  function drawStars(ctx: CanvasRenderingContext2D, litCount: number) {
    ctx.save();
    for (let i = 0; i < 85; i += 1) {
      const x = (i * 137.5) % VIEWBOX.width;
      const y = 22 + ((i * 61.2) % 470);
      const alpha = 0.18 + ((i * 23) % 40) / 100 + Math.min(litCount / WINTER_NOTES.length, 1) * 0.18;
      ctx.fillStyle = `rgba(240, 248, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, 0.8 + ((i * 7) % 12) / 10, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawTree(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(500, 72);
    ctx.lineTo(798, 520);
    ctx.lineTo(640, 500);
    ctx.lineTo(622, 576);
    ctx.lineTo(378, 576);
    ctx.lineTo(360, 500);
    ctx.lineTo(202, 520);
    ctx.closePath();
    const treeFill = ctx.createLinearGradient(300, 90, 720, 570);
    treeFill.addColorStop(0, "rgba(29, 121, 102, 0.34)");
    treeFill.addColorStop(0.48, "rgba(18, 74, 71, 0.42)");
    treeFill.addColorStop(1, "rgba(12, 45, 56, 0.62)");
    ctx.fillStyle = treeFill;
    ctx.fill();
    ctx.strokeStyle = "rgba(187, 247, 208, 0.28)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "rgba(98, 67, 43, 0.78)";
    ctx.fillRect(438, 540, 124, 72);
    ctx.strokeStyle = "rgba(255, 236, 188, 0.2)";
    ctx.strokeRect(438, 540, 124, 72);

    drawStar(ctx, 500, 75, 24, "rgba(255, 228, 118, 0.9)");
    ctx.restore();
  }

  function drawMaze(ctx: CanvasRenderingContext2D, points: MazePoint[], litCount: number) {
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(500, 610);
    ctx.lineTo(points[0].x, points[0].y);
    points.forEach((point) => ctx.lineTo(point.x, point.y));
    ctx.strokeStyle = "rgba(199, 231, 255, 0.18)";
    ctx.lineWidth = 14;
    ctx.stroke();
    ctx.strokeStyle = "rgba(255, 236, 172, 0.28)";
    ctx.lineWidth = 2;
    ctx.stroke();

    if (litCount > 0) {
      ctx.beginPath();
      ctx.moveTo(500, 610);
      ctx.lineTo(points[0].x, points[0].y);
      points.slice(0, litCount).forEach((point) => ctx.lineTo(point.x, point.y));
      ctx.strokeStyle = "rgba(255, 225, 132, 0.75)";
      ctx.lineWidth = 4;
      ctx.shadowColor = "rgba(255, 215, 132, 0.85)";
      ctx.shadowBlur = 18;
      ctx.stroke();
    }

    points.forEach((point, index) => {
      const lit = index < litCount;
      ctx.beginPath();
      ctx.arc(point.x, point.y, lit ? 8.4 : 5.3, 0, Math.PI * 2);
      ctx.fillStyle = lit ? bulbColor(point.midi, 0.95) : "rgba(174, 197, 218, 0.32)";
      ctx.shadowColor = lit ? bulbColor(point.midi, 0.9) : "transparent";
      ctx.shadowBlur = lit ? 18 : 0;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = lit ? "rgba(255,255,255,0.88)" : "rgba(255,255,255,0.22)";
      ctx.lineWidth = 1.4;
      ctx.stroke();
    });
    ctx.restore();
  }

  function drawOrb(ctx: CanvasRenderingContext2D, current: typeof stateRef.current) {
    const orb = orbRef.current;
    const glow = 18 + current.pulse * 24;
    ctx.save();
    ctx.shadowColor = "rgba(132, 225, 255, 0.95)";
    ctx.shadowBlur = glow;
    const gradient = ctx.createRadialGradient(orb.position.x - 4, orb.position.y - 5, 2, orb.position.x, orb.position.y, 18);
    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(0.42, "#b7f7ff");
    gradient.addColorStop(1, "rgba(68, 151, 255, 0.18)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(orb.position.x, orb.position.y, 10 + current.pulse * 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawBow(ctx: CanvasRenderingContext2D, pull: number, active: boolean) {
    const left = { x: 314, y: 596 };
    const right = { x: 686, y: 596 };
    const grip = { x: 500, y: 530 + pull };
    ctx.save();
    ctx.lineCap = "round";
    ctx.strokeStyle = "rgba(216, 180, 254, 0.72)";
    ctx.lineWidth = 11;
    ctx.beginPath();
    ctx.moveTo(left.x, left.y);
    ctx.quadraticCurveTo(500, 654, right.x, right.y);
    ctx.stroke();

    ctx.strokeStyle = active ? "rgba(255, 245, 200, 0.96)" : "rgba(241, 245, 249, 0.78)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(left.x, left.y);
    ctx.lineTo(grip.x, grip.y);
    ctx.lineTo(right.x, right.y);
    ctx.stroke();

    ctx.fillStyle = active ? "rgba(255, 231, 150, 0.95)" : "rgba(226, 232, 240, 0.9)";
    ctx.beginPath();
    ctx.arc(grip.x, grip.y, 11, 0, Math.PI * 2);
    ctx.fill();

    if (active && grip.y > VIEWBOX.height - 26) {
      ctx.fillStyle = "rgba(255, 231, 150, 0.9)";
      ctx.font = "800 14px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("계속 아래로 당기기", 500, VIEWBOX.height - 24);
    }
    ctx.restore();
  }

  function drawHud(ctx: CanvasRenderingContext2D, current: typeof stateRef.current) {
    const energy = Math.round((current.pull / MAX_PULL) * 100);
    const progress = Math.round((current.litCount / WINTER_NOTES.length) * 100);
    ctx.save();
    ctx.fillStyle = "rgba(8, 16, 30, 0.52)";
    roundRect(ctx, 28, 28, 292, 98, 12);
    ctx.fill();
    ctx.fillStyle = "rgba(226, 232, 240, 0.9)";
    ctx.font = "700 19px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    ctx.fillText("Bow Score Maze", 48, 62);
    ctx.font = "700 14px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    ctx.fillStyle = "rgba(191, 219, 254, 0.9)";
    ctx.fillText(`energy ${energy}% / lights ${progress}%`, 48, 91);
    ctx.fillStyle = "rgba(255, 228, 150, 0.88)";
    ctx.fillText(statusText(current.status, current.litCount, current.targetCount), 48, 114);
    ctx.restore();
  }

  function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 18;
    ctx.beginPath();
    for (let i = 0; i < 10; i += 1) {
      const angle = -Math.PI / 2 + (Math.PI * 2 * i) / 10;
      const r = i % 2 === 0 ? radius : radius * 0.42;
      const px = x + Math.cos(angle) * r;
      const py = y + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
  }

  function resizeCanvas(canvas: HTMLCanvasElement, shell: HTMLDivElement) {
    const rect = shell.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    const targetWidth = Math.max(320, Math.floor(rect.width));
    const targetHeight = Math.max(420, Math.floor(targetWidth * 0.68));
    if (canvas.width !== Math.floor(targetWidth * ratio) || canvas.height !== Math.floor(targetHeight * ratio)) {
      canvas.width = Math.floor(targetWidth * ratio);
      canvas.height = Math.floor(targetHeight * ratio);
      canvas.style.height = `${targetHeight}px`;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform((targetWidth * ratio) / VIEWBOX.width, 0, 0, (targetHeight * ratio) / VIEWBOX.height, 0, 0);
  }

  const energyPercent = Math.round((telemetry.pull / MAX_PULL) * 100);
  const progressPercent = Math.round((telemetry.litCount / WINTER_NOTES.length) * 100);

  return (
    <div className="score-maze-prototype">
      <div className="score-maze-panel">
        <div className="score-maze-toolbar">
          <div>
            <strong>Bow Score Maze</strong>
            <span>Vivaldi Winter RV 297 · solo line · 64 notes</span>
          </div>
          <div className="score-maze-actions">
            <button type="button" onClick={reset} aria-label="초기화">
              <RotateCcw size={17} />
              Reset
            </button>
            <button type="button" onClick={autoComplete} aria-label="완주 테스트">
              <Zap size={17} />
              Full Pull
            </button>
          </div>
        </div>

        <div className="score-maze-canvas-shell" ref={shellRef}>
          <canvas
            ref={canvasRef}
            className="score-maze-canvas"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          />
        </div>

        <div className="score-maze-readout" aria-live="polite">
          <div>
            <span>상태</span>
            <strong>{statusText(telemetry.status, telemetry.litCount, telemetry.targetCount)}</strong>
          </div>
          <div>
            <span>당김량</span>
            <strong>{energyPercent}%</strong>
          </div>
          <div>
            <span>점등</span>
            <strong>
              {telemetry.litCount}/{WINTER_NOTES.length}
            </strong>
          </div>
          <div>
            <span>완성도</span>
            <strong>{progressPercent}%</strong>
          </div>
        </div>
      </div>

      <aside className="score-maze-note">
        <Sparkles size={18} />
        <p>
          음표 배열은 Mutopia Project의 <em>L'Inverno / Winter</em> MIDI에서 첫 악장 solo 트랙 첫 64개 음을 추출했다.
          활시위를 충분히 당기면 모든 음표 지점이 켜지고, 부족하면 악보 미로 중간에서 멈춘다.
        </p>
      </aside>
    </div>
  );
}
