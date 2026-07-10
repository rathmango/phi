import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUp,
  Check,
  Copy,
  Grip,
  LayoutDashboard,
  Maximize2,
  PanelLeftClose,
  PanelLeftOpen,
  Pin,
  Search,
  Send,
  SquarePen,
} from "lucide-react";
import "./PinnedSessionDashboardPrototype.css";

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

type DashboardPane = Session | "create";

type ToastState = {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

const DASHBOARD_SLOT_COUNT = 4;

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

function isSessionPane(pane: DashboardPane): pane is Session {
  return pane !== "create";
}

function getOrderedPinnedSessions(sessions: Session[], dashboardOrder: string[]) {
  const sessionMap = new Map(sessions.map((session) => [session.id, session]));
  const ordered = dashboardOrder
    .map((id) => sessionMap.get(id))
    .filter((session): session is Session => Boolean(session?.pinned));
  const missing = sessions.filter((session) => session.pinned && !dashboardOrder.includes(session.id));
  return [...ordered, ...missing].slice(0, 4);
}

async function copyToClipboard(text: string) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("copy failed");
}

function AssistantMessage({ text, interactive }: { text: string; interactive: boolean }) {
  const [copied, setCopied] = useState(false);
  const copiedTimeoutRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (copiedTimeoutRef.current) window.clearTimeout(copiedTimeoutRef.current);
  }, []);

  async function handleCopy() {
    try {
      await copyToClipboard(text);
      setCopied(true);
      if (copiedTimeoutRef.current) window.clearTimeout(copiedTimeoutRef.current);
      copiedTimeoutRef.current = window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="assistant-message">
      <div className="thread-bubble assistant">
        <p>{text}</p>
      </div>
      <div className="message-actions">
        <button
          type="button"
          className={copied ? "message-copy-button copied" : "message-copy-button"}
          aria-label={copied ? "답변 복사 완료" : "답변 복사"}
          title={copied ? "복사됨" : "답변 복사"}
          disabled={!interactive}
          onClick={handleCopy}
        >
          {copied ? <Check size={15} /> : <Copy size={15} />}
        </button>
      </div>
    </div>
  );
}

function Sidebar({
  sessions,
  activeView,
  activeSessionId,
  interactive,
  onOpenDashboard,
  onOpenSession,
  onTogglePin,
  onCreateChat,
  onToggleSidebar,
  pinFeedbackActive,
}: {
  sessions: Session[];
  activeView: "dashboard" | "chat";
  activeSessionId?: string;
  interactive: boolean;
  onOpenDashboard?: () => void;
  onOpenSession?: (id: string) => void;
  onTogglePin?: (id: string) => void;
  onCreateChat?: () => void;
  onToggleSidebar?: () => void;
  pinFeedbackActive?: boolean;
}) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase("ko");
  const visibleSessions = normalizedQuery
    ? sessions.filter((session) => `${session.title} ${session.summary}`.toLocaleLowerCase("ko").includes(normalizedQuery))
    : sessions;

  return (
    <aside className="chatgpt-sidebar">
      <div className="chatgpt-window-row">
        <div className="app-window-dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="sidebar-window-actions">
          <button
            type="button"
            className="sidebar-collapse-button"
            aria-label="사이드바 닫기"
            disabled={!interactive}
            onClick={onToggleSidebar}
            title="사이드바 닫기"
          >
            <PanelLeftClose size={19} />
          </button>
          <button
            type="button"
            className="sidebar-new-chat"
            aria-label="새 채팅 만들기"
            disabled={!interactive}
            onClick={onCreateChat}
            title="새 채팅"
          >
            <SquarePen size={18} />
          </button>
        </div>
      </div>

      <label className="chatgpt-search">
        <Search size={18} />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="채팅 검색"
          readOnly={!interactive}
          aria-label="채팅 검색"
        />
      </label>

      <nav className="chatgpt-primary-nav" aria-label="주요 메뉴">
        <button
          type="button"
          className={[
            activeView === "dashboard" ? "selected" : "",
            pinFeedbackActive ? "pin-feedback" : "",
          ].join(" ")}
          onClick={onOpenDashboard}
        >
          <LayoutDashboard size={20} />
          <span className="dashboard-nav-label">Dashboard</span>
          <span className="dashboard-nav-count" aria-label={`${sessions.filter((session) => session.pinned).length}개 고정됨`}>
            {sessions.filter((session) => session.pinned).length}
          </span>
        </button>
      </nav>

      <section className="chatgpt-session-group recent" aria-label="채팅 목록">
        {visibleSessions.map((session) => (
          <SessionButton
            key={session.id}
            session={session}
            selected={activeView === "chat" && activeSessionId === session.id}
            interactive={interactive}
            onOpenSession={onOpenSession}
            onTogglePin={onTogglePin}
          />
        ))}
        {visibleSessions.length === 0 && <p className="session-search-empty">일치하는 채팅이 없습니다</p>}
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
        aria-label={`${session.title} ${session.pinned ? "고정 해제" : "Dashboard에 고정"}`}
        aria-pressed={session.pinned}
        disabled={!interactive}
        onClick={() => interactive && onTogglePin?.(session.id)}
      >
        <Pin size={15} fill={session.pinned ? "currentColor" : "none"} />
      </button>
    </div>
  );
}

function DashboardGrid({
  sessions,
  interactive,
  draggablePanels,
  onCreateChat,
  onUnpin,
  onDraftChange,
  onSubmitPanel,
  onReorderPinned,
  onMarkSeen,
  onOpenSession,
  focusSessionId,
  highlightedSessionId,
}: {
  sessions: Session[];
  interactive: boolean;
  draggablePanels?: boolean;
  onCreateChat?: () => void;
  onUnpin?: (id: string) => void;
  onDraftChange?: (id: string, value: string) => void;
  onSubmitPanel?: (id: string) => void;
  onReorderPinned?: (draggedId: string, targetId: string) => void;
  onMarkSeen?: (id: string) => void;
  onOpenSession?: (id: string) => void;
  focusSessionId?: string | null;
  highlightedSessionId?: string | null;
}) {
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragPoint, setDragPoint] = useState<{ x: number; y: number } | null>(null);
  const [split, setSplit] = useState({ topColumn: 50, bottomColumn: 50, row: 50 });
  const [resizingAxis, setResizingAxis] = useState<ResizeAxis | null>(null);
  const resizingAxisRef = useRef<ResizeAxis | null>(null);
  const resizeBoundsRef = useRef<DOMRect | null>(null);
  const canDragPanels = draggablePanels ?? interactive;
  const pinnedSessions = sessions.filter((session) => session.pinned).slice(0, DASHBOARD_SLOT_COUNT);
  const dashboardPanes: DashboardPane[] =
    pinnedSessions.length < DASHBOARD_SLOT_COUNT ? [...pinnedSessions, "create"] : pinnedSessions;
  const paneRows = dashboardPanes.length <= 2 ? [dashboardPanes] : [dashboardPanes.slice(0, 2), dashboardPanes.slice(2)];
  const draggingSession = pinnedSessions.find((session) => session.id === draggingId);
  const gridStyle = {
    "--dashboard-row-size": `${split.row}%`,
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
    <main className="chatgpt-main dashboard-main">
      <section className="pinned-dashboard-canvas" aria-label="고정 세션 대시보드">
        <header className="pinned-dashboard-header">
          <div>
            <h2>Dashboard</h2>
            <span>{pinnedSessions.length} / {DASHBOARD_SLOT_COUNT}</span>
          </div>
          <p>반복해서 쓰는 채팅을 한 화면에서 이어서 작업합니다</p>
        </header>
        <div
          ref={gridRef}
          className={[
            "pinned-card-grid",
            `count-${dashboardPanes.length}`,
            `occupied-${pinnedSessions.length}`,
            resizingAxis ? `resizing-${resizingAxis}` : "",
          ].join(" ")}
          style={gridStyle}
        >
          {paneRows.map((row, rowIndex) => (
            <div
              className={`pinned-pane-row row-${rowIndex + 1} count-${row.length} occupied-${row.filter(isSessionPane).length}`}
              key={row.map((pane, index) => (isSessionPane(pane) ? pane.id : `create-${rowIndex}-${index}`)).join("-")}
              style={rowStyle(rowIndex)}
            >
              {row.map((pane, slotIndex) =>
                isSessionPane(pane) ? (
                  <article
                    data-pinned-card-id={pane.id}
                    className={[
                      "pinned-chat-card",
                      `status-${pane.status}`,
                      draggingId === pane.id ? "dragging" : "",
                      highlightedSessionId === pane.id ? "just-pinned" : "",
                    ].join(" ")}
                    key={pane.id}
                    onClick={() => {
                      if (interactive && pane.status === "new-result") {
                        onMarkSeen?.(pane.id);
                      }
                    }}
                  >
                    {pane.status === "generating" && <div className="panel-progress-bar" aria-hidden="true" />}
                    <header className="pinned-chat-card-header">
                      <button
                        type="button"
                        className="panel-grip"
                        aria-label={`${pane.title} 위치 바꾸기`}
                        onPointerDown={(event) => {
                          if (!canDragPanels) return;
                          event.preventDefault();
                          setDraggingId(pane.id);
                          setDragPoint({ x: event.clientX, y: event.clientY });
                          event.currentTarget.setPointerCapture(event.pointerId);
                        }}
                        onPointerMove={(event) => {
                          if (!canDragPanels || draggingId !== pane.id) return;
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
                          <h4>{pane.title}</h4>
                          {(pane.status === "generating" || pane.status === "new-result") && (
                            <span className={`panel-status-badge ${pane.status}`}>{statusLabel(pane.status)}</span>
                          )}
                        </div>
                        <p>{pane.summary}</p>
                      </div>
                      <div className="panel-action-group">
                        <button
                          type="button"
                          className="panel-open-button"
                          aria-label={`${pane.title} 전체 화면으로 열기`}
                          title="전체 화면으로 열기"
                          disabled={!interactive}
                          onClick={(event) => {
                            event.stopPropagation();
                            onOpenSession?.(pane.id);
                          }}
                        >
                          <Maximize2 size={15} />
                        </button>
                        <button
                          type="button"
                          className="panel-pin-button"
                          aria-label={`${pane.title} 대시보드에서 해제`}
                          aria-pressed="true"
                          title="대시보드에서 해제"
                          disabled={!interactive}
                          onClick={(event) => {
                            event.stopPropagation();
                            interactive && onUnpin?.(pane.id);
                          }}
                        >
                          <Pin size={15} fill="currentColor" />
                        </button>
                      </div>
                    </header>

                    <div className={pane.recentUser || pane.result || pane.recentAssistant ? "pinned-chat-thread" : "pinned-chat-thread empty"}>
                      {pane.recentUser && (
                        <div className="thread-bubble user">
                        <p>{pane.recentUser}</p>
                        </div>
                      )}
                      {(pane.result || pane.recentAssistant) && (
                        <AssistantMessage text={pane.result ?? pane.recentAssistant} interactive={interactive} />
                      )}
                    </div>

                  <form
                      className={pane.draft ? "pinned-panel-input active" : "pinned-panel-input"}
                      onSubmit={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        onSubmitPanel?.(pane.id);
                      }}
                    >
                      <textarea
                        aria-label={`${pane.title}에 입력`}
                        readOnly={!interactive}
                        value={pane.draft ?? ""}
                        onChange={(event) => onDraftChange?.(pane.id, event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                            event.preventDefault();
                            event.currentTarget.form?.requestSubmit();
                          }
                        }}
                        placeholder="무엇이든 부탁하세요"
                        rows={2}
                        autoFocus={pane.id === focusSessionId}
                      />
                      <button
                        type="submit"
                        aria-label={`${pane.title} 전송`}
                        disabled={!interactive || !pane.draft?.trim() || pane.status === "generating"}
                      >
                        <ArrowUp size={16} />
                      </button>
                    </form>
                  </article>
                ) : (
                  <button
                    type="button"
                    className="pinned-empty-slot"
                    key={`empty-${rowIndex}-${slotIndex}`}
                    onClick={onCreateChat}
                    disabled={!interactive}
                  >
                    <span className="pinned-empty-icon" aria-hidden="true">
                      <SquarePen size={22} />
                    </span>
                    <strong>새 채팅 시작</strong>
                    <span>새 패널을 추가하고 바로 입력합니다</span>
                  </button>
                ),
              )}
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
  onDraftChange,
  onSubmit,
  focusSessionId,
}: {
  session: Session;
  interactive: boolean;
  onTogglePin?: (id: string) => void;
  onDraftChange?: (id: string, value: string) => void;
  onSubmit?: (id: string) => void;
  focusSessionId?: string | null;
}) {
  return (
    <main className="chatgpt-main chat-main">
      <header className="chatgpt-topbar">
        <span className="model-pill">ChatGPT 5.5 Thinking</span>
        <div className="topbar-actions">
          <button
            type="button"
            className={session.pinned ? "chat-pin-action pinned" : "chat-pin-action"}
            aria-label={session.pinned ? "Dashboard에서 해제" : "Dashboard에 고정"}
            aria-pressed={session.pinned}
            disabled={!interactive}
            onClick={() => interactive && onTogglePin?.(session.id)}
          >
            <Pin size={18} fill={session.pinned ? "currentColor" : "none"} />
          </button>
        </div>
      </header>

      <section className="single-chat-canvas">
        <article className="single-chat-card">
          <div className="single-chat-heading">
            <h3>{session.title}</h3>
            {session.status === "generating" && <span>생성 중</span>}
          </div>
          <p>{session.summary}</p>
          <div className={session.recentUser || session.result || session.recentAssistant ? "single-chat-thread" : "single-chat-thread empty"}>
            {session.recentUser && <div className="thread-bubble user"><p>{session.recentUser}</p></div>}
            {(session.result || session.recentAssistant) && (
              <AssistantMessage text={session.result ?? session.recentAssistant} interactive={interactive} />
            )}
          </div>
        </article>

        <form
          className={session.draft ? "global-composer active" : "global-composer"}
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit?.(session.id);
          }}
        >
          <textarea
            value={session.draft ?? ""}
            onChange={(event) => onDraftChange?.(session.id, event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            readOnly={!interactive}
            placeholder="무엇이든 부탁하세요"
            rows={2}
            autoFocus={session.id === focusSessionId}
          />
          <div>
            <button type="submit" aria-label="전송" disabled={!interactive || !session.draft?.trim() || session.status === "generating"}>
              <Send size={18} />
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

function FeedbackToast({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  return (
    <div className={toast.actionLabel ? "pinned-feedback-toast has-action" : "pinned-feedback-toast"} role="status" aria-live="polite">
      <span>{toast.message}</span>
      {toast.actionLabel && toast.onAction && (
        <button
          type="button"
          className="toast-action-button"
          onClick={() => {
            toast.onAction?.();
            onDismiss();
          }}
        >
          {toast.actionLabel}
        </button>
      )}
    </div>
  );
}

export function PinnedSessionDashboardKeyScreen() {
  return (
    <div className="chatgpt-dashboard-shell" aria-label="고정 세션 대시보드 키스크린">
      <Sidebar sessions={baseSessions} activeView="dashboard" activeSessionId="biz-english" interactive={false} />
      <DashboardGrid sessions={baseSessions} interactive={false} />
    </div>
  );
}

export function PinnedSessionDashboardPrototype() {
  const [sessions, setSessions] = useState(prototypeSeed);
  const [dashboardOrder, setDashboardOrder] = useState(() => prototypeSeed.filter((session) => session.pinned).map((session) => session.id));
  const [activeView, setActiveView] = useState<"dashboard" | "chat">("dashboard");
  const [activeSessionId, setActiveSessionId] = useState("biz-english");
  const [focusSessionId, setFocusSessionId] = useState<string | null>(null);
  const [justPinnedId, setJustPinnedId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [shellHeight, setShellHeight] = useState(760);
  const [resizingWindow, setResizingWindow] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const windowResizeStartRef = useRef<{ clientY: number; height: number } | null>(null);
  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) ?? sessions[0],
    [activeSessionId, sessions],
  );
  const pinnedSessions = useMemo(() => getOrderedPinnedSessions(sessions, dashboardOrder), [sessions, dashboardOrder]);

  useEffect(() => {
    if (activeView !== "chat" || activeSession.status !== "new-result") return;
    setSessions((current) =>
      current.map((session) => session.id === activeSessionId ? { ...session, status: "seen" } : session),
    );
  }, [activeSession.status, activeSessionId, activeView]);

  useEffect(() => {
    if (!toast) return undefined;

    const timeoutId = window.setTimeout(() => setToast(null), toast.actionLabel ? 4000 : 2600);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  useEffect(() => {
    if (activeView !== "dashboard" || !justPinnedId) return undefined;

    const timeoutId = window.setTimeout(() => setJustPinnedId(null), 1400);
    return () => window.clearTimeout(timeoutId);
  }, [activeView, justPinnedId]);

  useEffect(() => {
    function resizeWindow(event: PointerEvent) {
      const start = windowResizeStartRef.current;
      if (!start) return;
      setShellHeight(clamp(start.height + event.clientY - start.clientY, 620, 1400));
    }

    function finishWindowResize() {
      windowResizeStartRef.current = null;
      setResizingWindow(false);
    }

    window.addEventListener("pointermove", resizeWindow);
    window.addEventListener("pointerup", finishWindowResize);
    window.addEventListener("pointercancel", finishWindowResize);
    return () => {
      window.removeEventListener("pointermove", resizeWindow);
      window.removeEventListener("pointerup", finishWindowResize);
      window.removeEventListener("pointercancel", finishWindowResize);
    };
  }, []);

  useEffect(() => {
    if (!toast) return undefined;

    function dismissToast(event: KeyboardEvent) {
      if (event.key === "Escape") setToast(null);
    }

    window.addEventListener("keydown", dismissToast);
    return () => window.removeEventListener("keydown", dismissToast);
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
    setDashboardOrder((current) => (current.includes(id) ? current : [...current, id].slice(-4)));
    setJustPinnedId(id);
    showToast({
      message: "대시보드에 고정됨",
      ...(activeView !== "dashboard"
        ? {
            actionLabel: "이동",
            onAction: () => setActiveView("dashboard"),
          }
        : {}),
    });
  }

  function unpinSession(id: string) {
    const target = sessions.find((session) => session.id === id);
    if (!target) return;
    const previousOrder = getOrderedPinnedSessions(sessions, dashboardOrder).map((session) => session.id);
    const previousIndex = previousOrder.indexOf(id);

    setSessions((current) => current.map((session) => (session.id === id ? { ...session, pinned: false } : session)));
    setDashboardOrder((current) => current.filter((sessionId) => sessionId !== id));
    showToast({
      message: "고정 해제됨",
      actionLabel: "되돌리기",
      onAction: () => {
        setSessions((current) => current.map((session) => session.id === id ? { ...session, pinned: true } : session));
        setDashboardOrder((current) => {
          const next = current.filter((sessionId) => sessionId !== id);
          next.splice(clamp(previousIndex, 0, next.length), 0, id);
          return next.slice(0, DASHBOARD_SLOT_COUNT);
        });
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
      showToast({
        message: "대시보드가 가득 찼습니다",
        ...(activeView !== "dashboard"
          ? {
              actionLabel: "이동",
              onAction: () => setActiveView("dashboard"),
            }
          : {}),
      });
      return;
    }

    pinSession(id);
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
              ...(session.title === "새 채팅"
                ? {
                    title: input.length > 16 ? `${input.slice(0, 16)}…` : input,
                    summary: session.pinned ? "Dashboard에서 시작한 채팅" : "새로 시작한 채팅",
                  }
                : {}),
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
    setDashboardOrder((current) => {
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
    setFocusSessionId(null);
    setActiveSessionId(id);
    setActiveView("chat");
    setSessions((current) => current.map((session) => (session.id === id && session.status === "new-result" ? { ...session, status: "seen" } : session)));
  }

  function markSeen(id: string) {
    setSessions((current) => current.map((session) => (session.id === id && session.status === "new-result" ? { ...session, status: "seen" } : session)));
  }

  function createDashboardChat() {
    const pinnedCount = sessions.filter((session) => session.pinned).length;
    if (pinnedCount >= DASHBOARD_SLOT_COUNT) {
      showToast({ message: "대시보드가 가득 찼습니다" });
      return;
    }

    const id = `new-chat-${Date.now()}`;
    const newSession: Session = {
      id,
      title: "새 채팅",
      summary: "새 요청을 입력하는 대화",
      pinned: true,
      status: "idle",
      recentUser: "",
      recentAssistant: "",
      draft: "",
    };
    setSessions((current) => [newSession, ...current]);
    setDashboardOrder((current) => (current.includes(id) ? current : [...current, id]).slice(-DASHBOARD_SLOT_COUNT));
    setActiveSessionId(id);
    setActiveView("dashboard");
    setFocusSessionId(id);
    setJustPinnedId(id);
  }

  function createRegularChat() {
    const id = `new-chat-${Date.now()}`;
    const newSession: Session = {
      id,
      title: "새 채팅",
      summary: "새 요청을 입력하는 대화",
      pinned: false,
      status: "idle",
      recentUser: "",
      recentAssistant: "",
      draft: "",
    };
    setSessions((current) => [newSession, ...current]);
    setActiveSessionId(id);
    setActiveView("chat");
    setFocusSessionId(id);
  }

  function startWindowResize(event: ReactPointerEvent<HTMLButtonElement>) {
    const shell = event.currentTarget.parentElement;
    if (!shell) return;

    event.preventDefault();
    windowResizeStartRef.current = {
      clientY: event.clientY,
      height: shell.getBoundingClientRect().height,
    };
    setResizingWindow(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  return (
    <div
      className={[
        "chatgpt-dashboard-shell",
        "interactive-shell",
        sidebarCollapsed ? "sidebar-collapsed" : "",
        resizingWindow ? "window-resizing" : "",
      ].join(" ")}
      style={{ "--dashboard-shell-height": `${shellHeight}px` } as CSSProperties}
      aria-label="고정 세션 대시보드 프로토타입"
    >
      <Sidebar
        sessions={sessions}
        activeView={activeView}
        activeSessionId={activeSessionId}
        interactive
        onOpenDashboard={() => setActiveView("dashboard")}
        onOpenSession={openSession}
        onTogglePin={togglePin}
        onCreateChat={createRegularChat}
        onToggleSidebar={() => setSidebarCollapsed(true)}
        pinFeedbackActive={Boolean(justPinnedId)}
      />
      {sidebarCollapsed && (
        <button
          type="button"
          className="sidebar-reopen-button"
          aria-label="사이드바 열기"
          title="사이드바 열기"
          onClick={() => setSidebarCollapsed(false)}
        >
          <PanelLeftOpen size={19} />
        </button>
      )}
      {activeView === "dashboard" ? (
        <DashboardGrid
          sessions={pinnedSessions}
          interactive
          onCreateChat={createDashboardChat}
          onUnpin={togglePin}
          onDraftChange={updateDraft}
          onSubmitPanel={submitPanel}
          onReorderPinned={reorderPinned}
          onMarkSeen={markSeen}
          onOpenSession={openSession}
          focusSessionId={focusSessionId}
          highlightedSessionId={justPinnedId}
        />
      ) : (
        <ChatView
          session={activeSession}
          interactive
          onTogglePin={togglePin}
          onDraftChange={updateDraft}
          onSubmit={submitPanel}
          focusSessionId={focusSessionId}
        />
      )}
      {toast && <FeedbackToast toast={toast} onDismiss={() => setToast(null)} />}
      <button
        type="button"
        className="dashboard-window-resize-handle"
        aria-label="창 높이 조절"
        title="드래그하여 창 높이 조절"
        onPointerDown={startWindowResize}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setShellHeight((current) => clamp(current + 40, 620, 1400));
          }
          if (event.key === "ArrowUp") {
            event.preventDefault();
            setShellHeight((current) => clamp(current - 40, 620, 1400));
          }
        }}
      />
    </div>
  );
}
