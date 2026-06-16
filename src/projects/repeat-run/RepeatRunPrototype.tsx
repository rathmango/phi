import {
  Archive,
  CheckCircle2,
  ClipboardList,
  Eye,
  FileClock,
  MessageSquareText,
  PanelLeft,
  Pin,
  Play,
  RotateCcw,
  Send,
  Sparkles,
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";

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
const defaultRefinement = "조금 더 짧게 줄여줘.";

const instructionItems = [
  "자연스러운 비즈니스 영어",
  "Speak는 브랜드명으로 유지",
  "April은 사람 이름으로 처리",
  "Notion에 붙여넣을 Markdown 형식",
];

let nextRunId = 0;

function createRunId() {
  nextRunId += 1;
  return nextRunId;
}

function initialResult(input: string, runNumber: number) {
  if (input.includes("온보딩")) {
    return [
      "- April will review the proposed updates to the Speak onboarding flow before we share them with HQ.",
      "",
      "참조: 작업지시서만 사용됨. 이전 실행의 '조금 더 짧게' 수정 대화는 자동 반영되지 않습니다.",
    ].join("\n");
  }

  return [
    `- April will work with the KR marketing team on the Speak Friday promotion page design.`,
    "",
    `실행 ${runNumber}: 고정된 작업지시서를 참조해 생성된 초안입니다.`,
  ].join("\n");
}

function refinedResult(input: string) {
  if (input.includes("온보딩")) {
    return "- April will review the Speak onboarding updates before sharing them with HQ.";
  }

  return "- April will work with the KR marketing team on the Speak Friday promotion page.";
}

function RunThread({ turns }: { turns: Turn[] }) {
  return (
    <div className="run-thread" aria-live="polite">
      {turns.map((turn, index) => (
        <article className={`run-message ${turn.role}`} key={`${turn.role}-${index}`}>
          <div className="message-meta">{turn.role === "user" ? "사용자" : "AI 작업자"}</div>
          <p>{turn.text}</p>
        </article>
      ))}
    </div>
  );
}

function AppliedInstructionLabel() {
  return (
    <div className="run-reference-label" tabIndex={0}>
      <Sparkles size={15} />
      작업지시서 참조됨
      <div className="run-reference-tooltip" role="tooltip">
        {instructionItems.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>
    </div>
  );
}

export function RepeatRunPrototype() {
  const [routineMode, setRoutineMode] = useState(false);
  const [instructionText, setInstructionText] = useState(instructionTemplate);
  const [instructionPinned, setInstructionPinned] = useState(false);
  const [newInput, setNewInput] = useState(firstInput);
  const [refinementInput, setRefinementInput] = useState(defaultRefinement);
  const [activeRun, setActiveRun] = useState<RunRecord | null>(null);
  const [records, setRecords] = useState<RunRecord[]>([]);
  const [selectedRecordId, setSelectedRecordId] = useState<number | null>(null);

  const selectedRecord = useMemo(
    () => records.find((record) => record.id === selectedRecordId) ?? null,
    [records, selectedRecordId],
  );

  function pinInstruction() {
    setRoutineMode(true);
    setInstructionPinned(true);
  }

  function startRun(event?: FormEvent) {
    event?.preventDefault();
    const trimmed = newInput.trim();
    if (!trimmed || !instructionPinned || activeRun) return;

    const runId = createRunId();
    const result = initialResult(trimmed, records.length + 1);
    setActiveRun({
      id: runId,
      title: `실행 ${records.length + 1}`,
      input: trimmed,
      finalResult: result,
      turns: [
        { role: "user", text: trimmed },
        { role: "assistant", text: result },
      ],
    });
    setNewInput("");
    setSelectedRecordId(null);
  }

  function refineRun(event?: FormEvent) {
    event?.preventDefault();
    const trimmed = refinementInput.trim();
    if (!trimmed || !activeRun) return;

    const nextResult = refinedResult(activeRun.input);
    setActiveRun({
      ...activeRun,
      finalResult: nextResult,
      turns: [
        ...activeRun.turns,
        { role: "user", text: trimmed },
        { role: "assistant", text: nextResult },
      ],
    });
    setRefinementInput("");
  }

  function completeRun() {
    if (!activeRun) return;

    const completedRun = {
      ...activeRun,
      title: `완료된 실행 ${records.length + 1}`,
    };
    setRecords((current) => [completedRun, ...current]);
    setSelectedRecordId(completedRun.id);
    setActiveRun(null);
    setRefinementInput(defaultRefinement);
    setNewInput(records.length === 0 ? secondInput : "");
  }

  function resetPrototype() {
    setRoutineMode(false);
    setInstructionText(instructionTemplate);
    setInstructionPinned(false);
    setNewInput(firstInput);
    setRefinementInput(defaultRefinement);
    setActiveRun(null);
    setRecords([]);
    setSelectedRecordId(null);
  }

  return (
    <div className="routine-prototype">
      <aside className="routine-history" aria-label="채팅 히스토리">
        <div className="history-title">
          <PanelLeft size={18} />
          <h3>히스토리</h3>
        </div>
        <button type="button" className="history-item muted">
          <MessageSquareText size={16} />
          <span>
            일반 채팅
            <small>지난 번역 질문</small>
          </span>
        </button>
        <button type="button" className="history-item selected">
          <ClipboardList size={16} />
          <span>
            업무 번역 반복 작업
            <small>
              {routineMode ? "반복 작업 세션" : "일반 채팅"} · 완료 {records.length}개
            </small>
          </span>
        </button>
        <button type="button" className="history-item muted">
          <MessageSquareText size={16} />
          <span>
            회의록 요약
            <small>일반 채팅</small>
          </span>
        </button>
      </aside>

      <section className="routine-workspace">
        <header className="routine-toolbar">
          <div>
            <p className="eyebrow">Routine Mode</p>
            <h3>작업지시서 아래의 독립 실행</h3>
          </div>
          <div className="routine-actions">
            <button type="button" className={routineMode ? "active" : ""} onClick={() => setRoutineMode(true)}>
              <Play size={16} />
              반복 작업 모드
            </button>
            <button type="button" onClick={resetPrototype}>
              <RotateCcw size={16} />
              초기화
            </button>
          </div>
        </header>

        <section className={`instruction-panel ${instructionPinned ? "pinned" : ""}`}>
          <div className="instruction-header">
            <div>
              <p className="eyebrow">Instruction</p>
              <h3>작업지시서</h3>
            </div>
            {instructionPinned && (
              <span className="instruction-status">
                <Pin size={15} />
                고정됨
              </span>
            )}
          </div>

          {instructionPinned ? (
            <>
              <div className="instruction-chips">
                {instructionItems.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
              <button type="button" className="text-action" onClick={() => setInstructionPinned(false)}>
                작업지시서 수정
              </button>
            </>
          ) : (
            <div className="instruction-editor">
              <textarea
                aria-label="작업지시서 입력"
                value={instructionText}
                onChange={(event) => setInstructionText(event.target.value)}
              />
              <button type="button" disabled={!routineMode} onClick={pinInstruction}>
                <Pin size={16} />
                작업지시서 고정
              </button>
            </div>
          )}
        </section>

        <section className="active-run-panel">
          <div className="active-run-header">
            <div>
              <p className="eyebrow">Current Run</p>
              <h3>{activeRun ? "진행 중인 실행" : "새 입력"}</h3>
            </div>
            {activeRun && <AppliedInstructionLabel />}
          </div>

          {activeRun ? (
            <>
              <RunThread turns={activeRun.turns} />
              <form className="run-refine-form" onSubmit={refineRun}>
                <input
                  aria-label="실행 안 수정 요청"
                  placeholder="이번 실행 안에서만 수정 요청"
                  value={refinementInput}
                  onChange={(event) => setRefinementInput(event.target.value)}
                />
                <button type="submit">
                  <Send size={16} />
                  수정 요청
                </button>
                <button type="button" className="complete-run-button" onClick={completeRun}>
                  <CheckCircle2 size={16} />
                  완료
                </button>
              </form>
            </>
          ) : (
            <form className="new-run-form" onSubmit={startRun}>
              <textarea
                aria-label="새 실행 입력"
                value={newInput}
                onChange={(event) => setNewInput(event.target.value)}
                placeholder="작업지시서 아래에서 처리할 새 입력값"
              />
              <button type="submit" disabled={!instructionPinned || !newInput.trim()}>
                <Play size={16} />
                실행 시작
              </button>
              {!instructionPinned && <p>반복 작업 모드를 켜고 작업지시서를 고정하면 실행을 시작할 수 있습니다.</p>}
            </form>
          )}
        </section>
      </section>

      <aside className="routine-records">
        <section>
          <div className="side-title">
            <Archive size={18} />
            <h3>실행 기록</h3>
          </div>
          {records.length === 0 ? (
            <p className="empty-record">완료된 실행은 최종 결과 미리보기만 남고, 긴 수정 대화는 기록을 열 때만 보입니다.</p>
          ) : (
            <ul className="run-record-list">
              {records.map((record) => (
                <li key={record.id} className={record.id === selectedRecordId ? "selected" : ""}>
                  <button type="button" onClick={() => setSelectedRecordId(record.id)}>
                    <FileClock size={16} />
                    <span>
                      <strong>{record.title}</strong>
                      <small>{record.finalResult.split("\n")[0]}</small>
                    </span>
                    <Eye size={15} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <div className="side-title">
            <ClipboardList size={18} />
            <h3>기록 상세</h3>
          </div>
          {selectedRecord ? (
            <div className="record-detail">
              <strong>{selectedRecord.input}</strong>
              <RunThread turns={selectedRecord.turns} />
            </div>
          ) : (
            <p className="empty-record">실행 기록을 열면 원문, 수정 대화, 최종 결과를 다시 확인할 수 있습니다.</p>
          )}
        </section>
      </aside>
    </div>
  );
}
