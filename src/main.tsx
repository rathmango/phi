import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { ArrowLeft, FileText, FlaskConical, GitBranch, LayoutDashboard, ListTree, Play } from "lucide-react";
import { GlossaryChatPrototype } from "./projects/glossary-chat/GlossaryChatPrototype";
import { ImageZettelkastenPrototype } from "./projects/image-zettelkasten/ImageZettelkastenPrototype";
import { MermaidDiagram } from "./shared/MermaidDiagram";
import {
  PinnedSessionDashboardKeyScreen,
  PinnedSessionDashboardPrototype,
} from "./projects/pinned-session-dashboard/PinnedSessionDashboardPrototype";
import { QueuePrototype } from "./projects/queue-flow/QueuePrototype";
import { RepeatRunPrototype } from "./projects/repeat-run/RepeatRunPrototype";
import { BowScoreMazePrototype } from "./projects/score-maze/BowScoreMazePrototype";
import { TakoyakiGrillGame } from "./projects/takoyaki-grill-game/TakoyakiGrillGame";
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

const pinnedDashboardSections: Array<{ id: ProjectSectionId; label: string; icon: React.ComponentType<{ size?: number }> }> = [
  { id: "onepager", label: "1 Pager", icon: FileText },
  { id: "keyscreen", label: "키스크린", icon: LayoutDashboard },
  { id: "prototype", label: "프로토타입", icon: FlaskConical },
];

const ctSections: Array<{ id: ProjectSectionId; label: string; icon: React.ComponentType<{ size?: number }> }> = [
  { id: "brief", label: "분해안", icon: FileText },
  { id: "pattern", label: "패턴 인식", icon: ListTree },
  { id: "abstraction", label: "추상화", icon: GitBranch },
  { id: "flowchart", label: "플로우차트", icon: GitBranch },
  { id: "prototype", label: "프로토타입", icon: FlaskConical },
];

function getRoute() {
  const [, appId] = window.location.hash.match(/^#\/apps\/([^/]+)/) ?? [];
  if (appId) {
    return {
      appId,
      projectId: undefined,
      section: undefined,
    };
  }

  const [, projectId, section] = window.location.hash.match(/^#\/projects\/([^/]+)\/?([^/]*)?/) ?? [];
  return {
    appId: undefined,
    projectId,
    section: section as ProjectSectionId | undefined,
  };
}

function defaultSection(project: Project) {
  if (project.kind === "pinned-dashboard") return "onepager";
  if (project.kind === "queue") return "brief";
  if (project.kind === "ct-decomposition") return "brief";
  if (project.kind === "ct-process") return "brief";
  if (project.kind === "ct-brief") return "brief";
  if (project.kind === "ct") return "brief";
  return "onepager";
}

function projectSections(project: Project) {
  if (project.kind === "pinned-dashboard") return pinnedDashboardSections;
  if (project.kind === "queue") return queueSections;
  if (project.kind === "ct-decomposition") return [ctSections[0], ctSections[1], ctSections[2], ctSections[3]];
  if (project.kind === "ct-process") return ctSections;
  if (project.kind === "ct-brief") return [ctSections[0], ctSections[1], ctSections[2], ctSections[3]];
  if (project.kind === "ct") return ctSections;
  return glossarySections;
}

function PatternMetricCell({ text, metrics }: { text: string; metrics: string[] }) {
  return (
    <div className="metric-cell">
      <p>{text}</p>
      {metrics.length > 0 && (
        <div className="metric-chip-list" aria-label="분해안 저수준 값">
          {metrics.map((metric) => (
            <code key={metric}>{metric}</code>
          ))}
        </div>
      )}
    </div>
  );
}

function App() {
  const [route, setRoute] = useState(getRoute);
  const project = useMemo(() => {
    const projectId = route.projectId === "hid-pinned-session-home" ? "hid-pinned-session-dashboard" : route.projectId;
    return projects.find((item) => item.id === projectId);
  }, [route.projectId]);
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

  if (route.appId === "image-zettelkasten") {
    return <ImageZettelkastenPrototype />;
  }

  if (route.appId === "takoyaki-grill-game") {
    return <TakoyakiGrillGame />;
  }

  if (
    route.appId === "pinned-session-dashboard" ||
    (project?.kind === "pinned-dashboard" && activeSection === "prototype")
  ) {
    return (
      <main className="pinned-dashboard-app-page">
        <PinnedSessionDashboardPrototype />
      </main>
    );
  }

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
          if (project.kind === "pinned-dashboard" && section.id === "prototype") {
            return (
              <a
                href="#/apps/pinned-session-dashboard"
                key={section.id}
                onClick={(event) => {
                  event.preventDefault();
                  navigate("#/apps/pinned-session-dashboard");
                }}
              >
                <Icon size={17} />
                {section.label}
              </a>
            );
          }

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
            <MermaidDiagram chart={project.decomposition} title="분해안" />
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
            <MermaidDiagram chart={project.flowchart} title="플로우차트" />
          </article>
        )}

        {(project.kind === "ct" ||
          project.kind === "ct-decomposition" ||
          project.kind === "ct-brief" ||
          project.kind === "ct-process") &&
          activeSection === "brief" && (
          <article className="ct-decomposition-view">
            <div className="pattern-intro">
              <p className="eyebrow">Decomposition</p>
              <h2>분해안</h2>
              <p>
                {project.kind === "ct"
                  ? "두 사물을 각각 먼저 분해한 뒤, 패턴 인식 단계에서 저수준 값의 역할을 비교 분해 속성으로 묶는다."
                  : project.kind === "ct-decomposition"
                    ? "최종 과제 CT를 진행하기 위한 기준 분해안이다. 지금 단계에서는 필요한 상수와 변수만 남긴 모래시계 분해안을 먼저 확인한다."
                  : project.kind === "ct-process"
                    ? "프로세스 수행 기록을 고수준-중수준-저수준 과업으로 나누고, 가장 낮은 단계에서 추려지는 데이터를 함께 확인한다."
                    : "사물의 목적에서 시작해 주요 작동 흐름을 나누고, 각 단계에서 바뀌는 값과 고정된 값을 함께 확인한다."}
              </p>
            </div>

            {project.kind === "ct-process" && (
              <section className="process-source-doc">
                <div className="process-source-block primary">
                  <p className="eyebrow">{project.document.subject.title}</p>
                  <h3>{project.document.subject.shortName}</h3>
                  <p>{project.document.subject.body}</p>
                </div>

                <div className="process-record-grid">
                  {project.document.records.map((record) => (
                    <section className="process-source-block" key={record.title}>
                      <h3>{record.title}</h3>
                      {record.body.map((paragraph) => (
                        <p key={paragraph}>{paragraph}</p>
                      ))}
                    </section>
                  ))}
                </div>

                <div className="process-source-block problem">
                  <h3>현재까지 확인한 자동화 문제</h3>
                  <p>{project.document.automationProblem}</p>
                </div>
              </section>
            )}

            <div className="ct-decomposition-list">
              {project.decomposition.map((item) => (
                <section className="ct-decomposition-card" key={item.title}>
                  <h3>{item.title}</h3>
                  <p>{item.brief}</p>
                  <MermaidDiagram chart={item.chart} fit="compact" title={item.title} />
                </section>
              ))}
            </div>
          </article>
        )}

        {(project.kind === "glossary" || project.kind === "routine" || project.kind === "pinned-dashboard") && activeSection === "onepager" && (
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

        {project.kind === "ct" && activeSection === "pattern" && (
          <article className="pattern-view">
            <div className="pattern-intro">
              <p className="eyebrow">Pattern Recognition</p>
              <h2>패턴 인식</h2>
              <p>{project.patternRecognition.overview}</p>
            </div>

            <div className="comparison-table-wrap">
              <table className="comparison-table">
                <thead>
                  <tr>
                    <th>비교 분해 속성</th>
                    <th>모래시계</th>
                    <th>태엽식 오르골</th>
                    <th>공통 패턴</th>
                    <th>차이 패턴</th>
                  </tr>
                </thead>
                <tbody>
                  {project.patternRecognition.rows.map((row) => (
                    <tr key={row.property}>
                      <th scope="row">{row.property}</th>
                      <td>
                        <PatternMetricCell text={row.hourglass.text} metrics={row.hourglass.metrics} />
                      </td>
                      <td>
                        <PatternMetricCell text={row.musicBox.text} metrics={row.musicBox.metrics} />
                      </td>
                      <td>{row.commonPattern}</td>
                      <td>{row.differencePattern}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pattern-summary-grid">
              <section>
                <h3>공통 패턴</h3>
                <p>{project.patternRecognition.commonSummary}</p>
              </section>
              <section>
                <h3>차이 패턴</h3>
                <p>{project.patternRecognition.differenceSummary}</p>
              </section>
            </div>
          </article>
        )}

        {project.kind === "ct-decomposition" && activeSection === "pattern" && (
          <article className="pattern-view">
            <div className="pattern-intro">
              <p className="eyebrow">Pattern Recognition</p>
              <h2>패턴 인식</h2>
              <p>{project.patternRecognition.overview}</p>
            </div>

            <div className="comparison-table-wrap">
              <table className="comparison-table">
                <thead>
                  <tr>
                    <th>비교 속성</th>
                    <th>모래시계</th>
                    <th>타코야끼 굽기</th>
                    <th>공통 패턴</th>
                    <th>차이 패턴</th>
                  </tr>
                </thead>
                <tbody>
                  {project.patternRecognition.rows.map((row) => (
                    <tr key={row.property}>
                      <th scope="row">{row.property}</th>
                      <td>
                        <PatternMetricCell text={row.hourglass.text} metrics={row.hourglass.metrics} />
                      </td>
                      <td>
                        <PatternMetricCell text={row.takoyaki.text} metrics={row.takoyaki.metrics} />
                      </td>
                      <td>{row.commonPattern}</td>
                      <td>{row.differencePattern}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pattern-summary-grid">
              <section>
                <h3>공통 패턴</h3>
                <p>{project.patternRecognition.commonSummary}</p>
              </section>
              <section>
                <h3>차이 패턴</h3>
                <p>{project.patternRecognition.differenceSummary}</p>
              </section>
            </div>
          </article>
        )}

        {project.kind === "ct-brief" && activeSection === "pattern" && (
          <article className="pattern-view">
            <div className="pattern-intro">
              <p className="eyebrow">Pattern Recognition</p>
              <h2>패턴 인식</h2>
              <p>{project.patternRecognition.overview}</p>
            </div>

            <div className="comparison-table-wrap">
              <table className="comparison-table">
                <thead>
                  <tr>
                    <th>패턴 / 속성</th>
                    <th>모래시계</th>
                    <th>태엽식 오르골</th>
                    <th>기계식 스톱워치</th>
                  </tr>
                </thead>
                <tbody>
                  {project.patternRecognition.rows.map((row) => (
                    <tr key={row.property}>
                      <th scope="row">{row.property}</th>
                      <td>
                        <PatternMetricCell text={row.hourglass.text} metrics={row.hourglass.metrics} />
                      </td>
                      <td>
                        <PatternMetricCell text={row.musicBox.text} metrics={row.musicBox.metrics} />
                      </td>
                      <td>
                        <PatternMetricCell text={row.stopwatch.text} metrics={row.stopwatch.metrics} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pattern-summary-grid">
              <section>
                <h3>공통 패턴</h3>
                <p>{project.patternRecognition.commonSummary}</p>
              </section>
              <section>
                <h3>차이 패턴</h3>
                <p>{project.patternRecognition.differenceSummary}</p>
              </section>
            </div>
          </article>
        )}

        {project.kind === "ct-process" && activeSection === "pattern" && (
          <article className="pattern-view">
            <div className="pattern-intro">
              <p className="eyebrow">Pattern Recognition</p>
              <h2>패턴 인식</h2>
              <p>{project.patternRecognition.overview}</p>
            </div>

            <div className="comparison-table-wrap">
              <table className="comparison-table">
                <thead>
                  <tr>
                    <th>반복 과업</th>
                    <th>오프라인 이미지</th>
                    <th>온라인 이미지</th>
                    <th>입력 데이터</th>
                    <th>출력 데이터</th>
                  </tr>
                </thead>
                <tbody>
                  {project.patternRecognition.rows.map((row) => (
                    <tr key={row.task}>
                      <th scope="row">{row.task}</th>
                      <td>{row.offline}</td>
                      <td>{row.online}</td>
                      <td>{row.input}</td>
                      <td>{row.output}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pattern-summary-grid">
              <section>
                <h3>공통 패턴</h3>
                <p>{project.patternRecognition.commonSummary}</p>
              </section>
              <section>
                <h3>차이 패턴</h3>
                <p>{project.patternRecognition.differenceSummary}</p>
              </section>
            </div>
          </article>
        )}

        {(project.kind === "ct" ||
          project.kind === "ct-decomposition" ||
          project.kind === "ct-brief" ||
          project.kind === "ct-process") &&
          activeSection === "abstraction" && (
          <article className="ct-abstraction-view">
            <div className="pattern-intro">
              <p className="eyebrow">Abstraction</p>
              <h2>추상화</h2>
              <p>{project.abstraction.description}</p>
            </div>

            <section className="abstraction-model">
              <span>{project.abstraction.title}</span>
              <p>{project.abstraction.oneLine}</p>
            </section>

            <section className="abstraction-elements-panel">
              <h3>추상화 모델을 이루는 요소</h3>
              <ol className="abstraction-list">
                {project.abstraction.elements.map((item) => (
                  <li key={item.key}>
                    <span>{item.key}</span>
                    <div>
                      <p>{item.text}</p>
                      {item.tagGroups && item.tagGroups.length > 0 && (
                        <div className="abstraction-tag-list" aria-label={`${item.key} 관련 변수, 상수, 트리거`}>
                          {item.tagGroups.map((group) => (
                            <div className="abstraction-tag-row" key={group.label}>
                              <strong>{group.label}</strong>
                              {group.items.length > 0 ? (
                                <div className="metric-chip-list">
                                  {group.items.map((tag) => (
                                    <code key={tag}>{tag}</code>
                                  ))}
                                </div>
                              ) : (
                                <span className="empty-tag">X</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            <div className="abstraction-detail-grid">
              <section>
                <h3>변수</h3>
                <dl className="term-list">
                  {project.abstraction.variables.map((item) => (
                    <div key={item.name}>
                      <dt>{item.name}</dt>
                      <dd>{item.text}</dd>
                    </div>
                  ))}
                </dl>
              </section>

              {project.abstraction.derivedVariables && project.abstraction.derivedVariables.length > 0 && (
                <section>
                  <h3>파생 변수</h3>
                  <dl className="term-list">
                    {project.abstraction.derivedVariables.map((item) => (
                      <div key={item.name}>
                        <dt>{item.name}</dt>
                        <dd>{item.text}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              )}

              <section>
                <h3>상수</h3>
                <dl className="term-list">
                  {project.abstraction.constants.map((item) => (
                    <div key={item.name}>
                      <dt>{item.name}</dt>
                      <dd>{item.text}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            </div>

            <section className="event-rule-panel">
              <h3>이벤트 규칙</h3>
              <ol>
                {project.abstraction.events.map((event) => (
                  <li key={event.condition}>
                    <code>{event.condition}</code>
                    <p>{event.result}</p>
                  </li>
                ))}
              </ol>
            </section>

            <div className="abstraction-example-grid">
              {project.abstraction.examples.map((example) => (
                <section key={example.title}>
                  <h3>{example.title}</h3>
                  <dl className="term-list compact">
                    {example.mappings.map((item) => (
                      <div key={item.name}>
                        <dt>{item.name}</dt>
                        <dd>{item.value}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              ))}
            </div>
          </article>
        )}

        {(project.kind === "ct" ||
          project.kind === "ct-decomposition" ||
          project.kind === "ct-brief" ||
          project.kind === "ct-process") &&
          activeSection === "flowchart" && (
          <article className="ct-flowchart-view">
            <div className="pattern-intro">
              <p className="eyebrow">Flowchart</p>
              <h2>플로우차트</h2>
              <p>{project.flowchart.overview}</p>
            </div>

            <div className="flowchart-meta-grid">
              <section>
                <h3>UI 상태</h3>
                <dl className="term-list compact">
                  {project.flowchart.states.map((state) => (
                    <div key={state.name}>
                      <dt>{state.name}</dt>
                      <dd>{state.text}</dd>
                    </div>
                  ))}
                </dl>
              </section>

              <section>
                <h3>상태 전환 시나리오</h3>
                <ol className="flow-scenario-list">
                  {project.flowchart.scenarios.map((scenario) => (
                    <li key={scenario}>{scenario}</li>
                  ))}
                </ol>
              </section>
            </div>

            <div className="ct-flowchart-diagram">
              <MermaidDiagram chart={project.flowchart.chart} fit="compact" title="플로우차트" />
            </div>
          </article>
        )}

        {project.kind === "pinned-dashboard" && activeSection === "keyscreen" && (
          <article className="prototype-view">
            <div className="prototype-heading">
              <div>
                <h2>키스크린</h2>
                <p>반복해서 쓰는 채팅 세션을 대시보드에 고정하고, 4분할 패널에서 바로 입력하는 화면입니다.</p>
              </div>
            </div>
            <PinnedSessionDashboardKeyScreen />
          </article>
        )}

        {activeSection === "prototype" && project.kind !== "pinned-dashboard" && (
          <article className="prototype-view">
            <div className="prototype-heading">
              <div>
                <h2>동작 프로토타입</h2>
                <p>
                  {project.kind === "glossary"
                    ? "채팅 안의 자연어 정정이 저장 가능한 번역 기준으로 바뀌고, 새 채팅에서 다시 적용되는 과정을 확인합니다."
                    : project.kind === "routine"
                      ? "작업지시서를 고정하고, 각 입력을 독립 실행으로 처리한 뒤 완료된 실행을 기록으로 보관하는 흐름을 확인합니다."
                    : project.kind === "ct-process"
                      ? project.prototypeNote
                    : project.kind === "ct"
                      ? project.prototypeNote
                      : "뒤집기, 일시정지, 재개 트리거와 이동 완료 조건을 실제 queue 움직임으로 확인합니다."}
                </p>
              </div>
              <Play size={22} />
            </div>

            {project.kind === "ct-process" && (
              <section className="prototype-description-doc">
                <p className="eyebrow">Prototype Description</p>
                <h3>프로토타입 설명 원문</h3>
                {project.document.prototypeDescription.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
                <ol className="prototype-flow-list">
                  {project.document.prototypeDescription.flow.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
                <a className="prototype-launch-link" href="#/apps/image-zettelkasten">
                  프로토타입 열기
                </a>
              </section>
            )}

            {project.kind === "glossary" && <GlossaryChatPrototype />}
            {project.kind === "routine" && <RepeatRunPrototype />}
            {project.kind === "queue" && <QueuePrototype />}
            {project.kind === "ct" && <BowScoreMazePrototype />}
          </article>
        )}
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
