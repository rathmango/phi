import mermaid from "mermaid";
import { useEffect, useId, useState } from "react";

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
};

export function MermaidDiagram({ chart }: MermaidDiagramProps) {
  const id = useId().replace(/:/g, "");
  const [svg, setSvg] = useState("");

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

  return <div className="mermaid-output" dangerouslySetInnerHTML={{ __html: svg }} />;
}
