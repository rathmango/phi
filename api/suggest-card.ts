const GEMINI_MODEL = "gemini-3.1-flash-lite";

type SuggestCardRequest = {
  observation?: string;
  insight?: string;
  collectedAt?: string;
  collectedTime?: string;
  collectedPlace?: string;
  existingTags?: string[];
  image?: {
    mimeType?: string;
    data?: string;
  };
  relatedCards?: Array<{
    title?: string;
    observation?: string;
    insight?: string;
    tags?: string[];
  }>;
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
    return { title: "조형의 단서", tags: ["관찰"] };
  }
  const record = value as Record<string, unknown>;
  const title = cleanText(record.title) || "조형의 단서";
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
    const imageMimeType = cleanText(body.image?.mimeType);
    const imageData = cleanText(body.image?.data);
    const image = imageMimeType.startsWith("image/") && imageData ? { mimeType: imageMimeType, data: imageData } : null;
    const relatedCards = Array.isArray(body.relatedCards) ? body.relatedCards.slice(0, 40).map((card, index) => ({
      index: index + 1,
      title: cleanText(card?.title),
      observation: cleanText(card?.observation),
      insight: cleanText(card?.insight),
      tags: cleanTags(card?.tags),
    })).filter((card) => card.title || card.observation || card.insight || card.tags.length) : [];
    const relatedCardText = relatedCards.length > 0 ? relatedCards.map((card) => [
      `${card.index}. ${card.title || "제목 없음"}`,
      `관찰: ${card.observation || "없음"}`,
      `인사이트: ${card.insight || "없음"}`,
      `태그: ${card.tags.join(", ") || "없음"}`,
    ].join("\n")).join("\n\n") : "아직 비교할 카드가 없음";

    const prompt = [
      "너는 미감 훈련용 이미지 제텔카스텐 앱의 제목/주제 태그 제안기다.",
      "이미지가 함께 제공되면 이미지를 가장 먼저 보고, 관찰과 인사이트는 이미지를 이해하기 위한 보조 설명으로만 사용한다.",
      "사용자가 직접 쓴 관찰과 인사이트는 이미지에 대한 설명이다. 이 설명문 자체가 아니라, 실제 이미지 장면의 제목과 주제 태그를 제안한다.",
      "제목은 이미지 안의 조형, 물성, 빛, 색, 배치, 리듬, 밀도, 여백, 대비, 맥락을 이름 붙이는 방식으로 쓴다.",
      "제목에서 언어, 텍스트, 문장, 설명, 기록, 비어 있음, 의미, 무의미 같은 단어를 쓰지 않는다. 이미지 안에 실제 글자나 타이포그래피가 관찰 대상인 경우에도, 그 글자의 내용보다 시각적 상태와 조형 효과를 제목화한다.",
      "제목은 8~18자 정도의 짧은 한국어 문장 또는 명사구로 쓴다.",
      "태그는 단순히 현재 카드만 요약하지 않는다. 전체 카드의 관찰/인사이트/기존 태그를 함께 보고, 여러 카드 사이에서 반복되는 조형적 기준이나 감각적 패턴을 끌어낸다.",
      "현재 카드와 비슷한 관찰 또는 인사이트를 가진 기존 카드가 있고 그 카드에 적절한 태그가 있으면, 그 태그를 우선 재사용한다.",
      "비슷한 기존 카드가 없거나 기존 태그로 설명되지 않으면, 현재 카드에서 새롭게 필요한 주제 태그를 제안한다.",
      "태그는 3~6개, 짧은 한국어 명사구로 쓴다. 해시태그 기호는 쓰지 않는다. 같은 응답 안에서는 중복 태그를 만들지 않는다.",
      "",
      `[관찰]\n${observation || "비어 있음"}`,
      `[인사이트]\n${insight || "비어 있음"}`,
      `[수집 시간]\n${[collectedAt, collectedTime].filter(Boolean).join(" ") || "미기록"}`,
      `[수집 공간]\n${collectedPlace || "미기록"}`,
      `[기존 태그]\n${existingTags.join(", ") || "없음"}`,
      `[전체 카드 기록]\n${relatedCardText}`,
    ].join("\n");
    const parts: Array<Record<string, unknown>> = [{ text: prompt }];
    if (image) parts.push({ inlineData: image });

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
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
