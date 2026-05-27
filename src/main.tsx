import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { ArrowLeft, FileText, FlaskConical, GitBranch, ListTree, Play } from "lucide-react";
import { MermaidDiagram } from "./shared/MermaidDiagram";
import { QueuePrototype } from "./projects/queue-flow/QueuePrototype";
import { projects } from "./projects";
import "./styles.css";

type SectionId = "brief" | "abstraction" | "flowchart" | "prototype";

const sections: Array<{ id: SectionId; label: string; icon: React.ComponentType<{ size?: number }> }> = [
  { id: "brief", label: "분해안", icon: FileText },
  { id: "abstraction", label: "추상화", icon: ListTree },
  { id: "flowchart", label: "플로우차트", icon: GitBranch },
  { id: "prototype", label: "프로토타입", icon: FlaskConical },
];

function getRoute() {
  const [, projectId, section] = window.location.hash.match(/^#\/projects\/([^/]+)\/?([^/]*)?/) ?? [];
  return {
    projectId,
    section: (section || "brief") as SectionId,
  };
}

function App() {
  const [route, setRoute] = useState(getRoute);
  const project = useMemo(() => projects.find((item) => item.id === route.projectId), [route.projectId]);

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
              onClick={() => navigate(`#/projects/${item.id}/brief`)}
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
          const selected = route.section === section.id;
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
        {route.section === "brief" && (
          <article className="diagram-view">
            <h2>분해안</h2>
            <p className="section-copy">{project.brief}</p>
            <MermaidDiagram chart={project.decomposition} />
          </article>
        )}

        {route.section === "abstraction" && (
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

        {route.section === "flowchart" && (
          <article className="diagram-view">
            <h2>플로우차트</h2>
            <MermaidDiagram chart={project.flowchart} />
          </article>
        )}

        {route.section === "prototype" && (
          <article className="prototype-view">
            <div className="prototype-heading">
              <div>
                <h2>동작 프로토타입</h2>
                <p>뒤집기, 일시정지, 재개 트리거와 이동 완료 조건을 실제 queue 움직임으로 확인합니다.</p>
              </div>
              <Play size={22} />
            </div>
            <QueuePrototype />
          </article>
        )}
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
