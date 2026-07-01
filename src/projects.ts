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

type PinnedHomeProject = {
  id: string;
  kind: "pinned-home";
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

export type Project = QueueProject | GlossaryProject | PinnedHomeProject | CtProject | CtBriefProject | CtProcessProject;

export const projects: Project[] = [
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
    id: "hid-pinned-session-home",
    kind: "pinned-home",
    title: "Pinned Session Home",
    status: "HID Final",
    summary: "여러 채팅 세션에 흩어진 반복 작업지시를 홈에 고정하고, 한 화면에서 바로 입력하는 LLM 채팅 홈",
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
          title: "해결안 후보 2. 4분할 고정 세션 홈 방식",
          text:
            "사용자가 반복해서 쓰는 채팅 세션을 홈 화면에 고정한다. 시스템은 고정된 세션을 최대 4개까지 한 화면에 나누어 보여준다. 각 세션은 독립된 입력창과 결과 영역을 가진다.\n\n사용자가 번역, 요약, 문장 수정처럼 자주 쓰는 작업을 다시 해야 할 때, 과거 채팅 목록을 찾거나 세션 안으로 들어가지 않는다. 홈 화면에 이미 열려 있는 해당 패널의 입력창에 바로 내용을 넣는다. 그러면 시스템은 그 세션에 저장된 작업지시를 기준으로 결과를 생성한다.\n\n사용자가 패널을 드래그하면 시스템은 다른 패널을 밀어내며 순서를 바꾼다. 사용자는 더 자주 쓰는 작업을 보기 쉬운 위치에 둘 수 있고, 덜 쓰는 작업은 홈에서 제거할 수 있다.\n\n이 방식은 작업지시를 별도의 템플릿으로 새로 만드는 방식이 아니다. 사용자가 이미 쓰고 있던 채팅 세션을 홈 화면에 작업대처럼 펼쳐두고, 반복해서 쓰는 업무 세션에 바로 입력할 수 있게 하는 방식이다.",
        },
        {
          title: "비교",
          text:
            "반복해서 쓰는 작업지시를 다시 사용할 수 있는가: 작업지시 바로가기 방식은 가능하다. 바로가기를 누르면 해당 세션으로 이동한다. 4분할 고정 세션 홈 방식도 가능하다. 고정된 세션이 홈에 계속 열려 있다.\n\n흩어진 세션 중 필요한 작업지시를 빠르게 찾을 수 있는가: 작업지시 바로가기 방식은 가능하다. 다만 바로가기를 선택한 뒤 세션으로 이동해야 한다. 4분할 고정 세션 홈 방식은 필요한 세션이 한 화면에 펼쳐져 있다.\n\n바로 입력할 수 있는가: 작업지시 바로가기 방식은 세션이 열린 뒤 입력할 수 있다. 4분할 고정 세션 홈 방식은 홈 화면에서 바로 입력할 수 있다.\n\n여러 작업을 오갈 때 편한가: 작업지시 바로가기 방식은 작업마다 세션 전환이 필요하다. 4분할 고정 세션 홈 방식은 최대 4개 작업을 한 화면에서 오갈 수 있다.\n\n사용자의 행동 비용이 적은가: 작업지시 바로가기 방식은 바로가기 선택 후 입력한다. 4분할 고정 세션 홈 방식은 패널 선택 후 입력한다.\n\n핵심 마찰을 직접 해결하는가: 작업지시 바로가기 방식은 과거 채팅 탐색을 줄인다. 4분할 고정 세션 홈 방식은 과거 채팅 탐색과 세션 전환을 함께 줄인다.",
        },
        {
          title: "선정 방향",
          text:
            "이 문제에서는 사용자가 과거 채팅을 찾지 않는 것뿐 아니라, 찾은 뒤 세션 안으로 들어가는 과정까지 줄이는 것이 중요하다. 사용자는 반복 작업을 한 번에 많이 처리하려는 것이 아니라, 업무 중간중간 필요한 작업을 빠르게 맡기고 싶어 한다.\n\n따라서 더 적합한 방향은 4분할 고정 세션 홈 방식이다. 사용자는 자주 쓰는 세션을 홈에 고정해두고, 필요할 때 해당 패널에 바로 입력한다. 이때 문제가 해결되는 순간은 사용자가 원하는 세션을 찾는 순간이 아니라, 이미 펼쳐진 작업 패널에 새 입력을 바로 넣는 순간이다.",
        },
      ],
      scenario: [
        "사용자는 과거에 사용했던 `비즈니스 영어 번역` 채팅 세션을 열어둔 상태에서 시작한다.",
        "사용자는 이 세션을 앞으로도 자주 쓸 것이라고 판단하고, 세션 상단의 `핀` 버튼을 누른다.",
        "시스템은 해당 세션을 홈 화면에 고정한다.",
        "사용자는 홈 화면으로 이동한다.",
        "홈 화면에 `비즈니스 영어 번역` 세션이 하나의 패널로 고정되어 있는 것을 확인한다.",
        "사용자는 같은 방식으로 `Markdown 정리`, `회의록 요약`, `문장 다듬기` 세션도 홈에 고정한다.",
        "시스템은 고정된 세션을 최대 4개까지 한 화면에 나누어 보여준다.",
        "사용자는 업무 중 새로운 한국어 문장을 비즈니스 영어로 번역해야 하는 상황을 가정한다.",
        "사용자는 과거 채팅 목록을 열거나 검색하지 않고, 홈 화면에 이미 열려 있는 `비즈니스 영어 번역` 패널을 찾는다.",
        "사용자는 해당 패널의 입력창에 새로 번역할 문장을 입력한다. 예: “이번 주 금요일까지 온보딩 플로우 개선안을 공유드리겠습니다. Speak 관련 문구는 다음 회의에서 다시 논의하겠습니다.”",
        "사용자는 전송 버튼을 누른다.",
        "시스템은 해당 세션에 저장되어 있던 기존 작업지시를 기준으로 결과를 생성한다.",
        "사용자는 `Speak`가 브랜드명으로 유지되고, 문장이 비즈니스 영어 톤으로 번역된 것을 확인한다.",
        "사용자는 자주 쓰는 작업의 위치를 바꾸기 위해 `비즈니스 영어 번역` 패널을 드래그한다.",
        "시스템은 다른 패널을 밀어내며 순서를 바꾼다.",
        "사용자는 더 자주 쓰는 작업을 보기 쉬운 위치에 둘 수 있음을 확인한다.",
        "이 시나리오에서 확인해야 하는 핵심은 두 가지다. 먼저 사용자는 반복해서 쓰는 세션을 `핀`으로 홈에 꺼내둘 수 있다. 이후에는 과거 채팅 목록을 뒤지지 않고, 홈 화면에 펼쳐진 작업 패널에 바로 입력할 수 있다.",
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
