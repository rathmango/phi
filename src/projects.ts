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

export const hourglassDecompositionChart = `
flowchart TB
  root["고수준<br/>뒤집힌 순간 위쪽에 놓인 정해진 양의 모래가<br/>좁은 통로를 지나 아래쪽으로 떨어지고,<br/>위쪽 모래가 모두 사라진 시점으로<br/>정해진 시간이 지났음을 보여준다"]

  root --> start["1. 모래시계를 뒤집어<br/>시간 측정을 시작한다"]
  root --> flow["2. 위쪽 모래가 좁은 통로를 지나<br/>아래쪽으로 떨어진다"]
  root --> progress["3. 위쪽과 아래쪽의 모래 양으로<br/>시간 진행을 보여준다"]
  root --> finish["4. 위쪽 모래가 다 떨어지면<br/>측정이 끝난다"]

  start --> chamberSwap["1-1. 위쪽과 아래쪽 공간의<br/>위치가 바뀐다<br/><br/>뒤집힘 여부: is_flipped, 0 / 1<br/>회전 각도: rotation_angle, 0~180도<br/>현재 위쪽 공간: upper_chamber_id"]

  start --> sandBecomesTop["1-2. 아래에 있던 모래가<br/>위쪽 모래가 된다<br/><br/>전체 모래 양: total_sand_amount<br/>위쪽 모래 양: top_sand_amount<br/>아래쪽 모래 양: bottom_sand_amount"]

  start --> startTime["1-3. 측정 시작 시점이<br/>정해진다<br/><br/>시작 시각: start_time<br/>목표 측정 시간: target_duration_sec<br/>경과 시간: elapsed_sec = 0"]

  flow --> downwardMove["2-1. 위쪽에 있는 모래가<br/>아래 방향으로 이동한다<br/><br/>중력 가속도: gravity<br/>위쪽 모래 존재 여부: has_top_sand, 0 / 1<br/>모래 이동 방향: downward = 1"]

  flow --> neckLimit["2-2. 가운데 통로가 한 번에 지나가는<br/>모래 양을 제한한다<br/><br/>통로 지름: neck_width_mm<br/>초당 통과 모래 양: flow_rate<br/>통로 막힘 여부: is_blocked, 0 / 1"]

  flow --> sandShift["2-3. 시간에 따라<br/>모래 양이 이동한다<br/><br/>경과 시간: elapsed_sec<br/>이동한 모래 양: moved_sand_amount<br/>단위 시간당 이동량: sand_per_sec"]

  progress --> topDecrease["3-1. 위쪽 모래 양이<br/>줄어든다<br/><br/>위쪽 모래 양: top_sand_amount<br/>위쪽 모래 감소량: top_sand_decrease<br/>남은 비율: remaining_ratio, 0~100%"]

  progress --> bottomIncrease["3-2. 아래쪽 모래 양이<br/>늘어난다<br/><br/>아래쪽 모래 양: bottom_sand_amount<br/>아래쪽 모래 증가량: bottom_sand_increase<br/>완료 비율: progress_ratio, 0~100%"]

  progress --> timeRead["3-3. 모래 양의 변화가<br/>남은 시간으로 읽힌다<br/><br/>예상 전체 시간: target_duration_sec<br/>지난 시간: elapsed_sec<br/>남은 시간: remaining_sec"]

  finish --> emptyCheck["4-1. 위쪽에 남은 모래가<br/>있는지 확인한다<br/><br/>위쪽 모래 양: top_sand_amount<br/>위쪽 모래 없음 여부: is_top_empty, 0 / 1<br/>아래쪽 모래 가득 참 여부: is_bottom_full, 0 / 1"]

  finish --> noFlow["4-2. 더 이상 통로를 지나는<br/>모래가 없어진다<br/><br/>통과 중인 모래 양: falling_sand_amount<br/>초당 통과 모래 양: flow_rate = 0<br/>이동 상태: is_flowing, 0 / 1"]

  finish --> finishedState["4-3. 정해진 시간이 지났다는<br/>상태가 된다<br/><br/>경과 시간: elapsed_sec ≈ target_duration_sec<br/>남은 시간: remaining_sec = 0<br/>측정 완료 여부: is_finished, 0 / 1"]

  classDef high fill:#ffffff,stroke:#64748b,stroke-width:3px,color:#111827,font-weight:bold;
  classDef mid fill:#e8f2ff,stroke:#2563eb,stroke-width:3px,color:#0f172a,font-weight:bold;
  classDef action fill:#e9f9f1,stroke:#16824a,stroke-width:2px,color:#10251a,font-weight:bold;
  classDef endState fill:#f5eafe,stroke:#7c3aed,stroke-width:3px,color:#1f133a,font-weight:bold;

  class root high;
  class start,flow,progress mid;
  class finish endState;
  class chamberSwap,sandBecomesTop,startTime,downwardMove,neckLimit,sandShift,topDecrease,bottomIncrease,timeRead,emptyCheck,noFlow,finishedState action;
`;

export const finalHourglassDecompositionChart = `
flowchart TB
  root["고수준<br/>정해진 양의 단위가 위쪽 영역에서 아래쪽 영역으로<br/>일정한 속도로 이동하고,<br/>남은 양과 이동한 양의 비율로<br/>정해진 시간의 진행과 완료를 보여준다"]

  root --> start["중수준 1<br/>시간 측정 시작"]
  root --> regulate["중수준 2<br/>시간 흐름 제어"]
  root --> observe["중수준 3<br/>진행 상태 표시"]
  root --> result["중수준 4<br/>측정 완료 확인"]

  start --> swap["1-1. 위쪽 영역과 아래쪽 영역의<br/>역할이 바뀐다<br/><br/>[변수] state: 측정 상태<br/>[변수] top_amount: 위쪽에 남은 양<br/>[변수] bottom_amount: 아래쪽에 쌓인 양"]
  start --> setStart["1-2. 측정 시작 시점과<br/>총 측정 기준이 정해진다<br/><br/>[변수] elapsed_time: 경과 시간<br/>[상수] total_amount: 전체 단위량<br/>[상수] target_duration: 목표 측정 시간"]

  regulate --> limit["2-1. 연결 통로가<br/>단위의 이동 속도를 제한한다<br/><br/>[상수] transfer_rate: 이동 속도"]
  regulate --> move["2-2. 시간이 지날수록<br/>위쪽 양은 줄고 아래쪽 양은 늘어난다<br/><br/>[변수] top_amount: 위쪽에 남은 양<br/>[변수] bottom_amount: 아래쪽에 쌓인 양<br/>[변수] elapsed_time: 경과 시간"]

  observe --> progress["3-1. 남은 양과 이동한 양이<br/>진행률로 변환된다<br/><br/>[변수] progress_ratio: 진행률<br/>[변수] remaining_time: 남은 시간"]
  observe --> visibleState["3-2. 위쪽과 아래쪽의 모래 분포가<br/>사용자가 볼 수 있는 진행 상태가 된다<br/><br/>[변수] top_amount: 위쪽에 남은 양<br/>[변수] bottom_amount: 아래쪽에 쌓인 양"]

  result --> check["4-1. 위쪽에 남은 양이<br/>완료 기준에 도달했는지 판단한다<br/><br/>[변수] top_amount: 위쪽에 남은 양<br/>[상수] 완료 기준: top_amount = 0"]
  result --> done["4-2. 완료 기준을 만족하면<br/>측정 완료 상태가 된다<br/><br/>[변수] state: 측정 상태<br/>[변수] is_finished: 완료 여부"]

  classDef high fill:#ffffff,stroke:#64748b,stroke-width:3px,color:#111827,font-weight:bold;
  classDef mid fill:#e8f2ff,stroke:#2563eb,stroke-width:3px,color:#0f172a,font-weight:bold;
  classDef action fill:#e9f9f1,stroke:#16824a,stroke-width:2px,color:#10251a,font-weight:bold;
  classDef endState fill:#f5eafe,stroke:#7c3aed,stroke-width:3px,color:#1f133a,font-weight:bold;

  class root high;
  class start,regulate,observe mid;
  class result endState;
  class swap,setStart,limit,move,progress,visibleState,check,done action;
`;

export const takoyakiDecompositionChart = `
flowchart TB
  root["고수준<br/>가열된 팬에 반죽과 재료를 넣은 뒤,<br/>팬에 닿은 면이 시간에 따라 익는 동안<br/>사용자가 굴려 접촉면을 바꾸고,<br/>겉면 전체가 충분히 익으면 팬에서 꺼낸다"]

  root --> prepare["중수준 1<br/>팬 준비"]
  root --> pour["중수준 2<br/>반죽과 재료 투입"]
  root --> cook["중수준 3<br/>타코야끼 익히기"]
  root --> turn["중수준 4<br/>타코야끼 굴리기"]
  root --> remove["중수준 5<br/>팬에서 꺼내기"]

  prepare --> heatPan["1-1. 팬을 조리 가능한 온도로<br/>예열한다<br/><br/>[변수] pan_temperature: 팬 온도<br/>[상수] target_heat_range: 조리 가능한 온도 범위"]
  prepare --> oilPan["1-2. 팬 홈에 기름을 발라<br/>반죽이 과하게 달라붙지 않게 한다<br/><br/>[변수] oil_coverage: 기름칠 범위"]

  pour --> pourBatter["2-1. 반죽을 팬 홈에 붓는다<br/><br/>[변수] batter_amount: 투입된 반죽 양"]
  pour --> startCooking["2-2. 반죽이 팬에 닿는 순간<br/>익힘 시간이 시작된다<br/><br/>[변수] cook_time: 반죽 투입 후 지난 시간"]
  pour --> addIngredients["2-3. 반죽 위에 재료를 넣는다<br/><br/>[변수] ingredient_amount: 투입된 재료 양"]

  cook --> heatContact["3-1. 팬에 닿아 있는 면이<br/>먼저 익는다<br/><br/>[변수] contact_time: 현재 접촉면이 팬에 닿은 시간<br/>[변수] cooked_surface_coverage: 익은 표면 범위"]
  cook --> timePasses["3-2. 시간이 지나면 익힘이 진행되고,<br/>너무 오래 닿은 면은 탄다<br/><br/>[변수] cook_time: 반죽 투입 후 지난 시간<br/>[변수] contact_time: 현재 접촉면이 팬에 닿은 시간<br/>[변수] burn_degree: 탄 정도"]
  cook --> cookProgress["3-3. 익은 면이 늘어나면서<br/>전체 겉면의 익은 범위가 커진다<br/><br/>[변수] cooked_surface_coverage: 익은 표면 범위"]

  turn --> rotatePiece["4-1. 굴리면 타코야끼의 방향이 바뀌고<br/>보이는 면과 팬에 닿는 면이 바뀐다<br/><br/>[변수] rotation_index: 현재 굴러간 방향<br/>[변수] visible_area: 현재 위쪽에서 보이는 표면 영역<br/>[변수] contact_area: 현재 팬에 닿은 표면 영역"]
  turn --> contactRule["4-2. 팬에 닿는 면은 현재 방향의<br/>아래쪽 일부로 정해진다<br/><br/>[상수] contact_surface_ratio: 한 번에 팬에 닿는 표면 비율 ≈ 1/2<br/>[상수] contact_area_rule: rotation_index에 따라 contact_area가 정해짐"]
  turn --> turnLoop["4-3. 겉면 전체가 익을 때까지<br/>굴리기를 반복한다<br/><br/>[변수] cooked_surface_coverage: 익은 표면 범위<br/>[상수] target_surface_coverage: 완료로 볼 익은 표면 범위"]

  remove --> finishCheck["5-1. 겉면 전체가 기준 이상 익었는지<br/>확인한다<br/><br/>[변수] cooked_surface_coverage: 익은 표면 범위<br/>[상수] target_surface_coverage: 완료로 볼 익은 표면 범위<br/>[변수] burn_degree: 탄 정도"]
  remove --> takeOut["5-2. 익었거나 탄 타코야끼를<br/>팬 홈에서 꺼낸다<br/><br/>[변수] is_removed: 팬에서 꺼냈는지 여부"]

  classDef high fill:#ffffff,stroke:#64748b,stroke-width:3px,color:#111827,font-weight:bold;
  classDef mid fill:#e8f2ff,stroke:#2563eb,stroke-width:3px,color:#0f172a,font-weight:bold;
  classDef action fill:#e9f9f1,stroke:#16824a,stroke-width:2px,color:#10251a,font-weight:bold;
  classDef endState fill:#f5eafe,stroke:#7c3aed,stroke-width:3px,color:#1f133a,font-weight:bold;

  class root high;
  class prepare,pour,cook,turn mid;
  class remove endState;
  class heatPan,oilPan,pourBatter,startCooking,addIngredients,heatContact,timePasses,cookProgress,rotatePiece,contactRule,turnLoop,finishCheck,takeOut action;
`;

export const takoyakiGameFlowChart = `
flowchart TD
  start(["시작"])

  subgraph setup_module["시작/초기화 모듈"]
    direction TD
    initialize{{"초기값 설정<br/>pan_width_count = 3<br/>pan_height_count = 6<br/>takoyaki_count = 18<br/>plate_capacity = 6<br/>target_plate_count = 3<br/>completed_plate_count = 0<br/>plate_piece_ids = []<br/>remaining_time = time_limit"}}
    create_grid["가로 3 x 세로 6 팬 구멍에<br/>18개 takoyaki_piece 배치"]
    game_start[/"game_start<br/>조리 시작"/]
    show_initial[/"초기 화면 표시<br/>18개 visible_panels 표시<br/>각 알의 contact_panels 계산"/]
  end

  subgraph timer_module["게임 타이머 모듈"]
    direction TD
    time_tick[/"time_tick<br/>시간 경과"/]
    update_time["remaining_time 감소"]
    time_over{"remaining_time &lt;= 0인가?"}
  end

  subgraph heat_module["접촉면 상태 갱신 모듈<br/>팬 위 active_pieces 전체에 적용"]
    direction TD
    read_active["팬 위 active_pieces 확인"]
    read_contact["각 active_piece의<br/>현재 contact_panels 확인"]
    increase_contact_state["각 contact_panels의<br/>panel_state_levels 증가"]
    clamp_panel_levels["max_state_level을 넘지 않게 제한"]
    update_coverage["각 알의 done_coverage 재계산<br/>각 알의 overdone_coverage 재계산"]
  end

  subgraph decision_module["관찰/판단 모듈"]
    direction TD
    show_cooking_view[/"관찰 화면 갱신<br/>가로 3 x 세로 6 팬, visible_panels,<br/>접시 슬롯, 남은 시간 표시"/]
    player_decision{"사용자 판단<br/>무엇을 할 것인가?"}
    wait_choice(("계속 기다리기"))
    rotate_event[/"rotate_input<br/>선택한 타코야끼 알 굴리기"/]
    move_to_plate_event[/"drag_to_plate_input<br/>팬의 알을 눌러 접시로 드래그"/]
    return_to_pan_event[/"return_to_pan_input<br/>접시의 알을 빈 구멍으로 드래그"/]
    plate_event[/"plate_submit_input<br/>접시 제출"/]
  end

  subgraph rotation_module["회전 모듈<br/>rotate_input 발생 시 실행"]
    direction TD
    select_piece["selected_piece_id 지정"]
    begin_rotation["회전 시작<br/>reveal_timer = reveal_duration"]
    no_heat_during_rotation["회전 중에는<br/>panel_state_levels 변화 없음"]
    show_reveal[/"회전 중 노출<br/>지나가는 표면 상태를 잠깐 표시"/]
    reveal_done{"reveal_timer &lt;= 0인가?"}
    continue_reveal["reveal_timer 감소<br/>회전 애니메이션 유지"]
    settle_rotation["선택한 알의<br/>rotation_index 변경"]
    recalc_surfaces["선택한 알의<br/>contact_panels / visible_panels 재계산"]
  end

  subgraph plate_move_module["팬/접시 이동 모듈<br/>drag 입력 발생 시 실행"]
    direction TD
    select_pan_piece["팬 위 selected_piece_id 지정"]
    plate_has_space{"plate_piece_ids 수 &lt; plate_capacity인가?"}
    plate_full_block(("접시가 가득 참"))
    move_to_plate["선택한 알을 접시 슬롯으로 이동<br/>active_piece_ids에서 제거<br/>plate_piece_ids에 추가"]
    stop_cooking_on_plate["접시 위 알은<br/>익힘 갱신에서 제외"]
    select_plate_piece["접시 위 selected_piece_id 지정"]
    select_empty_hole["빈 pan_hole_id 지정"]
    move_back_to_pan["선택한 알을 빈 구멍으로 이동<br/>plate_piece_ids에서 제거<br/>active_piece_ids에 추가"]
    resume_cooking_on_pan["다음 time_tick부터<br/>다시 익힘 갱신 대상"]
  end

  subgraph plate_module["접시 제출 판정 모듈<br/>plate_submit_input 발생 시 실행"]
    direction TD
    plate_full{"plate_piece_ids 수 = plate_capacity인가?"}
    need_six(("한 접시는 6개 필요"))
    freeze_plate["plate_piece_ids 6개 상태 고정<br/>plate_candidate 생성"]
    judge_plate{"접시 조건을<br/>만족하는가?<br/>각 알 done_coverage &gt;= required_done_coverage<br/>각 알 overdone_coverage &lt;= max_overdone_coverage"}
    show_plate_reject[/"접시 미완료 표시<br/>plate_piece_ids 유지"/]
    accept_plate["completed_plate_count 증가<br/>접시 위 6개를 완료 처리<br/>plate_piece_ids = []"]
  end

  subgraph end_module["전체 완료/종료 판정 모듈"]
    direction TD
    auto_finalize["is_finalized = true<br/>제한 시간 종료"]
    all_plates_done{"completed_plate_count = target_plate_count인가?"}
    success(["종료: 성공<br/>타코야끼 3접시 완성"])
    fail_time(["종료: 실패<br/>제한 시간 안에 3접시를 완성하지 못함"])
  end

  start --> initialize
  initialize --> create_grid
  create_grid --> game_start
  game_start --> show_initial
  show_initial --> time_tick

  time_tick --> update_time
  update_time --> time_over
  time_over -->|예| auto_finalize
  auto_finalize --> fail_time
  time_over -->|아니오| read_active
  read_active --> read_contact
  read_contact --> increase_contact_state
  increase_contact_state --> clamp_panel_levels
  clamp_panel_levels --> update_coverage
  update_coverage --> show_cooking_view
  show_cooking_view --> player_decision
  player_decision -->|기다리기| wait_choice
  wait_choice --> time_tick
  player_decision -->|굴리기| rotate_event
  rotate_event --> select_piece
  select_piece --> begin_rotation
  begin_rotation --> no_heat_during_rotation
  no_heat_during_rotation --> show_reveal
  show_reveal --> reveal_done
  reveal_done -->|아니오| continue_reveal
  continue_reveal --> show_reveal
  reveal_done -->|예| settle_rotation
  settle_rotation --> recalc_surfaces
  recalc_surfaces --> time_tick

  player_decision -->|접시에 올리기| move_to_plate_event
  move_to_plate_event --> select_pan_piece
  select_pan_piece --> plate_has_space
  plate_has_space -->|아니오| plate_full_block
  plate_full_block --> player_decision
  plate_has_space -->|예| move_to_plate
  move_to_plate --> stop_cooking_on_plate
  stop_cooking_on_plate --> time_tick

  player_decision -->|팬으로 되돌리기| return_to_pan_event
  return_to_pan_event --> select_plate_piece
  select_plate_piece --> select_empty_hole
  select_empty_hole --> move_back_to_pan
  move_back_to_pan --> resume_cooking_on_pan
  resume_cooking_on_pan --> time_tick

  player_decision -->|제출하기| plate_event
  plate_event --> plate_full
  plate_full -->|아니오| need_six
  need_six --> player_decision
  plate_full -->|예| freeze_plate
  freeze_plate --> judge_plate
  judge_plate -->|아니오| show_plate_reject
  show_plate_reject --> player_decision
  judge_plate -->|예| accept_plate
  accept_plate --> all_plates_done
  all_plates_done -->|예| success
  all_plates_done -->|아니오| time_tick

  classDef terminal fill:#ffffff,stroke:#64748b,stroke-width:3px,color:#111827,font-weight:bold;
  classDef preparation fill:#f8fafc,stroke:#64748b,stroke-width:3px,color:#111827,font-weight:bold;
  classDef io fill:#eef6ff,stroke:#2563eb,stroke-width:3px,color:#0f172a,font-weight:bold;
  classDef process fill:#ffffff,stroke:#737373,stroke-width:3px,color:#111827;
  classDef decision fill:#fff8e6,stroke:#b7791f,stroke-width:3px,color:#111827,font-weight:bold;
  classDef connector fill:#ffffff,stroke:#64748b,stroke-width:3px,color:#111827;
  classDef successState fill:#dcfce7,stroke:#16824a,stroke-width:4px,color:#10251a,font-weight:bold;
  classDef failureState fill:#fee2e2,stroke:#b91c1c,stroke-width:4px,color:#3f1212,font-weight:bold;

  class start terminal;
  class initialize preparation;
  class game_start,show_initial,time_tick,show_cooking_view,show_reveal,rotate_event,move_to_plate_event,return_to_pan_event,plate_event,show_plate_reject io;
  class create_grid,update_time,read_active,read_contact,increase_contact_state,clamp_panel_levels,update_coverage,select_piece,begin_rotation,no_heat_during_rotation,continue_reveal,settle_rotation,recalc_surfaces,select_pan_piece,move_to_plate,stop_cooking_on_plate,select_plate_piece,select_empty_hole,move_back_to_pan,resume_cooking_on_pan,freeze_plate,accept_plate,auto_finalize process;
  class player_decision,reveal_done,plate_has_space,plate_full,judge_plate,all_plates_done,time_over decision;
  class wait_choice,plate_full_block,need_six connector;
  class success successState;
  class fail_time failureState;
`;

export const musicBoxDecompositionChart = `
flowchart TB
  root["고수준<br/>감긴 태엽이 풀리는 힘으로 실린더를 돌리고,<br/>실린더의 핀이 금속 빗살을 차례대로 튕겨<br/>정해진 음악을 재생한다"]

  root --> wind["1. 태엽을 감아<br/>재생될 시간을 정한다"]
  root --> read["2. 태엽이 풀리면서 실린더가 돌고,<br/>저장된 음의 순서를 읽는다"]
  root --> sound["3. 핀이 금속 빗살을 튕겨<br/>소리를 낸다"]
  root --> finish["4. 태엽이 다 풀리면<br/>재생이 끝난다"]

  wind --> handle["1-1. 손잡이를 돌려<br/>태엽을 감는다<br/><br/>손잡이 회전 횟수: n회<br/>손잡이 회전 각도: theta_handle<br/>손잡이 회전 방향: 1 / -1"]

  wind --> windLevelChange["1-2. 손잡이를 돌린 만큼<br/>태엽 감김 정도가 올라간다<br/><br/>회전 1회당 감김 증가량: wind_per_turn<br/>현재 태엽 감김 정도: wind_level, 0~100%<br/>최대 감김 정도: max_wind = 100%"]

  wind --> durationMap["1-3. 감긴 정도가<br/>오르골이 돌아갈 수 있는 시간으로 남는다<br/><br/>감김 1%당 재생 시간: sec_per_wind<br/>예상 재생 시간: expected_duration_sec<br/>남은 재생 시간: remaining_duration_sec"]

  read --> unwind["2-1. 감긴 태엽이 풀리며<br/>회전 운동을 만든다<br/><br/>태엽 풀림 정도: unwind_level<br/>태엽 풀림 속도: unwind_rate<br/>출력 회전 속도: output_rpm"]

  read --> gearTransfer["2-2. 회전이 기어를 지나<br/>실린더에 전달된다<br/><br/>기어비: gear_ratio<br/>실린더 회전 속도: cylinder_rpm<br/>실린더 회전 방향: 1 / -1"]

  read --> cylinderPosition["2-3. 실린더의 현재 위치가<br/>곡의 진행 위치가 된다<br/><br/>실린더 현재 각도: cylinder_angle, 0~360도<br/>실린더 회전 완료 횟수: cylinder_turn_count<br/>곡 진행률: music_progress, 0~100%"]

  read --> pinRead["2-4. 실린더 위의 핀이 읽기 위치를 지나가며<br/>다음 음을 정한다<br/><br/>핀 개수: pin_count<br/>각 핀의 각도 위치: pin_angle<br/>각 핀의 가로 위치: pin_x<br/>현재 읽기 위치와 핀의 거리: read_distance<br/>핀 통과 여부: 0 / 1"]

  sound --> tineSelect["3-1. 지나간 핀의 위치가<br/>어떤 빗살을 칠지 정한다<br/><br/>핀 가로 위치: pin_x<br/>빗살 번호: tine_index<br/>해당 빗살의 음 높이: frequency_hz"]

  sound --> pluck["3-2. 핀이 금속 빗살을<br/>밀고 지나간다<br/><br/>핀 접촉 여부: contact, 0 / 1<br/>접촉 깊이: contact_depth_mm<br/>접촉 시간: contact_duration_sec<br/>튕김 세기: pluck_strength"]

  sound --> vibration["3-3. 밀렸다가 놓인 빗살이<br/>진동한다<br/><br/>빗살 길이: tine_length_mm<br/>빗살 두께: tine_thickness_mm<br/>진동 주파수: vibration_frequency_hz<br/>진동 세기: amplitude<br/>진동 감쇠율: decay_rate"]

  sound --> audibleSound["3-4. 빗살의 진동이<br/>들을 수 있는 소리로 퍼진다<br/><br/>음량: volume_db<br/>소리 지속 시간: sound_duration_sec<br/>현재 울리고 있는 음 개수: active_note_count"]

  finish --> windDecrease["4-1. 재생되는 동안<br/>태엽 감김 정도가 줄어든다<br/><br/>현재 태엽 감김 정도: wind_level<br/>감김 감소 속도: wind_decrease_rate<br/>남은 재생 시간: remaining_duration_sec"]

  finish --> finishCheck["4-2. 남은 감김 정도로<br/>계속 재생할 수 있는지 판단한다<br/><br/>남은 재생 시간: remaining_duration_sec<br/>실린더 회전 속도: cylinder_rpm<br/>종료 여부: is_finished, 0 / 1"]

  finish --> stop["4-3. 회전이 멈추고<br/>남은 진동도 사라진다<br/><br/>실린더 회전 속도: cylinder_rpm = 0<br/>현재 울리고 있는 음 개수: active_note_count = 0<br/>출력 음량: volume_db ≈ 0"]

  classDef high fill:#ffffff,stroke:#64748b,stroke-width:3px,color:#111827,font-weight:bold;
  classDef mid fill:#e8f2ff,stroke:#2563eb,stroke-width:3px,color:#0f172a,font-weight:bold;
  classDef action fill:#e9f9f1,stroke:#16824a,stroke-width:2px,color:#10251a,font-weight:bold;
  classDef endState fill:#f5eafe,stroke:#7c3aed,stroke-width:3px,color:#1f133a,font-weight:bold;

  class root high;
  class wind,read,sound mid;
  class finish endState;
  class handle,windLevelChange,durationMap,unwind,gearTransfer,cylinderPosition,pinRead,tineSelect,pluck,vibration,audibleSound,windDecrease,finishCheck,stop action;
`;

export const mechanicalStopwatchDecompositionChart = `
flowchart TB
  root["고수준<br/>크라운을 돌려 측정할 수 있는 시간을 확보하고,<br/>버튼으로 측정을 시작하고 멈춘 뒤,<br/>지나간 시간을 바늘과 눈금으로 보여준다"]

  root --> wind["1. 크라운을 돌려<br/>측정할 수 있는 시간을 확보한다"]
  root --> startMeasure["2. 버튼을 눌러<br/>측정을 시작한다"]
  root --> showTime["3. 바늘이 일정하게 움직이며<br/>지난 시간을 보여준다"]
  root --> stopMeasure["4. 버튼을 눌러<br/>측정을 멈춘다"]
  root --> resetDisplay["5. 다음 측정을 위해<br/>표시를 0으로 되돌린다"]

  wind --> turnCrown["1-1. 사용자가 크라운을<br/>손으로 돌린다<br/><br/>[변수] 크라운을 돌린 정도: wound_amount"]
  wind --> windSpring["1-2. 크라운을 돌린 만큼<br/>안쪽 스프링이 감긴다<br/><br/>[변수] 스프링 감김 정도: wind_level<br/>[상수] 최대 감김 정도: max_wind"]
  wind --> availableTime["1-3. 감긴 정도만큼<br/>스톱워치가 움직일 수 있는 시간이 생긴다<br/><br/>[변수] 작동 가능 시간: available_run_time"]

  startMeasure --> pressStart["2-1. 사용자가 시작 버튼을 누른다<br/><br/>[변수] 현재 상태: state"]
  startMeasure --> moveInside["2-2. 멈춰 있던 내부 장치가<br/>움직이기 시작한다<br/><br/>[변수] 작동 여부: is_running"]
  startMeasure --> handFromZero["2-3. 바늘이 0 위치에서<br/>움직이기 시작한다<br/><br/>[변수] 바늘 위치: needle_position<br/>[상수] 0 위치: zero_position"]

  showTime --> unwind["3-1. 감겨 있던 스프링이<br/>조금씩 풀린다<br/><br/>[변수] 남은 감김 정도: remaining_wind<br/>[변수] 남은 작동 가능 시간: remaining_run_time"]
  showTime --> steadyMove["3-2. 내부 장치가 바늘을<br/>일정하게 움직인다<br/><br/>[상수] 기준 속도: standard_speed"]
  showTime --> displayTime["3-3. 바늘 위치가<br/>지난 시간으로 보인다<br/><br/>[변수] 바늘 위치: needle_position<br/>[변수] 경과 시간: elapsed_time<br/>[변수] 표시된 시간: displayed_time"]

  stopMeasure --> pressStop["4-1. 사용자가 정지 버튼을 누른다<br/><br/>[변수] 현재 상태: state"]
  stopMeasure --> handStops["4-2. 움직이던 바늘이 멈춘다<br/><br/>[변수] 작동 여부: is_running<br/>[변수] 멈춘 바늘 위치: stopped_needle_position"]
  stopMeasure --> resultStays["4-3. 멈춘 바늘 위치가<br/>측정 결과로 남는다<br/><br/>[변수] 측정 결과: measured_time"]

  resetDisplay --> resetInput["5-1. 사용자가 리셋 조작을 한다<br/><br/>[변수] 현재 상태: state"]
  resetDisplay --> handReturns["5-2. 바늘이 0 위치로 돌아간다<br/><br/>[변수] 바늘 위치: needle_position<br/>[상수] 0 위치: zero_position"]
  resetDisplay --> timeZero["5-3. 표시된 시간이<br/>0으로 초기화된다<br/><br/>[변수] 표시된 시간: displayed_time<br/>[변수] 측정 결과: measured_time"]
  resetDisplay --> windRemains["5-4. 감겨 있는 힘은 남아 있어<br/>다시 측정에 사용할 수 있다<br/><br/>[변수] 남은 감김 정도: remaining_wind<br/>[변수] 남은 작동 가능 시간: remaining_run_time"]

  classDef high fill:#ffffff,stroke:#64748b,stroke-width:3px,color:#111827,font-weight:bold;
  classDef mid fill:#e8f2ff,stroke:#2563eb,stroke-width:3px,color:#0f172a,font-weight:bold;
  classDef action fill:#e9f9f1,stroke:#16824a,stroke-width:2px,color:#10251a,font-weight:bold;
  classDef endState fill:#f5eafe,stroke:#7c3aed,stroke-width:3px,color:#1f133a,font-weight:bold;

  class root high;
  class wind,startMeasure,showTime mid;
  class stopMeasure,resetDisplay endState;
  class turnCrown,windSpring,availableTime,pressStart,moveInside,handFromZero,unwind,steadyMove,displayTime,pressStop,handStops,resultStays,resetInput,handReturns,timeZero,windRemains action;
`;

export const sensoryUnfoldingFlowChart = `
flowchart TD
  idle["대기<br/>사전 정의된 결과 패턴 준비됨<br/>작동 가능량 입력 대기"]
  charge["설정 중<br/>작동 가능량 채워짐"]
  release{"놓기 / 시작<br/>트리거 발생?"}
  running["전개 중<br/>작동 가능량 감소<br/>시각/청각 결과 전개"]
  tick["시간 경과<br/>진행률 증가"]
  update["출력 갱신<br/>결과 패턴이 진행률에 맞춰 변화"]
  pause{"멈춤<br/>트리거 발생?"}
  paused["일시정지<br/>남은 가능량 보존<br/>출력 상태 유지"]
  resume{"다시 시작<br/>트리거 발생?"}
  done{"작동 가능량이<br/>소진되었는가?"}
  complete["완료<br/>사전 정의된 결과가 완성됨"]
  reset{"다시 감상 / 초기화<br/>트리거 발생?"}

  idle -->|채우기 입력| charge
  charge --> release
  release -->|아니오| charge
  release -->|예| running
  running --> tick
  tick --> update
  update --> pause
  pause -->|예| paused
  paused --> resume
  resume -->|아니오| paused
  resume -->|예| running
  pause -->|아니오| done
  done -->|아니오| running
  done -->|예| complete
  complete --> reset
  reset -->|아니오| complete
  reset -->|예| idle

  classDef state fill:#dbeafe,stroke:#1d4ed8,stroke-width:4px,color:#0f172a,font-weight:bold;
  classDef decision fill:#fff8e6,stroke:#b7791f,stroke-width:3px,color:#111827,font-weight:bold;
  classDef action fill:#e9f9f1,stroke:#16824a,stroke-width:3px,color:#10251a,font-weight:bold;
  classDef endState fill:#f5eafe,stroke:#7c3aed,stroke-width:4px,color:#1f133a,font-weight:bold;

  class idle,charge,running,paused state;
  class release,pause,resume,done,reset decision;
  class tick,update action;
  class complete endState;
`;

export const elasticRhythmOutputFlowChart = `
flowchart TD
  %% Generated by flowchart-harness. Edit FlowchartSpec, not this Mermaid.
  start(["시작"])
  initialize{{"초기값 설정<br/>state = idle<br/>stored_energy = 0<br/>remaining_energy = 0<br/>release_progress = 0<br/>output_value = initial"}}
  charge_input[/"charge_input<br/>탄성 에너지 저장 입력"/]
  store_energy["stored_energy 증가<br/>remaining_energy 갱신<br/>state = charged"]
  start_input[/"start_input<br/>출력 시작 입력"/]
  has_energy{"stored_energy가<br/>0보다 큰가?"}
  start_release["state = running<br/>저장된 에너지 풀림 시작"]
  wait_for_charge(("충전 필요"))
  hold_output["state = stopped<br/>output_value 현재 상태 유지"]
  resume_input{"start_input으로<br/>다시 시작하는가?"}
  reset_output["출력만 초기화<br/>output_value = initial<br/>release_progress = 0<br/>remaining_energy 유지"]
  finish_output(["완료<br/>state = finished<br/>출력 멈춤"])
  subgraph release_loop["출력 진행 반복<br/>state = running, remaining_energy &gt; completion_threshold"]
    direction TD
    time_tick[/"time_tick<br/>시간 경과"/]
    release_energy["rate_limiter를 거쳐<br/>remaining_energy 감소<br/>release_progress 증가"]
    update_output[/"output_mapping_rule에 따라<br/>output_value 갱신"/]
    stop_input{"stop_input이<br/>발생했는가?"}
    reset_input{"reset_input이<br/>발생했는가?"}
    is_finished{"remaining_energy가<br/>completion_threshold 이하인가?"}
  end

  start --> initialize
  initialize --> charge_input
  charge_input --> store_energy
  store_energy --> start_input
  start_input --> has_energy
  has_energy -->|예| start_release
  has_energy -->|아니오| wait_for_charge
  wait_for_charge --> charge_input
  start_release --> time_tick
  time_tick --> release_energy
  release_energy --> update_output
  update_output --> stop_input
  stop_input -->|예| hold_output
  stop_input -->|아니오| reset_input
  hold_output --> resume_input
  resume_input -->|예| time_tick
  resume_input -->|아니오| reset_input
  reset_input -->|예| reset_output
  reset_input -->|아니오| is_finished
  reset_output --> start_input
  is_finished -->|예| finish_output
  is_finished -->|아니오| time_tick

  classDef terminal fill:#ffffff,stroke:#64748b,stroke-width:3px,color:#111827,font-weight:bold;
  classDef preparation fill:#f8fafc,stroke:#64748b,stroke-width:3px,color:#111827,font-weight:bold;
  classDef io fill:#eef6ff,stroke:#2563eb,stroke-width:3px,color:#0f172a,font-weight:bold;
  classDef process fill:#ffffff,stroke:#737373,stroke-width:3px,color:#111827;
  classDef decision fill:#fff8e6,stroke:#b7791f,stroke-width:3px,color:#111827,font-weight:bold;
  classDef predefinedProcess fill:#f5f3ff,stroke:#7c3aed,stroke-width:3px,color:#111827;
  classDef connector fill:#ffffff,stroke:#64748b,stroke-width:3px,color:#111827;

  class start terminal;
  class initialize preparation;
  class charge_input io;
  class store_energy process;
  class start_input io;
  class has_energy decision;
  class start_release process;
  class wait_for_charge connector;
  class time_tick io;
  class release_energy process;
  class update_output io;
  class stop_input decision;
  class hold_output process;
  class resume_input decision;
  class reset_input decision;
  class reset_output process;
  class is_finished decision;
  class finish_output terminal;
  style release_loop fill:#dcfce7,stroke:#22c55e,stroke-width:2px,color:#0f172a;
`;

export const imageZettelkastenDecompositionChart = `
flowchart TB
  root["고수준<br/>오프라인 또는 온라인에서 발견한<br/>디자인/조형 이미지를<br/>이미지 제텔카스텐 관찰 카드로 제작한다"]

  root --> discover["1. 발견"]
  discover --> discoverTarget["1-1. 눈에 띄는 디자인/조형을 마주친다<br/><br/>데이터: 발견 대상"]
  discover --> discoverReason["1-2. 왜 눈에 띄었는지 순간적으로 판단한다<br/><br/>데이터: 첫인상, 관심 이유"]

  root --> collect["2. 이미지 수집"]
  collect --> collectOffline["2-1. 오프라인이면 카메라 앱을 열고 촬영한다<br/><br/>데이터: 원본 사진, 촬영 날짜, 촬영 위치"]
  collect --> collectOnline["2-2. 온라인이면 이미지를 저장하거나 스크린샷한다<br/><br/>데이터: 원본 이미지, 발견 날짜, 출처 링크, 저장 위치"]

  root --> prepare["3. 작업 환경 준비"]
  prepare --> moveWork["3-1. 오프라인 수집이면 컴퓨터 작업 환경으로 이동한다<br/><br/>데이터: 컴퓨터 작업 가능 상태"]
  prepare --> prepareFile["3-2. 이미지 파일을 작업 가능한 위치로 옮기거나 연다<br/><br/>데이터: 이미지 파일, 파일 위치"]
  prepare --> openTools["3-3. Figma/PPT 등 작업 도구를 연다<br/><br/>데이터: 작업 도구, 작업 파일"]

  root --> refine["4. 관찰 이미지화"]
  refine --> uploadImage["4-1. 이미지를 작업 화면에 올린다<br/><br/>데이터: 작업 중 이미지"]
  refine --> positionImage["4-2. 관심 있는 조형이 잘 보이도록 위치를 조정한다<br/><br/>데이터: 조정된 이미지 위치"]
  refine --> cropImage["4-3. 필요 없는 부분을 크롭한다<br/><br/>데이터: 크롭 영역, 정제된 이미지"]

  root --> metadata["5. 정보 확인"]
  metadata --> photoMeta["5-1. 오프라인 사진의 메타데이터를 확인한다<br/><br/>데이터: 촬영 날짜, 촬영 위치, 파일 정보"]
  metadata --> webMeta["5-2. 온라인 이미지의 출처와 발견 정보를 확인한다<br/><br/>데이터: 발견 날짜, 출처 링크, 저장 위치"]

  root --> observe["6. 기억 복원 및 관찰 기록"]
  observe --> recall["6-1. 왜 멈췄는지 또는 왜 저장했는지 떠올린다<br/><br/>데이터: 기억, 판단 근거, 감정"]
  observe --> writeNote["6-2. 요소, 구성, 상태, 맥락, 효과를 작성한다<br/><br/>데이터: 관찰 문장"]

  root --> classify["7. 제목/주제 부여 및 묶기"]
  classify --> propose["7-1. 카드 제목과 주제 태그 후보를 만든다<br/><br/>데이터: 제안 제목, 제안 주제 태그"]
  classify --> confirm["7-2. 사용자가 제목과 주제 태그를 선택하거나 직접 수정한다<br/><br/>데이터: 확정 제목, 확정 주제 태그"]
  classify --> group["7-3. 선택한 기준 필드 값별로 카드들을 묶는다<br/><br/>데이터: 기준별 카드 묶음"]

  root --> template["8. 출력 템플릿 제작"]
  template --> placeCard["8-1. 이미지와 메모를 카드 템플릿에 옮긴다<br/><br/>데이터: 카드 구성 요소"]
  template --> printCard["8-2. 디자인 요소를 배치하고 출력 가능한 형태로 정리한다<br/><br/>데이터: 출력용 관찰 카드"]

  classDef high fill:#ffffff,stroke:#64748b,stroke-width:3px,color:#111827,font-weight:bold;
  classDef mid fill:#e8f2ff,stroke:#2563eb,stroke-width:3px,color:#0f172a,font-weight:bold;
  classDef action fill:#e9f9f1,stroke:#16824a,stroke-width:2px,color:#10251a,font-weight:bold;
  classDef endState fill:#f5eafe,stroke:#7c3aed,stroke-width:3px,color:#1f133a,font-weight:bold;

  class root high;
  class discover,collect,prepare,refine,metadata,observe,classify mid;
  class template endState;
  class discoverTarget,discoverReason,collectOffline,collectOnline,moveWork,prepareFile,openTools,uploadImage,positionImage,cropImage,photoMeta,webMeta,recall,writeNote,propose,confirm,group,placeCard,printCard action;
`;

export const imageZettelkastenPrototypeFlowChart = `
flowchart TD
  outside["사용자 영역<br/>오프라인/온라인에서<br/>눈에 띄는 이미지 발견"]
  start["프로토타입 시작<br/>수집 모듈"]
  source{"수집 방식은<br/>무엇인가?"}

  offline["오프라인 이미지<br/>직접 촬영한 사진 업로드"]
  online["온라인 이미지<br/>저장 이미지 또는 스크린샷 업로드"]
  sourceInput["출처/발견 정보 입력<br/>URL, 발견 날짜, 저장 위치"]
  raw["원본 이미지 생성<br/>raw_image"]

  edit["관찰 이미지화 모듈<br/>크롭, 위치 조정,<br/>관찰 영역 선택"]
  refined["정제된 이미지<br/>refined_image, crop_area"]

  metadata["정보 자동 수집 모듈<br/>파일명, 촬영 날짜, 파일 정보,<br/>출처 링크, 발견 날짜 수집"]
  info["이미지 정보<br/>collected_at, collected_place,<br/>source_url, capture_date, file_info"]

  observe["관찰 기록 모듈<br/>사용자가 직접 작성"]
  element["요소"]
  composition["구성"]
  condition["상태"]
  context["맥락"]
  effect["효과"]
  note["관찰 문장 묶음<br/>observation_note"]

  suggest["제목/주제 제안 모듈<br/>관찰 문장과 기존 카드를 비교해<br/>제목과 주제 태그 후보 생성"]
  proposal["제안값<br/>suggested_title,<br/>suggested_topic_tags,<br/>similar_card_candidates"]
  confirm{"사용자가 제안을<br/>확정하는가?"}
  accept["제안 선택"]
  editText["직접 수정 또는 새로 입력"]
  confirmed["확정값<br/>title, topic_tags"]

  cardData["카드 데이터 생성<br/>정제 이미지 + 메타데이터 + 관찰 문장<br/>+ 제목 + 여러 태그"]
  template["템플릿 배치 모듈<br/>정해진 카드 템플릿에<br/>이미지와 텍스트 자동 배치"]
  card["출력용 관찰 카드<br/>저장 또는 출력"]

  groupChoice["카드 묶음 기준 선택<br/>사용자가 필드를 선택"]
  field{"묶기 기준 필드"}
  byTopic["주제 태그 기준"]
  byTime["수집 시간 기준"]
  byPlace["수집 공간 기준"]
  byMethod["수집 방식 기준"]
  byOther["요소/구성/상태/맥락/효과 태그 기준"]
  grouping["카드 그룹핑<br/>선택한 필드의 값별로 분류<br/>여러 값을 가진 카드는 중복 포함"]
  groupedView["기준별 카드 묶음 보기"]

  outside --> start
  start --> source
  source -->|오프라인| offline
  source -->|온라인| online
  online --> sourceInput
  offline --> raw
  sourceInput --> raw
  raw --> edit
  edit --> refined
  refined --> metadata
  raw --> metadata
  sourceInput --> metadata
  metadata --> info
  refined --> observe
  info --> observe
  observe --> element
  observe --> composition
  observe --> condition
  observe --> context
  observe --> effect
  element --> note
  composition --> note
  condition --> note
  context --> note
  effect --> note
  note --> suggest
  info --> suggest
  suggest --> proposal
  proposal --> confirm
  confirm -->|예| accept
  confirm -->|아니오| editText
  accept --> confirmed
  editText --> confirmed
  refined --> cardData
  info --> cardData
  note --> cardData
  confirmed --> cardData
  cardData --> template
  template --> card
  cardData --> groupChoice
  groupChoice --> field
  field --> byTopic
  field --> byTime
  field --> byPlace
  field --> byMethod
  field --> byOther
  byTopic --> grouping
  byTime --> grouping
  byPlace --> grouping
  byMethod --> grouping
  byOther --> grouping
  grouping --> groupedView

  classDef external fill:#f8fafc,stroke:#64748b,stroke-width:3px,color:#111827,font-weight:bold;
  classDef module fill:#e7f0ff,stroke:#2563eb,stroke-width:3px,color:#0f172a,font-weight:bold;
  classDef decision fill:#fff6db,stroke:#b7791f,stroke-width:3px,color:#111827,font-weight:bold;
  classDef action fill:#e9f9f1,stroke:#16824a,stroke-width:2px,color:#10251a,font-weight:bold;
  classDef data fill:#fff8e6,stroke:#b7791f,stroke-width:2px,color:#111827;
  classDef output fill:#f5eafe,stroke:#7c3aed,stroke-width:3px,color:#1f133a,font-weight:bold;

  class outside external;
  class start,edit,metadata,observe,suggest,template,groupChoice,grouping module;
  class source,confirm,field decision;
  class offline,online,sourceInput,element,composition,condition,context,effect,accept,editText,byTopic,byTime,byPlace,byMethod,byOther action;
  class raw,refined,info,note,proposal,confirmed,cardData data;
  class card,groupedView output;
`;

export type ProjectSectionId = "brief" | "abstraction" | "flowchart" | "onepager" | "pattern" | "prototype" | "keyscreen";

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

type PinnedDashboardProject = {
  id: string;
  kind: "pinned-dashboard";
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

type PatternRow = {
  property: string;
  hourglass: {
    text: string;
    metrics: string[];
  };
  musicBox: {
    text: string;
    metrics: string[];
  };
  commonPattern: string;
  differencePattern: string;
};

type CtProject = {
  id: string;
  kind: "ct";
  title: string;
  status: string;
  summary: string;
  decomposition: Array<{
    title: string;
    brief: string;
    chart: string;
  }>;
  patternRecognition: {
    overview: string;
    rows: PatternRow[];
    commonSummary: string;
    differenceSummary: string;
  };
  abstraction: {
    title: string;
    oneLine: string;
    description: string;
    elements: Array<{
      key: string;
      text: string;
      tagGroups?: Array<{ label: string; items: string[] }>;
    }>;
    variables: Array<{ name: string; text: string }>;
    derivedVariables?: Array<{ name: string; text: string }>;
    constants: Array<{ name: string; text: string }>;
    events: Array<{ condition: string; result: string }>;
    examples: Array<{ title: string; mappings: Array<{ name: string; value: string }> }>;
  };
  flowchart: {
    overview: string;
    states: Array<{ name: string; text: string }>;
    scenarios: Array<string>;
    chart: string;
  };
  prototypeNote: string;
};

type CtDecompositionProject = {
  id: string;
  kind: "ct-decomposition";
  title: string;
  status: string;
  summary: string;
  decomposition: Array<{
    title: string;
    brief: string;
    chart: string;
  }>;
  patternRecognition: {
    overview: string;
    rows: Array<{
      property: string;
      hourglass: {
        text: string;
        metrics: string[];
      };
      takoyaki: {
        text: string;
        metrics: string[];
      };
      commonPattern: string;
      differencePattern: string;
    }>;
    commonSummary: string;
    differenceSummary: string;
  };
  abstraction: {
    title: string;
    oneLine: string;
    description: string;
    elements: Array<{
      key: string;
      text: string;
      tagGroups?: Array<{ label: string; items: string[] }>;
    }>;
    variables: Array<{ name: string; text: string }>;
    derivedVariables?: Array<{ name: string; text: string }>;
    constants: Array<{ name: string; text: string }>;
    events: Array<{ condition: string; result: string }>;
    examples: Array<{ title: string; mappings: Array<{ name: string; value: string }> }>;
  };
  flowchart: {
    overview: string;
    states: Array<{ name: string; text: string }>;
    scenarios: Array<string>;
    chart: string;
  };
};

type CtBriefProject = {
  id: string;
  kind: "ct-brief";
  title: string;
  status: string;
  summary: string;
  decomposition: Array<{
    title: string;
    brief: string;
    chart: string;
  }>;
  patternRecognition: {
    overview: string;
    rows: Array<{
      property: string;
      hourglass: {
        text: string;
        metrics: string[];
      };
      musicBox: {
        text: string;
        metrics: string[];
      };
      stopwatch: {
        text: string;
        metrics: string[];
      };
    }>;
    commonSummary: string;
    differenceSummary: string;
  };
  abstraction: {
    title: string;
    oneLine: string;
    description: string;
    elements: Array<{
      key: string;
      text: string;
      tagGroups?: Array<{ label: string; items: string[] }>;
    }>;
    variables: Array<{ name: string; text: string }>;
    derivedVariables?: Array<{ name: string; text: string }>;
    constants: Array<{ name: string; text: string }>;
    events: Array<{ condition: string; result: string }>;
    examples: Array<{ title: string; mappings: Array<{ name: string; value: string }> }>;
  };
  flowchart: {
    overview: string;
    states: Array<{ name: string; text: string }>;
    scenarios: Array<string>;
    chart: string;
  };
};

type CtProcessProject = {
  id: string;
  kind: "ct-process";
  title: string;
  status: string;
  summary: string;
  document: {
    subject: {
      title: string;
      body: string;
      shortName: string;
    };
    records: Array<{
      title: string;
      body: string[];
    }>;
    automationProblem: string;
    prototypeDescription: {
      paragraphs: string[];
      flow: string[];
    };
  };
  decomposition: Array<{
    title: string;
    brief: string;
    chart: string;
  }>;
  patternRecognition: {
    overview: string;
    rows: Array<{
      task: string;
      offline: string;
      online: string;
      input: string;
      output: string;
    }>;
    findings: Array<{ title: string; text: string }>;
    conclusion: string;
    flow: string[];
    commonSummary: string;
    differenceSummary: string;
  };
  abstraction: {
    title: string;
    oneLine: string;
    description: string;
    elements: Array<{
      key: string;
      text: string;
      tagGroups?: Array<{ label: string; items: string[] }>;
    }>;
    variables: Array<{ name: string; text: string }>;
    derivedVariables?: Array<{ name: string; text: string }>;
    constants: Array<{ name: string; text: string }>;
    events: Array<{ condition: string; result: string }>;
    examples: Array<{ title: string; mappings: Array<{ name: string; value: string }> }>;
  };
  flowchart: {
    overview: string;
    states: Array<{ name: string; text: string }>;
    scenarios: Array<string>;
    chart: string;
  };
  prototypeNote: string;
};

export type Project =
  | QueueProject
  | GlossaryProject
  | PinnedDashboardProject
  | CtProject
  | CtDecompositionProject
  | CtBriefProject
  | CtProcessProject;

export const projects: Project[] = [
  {
    id: "engineering-ct-final-takoyaki",
    kind: "ct-decomposition",
    title: "Engineering CT Final: 타코야끼 굽기 프로세스",
    status: "최종 과제 플로우차트",
    summary:
      "모래시계와 타코야끼 굽기 프로세스를 비교해, 시간 경과로 진행되는 상태 변화와 진행 중 개입의 차이를 찾는 CT 작업장",
    decomposition: [
      {
        title: "모래시계 분해안",
        brief:
          "기존 모래시계 CT에서 불필요하게 세밀한 물리값을 줄이고, 프로세스 판단에 필요한 상수와 변수만 남긴 기준 분해안이다.",
        chart: finalHourglassDecompositionChart,
      },
      {
        title: "타코야끼 굽기 프로세스 분해안",
        brief:
          "반죽을 팬에 붓는 순간부터 익힘 시간이 시작되고, 재료를 넣은 뒤 사용자가 굴리기를 반복해 접촉면을 바꾸면서 전면이 기준 이상 익은 타코야끼로 완성한 뒤 팬에서 꺼내는 프로세스이다.",
        chart: takoyakiDecompositionChart,
      },
    ],
    patternRecognition: {
      overview:
        "분해안의 저수준 값을 그대로 비교하지 않고, 여러 메트릭이 함께 만드는 작동 속성을 찾는다. 비교 속성은 두 대상 모두에 있어야 하는 조건이 아니다. 한쪽에만 강하게 나타나는 속성은 다른 쪽을 X로 두어, 공통 구조뿐 아니라 결정적인 차이 구조까지 드러낸다.",
      rows: [
        {
          property: "시작 입력이 시간 기반 진행을 활성화한다",
          hourglass: {
            text:
              "뒤집는 순간 측정 상태가 열리고, 경과 시간과 목표 측정 시간이 의미를 갖기 시작한다.",
            metrics: ["state", "top_amount", "bottom_amount", "elapsed_time", "target_duration"],
          },
          takoyaki: {
            text:
              "반죽이 팬에 닿는 순간 조리 시간이 시작되고, 이후 익힘과 탐이 시간에 따라 진행된다.",
            metrics: ["pan_temperature", "target_heat_range", "batter_amount", "ingredient_amount", "cook_time"],
          },
          commonPattern:
            "둘 다 특정 입력 이후 시간 경과가 핵심 진행값을 바꾸기 시작한다.",
          differencePattern:
            "모래시계의 시작은 측정을 여는 신호이고, 타코야끼의 시작은 재료가 열에 들어가 되돌리기 어려운 조리가 시작되는 사건이다.",
        },
        {
          property: "고정된 총량이 진행 전체를 정의한다",
          hourglass: {
            text:
              "전체 단위량과 이동 속도가 목표 측정 시간을 만들고, 위쪽/아래쪽 양의 분포가 전체 진행 범위를 이룬다.",
            metrics: ["total_amount", "transfer_rate", "target_duration", "top_amount", "bottom_amount"],
          },
          takoyaki: {
            text: "X",
            metrics: [],
          },
          commonPattern:
            "공통 패턴이 아니다.",
          differencePattern:
            "모래시계는 전체 진행량이 사전에 닫혀 있지만, 타코야끼는 반죽 양이 있어도 전체 표면이 어떻게 익을지는 접촉면 변화와 조리 과정에 의해 결정된다.",
        },
        {
          property: "시간 경과가 상태를 자동으로 변화시킨다",
          hourglass: {
            text:
              "시간이 지날수록 위쪽 양은 줄고 아래쪽 양은 늘어나며, 진행률과 남은 시간이 계산된다.",
            metrics: ["elapsed_time", "top_amount", "bottom_amount", "progress_ratio", "remaining_time"],
          },
          takoyaki: {
            text:
              "시간이 지날수록 현재 팬에 닿은 표면이 익고, 너무 오래 닿은 면은 탄다.",
            metrics: ["cook_time", "contact_time", "cooked_surface_coverage", "burn_degree"],
          },
          commonPattern:
            "둘 다 시간 경과만으로 내부 상태가 자동 갱신된다.",
          differencePattern:
            "모래시계의 자동 변화는 완료를 향한 안정적인 이동이고, 타코야끼의 자동 변화는 익힘과 탐이 함께 진행되는 품질 변화이다.",
        },
        {
          property: "고정된 흐름 제어 구조가 진행 속도를 결정한다",
          hourglass: {
            text:
              "연결 통로의 이동 속도가 전체 진행 속도를 제한하고, 목표 측정 시간과 연결된다.",
            metrics: ["transfer_rate", "target_duration", "total_amount"],
          },
          takoyaki: {
            text: "X",
            metrics: [],
          },
          commonPattern:
            "공통 패턴이 아니다.",
          differencePattern:
            "모래시계는 구조가 흐름 속도를 거의 고정하지만, 타코야끼는 고정 통로 같은 단일 속도 제어 구조가 아니라 팬 온도와 접촉면 변화가 조리 결과를 조건짓는다.",
        },
        {
          property: "현재 처리 위치가 다음 상태 변화를 결정한다",
          hourglass: {
            text:
              "위쪽에 있는 양만 아래쪽으로 이동할 수 있고, 위/아래 분포가 곧 진행 상태가 된다.",
            metrics: ["top_amount", "bottom_amount"],
          },
          takoyaki: {
            text:
              "팬에 닿은 표면 영역만 직접 익고, 현재 방향이 보이는 면과 접촉면을 나누어 다음 익힘 대상을 정한다.",
            metrics: ["rotation_index", "visible_area", "contact_area", "contact_surface_ratio", "contact_time"],
          },
          commonPattern:
            "둘 다 전체 대상이 한꺼번에 같은 방식으로 변하지 않고, 현재 처리 위치에 놓인 부분이 먼저 변한다.",
          differencePattern:
            "모래시계의 처리 위치는 위/아래 두 영역으로 고정되고, 타코야끼의 처리 위치는 굴림 방향에 따라 바뀌는 접촉면이다.",
        },
        {
          property: "사용자 개입이 진행 구조를 바꾼다",
          hourglass: {
            text: "X",
            metrics: [],
          },
          takoyaki: {
            text:
              "사용자가 굴릴 때마다 방향이 바뀌고, 그 결과 보이는 면과 팬에 닿는 면이 달라진다.",
            metrics: ["rotation_index", "visible_area", "contact_area", "cooked_surface_coverage"],
          },
          commonPattern:
            "공통 패턴이 아니다.",
          differencePattern:
            "모래시계는 시작 후 기다리는 구조이고, 타코야끼는 기다리기만 하면 한 면만 익거나 타므로 반복 개입이 진행 구조 자체를 바꾼다.",
        },
        {
          property: "반복 개입이 전체 표면 처리 범위를 만든다",
          hourglass: {
            text: "X",
            metrics: [],
          },
          takoyaki: {
            text:
              "한 번에 아래쪽 일부만 팬에 닿으므로, 전체 겉면을 익히려면 방향을 바꾸는 굴리기를 반복해야 한다.",
            metrics: ["rotation_index", "contact_surface_ratio", "contact_area", "cooked_surface_coverage"],
          },
          commonPattern:
            "공통 패턴이 아니다.",
          differencePattern:
            "모래시계는 반복 개입 없이 전체 진행이 완성되지만, 타코야끼는 반복 개입이 전체 표면 커버리지를 만든다.",
        },
        {
          property: "진행 상태가 외부에서 관찰된다",
          hourglass: {
            text:
              "위쪽과 아래쪽의 양 변화가 그대로 보이고, 이를 통해 진행률과 남은 시간을 읽는다.",
            metrics: ["top_amount", "bottom_amount", "progress_ratio", "remaining_time"],
          },
          takoyaki: {
            text:
              "위쪽에 드러난 표면의 익은 정도와 탄 정도가 보이며, 사용자는 이를 보고 계속 굴릴지 꺼낼지 판단한다.",
            metrics: ["visible_area", "cooked_surface_coverage", "burn_degree"],
          },
          commonPattern:
            "둘 다 내부 진행값이 완전히 숨겨져 있지 않고, 외부에서 관찰 가능한 상태 변화로 나타난다.",
          differencePattern:
            "모래시계는 양의 분포가 시간 표시가 되고, 타코야끼는 위쪽에 보이는 표면 상태가 품질 판단의 근거가 된다.",
        },
        {
          property: "관찰 가능한 영역과 실제 진행 영역이 분리된다",
          hourglass: {
            text: "X",
            metrics: [],
          },
          takoyaki: {
            text:
              "사용자는 위쪽에 보이는 표면을 확인하지만, 실제로 익고 있는 것은 팬에 닿은 아래쪽 면이다. 굴리는 순간의 짧은 노출과 이전 상태 기억으로 아래쪽 익힘을 추정해야 한다.",
            metrics: ["visible_area", "contact_area", "rotation_index", "contact_time", "burn_degree"],
          },
          commonPattern:
            "공통 패턴이 아니다.",
          differencePattern:
            "모래시계는 현재 진행 영역과 관찰 영역이 거의 일치하지만, 타코야끼는 보이는 정보와 실제로 익는 위치가 어긋난다.",
        },
        {
          property: "완료 기준이 단일 상태값으로 판정된다",
          hourglass: {
            text:
              "위쪽에 남은 양이 0이 되면 완료 여부가 결정된다. 완료 기준은 단일하고 명확하다.",
            metrics: ["top_amount", "is_finished", "top_amount = 0"],
          },
          takoyaki: {
            text: "X",
            metrics: [],
          },
          commonPattern:
            "공통 패턴이 아니다.",
          differencePattern:
            "모래시계는 단일 완료 조건으로 판정되지만, 타코야끼는 표면 범위와 탄 정도를 함께 보아야 하므로 단일 상태값만으로 완료를 설명하기 어렵다.",
        },
        {
          property: "완료 기준이 품질 판단과 결합된다",
          hourglass: {
            text: "X",
            metrics: [],
          },
          takoyaki: {
            text:
              "익은 표면 범위가 완료 기준에 도달해야 하지만, 탄 정도도 결과 품질 판단에 함께 영향을 준다.",
            metrics: ["cooked_surface_coverage", "target_surface_coverage", "burn_degree"],
          },
          commonPattern:
            "공통 패턴이 아니다.",
          differencePattern:
            "모래시계는 완료 여부만 판단하면 되지만, 타코야끼는 완료 여부와 먹을 만한 품질이 분리되지 않는다.",
        },
        {
          property: "완료 시점 이후 방치하면 결과 품질이 나빠진다",
          hourglass: {
            text: "X",
            metrics: [],
          },
          takoyaki: {
            text:
              "익은 뒤에도 팬에 오래 두면 접촉 시간이 계속 늘고, 탄 정도가 커져 결과 품질이 나빠진다.",
            metrics: ["contact_time", "cook_time", "burn_degree", "is_removed"],
          },
          commonPattern:
            "공통 패턴이 아니다.",
          differencePattern:
            "모래시계는 완료 후 방치해도 측정 결과가 망가지지 않지만, 타코야끼는 완료 시점을 지나면 음식 상태가 품질 저하 쪽으로 변한다.",
        },
        {
          property: "최종 결과가 재료의 물리적 변환으로 남는다",
          hourglass: {
            text: "X",
            metrics: [],
          },
          takoyaki: {
            text:
              "반죽과 재료가 익은 타코야끼라는 조리물로 변환되고, 사용자가 팬에서 꺼내는 순간 결과물이 분리된다.",
            metrics: ["batter_amount", "ingredient_amount", "cooked_surface_coverage", "is_removed"],
          },
          commonPattern:
            "공통 패턴이 아니다.",
          differencePattern:
            "모래시계는 시간을 표시하는 장치이고, 타코야끼 굽기는 재료를 결과물로 변환하는 제작 프로세스이다.",
        },
      ],
      commonSummary:
        "공통으로 볼 수 있는 핵심은 시작 이후 시간이 흐르면 내부 상태가 자동으로 변하고, 현재 처리 위치에 놓인 부분이 먼저 변하며, 진행 상태가 외부에서 관찰된다는 점이다.",
      differenceSummary:
        "결정적 차이는 개입, 품질, 관찰 범위이다. 모래시계는 고정된 총량과 흐름 제어 구조가 단일 완료 조건으로 수렴하는 표시 시스템이다. 타코야끼는 사용자가 접촉면을 반복해서 바꾸어 전체 표면을 익혀야 하고, 보이는 면과 실제로 익는 면이 분리되며, 완료 시점을 지나면 품질이 나빠지는 변환 시스템이다.",
    },
    abstraction: {
      title: "Timed Contact State Rotation Model",
      oneLine:
        "제한 시간 안에서 여러 처리 대상을 동시에 관리하고, 각 대상의 관찰 가능한 표면과 실제 접촉 표면을 회전 입력으로 바꾸며, 약간의 굴림 편차를 포함해 정해진 묶음 단위가 목표 상태에 도달했는지 판정하는 시스템.",
      description:
        "모래시계에서는 제한 시간, 자동 진행, 명확한 종료 판정을 가져오고, 타코야끼에서는 접촉면만 익는 구조와 굴림으로 접촉면을 바꾸는 개입을 가져온다. 또한 실제 굴림처럼 입력 방향과 세기는 유지되지만 결과가 매번 완전히 같은 칸 수로 고정되지는 않는 작은 편차를 남긴다. 반죽 양, 재료 양, 기름칠, 팬 온도 조절 같은 실제 조리 세부값은 제외하고, 가로 3 x 세로 6 배치의 18개 대상, 표면 패널의 상태 변화, 접시 이동, 6개 단위 제출, 제출 통과 3회에 필요한 상태값만 남긴다.",
      elements: [
        {
          key: "1. 대상 배치와 완료 단위",
          text:
            "처리 대상은 격자 안에 여러 개 배치되고, 결과는 개별 대상 하나가 아니라 정해진 개수의 묶음 단위로 확정된다. 이번 모델에서는 가로 3 x 세로 6 배치의 18개 대상이 있고, 접시 위 6개를 제출해 3번 통과해야 전체가 완료된다.",
          tagGroups: [
            { label: "변수", items: ["active_piece_ids", "plate_piece_ids", "completed_plate_count"] },
            { label: "상수", items: ["pan_width_count", "pan_height_count", "takoyaki_count", "plate_capacity", "target_plate_count"] },
          ],
        },
        {
          key: "2. 제한 시간",
          text:
            "수행이 시작되면 남은 가스량이 줄고, 가스가 남아 있는 동안만 불이 유지된다. 시간은 별도의 숫자가 아니라 불을 켜는 연료의 지속 시간으로 표현되며, 모래시계처럼 전체 과정을 닫는 기준이지만 목표 상태 도달을 자동으로 보장하지는 않는다.",
          tagGroups: [
            { label: "변수", items: ["remaining_time", "gas_remaining_ratio"] },
            { label: "상수", items: ["time_limit", "initial_gas_amount"] },
          ],
        },
        {
          key: "3. 표면 분할",
          text:
            "각 대상의 표면을 여러 패널로 나누고, 각 패널은 독립적인 상태 레벨을 가진다. 목표는 제출할 대상들의 충분히 많은 패널을 적정 상태 범위에 넣는 것이다.",
          tagGroups: [
            { label: "변수", items: ["piece_panel_state_levels"] },
            { label: "파생 변수", items: ["surface_panels_by_piece"] },
            { label: "상수", items: ["surface_panel_count", "initial_state_level", "max_state_level", "target_state_range"] },
          ],
        },
        {
          key: "4. 방향 기반 접촉",
          text:
            "각 대상의 현재 방향이 위쪽에 보이는 패널과 아래쪽에서 접촉되는 패널을 나눈다. 접촉 패널은 완전 무작위가 아니라 대상별 방향값으로 결정된다.",
          tagGroups: [
            { label: "변수", items: ["piece_rotation_indices"] },
            { label: "파생 변수", items: ["visible_panels_by_piece", "contact_panels_by_piece"] },
            { label: "상수", items: ["contact_ratio", "rotation_step"] },
          ],
        },
        {
          key: "4-1. 굴림 입력의 작은 불확실성",
          text:
            "사용자는 굴릴 방향과 세기를 정하지만, 실제 결과가 매번 완전히 같은 칸 수로 고정되지는 않는다. 입력값을 기준으로 계산한 회전 단위에 작은 편차가 붙고, 사용자는 회전 직후 드러난 표면을 보고 다음 개입을 다시 판단한다.",
          tagGroups: [
            { label: "변수", items: ["selected_piece_id", "piece_rotation_indices"] },
            { label: "파생 변수", items: ["resolved_rotation_step"] },
            { label: "상수", items: ["rotation_variance_chance", "rotation_variance_step"] },
          ],
        },
        {
          key: "5. 자동 익힘",
          text:
            "시간이 흐르는 동안 팬 위에 남아 있는 대상들의 접촉 패널만 상태 레벨이 올라간다. 같은 패널이 너무 오래 접촉해 있으면 적정 범위를 지나 과처리 상태로 넘어간다.",
          tagGroups: [
            { label: "변수", items: ["piece_panel_state_levels"] },
            { label: "파생 변수", items: ["done_coverage_by_piece", "overdone_coverage_by_piece"] },
            { label: "상수", items: ["state_change_rate", "target_state_range", "overdone_threshold"] },
          ],
        },
        {
          key: "6. 짧은 노출과 추정",
          text:
            "선택한 대상을 회전하는 순간에는 이동하는 면이 잠깐 보인다. 이후 아래쪽 접촉면은 직접 보이지 않으므로, 사용자는 방금 본 상태와 경과 시간을 기억해 처리 정도를 추정한다.",
          tagGroups: [
            { label: "변수", items: ["selected_piece_id", "reveal_timer"] },
            { label: "파생 변수", items: ["is_revealing", "visible_panels_by_piece", "contact_panels_by_piece"] },
            { label: "상수", items: ["reveal_duration"] },
          ],
        },
        {
          key: "7. 팬/접시 위치 이동",
          text:
            "사용자는 팬 위 대상을 눌러 접시로 드래그할 수 있고, 접시 위 대상을 빈 팬 구멍으로 다시 드래그할 수 있다. 접시 위에 있는 대상은 팬에 닿지 않으므로 익힘 상태 갱신에서 제외된다.",
          tagGroups: [
            { label: "변수", items: ["active_piece_ids", "plate_piece_ids", "selected_piece_id"] },
            { label: "상수", items: ["plate_capacity"] },
          ],
        },
        {
          key: "8. 접시 단위 결과 확정",
          text:
            "사용자가 접시 위 6개를 제출하면 시스템은 각 대상의 적정 상태 표면 비율과 과처리 표면 비율을 함께 확인한다. 접시가 통과하면 완료 접시 수가 증가하고, 통과하지 못하면 접시 위 대상은 그대로 남아 다시 팬으로 옮겨 더 구울 수 있다. 제출을 통과한 접시가 3개가 되면 전체가 완료된다.",
          tagGroups: [
            { label: "변수", items: ["plate_piece_ids", "completed_plate_count", "is_finalized"] },
            { label: "파생 변수", items: ["done_coverage_by_piece", "overdone_coverage_by_piece", "is_plate_condition_satisfied"] },
            { label: "상수", items: ["plate_capacity", "required_done_coverage", "max_overdone_coverage", "target_plate_count"] },
          ],
        },
      ],
      variables: [
        { name: "remaining_time", text: "불을 유지할 수 있는 남은 가스 지속 시간" },
        { name: "gas_remaining_ratio", text: "처음 가스량 대비 현재 남은 가스 비율" },
        { name: "active_piece_ids", text: "아직 팬 위에 남아 있어 익힘 상태가 갱신되는 대상 id 목록" },
        { name: "piece_rotation_indices", text: "각 대상이 현재 어느 방향으로 놓여 있는지 나타내는 방향값 목록" },
        { name: "piece_panel_state_levels", text: "각 대상의 표면 패널별 처리 상태 레벨 목록. 타코야끼에 대입하면 각 알의 패널별 익힘 정도가 된다" },
        { name: "selected_piece_id", text: "사용자가 굴리기로 선택한 대상 id" },
        { name: "plate_piece_ids", text: "현재 접시 위에 올라가 있는 대상 id 목록" },
        { name: "completed_plate_count", text: "제출 판정을 통과한 접시 수" },
        { name: "reveal_timer", text: "회전 직후 이동하는 면을 잠깐 보여주는 남은 시간" },
        { name: "is_finalized", text: "성공 또는 시간 초과 실패로 전체 흐름이 닫혔는지 여부" },
      ],
      derivedVariables: [
        { name: "surface_panels_by_piece", text: "각 대상마다 surface_panel_count에 따라 만들어지는 표면 패널 목록" },
        { name: "contact_panels_by_piece", text: "piece_rotation_indices, contact_ratio, surface_panel_count로 계산되는 대상별 현재 접촉 패널" },
        { name: "visible_panels_by_piece", text: "각 대상의 surface_panels 중 contact_panels에 포함되지 않아 위쪽에서 관찰 가능한 패널" },
        { name: "resolved_rotation_step", text: "사용자의 굴림 입력값에 작은 편차를 반영해 실제로 적용된 회전 단위" },
        { name: "is_revealing", text: "reveal_timer가 0보다 큰 동안 true가 되는 짧은 노출 상태" },
        { name: "done_coverage_by_piece", text: "대상별 panel_state_levels 중 target_state_range에 들어온 패널 비율" },
        { name: "overdone_coverage_by_piece", text: "대상별 panel_state_levels 중 overdone_threshold 이상인 패널 비율" },
        { name: "is_plate_condition_satisfied", text: "plate_piece_ids에 포함된 6개 모두가 done_coverage와 overdone_coverage 기준을 만족하는지 여부" },
      ],
      constants: [
        { name: "time_limit", text: "처음 LPG 가스가 불을 유지할 수 있는 전체 지속 시간" },
        { name: "initial_gas_amount", text: "수행 시작 시 제공되는 가스 총량. 이번 모델에서는 time_limit과 같은 역할을 한다" },
        { name: "pan_width_count", text: "팬 구멍의 가로 배치 수. 이번 모델에서는 3" },
        { name: "pan_height_count", text: "팬 구멍의 세로 배치 수. 이번 모델에서는 6" },
        { name: "takoyaki_count", text: "팬에 올라가는 전체 대상 수. pan_width_count x pan_height_count로 계산되며 이번 모델에서는 18" },
        { name: "plate_capacity", text: "한 접시에 담아 제출하는 대상 수. 이번 모델에서는 6" },
        { name: "target_plate_count", text: "완료해야 하는 접시 수. 이번 모델에서는 3" },
        { name: "surface_panel_count", text: "표면을 나누는 패널 개수" },
        { name: "contact_ratio", text: "한 번에 접촉되는 표면 비율. 기본값은 1/2" },
        { name: "initial_rotation_index", text: "수행 시작 시 대상이 놓이는 초기 방향값" },
        { name: "rotation_step", text: "한 번 회전할 때 방향이 바뀌는 단위" },
        { name: "rotation_variance_chance", text: "굴림 입력 결과에 작은 편차가 붙을 확률" },
        { name: "rotation_variance_step", text: "편차가 생겼을 때 회전 단위가 흔들리는 최대 폭" },
        { name: "state_change_rate", text: "접촉 패널의 상태 레벨이 올라가는 속도" },
        { name: "initial_state_level", text: "수행 시작 시 각 패널이 갖는 초기 상태 레벨" },
        { name: "max_state_level", text: "상태 레벨이 올라갈 수 있는 최대값" },
        { name: "target_state_range", text: "완료로 인정하는 상태 레벨 범위. 타코야끼에 대입하면 적정 익힘 범위가 된다" },
        { name: "overdone_threshold", text: "과처리 상태로 판정하는 상태 레벨. 타코야끼에 대입하면 탄 상태 기준이 된다" },
        { name: "reveal_duration", text: "회전 중 표면 상태가 잠깐 드러나는 시간" },
        { name: "required_done_coverage", text: "조건 만족에 필요한 목표 상태 표면 비율" },
        { name: "max_overdone_coverage", text: "허용되는 최대 과처리 표면 비율" },
      ],
      events: [
        {
          condition: "process_start",
          result:
            "remaining_time을 time_limit으로 설정하고, 가로 3 x 세로 6 배치에 18개 대상을 만든다. active_piece_ids를 전체 대상으로 채우고, plate_piece_ids를 빈 목록으로 두며, 각 대상의 piece_panel_state_levels를 initial_state_level로, piece_rotation_indices를 initial_rotation_index로 둔다.",
        },
        {
          condition: "time_tick",
          result:
            "is_finalized가 false이면 remaining_time과 gas_remaining_ratio가 줄어든다. gas_remaining_ratio가 0보다 큰 동안만 불이 유지되고, 회전 중이 아니라면 active_piece_ids에 포함된 대상들의 contact_panels_by_piece만 state_change_rate만큼 증가한다.",
        },
        {
          condition: "rotate_input",
          result:
            "is_finalized가 false이고 remaining_time이 0보다 크면 selected_piece_id를 정하고 reveal_timer를 reveal_duration으로 설정한다. 회전 중에는 panel_state_levels가 변하지 않고, 회전이 끝나면 입력 방향과 세기로 계산한 rotation_step에 작은 편차를 반영한 resolved_rotation_step만큼 선택한 대상의 piece_rotation_indices가 바뀌며 contact_panels_by_piece와 visible_panels_by_piece가 다시 계산된다.",
        },
        {
          condition: "drag_to_plate_input",
          result:
            "팬 위 대상 하나를 selected_piece_id로 정한다. plate_piece_ids 수가 plate_capacity보다 작으면 그 대상을 active_piece_ids에서 제거하고 plate_piece_ids에 추가한다. 접시 위 대상은 다음 time_tick부터 익힘 갱신에서 제외된다.",
        },
        {
          condition: "return_to_pan_input",
          result:
            "접시 위 대상 하나와 빈 팬 구멍 하나를 정한다. 그 대상을 plate_piece_ids에서 제거하고 active_piece_ids에 다시 추가한다. 팬으로 돌아온 대상은 다음 time_tick부터 다시 익힘 갱신 대상이 된다.",
        },
        {
          condition: "plate_submit_input",
          result:
            "plate_piece_ids 수가 plate_capacity이면 그 6개를 plate_candidate로 고정하고 is_plate_condition_satisfied를 계산한다. 통과하면 completed_plate_count를 증가시키고 plate_piece_ids를 빈 목록으로 만든다. 통과하지 못하면 plate_piece_ids를 유지해 사용자가 다시 팬으로 옮길 수 있게 한다. completed_plate_count가 target_plate_count에 도달하면 is_finalized를 true로 둔다.",
        },
        {
          condition: "time_expired",
          result:
            "remaining_time이 0이 되었는데 completed_plate_count가 target_plate_count보다 작으면 is_finalized를 true로 두고 시간 초과 실패로 판정한다.",
        },
      ],
      examples: [
        {
          title: "모래시계에서 가져온 단순화",
          mappings: [
            { name: "제한 시간", value: "전체 수행을 닫는 time_limit으로 변환" },
            { name: "자동 진행", value: "사용자가 아무 입력을 하지 않아도 contact_panels의 상태 변화가 계속 진행" },
            { name: "명확한 종료", value: "결과 확정 또는 시간 종료로 판정 시점이 명확해짐" },
          ],
        },
        {
          title: "타코야끼에서 남긴 조작 구조",
          mappings: [
            { name: "접촉면만 익음", value: "contact_panels만 panel_state_levels가 상승" },
            { name: "굴림", value: "rotation_index를 바꾸어 visible_panels와 contact_panels를 재배치" },
            { name: "접시 이동", value: "팬의 알을 접시로 옮기거나 접시의 알을 팬으로 되돌릴 수 있음" },
            { name: "접시 제출", value: "접시 위 6개를 제출하고 done_coverage와 overdone_coverage를 함께 판단" },
          ],
        },
        {
          title: "모델에서 제외한 실제 조리 요소",
          mappings: [
            { name: "반죽 양", value: "표면 패널 상태로 흡수하고 별도 조작값으로 두지 않음" },
            { name: "재료 양", value: "완성 판정에 직접 쓰지 않음" },
            { name: "기름칠/팬 온도 조절", value: "모델 복잡도를 키우는 세부 조리값이므로 이번 모델에서 제외" },
          ],
        },
      ],
    },
    flowchart: {
      overview:
        "가로 3 x 세로 6 팬의 18개 타코야끼 알을 제한 시간 안에 굽고, 접시에 6개씩 올려 제출해 총 3접시를 통과시키는 게임 흐름이다. 게임 타이머 모듈은 전체 남은 시간을 관리하고, 접촉면 상태 갱신 모듈은 팬 위 active_pieces 전체의 현재 contact_panels만 변화시킨다. 사용자는 알 하나를 굴리거나, 팬에서 접시로 옮기거나, 접시에서 팬으로 되돌릴 수 있으며, 제출한 접시가 통과한 횟수가 3이 되면 성공한다.",
      states: [
        {
          name: "시작 전",
          text: "가로 3 x 세로 6 팬, 18개 알, 6개 단위 접시, 제출 통과 3회 목표가 준비되어 있고 game_start 입력을 기다리는 상태.",
        },
        {
          name: "접촉면 상태 갱신",
          text: "팬 위에 남아 있는 active_pieces 전체에서 현재 contact_panels의 panel_state_levels가 자동으로 증가하는 상태.",
        },
        {
          name: "회전 노출",
          text: "rotate_input 직후 reveal_timer가 유지되는 동안 이동 표면이 잠깐 보이는 상태.",
        },
        {
          name: "관찰/판단",
          text: "visible_panels를 보고 아래쪽 contact_panels의 상태를 추정하며 기다릴지, 굴릴지, 접시에 올릴지, 팬으로 되돌릴지, 제출할지 고르는 상태.",
        },
        {
          name: "팬/접시 이동",
          text: "drag_to_plate_input 또는 return_to_pan_input으로 알의 위치가 팬과 접시 사이에서 바뀌는 상태.",
        },
        {
          name: "접시 제출 판정",
          text: "plate_submit_input 이후 접시 위 6개 알의 done_coverage와 overdone_coverage로 접시 통과 여부를 판정하는 상태.",
        },
        {
          name: "종료",
          text: "제출 판정을 통과한 접시가 3개가 되어 성공하거나, 제한 시간 안에 3접시를 통과시키지 못해 실패한 상태.",
        },
      ],
      scenarios: [
        "사용자가 game_start를 입력하면 가로 3 x 세로 6 팬에 18개 takoyaki_piece가 배치되고 remaining_time이 초기화된다.",
        "time_tick마다 게임 타이머 모듈이 실행되어 remaining_time을 줄이고 시간 종료 여부를 확인한다.",
        "remaining_time이 0보다 크면 접촉면 상태 갱신 모듈이 팬 위 active_pieces 전체의 contact_panels를 확인한다.",
        "접촉면 상태 갱신 모듈은 각 active_piece의 contact_panels만 state_change_rate만큼 증가시키고 max_state_level 초과를 제한한다.",
        "접촉면 상태 갱신 모듈은 각 알의 done_coverage와 overdone_coverage를 다시 계산한다.",
        "사용자는 관찰 화면을 보고 계속 기다릴지, 굴릴지, 접시에 올릴지, 팬으로 되돌릴지, 제출할지 판단한다.",
        "rotate_input이 들어오면 선택한 타코야끼 알 하나에 대해 회전 모듈이 실행되고, reveal_timer 동안 이동 표면이 잠깐 보인다.",
        "회전 중에는 panel_state_levels가 변하지 않는다.",
        "회전이 끝나면 선택한 알의 rotation_index가 바뀌고, contact_panels와 visible_panels가 새 방향 기준으로 재계산된다.",
        "drag_to_plate_input이 들어오면 팬 위 알 하나가 접시 슬롯으로 이동하고, 그 알은 active_piece_ids에서 빠져 익힘 갱신 대상에서 제외된다.",
        "return_to_pan_input이 들어오면 접시 위 알 하나가 빈 팬 구멍으로 이동하고, 그 알은 active_piece_ids에 다시 들어가 다음 time_tick부터 다시 익는다.",
        "plate_submit_input이 들어오면 접시 위 알이 6개인지 확인한 뒤 6개를 한 접시 후보로 고정한다.",
        "접시 위 6개 알이 모두 required_done_coverage 이상이고 max_overdone_coverage 이하이면 접시가 통과되고 completed_plate_count가 증가한다.",
        "제출한 접시가 기준을 만족하지 못하면 plate_piece_ids를 유지한 채 접시 미완료를 표시하고, 사용자는 접시 위 알을 팬으로 되돌려 다시 구울 수 있다.",
        "completed_plate_count가 3이 되면, 즉 접시 세 개가 모두 제출 판정을 통과하면 성공으로 종료한다.",
        "remaining_time이 0이 될 때까지 제출 판정을 통과한 접시가 3개가 되지 못하면 시간 초과 실패로 종료한다.",
      ],
      chart: takoyakiGameFlowChart,
    },
  },
  {
    id: "engineering-ct-week-4-image-zettelkasten",
    kind: "ct-process",
    title: "Engineering CT 4주차: 이미지 제텔카스텐 관찰 카드",
    status: "4주차 자동화 프로토타입",
    summary:
      "오프라인/온라인에서 발견한 디자인 이미지를 수집하고, 직접 관찰 기록을 쓴 뒤, 제목/태그 제안과 템플릿 배치까지 이어지는 자동화 공정",
    document: {
      subject: {
        title: "대상 주제 선정",
        body:
          "평소 오프라인이나 온라인에서 눈에 띄는 디자인/조형 이미지를 수집하고, 크롭/조정한 뒤, 메타데이터 또는 출처 정보와 관찰 내용을 기록하여 정해진 시각 템플릿에 배치하는 과정을 자동화한다.",
        shortName: "이미지 제텔카스텐 관찰 카드 제작 자동화",
      },
      records: [
        {
          title: "수행 기록 1",
          body: [
            "길을 가다가 인상적인 재질 위에 페인트로 로고를 그린 간판을 마주했다. 멈춰서 휴대폰 기본 카메라 앱을 켜고, 로고와 재질이 잘 보이도록 줌해서 사진을 찍었다. 집으로 돌아온 뒤 컴퓨터를 켜고, 휴대폰에서 에어드랍으로 사진을 옮겼다. 옮긴 사진을 Figma에 올리고, 원하는 조형이 잘 보이도록 위치를 조정하고 크롭했다. 그 옆에 메모를 작성했다. 촬영 날짜는 기억이 헷갈려 이미지 메타데이터를 확인했고, 당시 어떤 인상을 받았는지 기억을 더듬어 요소, 구성, 상태, 맥락, 효과를 기록했다. 이후 작성된 메모와 사진을 프린트 가능한 PPT 템플릿에 다시 옮기고, 디자인 요소들을 배치했다.",
          ],
        },
        {
          title: "수행 기록 2",
          body: [
            "핀터레스트를 보다가 색 조합과 여백 배치가 마음에 드는 그래픽 이미지를 발견했다. 이미지를 그냥 넘기면 다시 찾기 어려울 것 같아 저장하거나 스크린샷을 찍었다. 이후 컴퓨터에서 해당 이미지를 열고 Figma에 올렸다. 이미지 안에서 내가 관찰하고 싶은 조형 요소가 잘 보이도록 위치를 조정하고 크롭했다. 이미지가 온라인에서 발견된 것이기 때문에 촬영 날짜 대신 발견 날짜, 출처 링크, 저장 위치를 기록했다. 그리고 왜 이 이미지가 눈에 들어왔는지, 어떤 요소와 구성 때문에 좋게 느껴졌는지, 어떤 맥락에서 참고할 수 있을지 메모를 작성했다. 마지막으로 사진과 메모를 프린트 가능한 PPT 템플릿에 다시 배치했다.",
            "이 과정에서도 수행 기록 1과 비슷한 문제가 있었다. 이미지를 발견한 순간에는 인상이 선명하지만, 저장한 뒤 나중에 정리하려고 하면 왜 저장했는지 흐려진다. 또한 핀터레스트, 스크린샷/저장 폴더, Figma, PPT를 오가며 같은 이미지를 반복해서 옮기고 다시 배치해야 했다.",
          ],
        },
      ],
      automationProblem:
        "이미지를 발견한 순간부터 템플릿 카드가 완성되기까지, 앱 전환, 파일 저장/전달, 크롭, 메타데이터 또는 출처 확인, 메모 작성, PPT 재배치가 반복된다.",
      prototypeDescription: {
        paragraphs: [
          "이 프로토타입은 오프라인 또는 온라인에서 발견한 디자인/조형 이미지를 이미지 제텔카스텐 관찰 카드로 만드는 도구이다. 사용자는 먼저 직접 촬영한 사진이나 온라인에서 저장한 이미지를 업로드한다. 이미지를 업로드하면 시스템은 원본 이미지를 화면에 보여주고, 사용자가 관찰하고 싶은 부분이 잘 보이도록 크롭하거나 위치를 조정할 수 있게 한다.",
          "이미지가 관찰 가능한 형태로 정리되면, 시스템은 이미지 파일에서 확인 가능한 정보를 자동으로 불러온다. 오프라인에서 촬영한 사진이라면 촬영 날짜나 파일 정보를 가져오고, 온라인에서 저장한 이미지라면 사용자가 입력한 출처 링크나 발견 날짜를 함께 기록한다. 이 정보는 나중에 왜 이 이미지를 수집했는지 다시 확인할 수 있는 기본 메타데이터가 된다.",
          "다음으로 사용자는 이미지에 대한 관찰 기록을 직접 작성한다. 기록 항목은 요소, 구성, 상태, 맥락, 효과로 나뉜다. 사용자는 각 항목에 대해 짧은 문장을 입력하고, 시스템은 이 내용을 하나의 관찰 메모로 묶는다. 이 단계의 목적은 이미지를 단순히 저장하는 것이 아니라, 사용자가 무엇을 보고 어떤 판단을 했는지 스스로 언어화하는 것이다. 따라서 관찰 기록은 시스템이 대신 작성하지 않는다.",
          "관찰 기록이 작성되면, 시스템은 기록된 문장에서 반복되는 키워드나 조형적 특징을 찾아 카드 제목과 주제 태그를 제안한다. 제목과 주제 태그는 확정값이 아니라 제안값이다. 사용자는 제안된 제목과 태그를 선택할 수도 있고, 선택하지 않을 수도 있으며, 직접 수정하거나 새로 입력할 수도 있다. 최종 카드에는 제목, 수집 시간, 수집 공간, 수집 방식, 출처, 요소 태그, 구성 태그, 상태 태그, 맥락 태그, 효과 태그, 주제 태그, 관찰 문장 같은 정보가 함께 저장된다.",
          "이렇게 쌓인 카드들은 고정된 폴더에 들어가는 것이 아니라, 사용자가 선택한 기준에 따라 다르게 묶여 보인다. 예를 들어 사용자가 묶기 기준으로 주제 태그를 선택하면, 시스템은 카드들을 주제 태그 값별로 묶어 보여준다. 사용자가 수집 공간을 선택하면 장소별로, 수집 방식을 선택하면 오프라인/온라인 수집 방식별로 카드가 묶인다. 하나의 카드가 여러 태그나 메타데이터 값을 가지고 있다면, 그 카드는 여러 그룹에 동시에 포함된다. 즉 카드 묶기는 하나의 위치에 고정되는 폴더 방식이 아니라, 태그와 메타데이터를 기준으로 바뀌는 다중 분류 보기 방식이다.",
          "마지막으로 시스템은 정제된 이미지, 메타데이터, 관찰 기록, 제목, 주제 태그를 정해진 시각 템플릿에 자동으로 배치한다. 사용자는 템플릿 안에서 이미지와 텍스트가 카드 형태로 정리된 결과물을 확인하고, 필요하면 간단히 수정한 뒤 저장하거나 출력용 이미지로 내보낼 수 있다.",
          "이 프로토타입이 자동화하는 핵심은 미감 판단 자체가 아니다. 사용자가 이미지를 발견하고 느끼는 일, 그리고 관찰 내용을 직접 쓰는 일은 사용자의 몫으로 남긴다. 대신 이미지 수집 이후 반복되는 크롭, 정보 확인, 관찰 항목 정리, 제목/주제 태그 제안, 태그 기반 카드 묶기, 템플릿 배치 과정을 하나의 공정으로 묶어, 미감 훈련 기록이 계속 쌓이고 다시 탐색될 수 있게 한다.",
        ],
        flow: [
          "이미지 업로드",
          "크롭/위치 조정",
          "메타데이터/출처 정보 기록",
          "요소·구성·상태·맥락·효과 직접 작성",
          "제목/주제 태그 제안",
          "사용자가 제목/주제 태그 선택 또는 직접 수정",
          "유사 카드 묶기",
          "카드 템플릿 자동 배치",
          "저장/출력",
        ],
      },
    },
    decomposition: [
      {
        title: "이미지 제텔카스텐 관찰 카드 제작 분해안",
        brief:
          "발견 자체는 사용자가 수행하고, 이후 이미지 수집부터 관찰 이미지화, 정보 확인, 직접 관찰 기록, 제목/주제 태그 확정, 기준별 카드 묶음, 출력 템플릿 제작까지의 반복 과업을 분해한다.",
        chart: imageZettelkastenDecompositionChart,
      },
    ],
    patternRecognition: {
      overview:
        "오프라인 간판 촬영 사례와 온라인 이미지 저장 사례는 출발점이 다르지만, 원본 이미지를 수집한 뒤 관찰 가능한 이미지와 기록 카드로 변환한다는 후반 구조가 반복된다.",
      rows: [
        {
          task: "이미지 발견",
          offline: "길에서 재질과 페인트 로고가 인상적인 간판을 발견한다.",
          online: "핀터레스트에서 색 조합과 여백 배치가 좋은 그래픽 이미지를 발견한다.",
          input: "주변 환경 또는 온라인 피드",
          output: "발견 대상, 첫인상",
        },
        {
          task: "이미지 수집",
          offline: "휴대폰 카메라로 조형이 잘 보이도록 촬영한다.",
          online: "이미지를 저장하거나 스크린샷한다.",
          input: "발견 대상",
          output: "원본 이미지",
        },
        {
          task: "작업 환경으로 이동",
          offline: "현장에서 집 또는 컴퓨터가 있는 장소로 이동한다.",
          online: "이미 컴퓨터/온라인 작업 환경에 있으므로 생략된다.",
          input: "현장 상황, 휴대폰 속 원본 사진",
          output: "컴퓨터 작업 가능 상태",
        },
        {
          task: "작업 파일 준비",
          offline: "휴대폰 사진을 컴퓨터로 에어드랍한다.",
          online: "저장 파일이나 스크린샷을 컴퓨터에서 확인한다.",
          input: "원본 이미지",
          output: "작업 가능한 이미지 파일",
        },
        {
          task: "관찰 이미지화",
          offline: "Figma에서 조형이 잘 보이도록 위치를 조정하고 크롭한다.",
          online: "Figma에서 조형 요소가 잘 보이도록 위치를 조정하고 크롭한다.",
          input: "작업 가능한 이미지 파일",
          output: "정제된 이미지",
        },
        {
          task: "정보 확인",
          offline: "이미지 메타데이터로 촬영 날짜와 파일 정보를 확인한다.",
          online: "발견 날짜, 출처 링크, 저장 위치를 확인한다.",
          input: "이미지 파일 또는 출처",
          output: "날짜, 출처, 파일 정보",
        },
        {
          task: "관찰 기록",
          offline: "당시 어떤 인상을 받았는지 떠올리고 요소, 구성, 상태, 맥락, 효과를 직접 기록한다.",
          online: "왜 저장했는지 떠올리고 요소, 구성, 상태, 맥락, 효과를 직접 기록한다.",
          input: "정제된 이미지, 정보, 판단 근거",
          output: "관찰 문장",
        },
        {
          task: "제목/주제 제안",
          offline: "관찰 문장에서 반복 특징을 찾아 제목과 주제 태그 후보를 만든다.",
          online: "관찰 문장에서 반복 특징을 찾아 제목과 주제 태그 후보를 만든다.",
          input: "관찰 문장, 기존 카드 목록",
          output: "제안 제목, 제안 주제 태그, 유사 카드 후보",
        },
        {
          task: "제목/주제 확정",
          offline: "제안값을 선택하거나 직접 수정한다.",
          online: "제안값을 선택하거나 직접 수정한다.",
          input: "제안 제목, 제안 주제 태그, 사용자의 판단",
          output: "확정 제목, 확정 주제 태그",
        },
        {
          task: "기준별 카드 묶기",
          offline: "사용자가 선택한 필드 값별로 카드를 묶어 본다.",
          online: "사용자가 선택한 필드 값별로 카드를 묶어 본다.",
          input: "카드 목록, 카드별 태그/메타데이터, 묶기 기준 필드",
          output: "기준별 카드 묶음",
        },
        {
          task: "출력 템플릿 배치",
          offline: "사진, 메모, 제목, 태그를 카드 템플릿에 배치한다.",
          online: "이미지, 메모, 제목, 태그를 카드 템플릿에 배치한다.",
          input: "정제된 이미지, 정보, 관찰 문장, 확정 제목, 확정 주제 태그",
          output: "출력용 관찰 카드",
        },
      ],
      findings: [
        {
          title: "이미지를 발견한 순간에는 인상이 선명하지만, 기록은 나중에 이루어진다.",
          text: "이 간격 때문에 왜 이 이미지를 찍었는지 또는 저장했는지가 흐려진다.",
        },
        {
          title: "이미지 원본은 항상 관찰 가능한 이미지로 한 번 정제된다.",
          text: "원본 그대로 쓰는 것이 아니라, 관심 있는 조형 요소가 보이도록 크롭하거나 위치를 조정한다.",
        },
        {
          title: "이미지에는 항상 부가 정보가 붙는다.",
          text: "오프라인 이미지는 촬영 날짜 같은 메타데이터가 필요하고, 온라인 이미지는 발견 날짜, 출처 링크, 저장 위치가 필요하다.",
        },
        {
          title: "관찰 기록은 같은 질문 구조를 반복한다.",
          text: "요소, 구성, 상태, 맥락, 효과라는 같은 항목을 반복해서 작성한다.",
        },
        {
          title: "관찰 기록이 쌓이면 비슷한 이미지끼리 제목과 주제 태그를 부여하고 묶는 과정이 반복된다.",
          text: "요소, 구성, 상태, 맥락, 효과 기록에서 반복되는 키워드나 판단 근거를 찾는다. 시스템은 제목과 주제 태그를 제안하고, 사용자는 선택하거나 직접 수정한다. 비슷한 특징을 가진 카드끼리 연결하면 나중에 자신의 미적 기준을 더 쉽게 확인할 수 있다.",
        },
        {
          title: "오프라인에서 발견한 이미지는 작업 환경으로 이동하는 단계가 추가된다.",
          text: "길거리에서 이미지를 발견하고 촬영하는 순간에는 Figma나 PPT 작업을 할 수 없기 때문에, 집이나 컴퓨터가 있는 장소로 이동하는 과정이 필요하다. 온라인에서 발견한 이미지는 이미 컴퓨터/온라인 작업 환경 안에서 발견되는 경우가 많기 때문에 이 단계가 생략된다.",
        },
        {
          title: "최종 결과물은 항상 정해진 템플릿에 배치된다.",
          text: "이미지와 텍스트를 따로 관리하는 것이 아니라, 프린트 가능한 카드 형태로 정리한다.",
        },
      ],
      conclusion:
        "오프라인이든 온라인이든, 눈에 띈 이미지는 원본 이미지로 수집된 뒤, 관찰하기 좋은 형태로 정제되고, 날짜/출처 정보와 관찰 문장이 붙는다. 이후 관찰 기록을 바탕으로 카드 제목과 주제 태그가 제안되고, 사용자가 이를 선택하거나 수정한 뒤, 비슷한 이미지끼리 묶이고 정해진 출력 템플릿 카드로 변환된다.",
      flow: [
        "이미지 발견",
        "이미지 수집",
        "관찰 이미지화",
        "정보 확인",
        "관찰 기록",
        "제목/주제 태그 제안",
        "제목/주제 태그 선택 또는 수정",
        "유사 카드 묶기",
        "템플릿 배치",
      ],
      commonSummary:
        "두 기록 모두 이미지 수집, 관찰 이미지화, 정보 확인, 관찰 기록, 제목/태그 확정, 템플릿 배치가 반복된다. 관찰 기록은 사용자가 직접 쓰고, 시스템은 반복되는 정리와 배치를 보조한다.",
      differenceSummary:
        "오프라인 사례는 현장에서 컴퓨터 작업 환경으로 이동하는 조건부 과업이 추가된다. 온라인 사례는 출처 링크와 저장 위치가 더 중요하다. 두 경우 모두 카드에는 여러 태그/메타데이터가 붙고, 묶음은 선택한 기준 필드의 값별로 생성된다.",
    },
    abstraction: {
      title: "이미지 수집 이후 관찰 카드 제작 공정",
      oneLine:
        "사용자가 발견한 이미지를 업로드하면, 시스템은 정제/정보수집/제목·태그 제안/템플릿 배치를 돕고, 사용자는 관찰 기록과 제목·태그 확정을 직접 수행한다.",
      description:
        "발견 자체와 관찰 판단은 사용자의 몫으로 남기고, 반복되는 이미지 수집 이후 공정을 모듈화한다. 핵심 자동화 대상은 관찰 이미지화, 메타데이터 수집, 제목/주제 태그 제안, 기준별 카드 묶기, 템플릿 배치이다.",
      elements: [
        {
          key: "수집 모듈",
          text: "사용자가 발견한 오프라인/온라인 이미지를 업로드하고, 온라인 이미지라면 출처 정보를 함께 입력한다.",
          tagGroups: [
            { label: "Input", items: ["discovered_image", "source_url"] },
            { label: "Output", items: ["raw_image", "temporary_source_info"] },
          ],
        },
        {
          key: "관찰 이미지화 모듈",
          text: "원본 이미지에서 관찰하고 싶은 조형이 잘 보이도록 크롭, 위치 조정, 확대/축소를 수행한다.",
          tagGroups: [
            { label: "Input", items: ["raw_image"] },
            { label: "Output", items: ["refined_image", "crop_area"] },
          ],
        },
        {
          key: "정보 자동 수집 모듈",
          text: "파일명, 파일 수정일, 촬영 날짜에 해당하는 정보, 발견 날짜, 출처 링크, 저장 위치를 모아 카드 메타데이터로 만든다.",
          tagGroups: [
            { label: "Input", items: ["raw_image", "file_info", "source_url"] },
            { label: "Output", items: ["image_metadata"] },
          ],
        },
        {
          key: "관찰 기록 모듈",
          text: "요소, 구성, 상태, 맥락, 효과 질문에 대해 사용자가 직접 관찰 문장을 작성한다. 시스템은 대신 쓰지 않고 입력 구조만 제공한다.",
          tagGroups: [
            { label: "Input", items: ["refined_image", "image_metadata", "first_impression"] },
            { label: "Output", items: ["observation_note"] },
          ],
        },
        {
          key: "제목/주제 제안 모듈",
          text: "관찰 문장과 기존 카드 목록을 비교해 카드 제목, 주제 태그, 유사 카드 후보를 제안한다.",
          tagGroups: [
            { label: "Input", items: ["observation_note", "existing_cards"] },
            { label: "Output", items: ["suggested_title", "suggested_topic_tags", "similar_card_candidates"] },
          ],
        },
        {
          key: "제목/주제 확정 모듈",
          text: "사용자가 제안된 제목과 태그를 선택하거나, 선택하지 않고 직접 수정 또는 새로 입력한다.",
          tagGroups: [
            { label: "Input", items: ["suggested_title", "suggested_topic_tags"] },
            { label: "Output", items: ["title", "topic_tags"] },
          ],
        },
        {
          key: "카드 그룹핑 모듈",
          text: "사용자가 묶기 기준 필드를 선택하면, 해당 필드의 값별로 카드를 묶어 보여준다. 한 카드가 여러 값을 가지면 여러 그룹에 중복 포함된다.",
          tagGroups: [
            { label: "Input", items: ["cards", "group_by_field"] },
            { label: "Output", items: ["grouped_cards"] },
          ],
        },
        {
          key: "템플릿 배치 모듈",
          text: "정제된 이미지, 메타데이터, 관찰 문장, 제목, 태그를 정해진 카드 템플릿에 자동 배치한다.",
          tagGroups: [
            { label: "Input", items: ["refined_image", "image_metadata", "observation_note", "title", "topic_tags"] },
            { label: "Output", items: ["printable_card"] },
          ],
        },
      ],
      variables: [
        { name: "raw_image", text: "사용자가 업로드한 원본 이미지" },
        { name: "refined_image", text: "크롭과 위치 조정이 끝난 관찰용 이미지" },
        { name: "image_metadata", text: "수집 시간, 공간, 방식, 출처, 파일 정보" },
        { name: "observation_note", text: "요소, 구성, 상태, 맥락, 효과에 대한 사용자 작성 문장" },
        { name: "title", text: "사용자가 확정한 카드 제목" },
        { name: "topic_tags", text: "사용자가 확정한 여러 주제 태그" },
        { name: "group_by_field", text: "사용자가 선택한 카드 묶음 기준 필드" },
      ],
      constants: [
        { name: "observation_fields", text: "요소, 구성, 상태, 맥락, 효과" },
        { name: "card_template", text: "이미지, 메타데이터, 관찰 기록, 제목, 태그가 들어가는 출력 카드 레이아웃" },
        { name: "multi_group_rule", text: "한 카드가 선택 기준에서 여러 값을 가지면 여러 그룹에 중복 포함된다" },
      ],
      events: [
        { condition: "image_uploaded", result: "원본 이미지가 생성되고 관찰 이미지화 단계로 이동한다." },
        { condition: "crop_changed", result: "정제된 이미지와 크롭 영역이 갱신된다." },
        { condition: "observation_saved", result: "제목과 주제 태그 후보가 제안된다." },
        { condition: "title_or_tags_confirmed", result: "확정 제목과 확정 주제 태그가 카드 데이터에 저장된다." },
        { condition: "group_by_field_changed", result: "선택한 필드의 값별로 카드 묶음 보기가 다시 생성된다." },
      ],
      examples: [
        {
          title: "오프라인 간판 카드",
          mappings: [
            { name: "수집 방식", value: "오프라인 촬영" },
            { name: "메타데이터", value: "촬영 날짜, 촬영 위치, 파일 정보" },
            { name: "주제 태그", value: "거친 재질, 손으로 그린 로고, 낮은 채도" },
          ],
        },
        {
          title: "온라인 그래픽 카드",
          mappings: [
            { name: "수집 방식", value: "온라인 저장/스크린샷" },
            { name: "메타데이터", value: "발견 날짜, 출처 링크, 저장 위치" },
            { name: "주제 태그", value: "여백, 색 대비, 단순한 구성" },
          ],
        },
      ],
    },
    flowchart: {
      overview:
        "프로토타입은 이미지 수집 모듈에서 시작한다. 관찰 기록은 사용자가 직접 쓰고, 시스템은 제목/주제 태그 제안, 기준별 그룹핑, 템플릿 배치를 수행한다.",
      states: [
        { name: "수집 중", text: "사용자가 원본 이미지와 출처 정보를 입력하는 상태" },
        { name: "관찰 이미지화", text: "이미지를 크롭하고 관찰 영역을 조정하는 상태" },
        { name: "관찰 기록", text: "사용자가 요소, 구성, 상태, 맥락, 효과를 직접 작성하는 상태" },
        { name: "제안/확정", text: "시스템이 제목과 주제 태그를 제안하고 사용자가 확정하는 상태" },
        { name: "카드 보기", text: "템플릿 카드와 기준별 카드 묶음을 확인하는 상태" },
      ],
      scenarios: [
        "사용자가 오프라인 촬영 사진 또는 온라인 저장 이미지를 업로드한다.",
        "사용자는 관찰하고 싶은 부분이 잘 보이도록 크롭과 위치를 조정한다.",
        "시스템은 파일 정보와 출처 정보를 카드 메타데이터로 모은다.",
        "사용자는 요소, 구성, 상태, 맥락, 효과를 직접 작성한다.",
        "시스템은 관찰 문장을 바탕으로 제목과 주제 태그를 제안한다.",
        "사용자는 제안값을 선택하거나 직접 수정한다.",
        "시스템은 카드 템플릿에 이미지와 텍스트를 자동 배치한다.",
        "사용자가 묶기 기준 필드를 바꾸면 카드들이 해당 필드의 값별로 다시 묶인다.",
      ],
      chart: imageZettelkastenPrototypeFlowChart,
    },
    prototypeNote:
      "이미지를 업로드하고 관찰 영역을 조정한 뒤, 사용자가 요소/구성/상태/맥락/효과를 직접 작성한다. 시스템은 제목과 주제 태그를 제안하고, 선택한 기준 필드별로 카드를 중복 허용 그룹으로 묶어 보여준다.",
  },
  {
    id: "hid-pinned-session-dashboard",
    kind: "pinned-dashboard",
    title: "Pinned Chat Dashboard",
    status: "HID Final",
    summary: "여러 채팅 세션에 흩어진 반복 작업지시를 대시보드에 고정하고, 한 화면에서 바로 입력하는 LLM 채팅 대시보드",
    onePager: {
      user:
        "LLM 채팅 앱을 업무 중간중간 사용하는 사용자. 이 사용자는 번역, 문장 수정, 요약, 포맷 변환처럼 짧은 작업을 필요할 때마다 맡긴다. 작업의 종류와 입력 내용은 매번 조금씩 다르지만, 특정 작업에서는 반복해서 적용하고 싶은 요청 조건이 있다. 예를 들어 “브랜드명은 번역하지 않기”, “Notion에 붙여넣기 좋게 Markdown으로 정리하기”, “비즈니스 이메일처럼 자연스럽게 다듬기” 같은 조건은 한 번 쓰고 끝나는 것이 아니라 이후에도 다시 사용할 가능성이 높다.\n\n다만 이 사용자는 같은 작업을 한 번에 대량으로 처리하는 사람은 아니다. 그래서 별도의 복잡한 반복 작업 모드가 필요하다고 느끼기보다는, 필요할 때 이전에 쓰던 작업지시를 지금 입력에 빠르게 다시 적용하고 싶어 한다.\n\n문제는 간단한 작업을 다시 맡기려는 순간에도 이전에 썼던 요청 조건을 찾거나 다시 입력해야 한다는 점이다. 새 채팅을 만들면 조건을 처음부터 설명해야 하고, 기존 채팅을 이어 쓰면 이전 대화의 맥락이 현재 작업에 섞일 수 있다. 결국 사용자는 가벼운 입력 하나를 처리하려고 할 때마다 새 채팅을 열지, 이전 채팅을 찾을지, 조건을 다시 쓸지 결정해야 한다. 이 준비 과정이 작업의 속도를 끊고, 짧게 끝날 수 있는 요청을 번거롭게 만든다.",
      goal:
        "사용자는 번역, 문장 수정, 요약, 포맷 변환처럼 짧게 끝낼 수 있는 작업을 LLM에게 맡기고 싶다. 이때 매번 요청 조건을 처음부터 다시 설명하거나, 예전에 썼던 채팅을 오래 찾아다니지 않고, 이전에 사용한 작업지시를 지금 입력에 빠르게 다시 적용해 결과를 받고 싶다.\n\n예를 들어 사용자가 새로운 한국어 문장을 비즈니스 영어로 번역하려고 할 때, 과거에 번역했던 채팅 세션을 찾아 헤매지 않아도 되어야 한다. 사용자는 해당 세션을 최대한 빨리 찾아 번역할 문장만 넣고, 이전에 쓰던 조건이 적용된 결과를 빠르게 확인하고 싶다.",
      friction:
        "사용자는 이전에 쓰던 작업지시를 지금 입력에 다시 적용하고 싶다. 하지만 채팅 UX에서는 작업지시가 따로 관리되지 않고, 여러 채팅 세션 안에 대화의 일부로 남아 있다.\n\n그래서 번역, 문장 수정, 요약처럼 반복해서 하는 업무라도 바로 입력을 시작하기 어렵다. 먼저 과거 채팅 목록에서 원하는 작업지시가 들어 있는 세션을 찾아야 하고, 비슷한 제목의 세션이 많으면 여러 채팅을 하나씩 열어보며 확인해야 한다.\n\n이 상황의 핵심 마찰은 다시 쓰고 싶은 작업지시가 여러 채팅 세션에 흩어져 있어, 지금 필요한 작업지시를 바로 찾고 적용하기 어렵다는 점이다.",
      solution: [
        {
          title: "해결해야 할 조건",
          text:
            "해결해야 할 조건은 두 가지로 좁힌다.\n\n- 반복해서 쓰는 작업지시를 다시 사용할 수 있어야 한다.\n- 여러 채팅 세션에 흩어진 작업지시 중 지금 필요한 것을 빠르게 찾고, 바로 입력할 수 있어야 한다.",
        },
        {
          title: "해결안 후보 1. 작업지시 바로가기 방식",
          text:
            "사용자가 반복해서 쓰는 채팅 세션을 바로가기로 저장한다. 이후 같은 작업이 필요해지면 채팅 목록을 뒤지지 않고, 입력창 근처나 사이드바에 있는 “비즈니스 영어 번역”, “Markdown 정리”, “회의록 요약” 같은 바로가기를 누른다. 시스템은 사용자가 누른 바로가기에 연결된 채팅 세션을 열어준다.\n\n사용자는 열린 세션에 새 입력을 넣고, 이전에 쓰던 조건이 적용된 결과를 확인한다. 이 방식은 과거 채팅을 직접 찾아야 하는 부담을 줄여준다. 다만 사용자는 바로가기를 누른 뒤 해당 세션으로 이동해야 한다. 여러 작업을 오가야 할 때는 작업마다 세션 전환이 반복된다.",
        },
        {
          title: "해결안 후보 2. 4분할 고정 세션 대시보드 방식",
          text:
            "사용자가 반복해서 쓰는 채팅 세션을 대시보드 화면에 고정한다. 시스템은 고정된 세션을 최대 4개까지 한 화면에 나누어 보여준다. 각 세션은 독립된 입력창과 결과 영역을 가진다.\n\n사용자가 번역, 요약, 문장 수정처럼 자주 쓰는 작업을 다시 해야 할 때, 과거 채팅 목록을 찾거나 세션 안으로 들어가지 않는다. 대시보드 화면에 이미 열려 있는 해당 패널의 입력창에 바로 내용을 넣는다. 그러면 시스템은 그 세션에 저장된 작업지시를 기준으로 결과를 생성한다.\n\n사용자가 패널을 드래그하면 시스템은 다른 패널을 밀어내며 순서를 바꾼다. 사용자는 더 자주 쓰는 작업을 보기 쉬운 위치에 둘 수 있고, 덜 쓰는 작업은 대시보드에서 제거할 수 있다.\n\n이 방식은 작업지시를 별도의 템플릿으로 새로 만드는 방식이 아니다. 사용자가 이미 쓰고 있던 채팅 세션을 대시보드 화면에 작업대처럼 펼쳐두고, 반복해서 쓰는 업무 세션에 바로 입력할 수 있게 하는 방식이다.",
        },
        {
          title: "비교",
          text:
            "반복해서 쓰는 작업지시를 다시 사용할 수 있는가: 작업지시 바로가기 방식은 가능하다. 바로가기를 누르면 해당 세션으로 이동한다. 4분할 고정 세션 대시보드 방식도 가능하다. 고정된 세션이 대시보드에 계속 열려 있다.\n\n흩어진 세션 중 필요한 작업지시를 빠르게 찾을 수 있는가: 작업지시 바로가기 방식은 가능하다. 다만 바로가기를 선택한 뒤 세션으로 이동해야 한다. 4분할 고정 세션 대시보드 방식은 필요한 세션이 한 화면에 펼쳐져 있다.\n\n바로 입력할 수 있는가: 작업지시 바로가기 방식은 세션이 열린 뒤 입력할 수 있다. 4분할 고정 세션 대시보드 방식은 대시보드 화면에서 바로 입력할 수 있다.\n\n여러 작업을 오갈 때 편한가: 작업지시 바로가기 방식은 작업마다 세션 전환이 필요하다. 4분할 고정 세션 대시보드 방식은 최대 4개 작업을 한 화면에서 오갈 수 있다.\n\n사용자의 행동 비용이 적은가: 작업지시 바로가기 방식은 바로가기 선택 후 입력한다. 4분할 고정 세션 대시보드 방식은 패널 선택 후 입력한다.\n\n핵심 마찰을 직접 해결하는가: 작업지시 바로가기 방식은 과거 채팅 탐색을 줄인다. 4분할 고정 세션 대시보드 방식은 과거 채팅 탐색과 세션 전환을 함께 줄인다.",
        },
        {
          title: "선정 방향",
          text:
            "이 문제에서는 사용자가 과거 채팅을 찾지 않는 것뿐 아니라, 찾은 뒤 세션 안으로 들어가는 과정까지 줄이는 것이 중요하다. 사용자는 반복 작업을 한 번에 많이 처리하려는 것이 아니라, 업무 중간중간 필요한 작업을 빠르게 맡기고 싶어 한다.\n\n따라서 더 적합한 방향은 4분할 고정 세션 대시보드 방식이다. 사용자는 자주 쓰는 세션을 대시보드에 고정해두고, 필요할 때 해당 패널에 바로 입력한다. 이때 문제가 해결되는 순간은 사용자가 원하는 세션을 찾는 순간이 아니라, 이미 펼쳐진 작업 패널에 새 입력을 바로 넣는 순간이다.",
        },
      ],
      scenario: [
        "사용자는 과거에 사용했던 `비즈니스 영어 번역` 채팅 세션을 열어둔 상태에서 시작한다.",
        "사용자는 이 세션을 앞으로도 자주 쓸 것이라고 판단하고, 세션 상단의 `핀` 버튼을 누른다.",
        "시스템은 해당 세션을 대시보드 화면에 고정한다.",
        "사용자는 대시보드 화면으로 이동한다.",
        "대시보드 화면에 `비즈니스 영어 번역` 세션이 하나의 패널로 고정되어 있는 것을 확인한다.",
        "사용자는 같은 방식으로 `Markdown 정리`, `회의록 요약`, `문장 다듬기` 세션도 대시보드에 고정한다.",
        "시스템은 고정된 세션을 최대 4개까지 한 화면에 나누어 보여준다.",
        "사용자는 업무 중 새로운 한국어 문장을 비즈니스 영어로 번역해야 하는 상황을 가정한다.",
        "사용자는 과거 채팅 목록을 열거나 검색하지 않고, 대시보드 화면에 이미 열려 있는 `비즈니스 영어 번역` 패널을 찾는다.",
        "사용자는 해당 패널의 입력창에 새로 번역할 문장을 입력한다. 예: “이번 주 금요일까지 온보딩 플로우 개선안을 공유드리겠습니다. Speak 관련 문구는 다음 회의에서 다시 논의하겠습니다.”",
        "사용자는 전송 버튼을 누른다.",
        "시스템은 해당 세션에 저장되어 있던 기존 작업지시를 기준으로 결과를 생성한다.",
        "사용자는 `Speak`가 브랜드명으로 유지되고, 문장이 비즈니스 영어 톤으로 번역된 것을 확인한다.",
        "사용자는 자주 쓰는 작업의 위치를 바꾸기 위해 `비즈니스 영어 번역` 패널을 드래그한다.",
        "시스템은 다른 패널을 밀어내며 순서를 바꾼다.",
        "사용자는 더 자주 쓰는 작업을 보기 쉬운 위치에 둘 수 있음을 확인한다.",
        "이 시나리오에서 확인해야 하는 핵심은 두 가지다. 먼저 사용자는 반복해서 쓰는 세션을 `핀`으로 대시보드에 꺼내둘 수 있다. 이후에는 과거 채팅 목록을 뒤지지 않고, 대시보드 화면에 펼쳐진 작업 패널에 바로 입력할 수 있다.",
      ],
    },
  },
  {
    id: "engineering-ct-week-3-stopwatch",
    kind: "ct-brief",
    title: "Engineering CT 3주차: 기계식 스톱워치",
    status: "3주차 분해안",
    summary: "기계식 스톱워치를 작동 준비, 측정 시작, 시간 표시, 정지, 리셋 흐름으로 분해한 Mermaid 플로우차트",
    decomposition: [
      {
        title: "기계식 스톱워치 분해안",
        brief:
          "기계식 스톱워치는 크라운을 돌려 측정할 수 있는 시간을 확보하고, 버튼으로 측정을 시작하고 멈춘 뒤, 지나간 시간을 바늘과 눈금으로 보여주는 도구이다.",
        chart: mechanicalStopwatchDecompositionChart,
      },
    ],
    patternRecognition: {
      overview:
        "세 사물을 같은 기준에 억지로 맞추기보다, 분해안에서 보이는 작동 패턴을 먼저 뽑았다. 어떤 패턴은 세 사물 모두에 있고, 어떤 패턴은 한두 사물에만 강하게 나타난다.",
      rows: [
        {
          property: "작동 전에 쓸 수 있는 양을 마련한다",
          hourglass: {
            text: "위쪽에 모래가 놓여 있어야 시간이 흐르는 모습을 만들 수 있다.",
            metrics: ["top_sand_amount"],
          },
          musicBox: {
            text: "태엽을 감아야 실린더가 돌고 음악이 재생된다.",
            metrics: ["wind_level"],
          },
          stopwatch: {
            text: "크라운을 돌려 스프링을 감아야 측정을 시작할 수 있다.",
            metrics: ["wind_level", "available_run_time"],
          },
        },
        {
          property: "작동 가능량이 탄성 에너지로 저장된다",
          hourglass: {
            text: "X",
            metrics: [],
          },
          musicBox: {
            text: "감긴 태엽에 재생할 힘이 저장된다.",
            metrics: ["wind_level", "remaining_duration_sec"],
          },
          stopwatch: {
            text: "감긴 스프링에 측정 중 바늘을 움직일 힘이 저장된다.",
            metrics: ["wind_level", "remaining_run_time"],
          },
        },
        {
          property: "작동 가능량이 물질의 위치로 바로 보인다",
          hourglass: {
            text: "위쪽과 아래쪽 모래의 위치를 보면 얼마나 진행됐는지 바로 알 수 있다.",
            metrics: ["top_sand_amount", "bottom_sand_amount"],
          },
          musicBox: {
            text: "X",
            metrics: [],
          },
          stopwatch: {
            text: "X",
            metrics: [],
          },
        },
        {
          property: "결과가 사물 안에 미리 정해져 있다",
          hourglass: {
            text: "전체 모래 양과 통로 조건이 대략적인 시간 길이를 정한다.",
            metrics: ["target_duration_sec"],
          },
          musicBox: {
            text: "실린더의 핀과 빗살 배열이 재생될 음악을 정한다.",
            metrics: ["pin_count", "tine_index", "frequency_hz"],
          },
          stopwatch: {
            text: "X",
            metrics: [],
          },
        },
        {
          property: "사용자가 끝나는 순간을 직접 정한다",
          hourglass: {
            text: "X",
            metrics: [],
          },
          musicBox: {
            text: "X",
            metrics: [],
          },
          stopwatch: {
            text: "사용자가 정지 버튼을 눌러 측정을 멈춘다.",
            metrics: ["state", "measured_time", "stopped_needle_position"],
          },
        },
        {
          property: "진행 속도를 제한하는 구조가 있다",
          hourglass: {
            text: "좁은 통로가 모래가 떨어지는 속도를 제한한다.",
            metrics: ["flow_rate"],
          },
          musicBox: {
            text: "기어와 회전 구조가 실린더가 도는 속도를 조절한다.",
            metrics: ["cylinder_rpm", "gear_ratio"],
          },
          stopwatch: {
            text: "내부 장치가 바늘이 일정하게 움직이도록 속도를 잡아준다.",
            metrics: ["standard_speed"],
          },
        },
        {
          property: "시각적으로 시간을 확인한다",
          hourglass: {
            text: "모래 양과 위치의 변화로 시간이 지나는 것을 본다.",
            metrics: ["top_sand_amount", "bottom_sand_amount"],
          },
          musicBox: {
            text: "X",
            metrics: [],
          },
          stopwatch: {
            text: "바늘과 눈금을 보고 지난 시간을 확인한다.",
            metrics: ["needle_position", "displayed_time"],
          },
        },
        {
          property: "청각적으로 결과가 나타난다",
          hourglass: {
            text: "X",
            metrics: [],
          },
          musicBox: {
            text: "빗살이 울리며 음악이 들린다.",
            metrics: ["volume_db", "active_note_count"],
          },
          stopwatch: {
            text: "X",
            metrics: [],
          },
        },
        {
          property: "표시값과 작동 가능량이 분리된다",
          hourglass: {
            text: "X",
            metrics: [],
          },
          musicBox: {
            text: "X",
            metrics: [],
          },
          stopwatch: {
            text: "리셋해도 감긴 힘은 남고, 표시된 시간만 0으로 돌아갈 수 있다.",
            metrics: ["remaining_wind", "displayed_time"],
          },
        },
        {
          property: "측정 결과를 멈춘 상태로 보존한다",
          hourglass: {
            text: "X",
            metrics: [],
          },
          musicBox: {
            text: "X",
            metrics: [],
          },
          stopwatch: {
            text: "정지 버튼을 누르면 바늘 위치가 멈춰 측정 결과로 남는다.",
            metrics: ["stopped_needle_position", "measured_time"],
          },
        },
      ],
      commonSummary:
        "세 사물은 모두 작동 전에 쓸 수 있는 양을 마련하고, 그 양이 한 번에 풀리지 않도록 진행 속도를 제한하는 구조를 가진다.",
      differenceSummary:
        "모래시계는 물질의 위치 변화로 시간이 드러나고, 오르골은 감긴 힘을 소리로 바꾸며, 스톱워치는 사용자가 시작과 정지를 조작해 측정 결과를 만든다.",
    },
    abstraction: {
      title: "Elastic Rhythm Output Model",
      oneLine:
        "탄성 에너지를 저장하고, 그 에너지가 풀리는 속도를 제한해 일정한 리듬의 출력으로 바꾸는 모델.",
      description:
        "이 모델은 세 사물을 모두 억지로 포함하지 않는다. 패턴 인식에서 나온 감김, 탄성 에너지, 속도 제한, 일정한 출력 패턴을 선택해 오르골과 기계식 스톱워치에 더 가까운 작동 모델로 추상화한다.",
      elements: [
        {
          key: "A",
          text: "사용자의 입력으로 탄성 에너지가 저장된다.",
          tagGroups: [
            { label: "변수", items: ["stored_energy"] },
            { label: "상수", items: ["max_energy"] },
            { label: "트리거", items: ["charge_input"] },
          ],
        },
        {
          key: "B",
          text: "저장된 에너지는 바로 출력되지 않고, 내부에 남아 있는 작동 가능량이 된다.",
          tagGroups: [
            { label: "변수", items: ["stored_energy", "remaining_energy", "state"] },
            { label: "상수", items: [] },
            { label: "트리거", items: [] },
          ],
        },
        {
          key: "C",
          text: "시작 입력이 들어오면 저장된 에너지가 풀리기 시작한다.",
          tagGroups: [
            { label: "변수", items: ["stored_energy", "state"] },
            { label: "상수", items: [] },
            { label: "트리거", items: ["start_input"] },
          ],
        },
        {
          key: "D",
          text: "속도 제한 구조가 에너지가 한 번에 풀리지 않도록 조절한다.",
          tagGroups: [
            { label: "변수", items: [] },
            { label: "상수", items: ["rate_limiter", "release_rate"] },
            { label: "트리거", items: ["time_tick"] },
          ],
        },
        {
          key: "E",
          text: "조절된 에너지의 풀림이 일정한 리듬을 만든다.",
          tagGroups: [
            { label: "변수", items: ["remaining_energy", "release_progress"] },
            { label: "상수", items: ["rhythm_unit"] },
            { label: "트리거", items: ["time_tick"] },
          ],
        },
        {
          key: "F",
          text: "일정한 리듬은 소리, 바늘 움직임, 빛, 화면 변화 같은 출력으로 나타난다.",
          tagGroups: [
            { label: "변수", items: ["release_progress", "output_value"] },
            { label: "상수", items: ["output_mapping_rule"] },
            { label: "트리거", items: [] },
          ],
        },
        {
          key: "G",
          text: "에너지가 다 풀리면 출력도 멈춘다.",
          tagGroups: [
            { label: "변수", items: ["remaining_energy", "state"] },
            { label: "상수", items: ["completion_threshold"] },
            { label: "트리거", items: [] },
          ],
        },
      ],
      variables: [
        {
          name: "stored_energy",
          text: "저장된 탄성 에너지의 양. 사용자가 감거나 당기는 입력으로 증가한다.",
        },
        {
          name: "remaining_energy",
          text: "아직 풀리지 않고 남아 있는 에너지의 양. 출력이 진행될수록 줄어든다.",
        },
        {
          name: "release_progress",
          text: "저장된 에너지가 얼마나 풀렸는지를 나타내는 진행값.",
        },
        {
          name: "output_value",
          text: "현재 사용자에게 보이거나 들리거나 느껴지는 출력 상태.",
        },
        {
          name: "state",
          text: "시스템의 현재 상태. 예: idle, charged, running, stopped, finished.",
        },
      ],
      constants: [
        {
          name: "max_energy",
          text: "저장할 수 있는 최대 에너지 양.",
        },
        {
          name: "release_rate",
          text: "에너지가 풀리는 기본 속도.",
        },
        {
          name: "rate_limiter",
          text: "에너지가 한 번에 풀리지 않도록 속도를 제한하는 구조.",
        },
        {
          name: "rhythm_unit",
          text: "출력이 한 번 갱신되는 기본 단위.",
        },
        {
          name: "output_mapping_rule",
          text: "에너지의 풀림 정도를 어떤 출력으로 바꿀지 정하는 규칙.",
        },
        {
          name: "completion_threshold",
          text: "에너지가 다 풀렸다고 판단하는 기준값.",
        },
      ],
      events: [
        {
          condition: "if charge_input occurs",
          result: "stored_energy가 max_energy까지 증가한다.",
        },
        {
          condition: "if start_input occurs and stored_energy > 0",
          result: "state가 running이 된다.",
        },
        {
          condition: "if state is running and time_tick occurs",
          result: "remaining_energy가 rate_limiter를 거쳐 release_rate만큼 줄어든다.",
        },
        {
          condition: "if remaining_energy decreases",
          result: "release_progress가 증가한다.",
        },
        {
          condition: "if release_progress changes",
          result: "output_mapping_rule에 따라 output_value가 갱신된다.",
        },
        {
          condition: "if stop_input occurs",
          result: "state가 stopped가 되고 output_value가 현재 상태로 유지된다.",
        },
        {
          condition: "if reset_input occurs",
          result: "output_value가 초기값으로 돌아간다.",
        },
        {
          condition: "if remaining_energy <= 0",
          result: "state가 finished가 되고 출력이 멈춘다.",
        },
      ],
      examples: [
        {
          title: "태엽식 오르골에 대입",
          mappings: [
            { name: "stored_energy", value: "감긴 태엽" },
            { name: "rate_limiter", value: "기어 구조" },
            { name: "rhythm_unit", value: "실린더가 핀을 읽는 간격" },
            { name: "output_value", value: "들리는 음과 멜로디" },
          ],
        },
        {
          title: "기계식 스톱워치에 대입",
          mappings: [
            { name: "stored_energy", value: "감긴 스프링" },
            { name: "rate_limiter", value: "내부 시간 조절 장치" },
            { name: "rhythm_unit", value: "바늘이 일정하게 움직이는 단위" },
            { name: "output_value", value: "바늘 위치와 표시된 시간" },
          ],
        },
        {
          title: "모래시계 제외",
          mappings: [
            { name: "reason", value: "탄성 에너지를 저장하지 않고, 물질의 위치와 중력으로 작동하기 때문" },
          ],
        },
      ],
    },
    flowchart: {
      overview:
        "탄성 에너지를 저장한 뒤 시작 입력으로 풀기 시작하고, 속도 제한 구조를 거쳐 일정한 리듬의 출력으로 바꾸는 흐름이다. reset_input은 에너지 자체를 지우지 않고 output_value와 release_progress만 초기화한다.",
      states: [
        {
          name: "idle",
          text: "아직 탄성 에너지가 저장되지 않은 대기 상태.",
        },
        {
          name: "charged",
          text: "stored_energy가 생겼고, start_input을 기다리는 상태.",
        },
        {
          name: "running",
          text: "remaining_energy가 rate_limiter를 거쳐 줄어들고 output_value가 갱신되는 상태.",
        },
        {
          name: "stopped",
          text: "출력을 멈추고 현재 output_value를 유지하는 상태.",
        },
        {
          name: "finished",
          text: "remaining_energy가 completion_threshold 이하가 되어 출력이 끝난 상태.",
        },
      ],
      scenarios: [
        "시스템은 idle 상태에서 시작하고 stored_energy, remaining_energy, release_progress는 0이다.",
        "사용자가 charge_input을 하면 stored_energy가 증가하고 remaining_energy가 갱신된다.",
        "stored_energy가 0보다 큰 상태에서 start_input이 들어오면 state는 running이 된다.",
        "running 상태에서는 time_tick마다 remaining_energy가 rate_limiter를 거쳐 release_rate만큼 줄어든다.",
        "remaining_energy가 줄어들면 release_progress가 증가하고, output_mapping_rule에 따라 output_value가 갱신된다.",
        "stop_input이 발생하면 state는 stopped가 되고 output_value는 현재 상태로 유지된다.",
        "stopped 상태에서 start_input이 다시 들어오면 남은 remaining_energy로 출력을 이어간다.",
        "reset_input이 발생하면 output_value와 release_progress는 초기값으로 돌아가지만 remaining_energy는 유지된다.",
        "remaining_energy가 completion_threshold 이하가 되면 state는 finished가 되고 출력이 멈춘다.",
      ],
      chart: elasticRhythmOutputFlowChart,
    },
  },
  {
    id: "hourglass-music-box",
    kind: "ct",
    title: "Hourglass + Music Box",
    status: "프로토타입 제작",
    summary: "모래시계와 태엽식 오르골의 공통 구조를 바탕으로, 활시위 에너지가 악보 미로를 따라 빛과 소리로 전개되는 프로토타입",
    decomposition: [
      {
        title: "모래시계 분해안",
        brief:
          "모래시계는 뒤집힌 순간 위쪽에 놓인 정해진 양의 모래가 좁은 통로를 지나 아래쪽으로 떨어지게 하고, 위쪽 모래가 모두 사라진 시점으로 정해진 시간이 지났음을 보여준다.",
        chart: hourglassDecompositionChart,
      },
      {
        title: "태엽식 오르골 분해안",
        brief:
          "태엽식 오르골은 감긴 태엽이 풀리는 힘으로 실린더를 돌리고, 실린더에 박힌 핀이 금속 빗살을 차례대로 튕기면서 정해진 음악을 재생한다.",
        chart: musicBoxDecompositionChart,
      },
    ],
    patternRecognition: {
      overview:
        "분해 단계에서 나온 저수준 값을 그대로 나열하지 않고, 각 값이 사물 안에서 맡는 역할에 이름을 붙였다. 이번 표에서는 결과를 미리 정하는 값, 작동 중 소모되는 값, 진행을 제어하는 값, 출력을 확인하는 값, 종료를 판단하는 값을 분리했다.",
      rows: [
        {
          property: "사전 정의된 결과",
          hourglass: {
            text: "측정이 시작되기 전부터 이 모래시계가 보여줄 시간 길이가 정해져 있다.",
            metrics: ["target_duration_sec"],
          },
          musicBox: {
            text: "재생이 시작되기 전부터 실린더와 빗살 배열 안에 들려줄 음악이 정해져 있다.",
            metrics: ["pin_count", "pin_angle", "pin_x", "tine_index", "frequency_hz"],
          },
          commonPattern: "둘 다 작동 후에 결과가 즉흥적으로 생기는 것이 아니라, 사물 안에 미리 정해진 결과가 시간에 따라 펼쳐진다.",
          differencePattern: "모래시계는 정해진 시간 길이를 펼치고, 오르골은 정해진 음의 순서와 리듬을 펼친다.",
        },
        {
          property: "작동 가능량",
          hourglass: {
            text: "위쪽에 남은 모래와 아래쪽으로 이동한 모래가 현재 얼마나 더 진행될 수 있는지를 나타낸다.",
            metrics: ["total_sand_amount", "top_sand_amount", "bottom_sand_amount", "moved_sand_amount", "remaining_sec"],
          },
          musicBox: {
            text: "태엽 감김 정도와 남은 재생 시간이 현재 얼마나 더 재생될 수 있는지를 나타낸다.",
            metrics: ["wind_level", "max_wind", "expected_duration_sec", "remaining_duration_sec"],
          },
          commonPattern: "둘 다 처음에 확보된 물리량이 작동 중에 줄어들며, 남은 양이 계속 진행할 수 있는 범위를 만든다.",
          differencePattern: "모래시계는 이동할 모래의 양이 줄어들고, 오르골은 감긴 태엽의 양이 줄어든다.",
        },
        {
          property: "진행 제어",
          hourglass: {
            text: "통로 지름, 초당 통과 모래 양, 세워진 각도가 모래가 떨어지는 속도와 안정성을 조절한다.",
            metrics: ["neck_width_mm", "flow_rate", "sand_per_sec", "rotation_angle", "is_blocked"],
          },
          musicBox: {
            text: "기어비, 태엽 풀림 속도, 실린더 회전 속도가 음악이 진행되는 빠르기와 안정성을 조절한다.",
            metrics: ["gear_ratio", "unwind_rate", "output_rpm", "cylinder_rpm"],
          },
          commonPattern: "둘 다 저장된 가능성이 한 번에 풀리지 않도록 흐름이나 회전을 제한하는 값이 있다.",
          differencePattern: "모래시계는 통로와 자세가 흐름을 잡고, 오르골은 기어와 회전 전달이 진행을 잡는다.",
        },
        {
          property: "출력 확인",
          hourglass: {
            text: "남은 비율과 완료 비율이 모래의 변화로 드러나면서 시간이 얼마나 지났는지 보인다.",
            metrics: ["remaining_ratio", "progress_ratio", "elapsed_sec", "remaining_sec", "is_finished"],
          },
          musicBox: {
            text: "실린더 위치와 현재 울리는 음이 소리로 드러나면서 음악이 어디까지 진행됐는지 들린다.",
            metrics: ["cylinder_angle", "cylinder_turn_count", "music_progress", "volume_db", "active_note_count"],
          },
          commonPattern: "둘 다 내부 진행 상태가 사람이 확인할 수 있는 감각적 출력으로 바뀐다.",
          differencePattern: "모래시계는 진행 상태를 시각적으로 확인하게 하고, 오르골은 진행 상태를 청각적으로 확인하게 한다.",
        },
        {
          property: "종료 판정",
          hourglass: {
            text: "위쪽 모래 양, 통과 중인 모래 양, 흐름 여부가 측정 종료를 판단한다.",
            metrics: ["top_sand_amount", "falling_sand_amount", "flow_rate", "is_top_empty", "is_flowing", "is_finished"],
          },
          musicBox: {
            text: "태엽 감김 정도, 실린더 회전 속도, 현재 울리는 음 개수가 재생 종료를 판단한다.",
            metrics: ["wind_level", "remaining_duration_sec", "cylinder_rpm", "active_note_count", "is_finished"],
          },
          commonPattern: "둘 다 더 이상 이동하거나 울릴 상태값이 남지 않으면 끝난다.",
          differencePattern: "모래시계는 이동할 모래가 없어질 때 끝나고, 오르골은 풀릴 힘과 남은 진동이 사라질 때 끝난다.",
        },
      ],
      commonSummary:
        "모래시계와 태엽식 오르골은 모두 사물 안에 미리 정해진 결과를 가지고 있고, 작동이 시작되면 저장된 가능성이 정해진 속도로 줄거나 이동하면서 그 결과를 펼쳐 보인다. 사용자는 그 진행을 감각적 출력으로 확인한다.",
      differenceSummary:
        "모래시계는 정해진 시간 길이를 모래의 시각적 변화로 펼치고, 태엽식 오르골은 정해진 음악을 회전과 진동의 청각적 변화로 펼친다.",
    },
    abstraction: {
      title: "Predefined Sensory Unfolding System",
      oneLine:
        "사전에 정의된 시각적/청각적 결과를 가지고 있으며, 특정 입력으로 작동 가능량을 채운 뒤 일정 시간에 걸쳐 그 가능량을 소모하며 결과를 완성하는 시스템.",
      description:
        "이 모델에서는 모래, 태엽, 실린더, 빗살 같은 물리 부품을 버린다. 대신 사전에 정의된 결과, 특정 입력으로 채워지는 작동 가능량, 시간에 따른 전개, 감상 가능한 출력만 남긴다.",
      elements: [
        {
          key: "A",
          text: "시스템 안에는 감상 가능한 시각적/청각적 결과 패턴이 사전에 정의되어 있다.",
        },
        {
          key: "B",
          text: "B 트리거에 의해 작동 가능량이 채워지거나 설정된다.",
        },
        {
          key: "C",
          text: "C 트리거에 의해 작동 가능량 설정이 중단되고 결과 전개가 시작된다.",
        },
        {
          key: "D",
          text: "시간이 흐르면서 작동 가능량은 줄어들고 진행률은 증가한다.",
        },
        {
          key: "E",
          text: "진행률에 따라 사전에 정의된 시각적/청각적 결과가 함께 변화한다.",
        },
        {
          key: "F",
          text: "작동 가능량이 모두 소진되면 결과가 완성된 상태로 멈춘다.",
        },
      ],
      variables: [
        {
          name: "stored_potential",
          text: "입력으로 채워지거나 설정된 전체 작동 가능량.",
        },
        {
          name: "remaining_potential",
          text: "아직 방출되지 않고 남아 있는 작동 가능량.",
        },
        {
          name: "progress_position",
          text: "사전 정의된 결과가 현재 어디까지 펼쳐졌는지 나타내는 위치.",
        },
        {
          name: "sensory_output",
          text: "현재 사용자가 보고, 듣고, 느낄 수 있는 출력 상태.",
        },
        {
          name: "is_finished",
          text: "작동 가능량이 소진되어 결과의 전개가 끝났는지 나타내는 값.",
        },
      ],
      constants: [
        {
          name: "predefined_result_rule",
          text: "작동 전에 이미 정해져 있는 결과의 구조. 시각 변화, 소리의 흐름, 리듬처럼 전개될 내용을 정한다.",
        },
        {
          name: "release_rate",
          text: "작동 가능량이 시간에 따라 줄어드는 속도.",
        },
        {
          name: "output_mapping_rule",
          text: "진행 위치를 감각적 출력으로 바꾸는 규칙.",
        },
        {
          name: "output_channel",
          text: "출력이 드러나는 감각 경로. visual, auditory, haptic처럼 정의할 수 있다.",
        },
        {
          name: "completion_threshold",
          text: "작동이 끝났다고 판단하는 기준값.",
        },
      ],
      events: [
        {
          condition: "if start_signal occurs",
          result: "stored_potential이 확정되고 progress_position이 시작 위치로 설정된다.",
        },
        {
          condition: "if time passes",
          result: "remaining_potential이 release_rate만큼 줄고 progress_position이 앞으로 이동한다.",
        },
        {
          condition: "if progress_position changes",
          result: "output_mapping_rule에 따라 sensory_output이 갱신된다.",
        },
        {
          condition: "if remaining_potential <= completion_threshold",
          result: "is_finished가 true가 되고 감각적 출력의 전개가 끝난다.",
        },
      ],
      examples: [
        {
          title: "모래시계에 대입",
          mappings: [
            { name: "predefined_result_rule", value: "정해진 시간 길이" },
            { name: "stored_potential", value: "위쪽 모래가 아래로 이동할 수 있는 상태" },
            { name: "sensory_output", value: "위쪽 모래가 줄고 아래쪽 모래가 쌓이는 모습" },
          ],
        },
        {
          title: "태엽식 오르골에 대입",
          mappings: [
            { name: "predefined_result_rule", value: "정해진 음의 순서와 리듬" },
            { name: "stored_potential", value: "감긴 태엽이 회전할 수 있는 상태" },
            { name: "sensory_output", value: "순서대로 울리는 음과 멜로디" },
          ],
        },
      ],
    },
    flowchart: {
      overview:
        "시스템 안에 사전 정의된 시각적/청각적 결과가 있고, 사용자가 작동 가능량을 설정하면 일정 시간에 걸쳐 그 가능량을 소모하며 결과를 완성하는 감상형 진행 인터페이스.",
      states: [
        {
          name: "대기",
          text: "사전 정의된 결과 패턴은 준비되어 있고, 작동 가능량 입력을 기다리는 상태.",
        },
        {
          name: "설정 중",
          text: "결과 패턴이 선택되고, 작동 가능량이 채워지거나 설정되는 상태.",
        },
        {
          name: "전개 중",
          text: "작동 가능량이 줄어들고 진행률이 증가하면서 시각적/청각적 결과가 펼쳐지는 상태.",
        },
        {
          name: "일시정지",
          text: "남은 작동 가능량과 현재 출력 상태를 유지한 채 전개를 멈춘 상태.",
        },
        {
          name: "완료",
          text: "작동 가능량이 소진되어 사전에 정의된 결과가 완성된 상태.",
        },
      ],
      scenarios: [
        "시스템에는 predefined_result_rule이 이미 정해져 있다.",
        "사용자가 채우기 입력을 하면 stored_potential이 증가하거나 설정된다.",
        "사용자가 놓기 또는 시작 입력을 하면 stored_potential이 확정되고 전개 중 상태로 넘어간다.",
        "시간이 흐를 때마다 remaining_potential은 줄고 progress_position은 앞으로 이동한다.",
        "progress_position이 바뀌면 시각적 출력과 청각적 출력이 output_mapping_rule에 맞춰 함께 변화한다.",
        "멈춤 입력이 발생하면 현재 출력 상태를 유지한 채 일시정지하고, 다시 시작 입력이 발생하면 전개를 이어간다.",
        "remaining_potential이 completion_threshold 이하가 되면 완료 상태가 되고, 사용자가 초기화하면 다시 대기 상태로 돌아간다.",
      ],
      chart: sensoryUnfoldingFlowChart,
    },
    prototypeNote:
      "활시위를 당겨 작동 가능량을 정하고, 놓는 순간 에너지 입자가 사전에 정의된 악보 미로를 따라 이동하며 비발디 겨울의 음표와 트리 조명을 함께 완성하는 프로토타입이다.",
  },
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
        "사용자: LLM 채팅 앱으로 같은 형식의 업무를 반복 처리하는 사용자. 예를 들어 업무 문장 번역, 이메일 문체 변환, 회의록 요약처럼 작업 조건은 유지되고 입력값만 계속 바뀌는 일을 자주 한다.\n\n이 사용자는 자연어로 요청하고 결과를 대화로 다듬을 수 있는 채팅 방식에는 익숙하다. 하지만 반복 작업을 같은 채팅에서 계속 처리하면 이전 입력, 결과, 수정 대화가 길게 쌓인다. 반대로 작업마다 새 채팅을 만들면 매번 작업지시를 다시 입력해야 하고, 비슷한 채팅이 왼쪽 히스토리 목록에 계속 늘어난다.",
      goal:
        "사용자는 한 번 정한 작업지시를 유지한 상태에서, 매번 새로운 입력만 넣어 독립적인 결과를 빠르게 얻고 싶다. 결과가 마음에 들지 않을 때는 그 자리에서 추가 대화로 다듬을 수 있어야 하지만, 완료된 작업의 입력과 수정 대화가 다음 작업의 맥락으로 계속 누적되지는 않기를 원한다.\n\n예를 들어 번역 작업에서는 “Speak는 브랜드명으로 처리”, “April은 사람 이름으로 유지”, “Notion 에 바로 붙여넣을 수 있도록 Markdown 으로 작성” 같은 조건은 유지하고, 번역할 문장만 계속 바꿔 넣고 싶다.",
      friction:
        "핵심 마찰은 반복 작업의 실행 단위와 채팅 인터페이스의 기록 단위가 맞지 않는다는 점이다.\n\n반복 작업에서는 작업지시는 유지되지만, 각 입력과 결과는 독립적으로 처리되어도 된다. 사용자는 결과를 받은 뒤 필요하면 추가 대화로 다듬고, 만족하면 그 작업을 끝낸 뒤 다음 입력으로 넘어가고 싶다.\n\n하지만 일반 채팅 인터페이스는 모든 입력, 답변, 수정 대화를 하나의 대화 히스토리로 계속 쌓는다. 같은 채팅을 계속 쓰면 완료된 작업의 기록까지 화면과 맥락에 누적되고, 새 채팅을 계속 만들면 작업지시를 반복 입력해야 하며 히스토리 목록에 비슷한 채팅이 계속 늘어난다.\n\n이 문제는 LLM의 번역 품질이나 기억력 자체보다, 반복 작업을 “고정된 작업지시서 아래의 독립 실행들”로 다루지 못하고 “계속 이어지는 하나의 대화”로 처리하는 인터페이스 구조에서 발생한다.",
      solution: [
        {
          title: "반복 작업 모드",
          text: "반복 작업 모드에서는 채팅을 하나의 긴 대화가 아니라, 작업지시서 아래에서 실행되는 여러 개의 독립 작업으로 다룬다.",
        },
        {
          title: "작업지시서 고정",
          text: "사용자가 반복 작업 모드를 켜면 먼저 작업지시서를 입력하거나 기존 작업지시서를 선택한다. 작업지시서는 현재 세션의 기준으로 고정되고, 이후 사용자는 새 입력값만 넣는다.",
        },
        {
          title: "실행 안의 수정 대화",
          text: "사용자가 새 입력을 보내면 하나의 실행이 시작된다. 실행 안에서는 일반 채팅처럼 결과를 보고 추가 대화로 다듬을 수 있다. 예를 들어 “조금 더 짧게”, “Slack에 붙여넣기 좋게”, “두 번째 문장만 다시 써줘”처럼 수정 요청을 할 수 있다.",
        },
        {
          title: "완료 후 기록 보관",
          text: "사용자가 결과에 만족하면 `완료`를 누른다. 완료된 실행은 현재 작업 흐름에서 빠지고 실행 기록으로 보관된다. 실행 기록에는 제목, 생성 시점, 최종 결과 미리보기만 표시되며, 전체 입력과 수정 대화는 사용자가 해당 기록을 열었을 때만 확인할 수 있다.",
        },
        {
          title: "새 실행 시작",
          text: "다음 입력은 새로운 실행으로 시작된다. 기본적으로 이전 실행의 수정 대화는 다음 실행의 맥락으로 자동 누적되지 않고, 고정된 작업지시서만 참조된다. 단, 사용자가 특정 수정 내용을 이후에도 유지하고 싶다면 작업지시서에 반영하여 고정 조건으로 추가할 수 있다.",
        },
        {
          title: "히스토리 구분",
          text: "왼쪽 히스토리 목록에서는 일반 채팅과 반복 작업 세션을 구분해 보여주어, 사용자가 반복 작업을 원할 때 언제든지 들어가서 작업을 할 수 있다.",
        },
      ],
      scenario: [
        "사용자가 새 채팅에서 반복 작업 모드를 켠다.",
        "작업지시서에 다음 조건을 입력한다. “내가 보내는 한국어 문장은 자연스러운 비즈니스 영어로 번역해줘. Speak는 브랜드명으로 유지하고, April은 사람 이름으로 처리해줘. 결과는 Notion 에 바로 붙여넣을 수 있게 Markdown 형식으로 만들어줘.”",
        "첫 번째 번역할 문장을 입력한다.",
        "시스템이 작업지시서를 참조해 첫 번째 결과를 생성한다.",
        "사용자가 결과를 보고 “조금 더 짧게 줄여줘”라고 입력한다.",
        "시스템이 같은 실행 안에서 결과를 수정한다.",
        "사용자가 만족하면 `완료`를 누른다.",
        "첫 번째 실행이 현재 작업 흐름에서 빠지고 실행 기록에 최종 결과 미리보기로 보관되는 것을 확인한다.",
        "사용자가 두 번째 번역할 문장을 입력한다.",
        "두 번째 입력이 새로운 실행으로 시작되고, 첫 번째 실행의 수정 대화는 자동으로 이어받지 않는 것을 확인한다.",
        "사용자가 실행 기록을 열어 첫 번째 작업의 원문, 수정 대화, 최종 결과를 다시 확인한다.",
        "사용자가 왼쪽 히스토리에서 이 세션이 일반 채팅이 아니라 반복 작업 세션으로 표시되는 것을 확인한다.",
      ],
    },
  },
];
