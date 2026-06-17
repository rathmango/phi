import mermaid from "mermaid";
import { useEffect, useId, useState } from "react";
import { Maximize2, X } from "lucide-react";

mermaid.initialize({
  startOnLoad: false,
  securityLevel: "loose",
  flowchart: {
    htmlLabels: true,
    curve: "basis",
    nodeSpacing: 44,
    rankSpacing: 62,
    wrappingWidth: 220,
  },
  theme: "base",
  themeVariables: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans KR", sans-serif',
    primaryTextColor: "#111827",
    lineColor: "#64748b",
  },
});

type MermaidDiagramProps = {
  chart: string;
  fit?: "natural" | "compact";
  title?: string;
};

export function MermaidDiagram({ chart, fit = "natural", title = "다이어그램" }: MermaidDiagramProps) {
  const id = useId().replace(/:/g, "");
  const [svg, setSvg] = useState("");
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    mermaid.render(`diagram-${id}`, chart).then(({ svg: rendered }) => {
      if (!cancelled) {
        setSvg(rendered);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [chart, id]);

  useEffect(() => {
    if (!fullscreen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setFullscreen(false);
      }
    };

    document.body.classList.add("modal-open");
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.classList.remove("modal-open");
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [fullscreen]);

  return (
    <>
      <div className={`mermaid-frame ${fit === "compact" ? "compact" : ""}`}>
        <div className="mermaid-frame-toolbar">
          <span>{title}</span>
          <button type="button" onClick={() => setFullscreen(true)} aria-label={`${title} 전체화면 보기`}>
            <Maximize2 size={16} />
            전체화면
          </button>
        </div>
        <div className="mermaid-output" dangerouslySetInnerHTML={{ __html: svg }} />
      </div>

      {fullscreen && (
        <div className="mermaid-fullscreen" role="dialog" aria-modal="true" aria-label={`${title} 전체화면`}>
          <div className="mermaid-fullscreen-toolbar">
            <strong>{title}</strong>
            <button type="button" onClick={() => setFullscreen(false)} aria-label="전체화면 닫기">
              <X size={18} />
              닫기
            </button>
          </div>
          <div className="mermaid-fullscreen-canvas" dangerouslySetInnerHTML={{ __html: svg }} />
        </div>
      )}
    </>
  );
}
