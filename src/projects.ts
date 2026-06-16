export const queueFlowChart = `
flowchart LR
  waiting(["상태: 대기"])
  flip["트리거: 뒤집기"]
  condition{"이동 완료?"}
  trueNode["true"]
  falseNode["false"]
  active(["상태: 작동중"])
  pause["트리거: 일시정지"]
  paused(["상태: 일시정지"])
  resume["트리거: 재개"]

  conditionDetail["판정 기준: 모든 queue가 하단 영역에 위치해있고, 하단 영역에 위치한 queue들도 각자 위치할 수 있는 가장 하단에 위치하여 움직이고 있지 않음"]
  activeDetail["정의: 각 queue가 더 아래로 이동할 수 있는 동안 계속 아래로 이동하는 상태. 상단 영역에서 하단 영역으로 넘어가는 queue는 가운데 통로를 통과하며, 이때 통과 속도는 가운데 통로에서 제어됨"]
  pausedDetail["정의: queue의 아래 방향 이동이 중단되어 각 queue가 현재 상대적 물리 위치를 유지하는 상태. 재개 트리거 전까지 상단/하단의 queue 배치가 변하지 않음"]

  subgraph mainFlow[" "]
    direction TB
    waiting --> flip
    flip --> condition
    condition --> trueNode
    trueNode --> waiting
    condition --> falseNode
    falseNode --> active
    active -->|시간 경과| condition
  end

  subgraph pauseFlow[" "]
    direction TB
    pause --> paused
    paused --> resume
  end

  active --> pause
  resume --> active

  conditionDetail -.-> condition
  activeDetail -.-> active
  pausedDetail -.-> paused

  classDef state fill:#dbeafe,stroke:#1d4ed8,stroke-width:5px,color:#0f172a,font-weight:bold,font-size:18px;
  classDef trigger fill:#ede9fe,stroke:#4f46e5,stroke-width:4px,color:#111827,font-weight:bold,font-size:17px;
  classDef decision fill:#fff8e6,stroke:#b7791f,stroke-width:3px,color:#111827;
  classDef note fill:#f8fafc,stroke:#94a3b8,stroke-width:2px,color:#111827;

  class waiting,active,paused state;
  class flip,pause,resume trigger;
  class condition decision;
  class trueNode,falseNode,conditionDetail,activeDetail,pausedDetail note;
  style mainFlow fill:transparent,stroke:transparent;
  style pauseFlow fill:transparent,stroke:transparent;
`;

export const queueDecompositionChart = `
flowchart TB
  root["고수준: 미리 정해놓은 시간을 한 번의 동작으로 정확히 측정할 수 있도록 설정하고, 이후 그 과정과 결과를 시각적으로 확인할 수 있게 한다."]

  root --> start["중수준 1: 뒤집어서 시간 측정을 시작하는 기능"]
  root --> observe["중수준 2: 모래가 떨어지는 모습과 위와 아래에 남은 모래의 양을 통해 시간의 흐름을 시각적으로 관찰하는 기능"]
  root --> resultCheck["중수준 3: 모래 전체가 상단에서 하단으로 이동한 상태를 통해 특정 시간이 다 지났음을 확인하는 기능"]

  start --> invert["저수준 1-A: 모래시계의 상단/하단 위치 반전"]
  start --> ready["저수준 1-B: 상단 모래의 낙하 가능 상태"]
  invert --> swapAmount["상단의 모래 양 &lt;-&gt; 하단의 모래 양"]
  ready --> readyState["TRUE / FALSE"]

  observe --> gravityPush["저수준 2-A: 중력의 힘이 위에 있는 모래를 아래로 밀어냄"]
  observe --> neckLimit["저수준 2-B: 상단과 하단을 연결하는 구멍이 한 번에 이동하는 모래의 양을 제한함"]
  observe --> amountShift["저수준 2-C: 상단의 모래 양은 줄어들고 하단의 모래 양은 늘어남"]

  gravityPush --> gravity["중력의 힘 (상수)"]
  gravityPush --> hasTopSand["상단에 모래가 남았는지 여부 (TRUE/FALSE)"]
  neckLimit --> neck["상단과 하단을 연결하는 구멍의 굵기 (상수)"]
  amountShift --> topSand["상단에 남은 모래의 양 (변수)"]
  amountShift --> bottomSand["하단에 쌓인 모래의 양 (변수)"]

  resultCheck --> totalAmountRule["저수준 3-A: 고정된 전체 모래의 양이 총 측정 시간을 정의함"]
  resultCheck --> completionState["저수준 3-B: 위에 있던 모래가 아래로 다 움직인 상태"]
  totalAmountRule --> totalSand["고정된 전체 모래의 양 (상수)"]
  completionState --> topEmpty["상단에 남은 모래의 양 = 0"]
  completionState --> bottomFull["하단에 쌓인 모래의 양 = 전체 모래의 양"]

  classDef high fill:#ffffff,stroke:#657a9f,stroke-width:3px,color:#111827;
  classDef midBlue fill:#e8f6ff,stroke:#2e7ca8,stroke-width:3px,color:#111827;
  classDef midOrange fill:#fff3e2,stroke:#c88422,stroke-width:3px,color:#111827;
  classDef lowBlue fill:#edf8ff,stroke:#2e7ca8,stroke-width:2px,color:#111827;
  classDef lowGreen fill:#edfdf6,stroke:#329877,stroke-width:2px,color:#111827;
  classDef lowAmber fill:#fff8e9,stroke:#c88422,stroke-width:2px,color:#111827;
  classDef group fill:#f4f7ff,stroke:#657a9f,stroke-width:2px,color:#111827;

  class root high;
  class start midBlue;
  class observe,resultCheck midOrange;
  class invert,ready lowBlue;
  class gravityPush,neckLimit,amountShift,totalAmountRule,completionState group;
  class swapAmount,readyState,hasTopSand,topSand,bottomSand,topEmpty,bottomFull lowGreen;
  class gravity,neck,totalSand lowAmber;
`;

export type ProjectSectionId = "brief" | "abstraction" | "flowchart" | "onepager" | "prototype";

type QueueProject = {
  id: string;
  kind: "queue";
  title: string;
  status: string;
  summary: string;
  brief: string;
  decomposition: string;
  abstraction: {
    oneLine: string;
    items: Array<{ key: string; text: string }>;
  };
  flowchart: string;
};

type GlossaryProject = {
  id: string;
  kind: "glossary" | "routine";
  title: string;
  status: string;
  summary: string;
  onePager: {
    user: string;
    goal: string;
    friction: string;
    solution: Array<{ title: string; text: string }>;
    scenario: Array<string>;
  };
};

export type Project = QueueProject | GlossaryProject;

export const projects: Project[] = [
  {
    id: "queue-hourglass",
    kind: "queue",
    title: "Queue Hourglass",
    status: "진행중",
    summary: "상단/하단 영역과 통로를 가진 queue 이동 기반 시간 측정 모델",
    brief:
      "상단에 대기 중인 queue가 하단으로 순차적으로 이동하도록 설계되어 있으며, 이동되는 모습과 이동 완료된 모습을 확인하며 시간의 흐름을 확인하고 측정하는 시스템을 프로토타입으로 검증합니다.",
    decomposition: queueDecompositionChart,
    abstraction: {
      oneLine:
        "상단에 대기중인 queue가 하단으로 순차적으로 이동하도록 설계되어있으며, 이동되는 모습과 이동 완료된 모습을 확인하며 시간의 흐름을 확인하고 측정하는 시스템.",
      items: [
        { key: "A", text: "전체는 상단과 하단 영역으로 구분되어있음." },
        { key: "B", text: "상단과 하단 영역은 가운데 통로로 연결되어있음." },
        { key: "C", text: "영역 전체에 한정된 수량의 queue가 있음." },
        { key: "D", text: "각 queue는 같은 영역 안에서 상대적인 물리적 위치를 가짐." },
        { key: "E", text: "각 queue는 같은 물리적인 부피를 가졌지만 모두 개별적임." },
        {
          key: "F",
          text: "각 queue는 항상 일정한 에너지를 통해 아래로 이동하게 되어있음. 더 이상 아래로 내려갈 수 없다면 멈추게 됨.",
        },
        {
          key: "G",
          text: "중력에 의해 상단에 있는 queue가 하단으로 이동할 때, 상단에서 하단으로 통과되는 속도는 가운데 통로에서 제어됨. 이는 F에서 정의된 아래로 이동하는 에너지와 별개임.",
        },
        {
          key: "H",
          text: "'뒤집기' 트리거를 통해 상단과 하단을 뒤집을 수 있음. 뒤집히게 되면 상단에 있던 queue가 하단으로, 하단에 있던 queue가 상단에 위치하게 됨. 실제로 queue가 통로를 통해 이동하는 개념이 아니라, 상단과 하단의 위치가 물리적으로 뒤바뀌는 개념임.",
        },
      ],
    },
    flowchart: queueFlowChart,
  },
  {
    id: "hid-glossary-chat",
    kind: "glossary",
    title: "Glossary Chat",
    status: "HID 1주차",
    summary: "채팅 안에 흩어지는 번역 정정을 지속 가능한 Glossary 규칙으로 저장하는 LLM 번역 UX",
    onePager: {
      user:
        "외국계 회사에서 해외 본사와 매일 이메일, 슬랙, 문서를 주고받는 실무자. 업무시간 내내 LLM 채팅 앱으로 업무 문장을 번역하며, 같은 브랜드명, 제품명, 팀명, 직책, 사람 이름이 매번 다르게 번역되는 것에 부담을 느낀다.",
      goal:
        "한국어로 정리한 업무 내용을 바탕으로 해외 본사에 공유할 영문 보고 문서나 메시지를 Notion, Gmail, Slack에 바로 붙여 넣을 수 있는 수준으로 작성한다. 브랜드명, 제품명, 팀명, 사람 이름, 직책, 자주 쓰는 표현 방식이 이전 문서와 일관되게 반영되어야 한다.",
      friction:
        "사용자가 번역 결과를 고치면서 만든 용어 규칙과 표현 기준이 채팅창 안에만 일회성으로 남는다. 사용자는 Speak는 브랜드명으로 유지, April은 월이 아니라 사람 이름처럼 정정하지만, 새 채팅에서는 같은 기준을 다시 설명해야 한다.",
      solution: [
        {
          title: "번역 요청",
          text: "사용자가 번역을 요청하면 시스템은 번역 모드로 전환하고, 입력 문서에 적용 가능한 Glossary가 있는지 먼저 확인한다.",
        },
        {
          title: "적용 표시",
          text: "번역 결과 상단에는 적용된 Glossary 라벨이 표시된다. 라벨에 호버하면 이번 번역에 사용된 규칙이 펼쳐지고, 본문에서는 적용된 부분이 같은 색상으로 하이라이트된다.",
        },
        {
          title: "자연어 정정",
          text: "사용자가 자연어로 정정하면 시스템은 이를 1회성 수정 요청이 아니라 반복 적용 가능한 Glossary 후보로 인식한다.",
        },
        {
          title: "저장 후 다음 번역에 반영",
          text: "사용자가 저장을 확인하면 규칙이 Glossary에 추가된다. 이미 생성된 번역 결과는 그대로 남고, 이후 새 채팅이나 다음 번역 요청에서 같은 규칙이 자동 적용된다.",
        },
      ],
      scenario: [
        "\"April will work on the Speak Friday promotion page design with the KR marketing team.\" 를 한국어로 번역해 달라고 입력한다.",
        "번역 결과에서 April이 4월로 해석되고, Speak와 KR marketing team이 원하는 기준으로 처리되지 않은 것을 확인한다.",
        "April은 4월이 아니라 사람 이름이고, Speak는 스픽으로, KR marketing team은 한국 마케팅팀으로 번역해야 한다고 자연어로 정정한다.",
        "Glossary에 등록하겠냐는 팝업에서 추출된 규칙을 확인한다.",
        "확인 버튼을 눌러 Glossary 등록 완료 상태를 확인한다.",
        "새 채팅 세션을 연다.",
        "같은 문장을 다시 한국어로 번역해 달라고 입력한다.",
        "Glossary 적용됨 라벨에 마우스를 올려 등록한 Glossary가 잘 적용됐는지 확인한다.",
        "번역 결과와 Glossary에 따라 번역된 부분의 색상 하이라이트를 확인한다.",
      ],
    },
  },
  {
    id: "hid-routine-run-chat",
    kind: "routine",
    title: "Routine Run Chat",
    status: "HID v1.0",
    summary: "반복 작업을 긴 대화 히스토리가 아니라 작업지시서 아래의 독립 실행으로 다루는 LLM 채팅 UX",
    onePager: {
      user:
        "LLM 채팅 앱으로 같은 형식의 업무를 반복 처리하는 사용자. 업무 문장 번역, 이메일 문체 변환, 회의록 요약처럼 작업 조건은 유지되고 입력값만 계속 바뀌는 일을 자주 한다.",
      goal:
        "한 번 정한 작업지시를 유지한 상태에서 매번 새로운 입력만 넣어 독립적인 결과를 빠르게 얻는다. 결과가 마음에 들지 않을 때는 그 자리에서 추가 대화로 다듬되, 완료된 작업의 입력과 수정 대화가 다음 작업의 맥락으로 계속 누적되지는 않아야 한다.",
      friction:
        "반복 작업의 실행 단위와 채팅 인터페이스의 기록 단위가 맞지 않는다. 같은 채팅을 계속 쓰면 완료된 작업의 기록까지 화면과 맥락에 누적되고, 새 채팅을 계속 만들면 작업지시를 반복 입력해야 하며 히스토리 목록에 비슷한 채팅이 계속 늘어난다.",
      solution: [
        {
          title: "반복 작업 모드",
          text: "사용자가 반복 작업 모드를 켜면 채팅은 하나의 긴 대화가 아니라 작업지시서 아래에서 실행되는 여러 개의 독립 작업으로 바뀐다.",
        },
        {
          title: "작업지시서 고정",
          text: "사용자는 작업지시서를 입력하거나 기존 작업지시서를 선택한다. 이후 새 입력값은 고정된 작업지시서만 참조해 실행된다.",
        },
        {
          title: "실행 안의 수정 대화",
          text: "각 입력은 하나의 실행으로 시작되고, 실행 안에서는 일반 채팅처럼 추가 대화로 결과를 다듬을 수 있다.",
        },
        {
          title: "완료 후 기록 보관",
          text: "사용자가 완료를 누르면 실행은 현재 작업 흐름에서 빠지고 실행 기록으로 보관된다. 다음 입력은 새 실행으로 시작되며 이전 실행의 수정 대화를 자동으로 이어받지 않는다.",
        },
      ],
      scenario: [
        "사용자가 새 채팅에서 반복 작업 모드를 켠다.",
        "작업지시서에 번역 조건을 입력하고 고정한다.",
        "첫 번째 번역할 문장을 입력한다.",
        "시스템이 작업지시서를 참조해 첫 번째 결과를 생성한다.",
        "사용자가 결과를 보고 조금 더 짧게 줄여달라고 수정 요청한다.",
        "시스템이 같은 실행 안에서 결과를 수정한다.",
        "사용자가 만족하면 완료를 누른다.",
        "첫 번째 실행이 현재 작업 흐름에서 빠지고 실행 기록에 최종 결과 미리보기로 보관되는 것을 확인한다.",
        "두 번째 번역할 문장을 입력한다.",
        "두 번째 입력이 새로운 실행으로 시작되고, 첫 번째 실행의 수정 대화는 자동으로 이어받지 않는 것을 확인한다.",
        "실행 기록을 열어 첫 번째 작업의 원문, 수정 대화, 최종 결과를 다시 확인한다.",
        "왼쪽 히스토리에서 이 세션이 일반 채팅이 아니라 반복 작업 세션으로 표시되는 것을 확인한다.",
      ],
    },
  },
];
