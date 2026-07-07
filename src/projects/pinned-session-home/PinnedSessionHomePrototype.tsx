import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUp,
  Check,
  Grip,
  Home,
  Mic,
  PanelLeft,
  Pin,
  PinOff,
  RotateCcw,
  Search,
  Send,
  SquarePen,
} from "lucide-react";
import "./PinnedSessionHomePrototype.css";

type WorkStatus = "idle" | "generating" | "new-result" | "seen";
type ResizeAxis = "topColumn" | "bottomColumn" | "row";

type Session = {
  id: string;
  title: string;
  summary: string;
  pinned: boolean;
  status: WorkStatus;
  recentUser: string;
  recentAssistant: string;
  draft?: string;
  result?: string;
};

type ToastState = {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

const baseSessions: Session[] = [
  {
    id: "biz-english",
    title: "비즈니스 영어 번역",
    summary: "브랜드명 유지, Markdown 출력, 자연스러운 이메일 톤",
    pinned: true,
    status: "new-result",
    recentUser: "Speak Friday 프로모션 페이지 문구를 영어로 다듬어줘.",
    recentAssistant: "Sure. I’ll keep Speak as a brand name and write it in a natural business tone.",
    draft: "이번 주 금요일까지 온보딩 플로우 개선안을 공유드리겠습니다. Speak 관련 문구는 다음 회의에서 다시 논의하겠습니다.",
    result:
      "I’ll share the proposed improvements to the onboarding flow by this Friday. We’ll revisit the Speak-related copy in the next meeting.",
  },
  {
    id: "markdown",
    title: "Notion용 Markdown 정리",
    summary: "회의 메모를 제목, 결정사항, 액션 아이템으로 정리",
    pinned: true,
    status: "idle",
    recentUser: "아래 메모를 Notion에 붙여넣기 좋게 정리해줘.",
    recentAssistant: "정리 기준은 제목, 결정사항, 액션 아이템 순서로 맞춰둘게요.",
    draft: "오늘 논의한 온보딩 개선안 메모 붙여넣기",
  },
  {
    id: "meeting",
    title: "회의록 요약",
    summary: "결정사항과 다음 할 일만 추출",
    pinned: true,
    status: "seen",
    recentUser: "오늘 회의록에서 결정사항과 할 일만 뽑아줘.",
    recentAssistant: "결정사항 3개와 담당자별 액션 아이템으로 정리했습니다.",
  },
  {
    id: "tone",
    title: "문장 톤 다듬기",
    summary: "딱딱한 문장을 부드러운 업무 메시지로 변환",
    pinned: true,
    status: "idle",
    recentUser: "이 문장을 조금 더 부드러운 업무 메시지로 바꿔줘.",
    recentAssistant: "상대가 부담스럽지 않도록 요청의 이유와 다음 행동을 함께 넣었습니다.",
  },
  {
    id: "research",
    title: "랜딩페이지 리뷰 배치 연구",
    summary: "리뷰 섹션의 정보 구조를 비교",
    pinned: false,
    status: "idle",
    recentUser: "랜딩페이지 리뷰 배치를 비교해줘.",
    recentAssistant: "신뢰 형성, 전환 직전 보강, 사용 맥락 제시 기준으로 나눠볼 수 있어요.",
  },
  {
    id: "release",
    title: "시스템 트레이딩 답변 요청",
    summary: "긴 답변을 검토 가능한 구조로 정리",
    pinned: false,
    status: "idle",
    recentUser: "아래 답변을 검토하기 좋게 정리해줘.",
    recentAssistant: "주장, 근거, 확인해야 할 지점으로 나누어 정리했습니다.",
  },
];

const prototypeSeed: Session[] = baseSessions.map((session) =>
  session.id === "biz-english"
    ? { ...session, pinned: false, status: "idle" as const, draft: "", result: undefined }
    : { ...session, status: session.status === "new-result" ? "seen" as const : session.status },
);

function createResult(sessionId: string, input: string) {
  if (sessionId === "biz-english") {
    return "I’ll share the proposed improvements to the onboarding flow by this Friday. We’ll revisit the Speak-related copy in the next meeting.";
  }

  if (sessionId === "markdown") {
    return ["## 온보딩 개선안", "- 결정사항: 첫 화면 문구를 더 짧게 정리", "- 액션 아이템: 금요일까지 수정안 공유"].join("\n");
  }

  if (input.trim()) {
    return "요청하신 내용을 이 세션의 기존 작업 방식에 맞춰 정리했습니다.";
  }

  return "";
}

function statusLabel(status: WorkStatus) {
  if (status === "generating") return "생성 중";
  if (status === "new-result") return "새 결과";
  return "";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getOrderedPinnedSessions(sessions: Session[], homeOrder: string[]) {
  const sessionMap = new Map(sessions.map((session) => [session.id, session]));
  const ordered = homeOrder
    .map((id) => sessionMap.get(id))
    .filter((session): session is Session => Boolean(session?.pinned));
  const missing = sessions.filter((session) => session.pinned && !homeOrder.includes(session.id));
  return [...ordered, ...missing].slice(0, 4);
}

function Sidebar({
  sessions,
  activeView,
  activeSessionId,
  interactive,
  onOpenHome,
  onOpenSession,
  onTogglePin,
}: {
  sessions: Session[];
  activeView: "home" | "chat";
  activeSessionId?: string;
  interactive: boolean;
  onOpenHome?: () => void;
  onOpenSession?: (id: string) => void;
  onTogglePin?: (id: string) => void;
}) {
  return (
    <aside className="chatgpt-sidebar">
      <div className="chatgpt-window-row">
        <div className="app-window-dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="window-tools">
          <PanelLeft size={18} />
          <SquarePen size={18} />
        </div>
      </div>

      <div className="chatgpt-search">
        <Search size={18} />
        <span>검색</span>
      </div>

      <nav className="chatgpt-primary-nav" aria-label="주요 메뉴">
        <button type="button" className={activeView === "home" ? "selected" : ""} onClick={onOpenHome}>
          <Home size={20} />
          <span>Home</span>
        </button>
      </nav>

      <section className="chatgpt-session-group recent" aria-label="채팅 목록">
        {sessions.map((session) => (
          <SessionButton
            key={session.id}
            session={session}
            selected={activeView === "chat" && activeSessionId === session.id}
            interactive={interactive}
            onOpenSession={onOpenSession}
            onTogglePin={onTogglePin}
          />
        ))}
      </section>

      <div className="chatgpt-profile">
        <span>MJ</span>
        <strong>Mingyu Jeong</strong>
      </div>
    </aside>
  );
}

function SessionButton({
  session,
  selected,
  interactive,
  onOpenSession,
  onTogglePin,
}: {
  session: Session;
  selected: boolean;
  interactive: boolean;
  onOpenSession?: (id: string) => void;
  onTogglePin?: (id: string) => void;
}) {
  return (
    <div className={`chatgpt-session-row ${selected ? "selected" : ""}`}>
      <button type="button" onClick={() => onOpenSession?.(session.id)}>
        {session.title}
      </button>
      {session.status === "new-result" && <span className="session-unread-dot" aria-label="새 결과" />}
      <button
        type="button"
        className={session.pinned ? "pin-control pinned" : "pin-control"}
        aria-label={`${session.title} ${session.pinned ? "고정 해제" : "Home에 고정"}`}
        aria-disabled={!interactive}
        onClick={() => interactive && onTogglePin?.(session.id)}
      >
        {session.pinned ? <Pin size={15} fill="currentColor" /> : <PinOff size={15} />}
      </button>
    </div>
  );
}

function HomeGrid({
  sessions,
  interactive,
  draggablePanels,
  onUnpin,
  onDraftChange,
  onSubmitPanel,
  onReorderPinned,
  onMarkSeen,
}: {
  sessions: Session[];
  interactive: boolean;
  draggablePanels?: boolean;
  onUnpin?: (id: string) => void;
  onDraftChange?: (id: string, value: string) => void;
  onSubmitPanel?: (id: string) => void;
  onReorderPinned?: (draggedId: string, targetId: string) => void;
  onMarkSeen?: (id: string) => void;
}) {
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragPoint, setDragPoint] = useState<{ x: number; y: number } | null>(null);
  const [split, setSplit] = useState({ topColumn: 50, bottomColumn: 50, row: 50 });
  const [resizingAxis, setResizingAxis] = useState<ResizeAxis | null>(null);
  const resizingAxisRef = useRef<ResizeAxis | null>(null);
  const resizeBoundsRef = useRef<DOMRect | null>(null);
  const canDragPanels = draggablePanels ?? interactive;
  const pinnedSessions = sessions.filter((session) => session.pinned).slice(0, 4);
  const paneRows = pinnedSessions.length <= 2 ? [pinnedSessions] : [pinnedSessions.slice(0, 2), pinnedSessions.slice(2)];
  const draggingSession = pinnedSessions.find((session) => session.id === draggingId);
  const gridStyle = {
    "--home-row-size": `${split.row}%`,
  } as CSSProperties;

  function rowStyle(rowIndex: number) {
    return {
      "--row-col-size": `${rowIndex === 0 ? split.topColumn : split.bottomColumn}%`,
    } as CSSProperties;
  }

  function finishPanelDrag(clientX: number, clientY: number) {
    if (!draggingId) return;

    const target = document.elementFromPoint(clientX, clientY)?.closest<HTMLElement>("[data-pinned-card-id]");
    const targetId = target?.dataset.pinnedCardId;
    if (targetId && targetId !== draggingId) {
      onReorderPinned?.(draggingId, targetId);
    }
    setDraggingId(null);
    setDragPoint(null);
  }

  useEffect(() => {
    function handleWindowPointerMove(event: PointerEvent) {
      const axis = resizingAxisRef.current;
      const rect = resizeBoundsRef.current;
      if (!axis || !rect) return;

      updateSplitFromRect(axis, rect, event.clientX, event.clientY);
    }

    function handleWindowPointerUp() {
      resizingAxisRef.current = null;
      resizeBoundsRef.current = null;
      setResizingAxis(null);
    }

    window.addEventListener("pointermove", handleWindowPointerMove);
    window.addEventListener("pointerup", handleWindowPointerUp);
    window.addEventListener("pointercancel", handleWindowPointerUp);

    return () => {
      window.removeEventListener("pointermove", handleWindowPointerMove);
      window.removeEventListener("pointerup", handleWindowPointerUp);
      window.removeEventListener("pointercancel", handleWindowPointerUp);
    };
  }, []);

  function updateSplitFromRect(axis: ResizeAxis, rect: DOMRect, clientX: number, clientY: number) {
    if (axis === "row") {
      setSplit((current) => ({ ...current, row: clamp(((clientY - rect.top) / rect.height) * 100, 28, 72) }));
      return;
    }

    setSplit((current) => ({
      ...current,
      [axis]: clamp(((clientX - rect.left) / rect.width) * 100, 28, 72),
    }));
  }

  function startResize(axis: ResizeAxis, event: ReactPointerEvent<HTMLButtonElement>) {
    if (!interactive) return;

    event.preventDefault();
    const resizeElement = axis === "row" ? gridRef.current : event.currentTarget.parentElement;
    if (!resizeElement) return;

    resizingAxisRef.current = axis;
    resizeBoundsRef.current = resizeElement.getBoundingClientRect();
    setResizingAxis(axis);
    event.currentTarget.setPointerCapture(event.pointerId);
    updateSplitFromRect(axis, resizeBoundsRef.current, event.clientX, event.clientY);
  }

  function moveResize(axis: ResizeAxis, event: ReactPointerEvent<HTMLButtonElement>) {
    if (resizingAxisRef.current !== axis) return;
    if (!resizeBoundsRef.current) return;

    event.preventDefault();
    updateSplitFromRect(axis, resizeBoundsRef.current, event.clientX, event.clientY);
  }

  function stopResize(event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    resizingAxisRef.current = null;
    resizeBoundsRef.current = null;
    setResizingAxis(null);
  }

  return (
    <main className="chatgpt-main home-main">
      <section className="pinned-home-canvas" aria-label="고정 세션 홈">
        <div
          ref={gridRef}
          className={[
            "pinned-card-grid",
            `count-${pinnedSessions.length}`,
            resizingAxis ? `resizing-${resizingAxis}` : "",
          ].join(" ")}
          style={gridStyle}
        >
          {paneRows.map((row, rowIndex) => (
            <div
              className={`pinned-pane-row row-${rowIndex + 1} count-${row.length}`}
              key={row.map((session) => session.id).join("-")}
              style={rowStyle(rowIndex)}
            >
              {row.map((session) => (
                <article
                  data-pinned-card-id={session.id}
                  className={[
                    "pinned-chat-card",
                    `status-${session.status}`,
                    draggingId === session.id ? "dragging" : "",
                  ].join(" ")}
                  key={session.id}
                  onClick={() => {
                    if (interactive && session.status === "new-result") {
                      onMarkSeen?.(session.id);
                    }
                  }}
                >
                  {session.status === "generating" && <div className="panel-progress-bar" aria-hidden="true" />}
                  <header className="pinned-chat-card-header">
                    <button
                      type="button"
                      className="panel-grip"
                      aria-label={`${session.title} 위치 바꾸기`}
                      onPointerDown={(event) => {
                        if (!canDragPanels) return;
                        event.preventDefault();
                        setDraggingId(session.id);
                        setDragPoint({ x: event.clientX, y: event.clientY });
                        event.currentTarget.setPointerCapture(event.pointerId);
                      }}
                      onPointerMove={(event) => {
                        if (!canDragPanels || draggingId !== session.id) return;
                        setDragPoint({ x: event.clientX, y: event.clientY });
                      }}
                      onPointerUp={(event) => {
                        if (!canDragPanels) return;
                        finishPanelDrag(event.clientX, event.clientY);
                        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                          event.currentTarget.releasePointerCapture(event.pointerId);
                        }
                      }}
                      onPointerCancel={() => {
                        setDraggingId(null);
                        setDragPoint(null);
                      }}
                    >
                      <Grip size={15} />
                    </button>
                    <div className="panel-heading">
                      <div className="panel-title-row">
                        <h4>{session.title}</h4>
                        {(session.status === "generating" || session.status === "new-result") && (
                          <span className={`panel-status-badge ${session.status}`}>{statusLabel(session.status)}</span>
                        )}
                      </div>
                      <p>{session.summary}</p>
                    </div>
                    <div className="panel-action-group">
                      <button
                        type="button"
                        className="panel-pin-button"
                        aria-label={`${session.title} 홈에서 해제`}
                        aria-disabled={!interactive}
                        onClick={(event) => {
                          event.stopPropagation();
                          interactive && onUnpin?.(session.id);
                        }}
                      >
                        <Pin size={15} fill="currentColor" />
                      </button>
                    </div>
                  </header>

                  <div className="pinned-chat-thread">
                    <div className="thread-bubble user">
                      <p>{session.recentUser}</p>
                    </div>
                    <div className="thread-bubble assistant">
                      <p>{session.result ?? session.recentAssistant}</p>
                    </div>
                  </div>

                  <form
                    className={session.draft ? "pinned-panel-input active" : "pinned-panel-input"}
                    onSubmit={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onSubmitPanel?.(session.id);
                    }}
                  >
                    <textarea
                      aria-label={`${session.title}에 입력`}
                      readOnly={!interactive}
                      value={session.draft ?? ""}
                      onChange={(event) => onDraftChange?.(session.id, event.target.value)}
                      placeholder="무엇이든 부탁하세요"
                      rows={2}
                    />
                    <button
                      type="submit"
                      aria-label={`${session.title} 전송`}
                      disabled={!interactive || !session.draft?.trim() || session.status === "generating"}
                    >
                      <ArrowUp size={16} />
                    </button>
                  </form>
                </article>
              ))}
              {interactive && row.length > 1 && (
                <button
                  type="button"
                  className="pinned-split-resize-handle vertical"
                  aria-label={`${rowIndex + 1}번째 줄 패널 가로 크기 조절`}
                  onPointerDown={(event) => startResize(rowIndex === 0 ? "topColumn" : "bottomColumn", event)}
                  onPointerMove={(event) => moveResize(rowIndex === 0 ? "topColumn" : "bottomColumn", event)}
                  onPointerUp={stopResize}
                  onPointerCancel={stopResize}
                />
              )}
            </div>
          ))}
          {interactive && pinnedSessions.length > 2 && (
            <button
              type="button"
              className="pinned-split-resize-handle horizontal"
              aria-label="패널 세로 크기 조절"
              onPointerDown={(event) => startResize("row", event)}
              onPointerMove={(event) => moveResize("row", event)}
              onPointerUp={stopResize}
              onPointerCancel={stopResize}
            />
          )}
        </div>

        {draggingSession && dragPoint && (
          <div
            className="pinned-drag-preview"
            style={{ left: dragPoint.x, top: dragPoint.y }}
            aria-hidden="true"
          >
            <Grip size={14} />
            <span>{draggingSession.title}</span>
          </div>
        )}
      </section>
    </main>
  );
}

function ChatView({
  session,
  interactive,
  onTogglePin,
}: {
  session: Session;
  interactive: boolean;
  onTogglePin?: (id: string) => void;
}) {
  return (
    <main className="chatgpt-main chat-main">
      <header className="chatgpt-topbar">
        <button type="button" className="model-pill">ChatGPT 5.5 Thinking</button>
        <div className="topbar-actions">
          <button
            type="button"
            className={session.pinned ? "chat-pin-action pinned" : "chat-pin-action"}
            aria-label={session.pinned ? "Home에서 해제" : "Home에 고정"}
            aria-disabled={!interactive}
            onClick={() => interactive && onTogglePin?.(session.id)}
          >
            {session.pinned ? <Pin size={18} fill="currentColor" /> : <PinOff size={18} />}
          </button>
        </div>
      </header>

      <section className="single-chat-canvas">
        <article className="single-chat-card">
          <h3>{session.title}</h3>
          <p>{session.summary}</p>
          <div className="single-chat-thread">
            <div className="thread-bubble user">
              <p>{session.recentUser}</p>
            </div>
            <div className="thread-bubble assistant">
              <p>{session.recentAssistant}</p>
            </div>
          </div>
        </article>

        <div className="global-composer">
          <textarea readOnly placeholder="무엇이든 부탁하세요" rows={2} />
          <div>
            <button type="button" aria-label="추가">+</button>
            <button type="button" aria-label="음성 입력">
              <Mic size={18} />
            </button>
            <button type="button" aria-label="전송">
              <Send size={18} />
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

function FeedbackToast({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  return (
    <div className="pinned-feedback-toast" role="status" aria-live="polite">
      <Check size={16} />
      <span>{toast.message}</span>
      {toast.onAction && toast.actionLabel && (
        <button
          type="button"
          onClick={() => {
            toast.onAction?.();
            onDismiss();
          }}
        >
          <RotateCcw size={14} />
          {toast.actionLabel}
        </button>
      )}
      <button type="button" aria-label="닫기" onClick={onDismiss}>
        ×
      </button>
    </div>
  );
}

function ReplacePinnedDialog({
  pendingSession,
  pinnedSessions,
  onReplace,
  onCancel,
}: {
  pendingSession: Session;
  pinnedSessions: Session[];
  onReplace: (replaceId: string) => void;
  onCancel: () => void;
}) {
  return (
    <div className="pinned-replace-backdrop" role="dialog" aria-modal="true" aria-label="Home 고정 세션 교체">
      <section className="pinned-replace-dialog">
        <header>
          <h3>Home이 가득 찼습니다</h3>
          <p><strong>{pendingSession.title}</strong>을 고정하려면 기존 패널 하나를 교체해야 합니다.</p>
        </header>
        <div className="replace-option-list">
          {pinnedSessions.map((session) => (
            <button type="button" key={session.id} onClick={() => onReplace(session.id)}>
              <strong>{session.title}</strong>
              <span>{session.summary}</span>
            </button>
          ))}
        </div>
        <footer>
          <button type="button" onClick={onCancel}>취소</button>
        </footer>
      </section>
    </div>
  );
}

export function PinnedSessionHomeKeyScreen() {
  return (
    <div className="chatgpt-home-shell" aria-label="고정 세션 홈 키스크린">
      <Sidebar sessions={baseSessions} activeView="home" activeSessionId="biz-english" interactive={false} />
      <HomeGrid sessions={baseSessions} interactive={false} />
    </div>
  );
}

export function PinnedSessionHomePrototype() {
  const [sessions, setSessions] = useState(prototypeSeed);
  const [homeOrder, setHomeOrder] = useState(() => prototypeSeed.filter((session) => session.pinned).map((session) => session.id));
  const [activeView, setActiveView] = useState<"home" | "chat">("chat");
  const [activeSessionId, setActiveSessionId] = useState("biz-english");
  const [toast, setToast] = useState<ToastState | null>(null);
  const [pendingPinId, setPendingPinId] = useState<string | null>(null);
  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) ?? sessions[0],
    [activeSessionId, sessions],
  );
  const pendingSession = pendingPinId ? sessions.find((session) => session.id === pendingPinId) : undefined;
  const pinnedSessions = useMemo(() => getOrderedPinnedSessions(sessions, homeOrder), [sessions, homeOrder]);

  useEffect(() => {
    if (!toast) return undefined;

    const timeoutId = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  function showToast(nextToast: ToastState) {
    setToast(nextToast);
  }

  function pinSession(id: string) {
    const target = sessions.find((session) => session.id === id);
    if (!target) return;

    setSessions((current) =>
      current.map((session) =>
        session.id === id ? { ...session, pinned: true } : session,
      ),
    );
    setHomeOrder((current) => (current.includes(id) ? current : [...current, id].slice(-4)));
    showToast({
      message: `${target.title}이 Home에 고정되었습니다.`,
      actionLabel: "실행 취소",
      onAction: () => {
        setSessions((current) => current.map((session) => (session.id === id ? { ...session, pinned: false } : session)));
        setHomeOrder((current) => current.filter((sessionId) => sessionId !== id));
      },
    });
  }

  function unpinSession(id: string) {
    const target = sessions.find((session) => session.id === id);
    if (!target) return;

    setSessions((current) => current.map((session) => (session.id === id ? { ...session, pinned: false } : session)));
    setHomeOrder((current) => current.filter((sessionId) => sessionId !== id));
    showToast({
      message: `Home에서 제거되었습니다. 채팅 기록은 유지됩니다.`,
      actionLabel: "실행 취소",
      onAction: () => {
        setSessions((current) => current.map((session) => (session.id === id ? { ...session, pinned: true } : session)));
        setHomeOrder((current) => (current.includes(id) ? current : [...current, id].slice(0, 4)));
      },
    });
  }

  function togglePin(id: string) {
    const target = sessions.find((session) => session.id === id);
    if (!target) return;

    if (target.pinned) {
      unpinSession(id);
      return;
    }

    const pinnedCount = sessions.filter((session) => session.pinned).length;
    if (pinnedCount >= 4) {
      setPendingPinId(id);
      return;
    }

    pinSession(id);
  }

  function replacePinnedSession(replaceId: string) {
    if (!pendingSession) return;
    const addedTitle = pendingSession.title;

    setSessions((current) =>
      current.map((session) => {
        if (session.id === replaceId) return { ...session, pinned: false };
        if (session.id === pendingSession.id) return { ...session, pinned: true };
        return session;
      }),
    );
    setHomeOrder((current) => current.map((sessionId) => (sessionId === replaceId ? pendingSession.id : sessionId)));
    setPendingPinId(null);
    showToast({
      message: `${addedTitle}이 Home에 고정되었습니다.`,
      actionLabel: "실행 취소",
      onAction: () => {
        setSessions((current) =>
          current.map((session) => {
            if (session.id === replaceId) return { ...session, pinned: true };
            if (session.id === pendingSession.id) return { ...session, pinned: false };
            return session;
          }),
        );
        setHomeOrder((current) => current.map((sessionId) => (sessionId === pendingSession.id ? replaceId : sessionId)));
      },
    });
  }

  function updateDraft(id: string, value: string) {
    setSessions((current) => current.map((session) => (session.id === id ? { ...session, draft: value } : session)));
  }

  function submitPanel(id: string) {
    const target = sessions.find((session) => session.id === id);
    const input = target?.draft?.trim();
    if (!target || !input || target.status === "generating") return;

    setSessions((current) =>
      current.map((session) =>
        session.id === id
          ? {
              ...session,
              status: "generating",
              recentUser: input,
              draft: "",
            }
          : session,
      ),
    );

    window.setTimeout(() => {
      setSessions((current) =>
        current.map((session) =>
          session.id === id
            ? {
                ...session,
                status: "new-result",
                result: createResult(id, input),
              }
            : session,
        ),
      );
    }, 900);
  }

  function reorderPinned(draggedId: string, targetId: string) {
    setHomeOrder((current) => {
      const orderedIds = getOrderedPinnedSessions(sessions, current).map((session) => session.id);
      const draggedIndex = orderedIds.indexOf(draggedId);
      const targetIndex = orderedIds.indexOf(targetId);
      if (draggedIndex < 0 || targetIndex < 0 || draggedIndex === targetIndex) return current;

      const next = [...orderedIds];
      const [dragged] = next.splice(draggedIndex, 1);
      const adjustedTargetIndex = next.indexOf(targetId);
      const insertIndex = draggedIndex < targetIndex ? adjustedTargetIndex + 1 : adjustedTargetIndex;
      next.splice(insertIndex, 0, dragged);
      return next;
    });
  }

  function openSession(id: string) {
    setActiveSessionId(id);
    setActiveView("chat");
    setSessions((current) => current.map((session) => (session.id === id && session.status === "new-result" ? { ...session, status: "seen" } : session)));
  }

  function markSeen(id: string) {
    setSessions((current) => current.map((session) => (session.id === id && session.status === "new-result" ? { ...session, status: "seen" } : session)));
  }

  return (
    <div className="chatgpt-home-shell" aria-label="고정 세션 홈 프로토타입">
      <Sidebar
        sessions={sessions}
        activeView={activeView}
        activeSessionId={activeSessionId}
        interactive
        onOpenHome={() => setActiveView("home")}
        onOpenSession={openSession}
        onTogglePin={togglePin}
      />
      {activeView === "home" ? (
        <HomeGrid
          sessions={pinnedSessions}
          interactive
          onUnpin={togglePin}
          onDraftChange={updateDraft}
          onSubmitPanel={submitPanel}
          onReorderPinned={reorderPinned}
          onMarkSeen={markSeen}
        />
      ) : (
        <ChatView session={activeSession} interactive onTogglePin={togglePin} />
      )}
      {toast && <FeedbackToast toast={toast} onDismiss={() => setToast(null)} />}
      {pendingSession && (
        <ReplacePinnedDialog
          pendingSession={pendingSession}
          pinnedSessions={pinnedSessions}
          onReplace={replacePinnedSession}
          onCancel={() => setPendingPinId(null)}
        />
      )}
    </div>
  );
}
