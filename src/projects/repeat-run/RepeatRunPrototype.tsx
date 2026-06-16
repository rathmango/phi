import {
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  History,
  MessageSquareText,
  PanelLeft,
  Send,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { FormEvent, useState } from "react";

type Turn = {
  role: "user" | "assistant";
  text: string;
};

type RunRecord = {
  id: number;
  title: string;
  input: string;
  turns: Turn[];
  finalResult: string;
};

const instructionTemplate =
  "내가 보내는 한국어 문장은 자연스러운 비즈니스 영어로 번역해줘. Speak는 브랜드명으로 유지하고, April은 사람 이름으로 처리해줘. 결과는 Notion 에 바로 붙여넣을 수 있게 Markdown 형식으로 만들어줘.";

const firstInput = "April이 Speak Friday 프로모션 페이지 디자인을 한국 마케팅팀과 진행할 예정입니다.";
const secondInput = "Speak 온보딩 플로우 수정안은 April에게 먼저 공유한 뒤 본사에 전달할 예정입니다.";
const refinementInput = "조금 더 짧게 줄여줘.";

let nextRunId = 0;

function createRunId() {
  nextRunId += 1;
  return nextRunId;
}

function createInitialResult(input: string, runNumber: number, repeatMode: boolean) {
  if (!repeatMode) {
    return "좋습니다. 요청하신 문장을 자연스럽게 다듬어 보겠습니다.";
  }

  if (input.includes("온보딩")) {
    return [
      "- April will review the proposed updates to the Speak onboarding flow before we share them with HQ.",
      "",
      "이 답변은 고정된 지시문만 참조했습니다.",
    ].join("\n");
  }

  return [
    "- April will work with the KR marketing team on the Speak Friday promotion page design.",
    "",
    `실행 ${runNumber}: 고정된 지시문을 참조해 생성된 초안입니다.`,
  ].join("\n");
}

function createRefinedResult(input: string) {
  if (input.includes("온보딩")) {
    return "- April will review the Speak onboarding updates before sharing them with HQ.";
  }

  return "- April will work with the KR marketing team on the Speak Friday promotion page.";
}

function shortPreview(text: string) {
  return text.split("\n")[0].replace(/^- /, "");
}

export function RepeatRunPrototype() {
  const [repeatMode, setRepeatMode] = useState(false);
  const [instructionText, setInstructionText] = useState(instructionTemplate);
  const [input, setInput] = useState(firstInput);
  const [activeTurns, setActiveTurns] = useState<Turn[]>([]);
  const [activeInput, setActiveInput] = useState("");
  const [activeResult, setActiveResult] = useState("");
  const [records, setRecords] = useState<RunRecord[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<RunRecord | null>(null);

  const hasActiveRun = repeatMode && activeTurns.length > 0;

  function submitMessage(event?: FormEvent) {
    event?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;

    if (repeatMode) {
      if (hasActiveRun) {
        const nextResult = createRefinedResult(activeInput);
        setActiveTurns((current) => [
          ...current,
          { role: "user", text: trimmed },
          { role: "assistant", text: nextResult },
        ]);
        setActiveResult(nextResult);
        setInput("");
        return;
      }

      const result = createInitialResult(trimmed, records.length + 1, true);
      setActiveInput(trimmed);
      setActiveResult(result);
      setActiveTurns([
        { role: "user", text: trimmed },
        { role: "assistant", text: result },
      ]);
      setInput(refinementInput);
      return;
    }

    const result = createInitialResult(trimmed, records.length + 1, false);
    setActiveTurns((current) => [
      ...current,
      { role: "user", text: trimmed },
      { role: "assistant", text: result },
    ]);
    setInput("");
  }

  function completeRun() {
    if (!hasActiveRun) return;

    const record: RunRecord = {
      id: createRunId(),
      title: `완료된 작업 ${records.length + 1}`,
      input: activeInput,
      turns: activeTurns,
      finalResult: activeResult,
    };
    setRecords((current) => [record, ...current]);
    setSelectedRecord(record);
    setActiveTurns([]);
    setActiveInput("");
    setActiveResult("");
    setInput(records.length === 0 ? secondInput : "");
  }

  function toggleRepeatMode() {
    setRepeatMode((current) => !current);
    setActiveTurns([]);
    setActiveInput("");
    setActiveResult("");
    setInput(firstInput);
    setSelectedRecord(null);
    setHistoryOpen(false);
  }

  return (
    <div className="routine-chat-shell">
      <aside className="routine-chat-history" aria-label="채팅 히스토리">
        <div className="history-title">
          <PanelLeft size={18} />
          <h3>히스토리</h3>
        </div>

        {repeatMode && (
          <button type="button" className="history-chat-item selected pinned">
            <ClipboardList size={16} />
            <span>업무 번역</span>
            <small>반복 대화</small>
          </button>
        )}

        <button type="button" className="history-chat-item">
          <MessageSquareText size={16} />
          <span>지난 번역 질문</span>
        </button>

        {!repeatMode && (
          <button type="button" className="history-chat-item selected">
            <ClipboardList size={16} />
            <span>업무 번역</span>
          </button>
        )}

        <button type="button" className="history-chat-item">
          <MessageSquareText size={16} />
          <span>회의록 요약</span>
        </button>
      </aside>

      <section className="routine-chat-window">
        <header className="routine-chat-topbar">
          <div>
            <strong>업무 번역</strong>
            {repeatMode && <span>반복 대화</span>}
          </div>
          <div className="routine-topbar-actions">
            <label className="repeat-toggle">
              <input type="checkbox" checked={repeatMode} onChange={toggleRepeatMode} />
              <span>반복 대화</span>
            </label>
            {repeatMode && (
              <button type="button" className="icon-action topbar-history-button" aria-label="반복 대화 기록" onClick={() => setHistoryOpen(true)}>
                <History size={18} />
                {records.length > 0 && <span>{records.length}</span>}
              </button>
            )}
          </div>
        </header>

        {repeatMode && (
          <section className="routine-instruction-strip" aria-label="반복 대화 지시문">
            <div className="instruction-strip-title">
              <SlidersHorizontal size={16} />
              <span>지시문</span>
              <ChevronDown size={15} />
            </div>
            <textarea
              aria-label="반복 대화 지시문"
              value={instructionText}
              onChange={(event) => setInstructionText(event.target.value)}
            />
          </section>
        )}

        <div className={`routine-chat-thread ${activeTurns.length === 0 ? "empty" : ""}`} aria-live="polite">
          {activeTurns.length === 0 ? (
            <div className="chat-empty-state">
              <Sparkles size={30} />
              <p>{repeatMode ? "지시문 아래에서 새 입력을 보냅니다." : "메시지를 입력해 대화를 시작합니다."}</p>
            </div>
          ) : (
            activeTurns.map((turn, index) => (
              <article className={`routine-chat-message ${turn.role}`} key={`${turn.role}-${index}`}>
                <div className="message-meta">{turn.role === "user" ? "사용자" : "ChatGPT"}</div>
                <p>{turn.text}</p>
              </article>
            ))
          )}
        </div>

        <div className="routine-composer-area">
          <form className="routine-chat-composer" onSubmit={submitMessage}>
            <textarea
              aria-label="채팅 입력"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="메시지 입력"
              rows={3}
            />
            <div className="composer-action-rail">
              {repeatMode && (
                <button type="button" className="complete-chip" disabled={!hasActiveRun} onClick={completeRun}>
                  <CheckCircle2 size={16} />
                  완료
                </button>
              )}
              <button type="submit" className="send-button" aria-label="보내기" disabled={!input.trim()}>
                <Send size={18} />
              </button>
            </div>
          </form>
        </div>

        {historyOpen && (
          <div className="routine-history-popover" role="dialog" aria-label="반복 대화 기록">
            <div className="popover-header">
              <strong>반복 대화 기록</strong>
              <button type="button" aria-label="닫기" onClick={() => setHistoryOpen(false)}>
                <X size={16} />
              </button>
            </div>

            {records.length === 0 ? (
              <p className="record-empty">완료한 작업이 여기에 쌓입니다.</p>
            ) : (
              <div className="record-popover-layout">
                <ul className="compact-record-list">
                  {records.map((record) => (
                    <li key={record.id}>
                      <button
                        type="button"
                        className={selectedRecord?.id === record.id ? "selected" : ""}
                        onClick={() => setSelectedRecord(record)}
                      >
                        <strong>{record.title}</strong>
                        <span>{shortPreview(record.finalResult)}</span>
                      </button>
                    </li>
                  ))}
                </ul>

                <div className="compact-record-detail">
                  {selectedRecord ? (
                    <>
                      <strong>{selectedRecord.input}</strong>
                      <div>
                        {selectedRecord.turns.map((turn, index) => (
                          <p key={`${turn.role}-${index}`}>
                            <b>{turn.role === "user" ? "사용자" : "ChatGPT"}</b>
                            {turn.text}
                          </p>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="record-empty">기록을 선택하면 대화 전체를 볼 수 있습니다.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
