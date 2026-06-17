# Hourglass + Music Box 추상화 v0.1

## 한 문장 추상화 모델

시스템은 내부에 저장된 작동 가능량을 시간에 따라 방출하고, 사전에 정의된 결과 규칙에 맞춰 그 과정을 감상 가능한 감각적 출력으로 펼친다.

## 모델 이름

`Predefined Sensory Unfolding System`

## 설명

이 모델에서는 모래, 태엽, 실린더, 빗살 같은 물리 부품을 버린다. 대신 작동 전에 정해진 결과, 그 결과를 펼칠 수 있는 작동 가능량, 그리고 사용자가 확인하거나 감상하는 감각적 출력만 남긴다.

## 변수

| 변수 | 설명 |
|---|---|
| `stored_potential` | 시스템 안에 확보된 작동 가능량. 작동이 시작되면 시간이 지나며 줄어든다. |
| `remaining_potential` | 아직 방출되지 않고 남아 있는 작동 가능량. |
| `progress_position` | 사전에 정의된 결과가 현재 어디까지 펼쳐졌는지 나타내는 위치. |
| `sensory_output` | 현재 사용자가 보고, 듣고, 느낄 수 있는 출력 상태. |
| `is_finished` | 작동 가능량이 소진되어 결과의 전개가 끝났는지 나타내는 값. |

## 상수

| 상수 | 설명 |
|---|---|
| `predefined_result_rule` | 작동 전에 이미 정해져 있는 결과의 구조. 시간 길이, 음의 순서, 화면 변화 패턴처럼 전개될 내용을 정한다. |
| `release_rate` | 작동 가능량이 시간에 따라 줄어드는 속도. |
| `output_mapping_rule` | 진행 위치를 감각적 출력으로 바꾸는 규칙. |
| `output_channel` | 출력이 드러나는 감각 경로. `visual`, `auditory`, `haptic`처럼 정의할 수 있다. |
| `completion_threshold` | 작동이 끝났다고 판단하는 기준값. |

## 이벤트 규칙

```text
if start_signal occurs:
  stored_potential이 활성화되고 progress_position이 시작 위치로 설정된다.

if time passes:
  remaining_potential이 release_rate만큼 줄고 progress_position이 앞으로 이동한다.

if progress_position changes:
  output_mapping_rule에 따라 sensory_output이 갱신된다.

if remaining_potential <= completion_threshold:
  is_finished가 true가 되고 감각적 출력의 전개가 끝난다.
```

## 사물 대입

| 항목 | 모래시계 | 태엽식 오르골 |
|---|---|---|
| `predefined_result_rule` | 정해진 시간 길이 | 정해진 음의 순서와 리듬 |
| `stored_potential` | 위쪽 모래가 아래로 이동할 수 있는 상태 | 감긴 태엽이 회전할 수 있는 상태 |
| `sensory_output` | 위쪽 모래가 줄고 아래쪽 모래가 쌓이는 모습 | 순서대로 울리는 음과 멜로디 |

<!-- HUMANIZE-SUMMARY
원본 글자수: 약 2100
윤문본 글자수: 약 2000
변경률: 약 12%
카테고리별 탐지: E-2 동일 종결 반복 -> 완화, F-4 명사화 반복 -> 일부 동사형으로 정리, H-3 메타 진입 표현 -> 제거
자체검증: 6/6 통과
등급: A
사유: 물리 부품을 제거하고, 사전 정의된 결과와 작동 가능량, 감각적 출력 중심으로 추상화함.
주요 변경:
- "보이지 않는 에너지"를 "작동 가능량"으로 디지털 UI에 맞게 정리
- "아름다운 결과"를 "감상 가능한 감각적 출력"으로 일반화
- 패턴 인식의 "사전 정의된 결과"를 추상화 모델에 반영
-->
