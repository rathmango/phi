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

export const projects = [
  {
    id: "queue-hourglass",
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
] as const;
