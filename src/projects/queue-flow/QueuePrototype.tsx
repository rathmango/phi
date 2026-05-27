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
const fallSpeed = 0.72;
const laneGap = 8;
const pipeDepth = 8;

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

export function QueuePrototype() {
  const [status, setStatus] = useState<MachineStatus>("waiting");
  const [queueCount, setQueueCount] = useState(600);
  const [passageLanes, setPassageLanes] = useState(3);
  const [flowDistance, setFlowDistance] = useState(Math.ceil(queueCount / passageLanes) + pipeDepth);
  const lastTimeRef = useRef<number | null>(null);

  const totalBatches = Math.ceil(queueCount / passageLanes);
  const completeDistance = totalBatches + pipeDepth;
  const isComplete = flowDistance >= completeDistance;
  const passageWidth = getPassageWidth(passageLanes);
  const passageX = viewWidth / 2 - passageWidth / 2;

  useEffect(() => {
    setFlowDistance(Math.ceil(queueCount / passageLanes) + pipeDepth);
    setStatus("waiting");
  }, [passageLanes, queueCount]);

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
          window.setTimeout(() => setStatus("waiting"), 0);
        }
        return next;
      });

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
          <h3>모델 파라미터</h3>
          <label>
            queue 수량
            <input
              type="range"
              min="50"
              max="1000"
              step="10"
              value={queueCount}
              onChange={(event) => setQueueCount(Number(event.target.value))}
            />
            <output>{queueCount}</output>
          </label>
          <label>
            통로 너비
            <input
              type="range"
              min="1"
              max="8"
              step="1"
              value={passageLanes}
              onChange={(event) => setPassageLanes(Number(event.target.value))}
            />
            <output>{passageLanes}개 동시</output>
          </label>
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
