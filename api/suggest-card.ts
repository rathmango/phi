const GEMINI_MODEL = "gemini-3.1-flash-lite";

type SuggestCardRequest = {
  observation?: string;
  insight?: string;
  collectedAt?: string;
  collectedTime?: string;
  collectedPlace?: string;
  existingTags?: string[];
};

type SuggestCardResponse = {
  title: string;
  tags: string[];
};

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanTags(value: unknown) {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map((item) => cleanText(item)).filter(Boolean))).slice(0, 6);
}

function normalizeSuggestion(value: unknown): SuggestCardResponse {
  if (!value || typeof value !== "object") {
    return { title: "눈에 걸린 조형 기록", tags: ["관찰"] };
  }
  const record = value as Record<string, unknown>;
  const title = cleanText(record.title) || "눈에 걸린 조형 기록";
  const tags = cleanTags(record.tags);
  return { title: title.slice(0, 32), tags: tags.length > 0 ? tags : ["관찰"] };
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "GEMINI_API_KEY is not configured" });
  }

  try {
    const body = (typeof req.body === "string" ? JSON.parse(req.body) : req.body) as SuggestCardRequest;
    const observation = cleanText(body.observation);
    const insight = cleanText(body.insight);
    const collectedAt = cleanText(body.collectedAt);
    const collectedTime = cleanText(body.collectedTime);
    const collectedPlace = cleanText(body.collectedPlace);
    const existingTags = cleanTags(body.existingTags);

    const prompt = [
      "너는 미감 훈련용 이미지 제텔카스텐 앱의 제목/주제 태그 제안기다.",
      "사용자가 직접 쓴 관찰과 인사이트를 바탕으로만 한국어 제목과 주제 태그를 제안한다.",
      "제목은 8~18자 정도의 짧은 한국어 문장 또는 명사구로 쓴다.",
      "태그는 3~6개, 짧은 한국어 명사구로 쓴다. 해시태그 기호는 쓰지 않는다.",
      "이미 있는 태그와 겹쳐도 괜찮지만, 같은 응답 안에서는 중복 태그를 만들지 않는다.",
      "",
      `[관찰]\n${observation || "비어 있음"}`,
      `[인사이트]\n${insight || "비어 있음"}`,
      `[수집 시간]\n${[collectedAt, collectedTime].filter(Boolean).join(" ") || "미기록"}`,
      `[수집 공간]\n${collectedPlace || "미기록"}`,
      `[기존 태그]\n${existingTags.join(", ") || "없음"}`,
    ].join("\n");

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              title: { type: "STRING" },
              tags: { type: "ARRAY", items: { type: "STRING" } },
            },
            required: ["title", "tags"],
          },
        },
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      return res.status(response.status).json({ error: "Gemini request failed", detail: detail.slice(0, 300) });
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    const parsed = typeof text === "string" ? JSON.parse(text) : {};
    return res.status(200).json(normalizeSuggestion(parsed));
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
}
