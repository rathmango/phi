import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { ArrowLeft, FileText, FlaskConical, GitBranch, ListTree, Play } from "lucide-react";
import { GlossaryChatPrototype } from "./projects/glossary-chat/GlossaryChatPrototype";
import { MermaidDiagram } from "./shared/MermaidDiagram";
import { QueuePrototype } from "./projects/queue-flow/QueuePrototype";
import { RepeatRunPrototype } from "./projects/repeat-run/RepeatRunPrototype";
import { Project, ProjectSectionId, projects } from "./projects";
import "./styles.css";

const queueSections: Array<{ id: ProjectSectionId; label: string; icon: React.ComponentType<{ size?: number }> }> = [
  { id: "brief", label: "분해안", icon: FileText },
  { id: "abstraction", label: "추상화", icon: ListTree },
  { id: "flowchart", label: "플로우차트", icon: GitBranch },
  { id: "prototype", label: "프로토타입", icon: FlaskConical },
];

const glossarySections: Array<{ id: ProjectSectionId; label: string; icon: React.ComponentType<{ size?: number }> }> = [
  { id: "onepager", label: "1 Pager", icon: FileText },
  { id: "prototype", label: "프로토타입", icon: FlaskConical },
];

function getRoute() {
  const [, projectId, section] = window.location.hash.match(/^#\/projects\/([^/]+)\/?([^/]*)?/) ?? [];
  return {
    projectId,
    section: section as ProjectSectionId | undefined,
  };
}

function defaultSection(project: Project) {
  return project.kind === "queue" ? "brief" : "onepager";
}

function projectSections(project: Project) {
  return project.kind === "queue" ? queueSections : glossarySections;
}

function App() {
  const [route, setRoute] = useState(getRoute);
  const project = useMemo(() => projects.find((item) => item.id === route.projectId), [route.projectId]);
  const activeSection = project ? route.section || defaultSection(project) : undefined;
  const sections = project ? projectSections(project) : [];

  function navigate(hash: string) {
    window.history.pushState(null, "", hash);
    setRoute(getRoute());
  }

  React.useEffect(() => {
    const handlePop = () => setRoute(getRoute());
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);

  if (!project) {
    return (
      <main className="home">
        <section className="home-hero">
          <div>
            <p className="eyebrow">Phi Design</p>
            <h1>프로토타입 작업실</h1>
            <p>
              프로젝트별로 분해안, 추상화, 플로우차트, 동작 프로토타입을 한 곳에 묶어
              Vercel에 배포하기 위한 공간입니다.
            </p>
          </div>
        </section>

        <section className="project-grid" aria-label="프로젝트 목록">
          {projects.map((item) => (
            <button
              className="project-card"
              key={item.id}
              onClick={() => navigate(`#/projects/${item.id}/${defaultSection(item)}`)}
            >
              <span>{item.status}</span>
              <strong>{item.title}</strong>
              <p>{item.summary}</p>
            </button>
          ))}
        </section>
      </main>
    );
  }

  return (
    <main className="workspace">
      <header className="workspace-header">
        <button className="back-button" onClick={() => navigate("#/")}>
          <ArrowLeft size={18} />
          프로젝트 목록
        </button>
        <div>
          <p className="eyebrow">{project.status}</p>
          <h1>{project.title}</h1>
          <p>{project.summary}</p>
        </div>
      </header>

      <nav className="section-tabs" aria-label="프로젝트 섹션">
        {sections.map((section) => {
          const Icon = section.icon;
          const selected = activeSection === section.id;
          return (
            <button
              className={selected ? "selected" : ""}
              key={section.id}
              onClick={() => navigate(`#/projects/${project.id}/${section.id}`)}
            >
              <Icon size={17} />
              {section.label}
            </button>
          );
        })}
      </nav>

      <section className="content-surface">
        {project.kind === "queue" && activeSection === "brief" && (
          <article className="diagram-view">
            <h2>분해안</h2>
            <p className="section-copy">{project.brief}</p>
            <MermaidDiagram chart={project.decomposition} />
          </article>
        )}

        {project.kind === "queue" && activeSection === "abstraction" && (
          <article className="doc-view">
            <h2>추상화</h2>
            <p className="lead">{project.abstraction.oneLine}</p>
            <ol className="abstraction-list">
              {project.abstraction.items.map((item) => (
                <li key={item.key}>
                  <span>{item.key}</span>
                  <p>{item.text}</p>
                </li>
              ))}
            </ol>
          </article>
        )}

        {project.kind === "queue" && activeSection === "flowchart" && (
          <article className="diagram-view">
            <h2>플로우차트</h2>
            <MermaidDiagram chart={project.flowchart} />
          </article>
        )}

        {project.kind !== "queue" && activeSection === "onepager" && (
          <article className="onepager-view">
            <div className="onepager-layout">
              <section className="onepager-panel primary">
                <p className="eyebrow">Problem</p>
                <h2>문제 정의</h2>
                <div className="onepager-block">
                  <h3>사용자와 페인포인트</h3>
                  <p>{project.onePager.user}</p>
                </div>
                <div className="onepager-block">
                  <h3>사용자의 목표</h3>
                  <p>{project.onePager.goal}</p>
                </div>
                <div className="onepager-block">
                  <h3>핵심 마찰</h3>
                  <p>{project.onePager.friction}</p>
                </div>
              </section>

              <section className="onepager-panel">
                <p className="eyebrow">Interaction</p>
                <h2>해결책</h2>
                <ol className="solution-flow">
                  {project.onePager.solution.map((item) => (
                    <li key={item.title}>
                      <strong>{item.title}</strong>
                      <p>{item.text}</p>
                    </li>
                  ))}
                </ol>
              </section>

              <section className="onepager-panel scenario">
                <p className="eyebrow">Test</p>
                <h2>테스트 시나리오</h2>
                <ol className="scenario-flow">
                  {project.onePager.scenario.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ol>
              </section>
            </div>
          </article>
        )}

        {activeSection === "prototype" && (
          <article className="prototype-view">
            <div className="prototype-heading">
              <div>
                <h2>동작 프로토타입</h2>
                <p>
                  {project.kind === "glossary"
                    ? "채팅 안의 자연어 정정이 저장 가능한 번역 기준으로 바뀌고, 새 채팅에서 다시 적용되는 과정을 확인합니다."
                    : project.kind === "routine"
                      ? "작업지시서를 고정하고, 각 입력을 독립 실행으로 처리한 뒤 완료된 실행을 기록으로 보관하는 흐름을 확인합니다."
                    : "뒤집기, 일시정지, 재개 트리거와 이동 완료 조건을 실제 queue 움직임으로 확인합니다."}
                </p>
              </div>
              <Play size={22} />
            </div>
            {project.kind === "glossary" && <GlossaryChatPrototype />}
            {project.kind === "routine" && <RepeatRunPrototype />}
            {project.kind === "queue" && <QueuePrototype />}
          </article>
        )}
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
