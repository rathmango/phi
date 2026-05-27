import { Pause, Play, RotateCw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type MachineStatus = "waiting" | "active" | "paused";
type QueueTone = "top" | "bottom" | "passage";

const viewWidth = 900;
const viewHeight = 620;
const chamberX = 72;
const chamberWidth = 756;
const topY = 54;
const chamberHeight = 210;
const passageTop = 274;
const passageBottom = 350;
const bottomY = 360;
const dotRadius = 2.45;
const dotGap = 6.35;
const fallSpeed = 2;
const laneGap = 8;
const pipeDepth = 8;
const maxQueueCount = 3000;
const maxPassageLanes = 8;
const timerPresets = [
  { label: "1분", seconds: 60 },
  { label: "2분", seconds: 120 },
  { label: "5분", seconds: 300 },
];

type QueueDot = {
  id: string;
  x: number;
  y: number;
  tone: QueueTone;
};

function buildSlots(count: number, region: "top" | "bottom") {
  const columns = Math.floor((chamberWidth - 34) / dotGap);
  const rows = Math.ceil(count / columns);
  const startX = chamberX + 17;
  const floorY = (region === "top" ? topY : bottomY) + chamberHeight - 17;

  return Array.from({ length: count }, (_, index) => {
    const row = Math.floor(index / columns);
    const column = index % columns;
    const rowCount = row === rows - 1 ? count - row * columns || columns : columns;
    const rowOffset = (columns - rowCount) * dotGap * 0.5;
    const jitter = ((index * 37) % 5) * 0.18;

    return {
      x: startX + rowOffset + column * dotGap + jitter,
      y: floorY - row * dotGap - ((index * 19) % 3) * 0.16,
    };
  });
}

function getPassageWidth(lanes: number) {
  return 22 + (lanes - 1) * laneGap;
}

function passagePosition(fraction: number, laneIndex: number, lanes: number) {
  const passageWidth = getPassageWidth(lanes);
  const laneOffset = laneIndex - (lanes - 1) / 2;

  return {
    x: viewWidth / 2 + laneOffset * laneGap,
    y: passageTop + 8 + fraction * (bottomY + 76 - passageTop),
  };
}

function expectedDuration(queueCount: number, lanes: number) {
  return (Math.ceil(queueCount / lanes) + pipeDepth) / fallSpeed;
}

function resolvePreset(targetSeconds: number) {
  let best = {
    queueCount: 50,
    lanes: 1,
    error: Number.POSITIVE_INFINITY,
  };

  for (let lanes = 1; lanes <= maxPassageLanes; lanes += 1) {
    const targetBatches = Math.max(1, Math.round(targetSeconds * fallSpeed - pipeDepth));
    const rawQueueCount = targetBatches * lanes;
    const nextQueueCount = Math.min(maxQueueCount, Math.max(50, rawQueueCount));
    const duration = expectedDuration(nextQueueCount, lanes);
    const error = Math.abs(duration - targetSeconds);

    if (error < best.error || (error === best.error && lanes > best.lanes)) {
      best = { queueCount: nextQueueCount, lanes, error };
    }
  }

  return best;
}

export function QueuePrototype() {
  const [status, setStatus] = useState<MachineStatus>("waiting");
  const [queueCount, setQueueCount] = useState(600);
  const [passageLanes, setPassageLanes] = useState(3);
  const [flowDistance, setFlowDistance] = useState(Math.ceil(queueCount / passageLanes) + pipeDepth);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [lastMeasuredSeconds, setLastMeasuredSeconds] = useState<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const elapsedRef = useRef(0);

  const totalBatches = Math.ceil(queueCount / passageLanes);
  const completeDistance = totalBatches + pipeDepth;
  const isComplete = flowDistance >= completeDistance;
  const passageWidth = getPassageWidth(passageLanes);
  const passageX = viewWidth / 2 - passageWidth / 2;

  useEffect(() => {
    if (status !== "active") {
      lastTimeRef.current = null;
      return;
    }

    let frame = 0;
    const tick = (time: number) => {
      const lastTime = lastTimeRef.current ?? time;
      const deltaSeconds = Math.min(0.08, (time - lastTime) / 1000);
      lastTimeRef.current = time;

      setFlowDistance((value) => {
        const next = Math.min(completeDistance, value + fallSpeed * deltaSeconds);
        if (next >= completeDistance) {
          window.setTimeout(() => {
            setLastMeasuredSeconds((current) => current ?? elapsedRef.current);
            setStatus("waiting");
          }, 0);
        }
        return next;
      });
      elapsedRef.current += deltaSeconds;
      setElapsedSeconds(elapsedRef.current);

      frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [completeDistance, status]);

  const { dots, topCount, movingCount, bottomCount } = useMemo(() => {
    const topQueue: number[] = [];
    const bottomQueue: number[] = [];
    const passageDots: QueueDot[] = [];

    for (let index = 0; index < queueCount; index += 1) {
      const sequence = Math.floor(index / passageLanes);
      const laneIndex = index % passageLanes;
      const queueProgress = flowDistance - sequence;

      if (queueProgress < 0) {
        topQueue.push(index);
      } else if (queueProgress < pipeDepth) {
        passageDots.push({
          id: `passage-${index}`,
          tone: "passage",
          ...passagePosition(queueProgress / pipeDepth, laneIndex, passageLanes),
        });
      } else {
        bottomQueue.push(index);
      }
    }

    const topDots = buildSlots(topQueue.length, "top").map((point, slotIndex) => ({
      id: `top-${topQueue[slotIndex]}`,
      tone: "top" as const,
      ...point,
    }));
    const bottomDots = buildSlots(bottomQueue.length, "bottom").map((point, slotIndex) => ({
      id: `bottom-${bottomQueue[slotIndex]}`,
      tone: "bottom" as const,
      ...point,
    }));

    return {
      dots: [...topDots, ...passageDots, ...bottomDots],
      topCount: topQueue.length,
      movingCount: passageDots.length,
      bottomCount: bottomQueue.length,
    };
  }, [flowDistance, passageLanes, queueCount]);

  function flip() {
    if (status !== "waiting") return;

    // 뒤집기는 queue를 통로로 이동시키는 동작이 아니라 상단/하단의 물리적 위치를 바꾸는 동작이다.
    setFlowDistance(0);
    elapsedRef.current = 0;
    setElapsedSeconds(0);
    setLastMeasuredSeconds(null);
    setStatus("active");
  }

  function pause() {
    if (status === "active") {
      setStatus("paused");
      return;
    }

    if (status === "paused") {
      setStatus("active");
    }
  }

  function startPreset(targetSeconds: number) {
    const preset = resolvePreset(targetSeconds);

    setQueueCount(preset.queueCount);
    setPassageLanes(preset.lanes);
    setFlowDistance(0);
    elapsedRef.current = 0;
    setElapsedSeconds(0);
    setLastMeasuredSeconds(null);
    setStatus("active");
  }

  const expectedSeconds = expectedDuration(queueCount, passageLanes);
  const remainingSeconds = Math.max(0, expectedSeconds - elapsedSeconds);

  return (
    <div className="prototype-grid">
      <section className="simulation-panel">
        <div className="simulation-toolbar">
          <div>
            <span className={`status-pill ${status}`}>상태: {statusLabel(status)}</span>
            <span className={isComplete ? "condition-pill done" : "condition-pill"}>
              이동 완료: {isComplete ? "true" : "false"}
            </span>
          </div>
          <div className="button-row">
            <button className="primary-action" onClick={flip} disabled={status !== "waiting"}>
              <RotateCw size={17} />
              뒤집기
            </button>
            <button onClick={pause} disabled={status === "waiting"}>
              {status === "paused" ? <Play size={17} /> : <Pause size={17} />}
              {status === "paused" ? "재개" : "일시정지"}
            </button>
          </div>
        </div>

        <svg className="queue-canvas abstract" viewBox={`0 0 ${viewWidth} ${viewHeight}`} role="img" aria-label="queue 이동 추상 프로토타입">
          <rect x={chamberX} y={topY} width={chamberWidth} height={chamberHeight} rx="8" className="region-box top-region" />
          <rect x={chamberX} y={bottomY} width={chamberWidth} height={chamberHeight} rx="8" className="region-box bottom-region" />
          <rect x={passageX} y={passageTop} width={passageWidth} height={passageBottom - passageTop} rx="8" className="passage-box" />
          <line x1={viewWidth / 2} y1={topY + chamberHeight} x2={viewWidth / 2} y2={passageTop} className="passage-guide" />
          <line x1={viewWidth / 2} y1={passageBottom} x2={viewWidth / 2} y2={bottomY} className="passage-guide" />

          <text x={chamberX + 18} y={topY + 28} className="svg-label">상단 영역</text>
          <text x={chamberX + 18} y={bottomY + 28} className="svg-label">하단 영역</text>
          <text x={passageX + passageWidth + 14} y={(passageTop + passageBottom) / 2 + 5} className="svg-label small">가운데 통로</text>

          <g className="queue-layer">
            {dots.map((queue) => (
              <circle key={queue.id} cx={queue.x} cy={queue.y} r={dotRadius} className={`queue-dot ${queue.tone}`} />
            ))}
          </g>
        </svg>
      </section>

      <aside className="control-panel">
        <section>
          <h3>프리셋 타이머</h3>
          <div className="preset-row">
            {timerPresets.map((preset) => (
              <button key={preset.seconds} onClick={() => startPreset(preset.seconds)}>
                {preset.label}
              </button>
            ))}
          </div>
          <p className="control-hint">
            프리셋은 목표 시간에 맞춰 queue 수와 통로 너비를 조정한 뒤 바로 시작합니다.
          </p>
        </section>

        <section>
          <h3>모델 파라미터</h3>
          <label>
            queue 수량
            <input
              type="range"
              min="50"
              max={maxQueueCount}
              step="10"
              value={queueCount}
              onChange={(event) => {
                const nextQueueCount = Number(event.target.value);
                setQueueCount(nextQueueCount);
                setFlowDistance(Math.ceil(nextQueueCount / passageLanes) + pipeDepth);
                setStatus("waiting");
                elapsedRef.current = 0;
                setElapsedSeconds(0);
                setLastMeasuredSeconds(null);
              }}
            />
            <output>{queueCount}</output>
          </label>
          <label>
            통로 너비
            <input
              type="range"
              min="1"
              max={maxPassageLanes}
              step="1"
              value={passageLanes}
              onChange={(event) => {
                const nextPassageLanes = Number(event.target.value);
                setPassageLanes(nextPassageLanes);
                setFlowDistance(Math.ceil(queueCount / nextPassageLanes) + pipeDepth);
                setStatus("waiting");
                elapsedRef.current = 0;
                setElapsedSeconds(0);
                setLastMeasuredSeconds(null);
              }}
            />
            <output>{passageLanes}개 동시</output>
          </label>
        </section>

        <section>
          <h3>시간 측정</h3>
          <dl className="debug-list">
            <div>
              <dt>예상 총 시간</dt>
              <dd>{formatTime(expectedSeconds)}</dd>
            </div>
            <div>
              <dt>경과 시간</dt>
              <dd>{formatTime(elapsedSeconds)}</dd>
            </div>
            <div>
              <dt>남은 예상 시간</dt>
              <dd>{formatTime(remainingSeconds)}</dd>
            </div>
            <div>
              <dt>최근 측정값</dt>
              <dd>{lastMeasuredSeconds === null ? "-" : formatTime(lastMeasuredSeconds)}</dd>
            </div>
          </dl>
        </section>

        <section>
          <h3>현재 판정</h3>
          <dl className="debug-list">
            <div>
              <dt>상단 queue</dt>
              <dd>{topCount}</dd>
            </div>
            <div>
              <dt>통로 queue</dt>
              <dd>{movingCount}</dd>
            </div>
            <div>
              <dt>하단 queue</dt>
              <dd>{bottomCount}</dd>
            </div>
            <div>
              <dt>완료율</dt>
              <dd>{Math.round((bottomCount / queueCount) * 100)}%</dd>
            </div>
          </dl>
        </section>

        <section>
          <h3>동작 해석</h3>
          <p>
            각 queue는 상단/하단 영역 안의 실제 좌표를 가진 작은 개체로 표시됩니다. 더 아래로 이동할 수 있으면 아래로 이동하고,
            상단에서 하단으로 넘어갈 때만 가운데 통로를 통과합니다.
          </p>
          <p>
            통로 너비는 내려가는 속도를 바꾸지 않고 가로 lane 수를 바꿉니다. 각 lane 안에서는 queue가 일정 간격으로 이어져 내려옵니다.
          </p>
          <p>
            뒤집기는 queue를 맨 위로 순간이동시키는 동작이 아니라 상단/하단 영역의 물리적 위치가 바뀌는 트리거입니다.
          </p>
        </section>
      </aside>
    </div>
  );
}

function statusLabel(status: MachineStatus) {
  if (status === "active") return "작동중";
  if (status === "paused") return "일시정지";
  return "대기";
}

function formatTime(seconds: number) {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const rest = safeSeconds - minutes * 60;
  if (minutes <= 0) {
    return `${rest.toFixed(1)}초`;
  }
  return `${minutes}분 ${rest.toFixed(1)}초`;
}
