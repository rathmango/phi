# Phi Design Prototypes

프로젝트별로 분해안, 추상화, 플로우차트, 동작 프로토타입을 묶어 관리하는 Vite/React 작업실입니다.

## Commands

```bash
pnpm install
pnpm dev
pnpm build
```

## Structure

```txt
src/
  main.tsx                       # 메인/프로젝트 상세 라우팅
  projects.ts                    # 프로젝트 목록, 문서, Mermaid 플로우차트 데이터
  projects/
    queue-flow/
      QueuePrototype.tsx          # Queue Hourglass 동작 프로토타입
  shared/
    MermaidDiagram.tsx            # Mermaid 렌더러
  styles.css
```

새 프로젝트를 추가할 때는 `src/projects.ts`에 프로젝트 메타데이터와 문서를 추가하고, 필요한 프로토타입 컴포넌트를 `src/projects/<project-id>/` 아래에 둡니다.
