import { useMemo, useState } from "react";
import {
  ArrowUp,
  Grip,
  Home,
  Mic,
  PanelLeft,
  Pin,
  PinOff,
  Search,
  Send,
  SquarePen,
} from "lucide-react";

type Session = {
  id: string;
  title: string;
  summary: string;
  pinned: boolean;
  recentUser: string;
  recentAssistant: string;
  draft?: string;
  result?: string;
};

const baseSessions: Session[] = [
  {
    id: "biz-english",
    title: "비즈니스 영어 번역",
    summary: "브랜드명 유지, Markdown 출력, 자연스러운 이메일 톤",
    pinned: true,
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
    recentUser: "아래 메모를 Notion에 붙여넣기 좋게 정리해줘.",
    recentAssistant: "정리 기준은 제목, 결정사항, 액션 아이템 순서로 맞춰둘게요.",
    draft: "오늘 논의한 온보딩 개선안 메모 붙여넣기",
  },
  {
    id: "meeting",
    title: "회의록 요약",
    summary: "결정사항과 다음 할 일만 추출",
    pinned: true,
    recentUser: "오늘 회의록에서 결정사항과 할 일만 뽑아줘.",
    recentAssistant: "결정사항 3개와 담당자별 액션 아이템으로 정리했습니다.",
  },
  {
    id: "tone",
    title: "문장 톤 다듬기",
    summary: "딱딱한 문장을 부드러운 업무 메시지로 변환",
    pinned: true,
    recentUser: "이 문장을 조금 더 부드러운 업무 메시지로 바꿔줘.",
    recentAssistant: "상대가 부담스럽지 않도록 요청의 이유와 다음 행동을 함께 넣었습니다.",
  },
  {
    id: "research",
    title: "랜딩페이지 리뷰 배치 연구",
    summary: "리뷰 섹션의 정보 구조를 비교",
    pinned: false,
    recentUser: "랜딩페이지 리뷰 배치를 비교해줘.",
    recentAssistant: "신뢰 형성, 전환 직전 보강, 사용 맥락 제시 기준으로 나눠볼 수 있어요.",
  },
  {
    id: "release",
    title: "시스템 트레이딩 답변 요청",
    summary: "긴 답변을 검토 가능한 구조로 정리",
    pinned: false,
    recentUser: "아래 답변을 검토하기 좋게 정리해줘.",
    recentAssistant: "주장, 근거, 확인해야 할 지점으로 나누어 정리했습니다.",
  },
];

const prototypeSeed = baseSessions.map((session) =>
  session.id === "biz-english" ? { ...session, pinned: false, draft: "", result: undefined } : session,
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
  onUnpin,
  onDraftChange,
  onSubmitPanel,
  onReorderPinned,
}: {
  sessions: Session[];
  interactive: boolean;
  onUnpin?: (id: string) => void;
  onDraftChange?: (id: string, value: string) => void;
  onSubmitPanel?: (id: string) => void;
  onReorderPinned?: (draggedId: string, targetId: string) => void;
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const pinnedSessions = sessions.filter((session) => session.pinned).slice(0, 4);

  return (
      <main className="chatgpt-main home-main">
      <section className="pinned-home-canvas" aria-label="고정 세션 홈">
        <div className="pinned-home-title">
          <h3>Home</h3>
        </div>

        <div className="pinned-card-grid">
          {pinnedSessions.map((session, index) => (
            <article
              className={draggingId === session.id ? "pinned-chat-card dragging" : "pinned-chat-card"}
              draggable={interactive}
              key={session.id}
              onDragStart={(event) => {
                if (!interactive) return;
                setDraggingId(session.id);
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", session.id);
              }}
              onDragOver={(event) => {
                if (!interactive || !draggingId || draggingId === session.id) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
              }}
              onDrop={(event) => {
                if (!interactive) return;
                event.preventDefault();
                const draggedId = event.dataTransfer.getData("text/plain") || draggingId;
                if (draggedId && draggedId !== session.id) {
                  onReorderPinned?.(draggedId, session.id);
                }
                setDraggingId(null);
              }}
              onDragEnd={() => setDraggingId(null)}
            >
              <header className="pinned-chat-card-header">
                <button type="button" className="panel-grip" aria-label={`${session.title} 위치 바꾸기`}>
                  <Grip size={15} />
                </button>
                <div>
                  <small>{index + 1}</small>
                  <h4>{session.title}</h4>
                </div>
                <button
                  type="button"
                  className="panel-pin-button"
                  aria-label={`${session.title} 홈에서 해제`}
                  aria-disabled={!interactive}
                  onClick={() => interactive && onUnpin?.(session.id)}
                >
                  <Pin size={15} fill="currentColor" />
                </button>
              </header>

              <p className="pinned-chat-summary">{session.summary}</p>

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
                <button type="submit" aria-label={`${session.title} 전송`} disabled={interactive && !session.draft?.trim()}>
                  <ArrowUp size={16} />
                </button>
              </form>
            </article>
          ))}
        </div>
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
  const [activeView, setActiveView] = useState<"home" | "chat">("chat");
  const [activeSessionId, setActiveSessionId] = useState("biz-english");
  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) ?? sessions[0],
    [activeSessionId, sessions],
  );

  function togglePin(id: string) {
    setSessions((current) => {
      const target = current.find((session) => session.id === id);
      const pinnedCount = current.filter((session) => session.pinned).length;
      if (!target) return current;
      if (!target.pinned && pinnedCount >= 4) return current;
      return current.map((session) => (session.id === id ? { ...session, pinned: !session.pinned } : session));
    });
  }

  function updateDraft(id: string, value: string) {
    setSessions((current) => current.map((session) => (session.id === id ? { ...session, draft: value } : session)));
  }

  function submitPanel(id: string) {
    setSessions((current) =>
      current.map((session) =>
        session.id === id
          ? {
              ...session,
              result: createResult(id, session.draft ?? ""),
              recentUser: session.draft?.trim() || session.recentUser,
              draft: "",
            }
          : session,
      ),
    );
  }

  function reorderPinned(draggedId: string, targetId: string) {
    setSessions((current) => {
      const draggedIndex = current.findIndex((session) => session.id === draggedId && session.pinned);
      const targetIndex = current.findIndex((session) => session.id === targetId && session.pinned);
      if (draggedIndex < 0 || targetIndex < 0 || draggedIndex === targetIndex) return current;

      const next = [...current];
      const [dragged] = next.splice(draggedIndex, 1);
      const adjustedTargetIndex = next.findIndex((session) => session.id === targetId);
      const insertIndex = draggedIndex < targetIndex ? adjustedTargetIndex + 1 : adjustedTargetIndex;
      next.splice(insertIndex, 0, dragged);
      return next;
    });
  }

  function openSession(id: string) {
    setActiveSessionId(id);
    setActiveView("chat");
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
          sessions={sessions}
          interactive
          onUnpin={togglePin}
          onDraftChange={updateDraft}
          onSubmitPanel={submitPanel}
          onReorderPinned={reorderPinned}
        />
      ) : (
        <ChatView session={activeSession} interactive onTogglePin={togglePin} />
      )}
    </div>
  );
}
