# Takoyaki Grill Game Plan

## 1. Product Direction

가로 3개, 세로 6개 구멍이 있는 타코야끼 판에서 18개의 타코야끼 알을 동시에 굽고, 접시에 6개씩 올려 제출해 총 3접시를 통과시키는 3D 웹 게임을 만든다.

이 작업은 단순 프로토타입이 아니라 실제 게임처럼 조작감, 피드백, 성능, 상태 구조를 갖춘 playable build를 목표로 한다. 다만 첫 구현 범위는 하나의 완성된 core loop에 집중한다.

## 2. Core Experience

플레이어는 제한 시간 안에서 다음 행동을 반복한다.

1. 팬 위의 타코야끼 상태를 관찰한다.
2. 덜 익은 면이 아래로 가도록 알을 굴린다.
3. 충분히 익었다고 판단한 알을 접시로 드래그한다.
4. 접시 위 6개를 제출한다.
5. 제출 판정이 통과하면 접시 수가 1 증가한다.
6. 제출 판정이 통과하지 못하면 접시 위 알을 다시 팬 구멍으로 옮겨 더 굽는다.
7. 제출 판정을 통과한 접시가 3개가 되면 성공한다.
8. 제한 시간이 끝날 때까지 3접시를 통과시키지 못하면 실패한다.

## 3. Technology Stack

현재 레포의 `React + Vite + TypeScript` 구조를 유지한다.

추가할 주요 패키지는 다음과 같다.

- `three`: WebGL 기반 3D 렌더링
- `@react-three/fiber`: React 안에서 Three.js scene을 선언적으로 구성
- `@react-three/drei`: 카메라, 컨트롤, 환경, 헬퍼 컴포넌트
- `@react-three/rapier`: R3F와 Rapier 물리엔진 연결
- `zustand`: 게임 상태와 UI 상태 관리

기존 `matter-js`는 2D 물리엔진이므로 이번 게임의 주 물리엔진으로 쓰지 않는다.

## 4. Route And File Structure

새 게임은 독립 앱 라우트로 붙인다.

- route: `#/apps/takoyaki-grill-game`
- source root: `src/projects/takoyaki-grill-game/`

초기 파일 구조 목표:

```txt
src/projects/takoyaki-grill-game/
  GAME_PLAN.md
  TakoyakiGrillGame.tsx
  gameStore.ts
  gameTypes.ts
  gameRules.ts
  scene/
    TakoyakiScene.tsx
    GrillPan.tsx
    TakoyakiPiece.tsx
    Plate.tsx
    Lighting.tsx
  ui/
    GameHud.tsx
    PlateStatus.tsx
    ResultOverlay.tsx
```

처음부터 파일을 과하게 쪼개지는 않는다. core loop가 안정된 뒤 위 구조로 분리한다.

## 5. Data Model

### Constants

```ts
pan_width_count = 3
pan_height_count = 6
takoyaki_count = 18
plate_capacity = 6
target_plate_count = 3
surface_panel_count = 8
contact_ratio = 1 / 2
initial_state_level = 0
max_state_level = 10
target_state_min = 7
target_state_max = 8
overdone_threshold = 9
required_done_coverage = 0.75
max_overdone_coverage = 0
```

`surface_panel_count = 8`은 첫 구현 기준이다. 알 하나를 너무 세밀하게 나누면 판정과 시각화가 복잡해지므로, 상/하/좌/우와 그 사이 방향을 포함한 8패널로 시작한다.

### Piece State

```ts
type TakoyakiPiece = {
  id: string;
  location: "pan" | "plate" | "completed";
  panHoleId: string | null;
  plateSlotIndex: number | null;
  rotationIndex: number;
  panelStateLevels: number[];
  revealTimer: number;
};
```

### Game State

```ts
type GameState = {
  phase: "ready" | "playing" | "success" | "fail";
  remainingTime: number;
  pieces: TakoyakiPiece[];
  platePieceIds: string[];
  completedPlateCount: number;
  targetPlateCount: number;
  selectedPieceId: string | null;
  lastPlateResult: "none" | "accepted" | "rejected";
};
```

## 6. Physics Responsibility

물리엔진은 게임 규칙을 판단하지 않는다. Rapier는 조작감과 자연스러운 움직임만 담당한다.

Rapier가 담당하는 것:

- 팬 구멍 안에서 알이 살짝 구르고 자리 잡는 움직임
- 회전 입력 후 알의 회전 애니메이션
- 팬, 알, 접시 사이의 충돌 감각
- 드래그 중 포인터 위치를 따라가는 움직임
- 접시나 팬 구멍에 놓일 때의 정착 애니메이션

게임 로직이 담당하는 것:

- 어떤 알이 팬 위에 있는지
- 어떤 패널이 현재 접촉면인지
- time tick마다 어떤 패널의 익힘 레벨을 올릴지
- 접시 위 알은 익지 않는다는 규칙
- 제출 판정
- 성공/실패 종료

## 7. Cooking Model

시간이 흐르면 팬 위에 있는 알만 익는다. 접시 위 알과 완료 처리된 알은 익힘 갱신 대상에서 제외된다.

각 알은 `rotationIndex`를 가지고, 이 값으로 `contactPanels`와 `visiblePanels`를 계산한다.

첫 구현 규칙:

```ts
contactPanelCount = surface_panel_count * contact_ratio // 4
contactPanels = panelsFromRotation(rotationIndex, contactPanelCount)
visiblePanels = allPanels - contactPanels
```

`time_tick`마다:

1. `remainingTime`을 감소시킨다.
2. `location === "pan"`인 알을 찾는다.
3. 각 알의 `contactPanels`만 `state_change_rate`만큼 증가시킨다.
4. 각 패널은 `max_state_level`을 넘지 않는다.
5. `doneCoverage`와 `overdoneCoverage`는 필요할 때 파생 계산한다.

레벨 의미:

- 0-6: 덜 익음
- 7: 적당히 익음
- 8: 까무잡잡하게 익음
- 9: 탄 상태
- 10: 심하게 탄 상태

## 8. Interaction Design

### rotate_input

팬 위 알을 클릭하거나 짧게 드래그하면 굴리기 입력으로 본다.

처리:

1. `selectedPieceId`를 지정한다.
2. 회전 애니메이션을 시작한다.
3. 회전 중에는 익힘 레벨을 증가시키지 않는다.
4. 짧은 reveal 동안 지나가는 표면을 보여준다.
5. 회전 완료 시 `rotationIndex`를 갱신한다.
6. 새 `contactPanels`와 `visiblePanels`를 계산한다.

### drag_to_plate_input

팬 위 알을 길게 누르거나 드래그해서 접시 슬롯에 올린다.

처리:

1. 접시에 빈 슬롯이 있는지 확인한다.
2. 있으면 `location = "plate"`로 바꾼다.
3. `active_piece_ids` 역할을 하는 팬 위 목록에서 제외한다.
4. `platePieceIds`에 추가한다.
5. 다음 tick부터 익힘이 멈춘다.

### return_to_pan_input

접시 위 알을 드래그해서 빈 팬 구멍에 다시 놓는다.

처리:

1. 빈 팬 구멍을 확인한다.
2. `location = "pan"`으로 바꾼다.
3. `platePieceIds`에서 제거한다.
4. 다음 tick부터 다시 익는다.

### plate_submit_input

접시 위 알 6개를 제출한다.

처리:

1. `platePieceIds.length === plate_capacity`인지 확인한다.
2. 6개가 아니면 제출을 거부하고 게임은 계속된다.
3. 6개면 각 알의 `doneCoverage`와 `overdoneCoverage`를 계산한다.
4. 6개 모두 기준을 만족하면 접시 통과.
5. 접시 통과 시 `completedPlateCount += 1`, 6개 알은 `completed` 처리, `platePieceIds = []`.
6. 접시가 통과하지 못하면 `lastPlateResult = "rejected"`로 두고, `platePieceIds`는 유지한다.
7. `completedPlateCount === targetPlateCount`이면 성공 종료.

## 9. Visual Direction

전체 화면은 게임 화면이어야 한다. 랜딩 페이지나 설명 화면을 만들지 않는다.

첫 화면 구성:

- 중앙: 3D 타코야끼 팬
- 팬 위: 가로 3 x 세로 6 구멍과 18개 알
- 오른쪽 또는 아래: 6칸 접시
- 상단 HUD: 남은 시간, 통과한 접시 수, 현재 접시 개수
- 제출 버튼: 접시에 6개가 있을 때만 활성
- 결과 오버레이: 성공 / 실패

시각화 원칙:

- 알의 보이는 면은 익힘 레벨에 따라 색이 변한다.
- 익힘 레벨 7-8은 맛있게 익은 갈색으로 보인다.
- 익힘 레벨 9-10은 명확하게 탄 색으로 보인다.
- 숨겨진 점수 수치를 직접 노출하지 않는다.
- 플레이어는 보이는 면과 기억으로 판단한다.

## 10. Performance Budget

첫 구현은 저사양 노트북에서도 부드럽게 돌아가는 것을 기준으로 한다.

- 타코야끼 알: 18개 고정
- rigid body 수: 18개 알 + 팬 collider + 접시 collider 수준으로 제한
- 그림자: 부드럽지만 과하지 않게 사용
- postprocessing은 첫 구현에서 제외
- 3D 모델은 직접 만든 primitive geometry로 시작
- 텍스처는 필요하면 작은 procedural texture 또는 CSS/Canvas generated texture 사용

## 11. Implementation Milestones

### Milestone 1: Skeleton

- route `#/apps/takoyaki-grill-game` 추가
- 빈 3D scene 렌더링
- 팬, 접시, HUD 배치
- 패키지 설치와 빌드 확인

완료 기준:

- 로컬 서버에서 새 라우트가 열린다.
- 3D canvas가 비어 있지 않다.
- 빌드가 통과한다.

### Milestone 2: Board And Pieces

- 가로 3 x 세로 6 팬 구멍 생성
- 18개 알 생성
- 알별 상태값 초기화
- 기본 카메라와 조명 확정

완료 기준:

- 18개 알이 안정적으로 보인다.
- 화면 크기가 바뀌어도 팬과 접시가 잘리지 않는다.

### Milestone 3: Cooking Loop

- global timer 구현
- 팬 위 알의 contact panels 익힘 갱신
- visible panels 색상 반영
- 접시 위 알은 익지 않음

완료 기준:

- 기다리면 팬 위 알의 보이는 상태가 변한다.
- 접시 위 알은 상태가 변하지 않는다.

### Milestone 4: Rotate And Reveal

- 팬 위 알 회전 입력 구현
- 회전 중 익힘 정지
- 짧은 reveal 애니메이션
- 회전 후 contact/visible panels 재계산

완료 기준:

- 알 하나를 굴리면 보이는 면이 바뀐다.
- 회전 중에는 익힘 레벨이 증가하지 않는다.

### Milestone 5: Plate Drag

- 팬에서 접시로 드래그
- 접시에서 빈 팬 구멍으로 드래그
- 접시 슬롯 6개 제한
- 위치 이동 시 상태 유지

완료 기준:

- 알을 접시에 올릴 수 있다.
- 접시 알을 다시 팬에 넣을 수 있다.
- 접시에 6개 이상 올라가지 않는다.

### Milestone 6: Submit And End Conditions

- 접시 제출 판정
- 제출 실패 시 접시 유지
- 제출 통과 시 접시 비우기, 완료 접시 수 증가
- 3접시 통과 성공
- 시간 종료 실패

완료 기준:

- 제출이 통과/거부로 갈린다.
- 접시 3개가 모두 통과하면 성공한다.
- 시간이 끝나면 실패한다.

### Milestone 7: Production Polish

- 모바일/데스크톱 반응형 조정
- 입력 피드백 강화
- 성공/실패 오버레이
- 사운드 또는 햅틱성 시각 피드백 검토
- Playwright screenshot QA
- canvas nonblank check

완료 기준:

- 데스크톱과 모바일에서 주요 UI가 겹치지 않는다.
- 3D scene이 정상적으로 렌더링된다.
- 핵심 조작이 끊기지 않는다.

## 12. Immediate Next Goal

다음 구현 목표는 Milestone 1이다.

구체적으로는 패키지를 설치하고, `#/apps/takoyaki-grill-game` 라우트에 빈 3D scene, 팬의 기본 형태, 접시 영역, HUD 자리만 만든다. 게임 규칙은 아직 넣지 않는다. 먼저 렌더링 기반과 프로젝트 구조를 안정화한다.

## 13. References

- Three.js: https://threejs.org/
- React Three Fiber: https://r3f.docs.pmnd.rs/getting-started/introduction
- Drei: https://drei.docs.pmnd.rs/
- Rapier: https://rapier.rs/
- React Three Rapier: https://pmndrs.github.io/react-three-rapier/
- Zustand: https://zustand.docs.pmnd.rs/
