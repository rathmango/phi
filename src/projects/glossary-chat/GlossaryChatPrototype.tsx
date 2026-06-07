import { BookOpen, Check, MessageSquarePlus, RotateCcw, Send, Sparkles } from "lucide-react";
import { FormEvent, ReactNode, useMemo, useState } from "react";

type RuleId = "april" | "speak" | "krMarketing";

type GlossaryRule = {
  id: RuleId;
  source: string;
  target: string;
  note: string;
  tone: "person" | "brand" | "team";
};

type ChatMessage = {
  id: number;
  role: "user" | "assistant";
  text?: string;
  appliedRules?: RuleId[];
};

const testPrompt =
  '"April will work on the Speak Friday promotion page design with the KR marketing team." 를 한국어로 번역해줘';

const correctionPrompt =
  "April은 4월이 아니라 사람 이름이야. Speak는 브랜드명이니까 스픽으로 번역하고, KR marketing team은 한국 마케팅팀으로 번역해야 해.";

const allRules: GlossaryRule[] = [
  {
    id: "april",
    source: "April",
    target: "April",
    note: "월 이름이 아니라 사람 이름으로 유지",
    tone: "person",
  },
  {
    id: "speak",
    source: "Speak",
    target: "스픽",
    note: "일반 동사가 아니라 브랜드명",
    tone: "brand",
  },
  {
    id: "krMarketing",
    source: "KR marketing team",
    target: "한국 마케팅팀",
    note: "사내 팀명 표기",
    tone: "team",
  },
];

const baseTranslation = "4월에는 KR 마케팅팀과 함께 Speak Friday 프로모션 페이지 디자인 작업을 진행할 예정입니다.";

let nextMessageId = 1;

function createId() {
  nextMessageId += 1;
  return nextMessageId;
}

function findRule(id: RuleId) {
  return allRules.find((rule) => rule.id === id)!;
}

function detectCorrectionRules(input: string) {
  return allRules.filter((rule) => {
    if (rule.id === "krMarketing") {
      return /KR|marketing|마케팅팀|한국 마케팅팀/i.test(input);
    }

    return input.toLowerCase().includes(rule.source.toLowerCase()) || input.includes(rule.target);
  });
}

function isCorrectionInput(input: string) {
  return /아니라|브랜드|사람 이름|번역해야|으로 번역|유지|정정/.test(input);
}

function isTranslationRequest(input: string) {
  return input.includes("April will work") && /번역|translate|한국어/i.test(input);
}

function AppliedTranslation({ appliedRules }: { appliedRules: RuleId[] }) {
  if (appliedRules.length === 0) {
    return <>{baseTranslation}</>;
  }

  const applied = new Set(appliedRules);
  const april: ReactNode = applied.has("april") ? (
    <>
      <mark className="glossary-hit person">April</mark>은
    </>
  ) : (
    "4월에는"
  );
  const team: ReactNode = applied.has("krMarketing") ? (
    <mark className="glossary-hit team">한국 마케팅팀</mark>
  ) : (
    "KR 마케팅팀"
  );
  const speak: ReactNode = applied.has("speak") ? (
    <mark className="glossary-hit brand">스픽</mark>
  ) : (
    "Speak"
  );

  return (
    <>
      {april} {team}과 함께 {speak} Friday 프로모션 페이지 디자인 작업을 진행할 예정입니다.
    </>
  );
}

function GlossaryLabel({ appliedRules }: { appliedRules: RuleId[] }) {
  const label = appliedRules.length > 0 ? `Glossary ${appliedRules.length}개 적용됨` : "Glossary 적용 없음";

  return (
    <div className={`glossary-label ${appliedRules.length > 0 ? "active" : ""}`} tabIndex={0}>
      <Sparkles size={15} />
      {label}
      <div className="glossary-tooltip" role="tooltip">
        {appliedRules.length === 0 ? (
          <p>이번 번역에 적용된 Glossary가 없습니다.</p>
        ) : (
          appliedRules.map((ruleId) => {
            const rule = findRule(ruleId);
            return (
              <div className="tooltip-rule" key={rule.id}>
                <strong>
                  {rule.source} {"->"} {rule.target}
                </strong>
                <span>{rule.note}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isAssistant = message.role === "assistant";

  return (
    <article className={`chat-message ${message.role}`}>
      <div className="message-meta">{isAssistant ? "LLM 번역" : "사용자"}</div>
      {isAssistant && <GlossaryLabel appliedRules={message.appliedRules ?? []} />}
      <p>
        {isAssistant && !message.text ? (
          <AppliedTranslation appliedRules={message.appliedRules ?? []} />
        ) : (
          message.text
        )}
      </p>
    </article>
  );
}

function CandidatePopup({
  rules,
  onCancel,
  onConfirm,
}: {
  rules: GlossaryRule[];
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="candidate-popup">
      <div>
        <p className="popup-title">이 정정을 앞으로도 적용할까요?</p>
        <p>채팅의 정정을 Glossary 규칙으로 저장합니다.</p>
      </div>
      <div className="candidate-rules">
        {rules.map((rule) => (
          <div className={`candidate-rule ${rule.tone}`} key={rule.id}>
            <strong>
              {rule.source} {"->"} {rule.target}
            </strong>
            <span>{rule.note}</span>
          </div>
        ))}
      </div>
      <div className="popup-actions">
        <button type="button" onClick={onCancel}>
          취소
        </button>
        <button type="button" className="save-rule-button" onClick={onConfirm}>
          <Check size={16} />
          Glossary에 저장
        </button>
      </div>
    </div>
  );
}

function renderSavedRules(savedRules: RuleId[]) {
  if (savedRules.length === 0) {
    return <p className="empty-glossary">아직 저장된 번역 기준이 없습니다.</p>;
  }

  return savedRules.map((ruleId) => {
    const rule = findRule(ruleId);
    return (
      <li className={rule.tone} key={rule.id}>
        <span>{rule.source}</span>
        <strong>{rule.target}</strong>
        <p>{rule.note}</p>
      </li>
    );
  });
}

export function GlossaryChatPrototype() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [savedRules, setSavedRules] = useState<RuleId[]>([]);
  const [candidateRules, setCandidateRules] = useState<GlossaryRule[]>([]);
  const [input, setInput] = useState(testPrompt);
  const [sessionCount, setSessionCount] = useState(1);
  const [savedFlash, setSavedFlash] = useState(false);

  const savedRuleSet = useMemo(() => new Set(savedRules), [savedRules]);

  function appliedRuleIds() {
    return allRules.filter((rule) => savedRuleSet.has(rule.id)).map((rule) => rule.id);
  }

  function pushMessage(message: Omit<ChatMessage, "id">) {
    setMessages((current) => [...current, { ...message, id: createId() }]);
  }

  function submitInput(event?: FormEvent) {
    event?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;

    pushMessage({ role: "user", text: trimmed });

    const detectedRules = detectCorrectionRules(trimmed);
    if (isCorrectionInput(trimmed) && detectedRules.length > 0) {
      setCandidateRules(detectedRules);
      setInput("");
      return;
    }

    if (isTranslationRequest(trimmed)) {
      pushMessage({ role: "assistant", appliedRules: appliedRuleIds() });
      setInput(correctionPrompt);
      return;
    }

    pushMessage({
      role: "assistant",
      text: "정정할 용어를 찾지 못했습니다. April, Speak, KR marketing team 중 하나를 포함해 다시 입력해 주세요.",
      appliedRules: [],
    });
    setInput("");
  }

  function saveCandidateRules() {
    const candidateIds = candidateRules.map((rule) => rule.id);
    setSavedRules((current) => Array.from(new Set([...current, ...candidateIds])));
    setCandidateRules([]);
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 900);
  }

  function startNewChat() {
    setMessages([]);
    setCandidateRules([]);
    setSessionCount((count) => count + 1);
    setInput(testPrompt);
  }

  function resetPrototype() {
    setMessages([]);
    setSavedRules([]);
    setCandidateRules([]);
    setSessionCount(1);
    setInput(testPrompt);
  }

  return (
    <div className="glossary-prototype">
      <section className="glossary-chat-panel">
        <header className="glossary-chat-header">
          <div>
            <p className="eyebrow">Session {sessionCount}</p>
            <h3>번역 채팅</h3>
          </div>
          <div className="chat-header-actions">
            <button type="button" onClick={startNewChat}>
              <MessageSquarePlus size={16} />
              새 채팅
            </button>
            <button type="button" onClick={resetPrototype}>
              <RotateCcw size={16} />
              초기화
            </button>
          </div>
        </header>

        <div className="chat-thread" aria-live="polite">
          {messages.length === 0 ? (
            <div className="empty-chat">
              <MessageSquarePlus size={28} />
              <p>테스트 문장을 보내면 Glossary가 없는 첫 번역 결과가 표시됩니다.</p>
            </div>
          ) : (
            messages.map((message) => <MessageBubble key={message.id} message={message} />)
          )}
        </div>

        {candidateRules.length > 0 && (
          <CandidatePopup
            rules={candidateRules}
            onCancel={() => setCandidateRules([])}
            onConfirm={saveCandidateRules}
          />
        )}

        <form className="chat-composer" onSubmit={submitInput}>
          <textarea
            aria-label="채팅 입력"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            rows={3}
          />
          <button type="submit">
            <Send size={17} />
            보내기
          </button>
        </form>
      </section>

      <aside className="glossary-side-panel">
        <section className={savedFlash ? "saved-flash" : ""}>
          <div className="side-title">
            <BookOpen size={18} />
            <h3>저장된 Glossary</h3>
          </div>
          <ul className="saved-rule-list">{renderSavedRules(savedRules)}</ul>
        </section>

        <section>
          <h3>테스트 시나리오</h3>
          <ol className="scenario-steps">
            <li>테스트 문장을 한국어로 번역해 달라고 입력한다.</li>
            <li>April이 4월로 해석되고, Speak와 KR marketing team이 원하는 기준과 다르게 처리된 것을 확인한다.</li>
            <li>April은 사람 이름이고, Speak는 스픽으로, KR marketing team은 한국 마케팅팀으로 번역해야 한다고 정정한다.</li>
            <li>Glossary 등록 팝업에서 추출된 규칙을 확인한다.</li>
            <li>Glossary에 저장 버튼을 눌러 등록 완료 상태를 확인한다.</li>
            <li>새 채팅을 연다.</li>
            <li>같은 문장을 다시 한국어로 번역해 달라고 입력한다.</li>
            <li>Glossary 적용됨 라벨에 마우스를 올려 등록한 Glossary가 적용됐는지 확인한다.</li>
            <li>번역 결과와 색상 하이라이트를 확인한다.</li>
          </ol>
        </section>
      </aside>
    </div>
  );
}
