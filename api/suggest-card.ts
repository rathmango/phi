import { listTagCategoriesFromFirestore, listTagsFromFirestore, seedTagCategories } from "./_google.js";

const GEMINI_MODEL = "gemini-3.1-flash-lite";
const tagCategories = [
  { id: "subject", label: "대상", description: "이미지 속 관찰 대상", examples: ["간판", "타일", "벽면", "계단", "창문", "문", "의자", "테이블", "조명", "포스터", "포장", "도로", "식물"] },
  { id: "form", label: "형태", description: "점, 선, 면, 덩어리 같은 기본 조형 단위", examples: ["점", "선", "면", "직선", "곡선", "사선", "원", "격자", "덩어리", "층", "테두리"] },
  { id: "composition", label: "구성", description: "요소들이 조직되는 방식", examples: ["반복", "리듬", "정렬", "균형", "비대칭", "중첩", "분할", "집중", "확산", "밀도", "간격"] },
  { id: "color", label: "색감", description: "색상, 명도, 채도, 대비의 작동 방식", examples: ["고채도", "저채도", "명도 대비", "색상 대비", "보색 대비", "단색", "그라디언트", "붉은색", "푸른색", "무채색"] },
  { id: "material", label: "재질", description: "표면과 물성", examples: ["거친 표면", "매끈한 표면", "유광", "무광", "반사", "투명", "금속", "유리", "플라스틱", "페인트", "종이"] },
  { id: "space", label: "공간", description: "여백, 깊이, 스케일, 거리감", examples: ["여백", "깊이감", "압축감", "평면성", "스케일 대비", "좁은 간격", "넓은 간격", "전경과 배경"] },
  { id: "light", label: "빛", description: "빛, 그림자, 반사, 밝기의 작동 방식", examples: ["그림자", "직사광", "확산광", "역광", "반사광", "하이라이트", "어두운 면", "밝은 면"] },
  { id: "effect", label: "효과", description: "조형 요소가 만드는 감각적 인상", examples: ["안정감", "긴장감", "낯섦", "가벼움", "무거움", "차가움", "따뜻함", "유쾌함", "고요함", "속도감"] },
] as const;
const tagCategoryIds = tagCategories.map((category) => category.id);
type TagCategoryId = typeof tagCategoryIds[number];

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
  tags: Record<string, string[]>;
  newTags?: Array<{ category: string; label: string; reason?: string }>;
};

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanTags(value: unknown) {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map((item) => cleanText(item)).filter(Boolean))).slice(0, 6);
}

function emptyTagMap() {
  return Object.fromEntries(tagCategoryIds.map((category) => [category, []])) as Record<TagCategoryId, string[]>;
}

function cleanTagMap(value: unknown) {
  const next = emptyTagMap();
  if (!value || typeof value !== "object") return next;
  const record = value as Record<string, unknown>;
  tagCategoryIds.forEach((category) => {
    next[category] = cleanTags(record[category]);
  });
  return next;
}

function normalizeSuggestion(value: unknown): SuggestCardResponse {
  if (!value || typeof value !== "object") {
    return { title: "조형의 단서", tags: emptyTagMap() };
  }
  const record = value as Record<string, unknown>;
  const title = cleanText(record.title) || "조형의 단서";
  const newTags = Array.isArray(record.newTags) ? record.newTags.map((tag) => {
    const item = tag as Record<string, unknown>;
    return { category: cleanText(item.category), label: cleanText(item.label), reason: cleanText(item.reason) };
  }).filter((tag) => tagCategoryIds.includes(tag.category as TagCategoryId) && tag.label).slice(0, 8) : [];
  return { title: title.slice(0, 32), tags: cleanTagMap(record.tags), newTags };
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
    const storedCategories = await seedTagCategories([...tagCategories]);
    const categoryList = storedCategories.length > 0 ? storedCategories : tagCategories;
    const storedTags = await listTagsFromFirestore();
    const tagsByCategory = Object.fromEntries(tagCategoryIds.map((category) => [
      category,
      storedTags.filter((tag: any) => tag.category === category).map((tag: any) => ({
        label: tag.label,
        aliases: tag.aliases || [],
        usageCount: tag.usageCount || 0,
      })),
    ]));
    const categoryText = categoryList.map((category: any) => [
      `${category.id} (${category.label})`,
      `설명: ${category.description}`,
      `권장 예시: ${(category.examples || []).join(", ")}`,
      `기존 태그: ${(tagsByCategory[category.id] || []).map((tag: any) => `${tag.label}${tag.usageCount ? `(${tag.usageCount})` : ""}`).join(", ") || "없음"}`,
    ].join("\n")).join("\n\n");

    const prompt = [
      "너는 미감 훈련용 이미지 제텔카스텐 앱의 제목/주제 태그 제안기다.",
      "사용자가 직접 쓴 관찰과 인사이트를 해석의 중심으로 삼고, 이미지는 그 해석을 시각적으로 확인하고 보강하는 근거로 사용한다.",
      "이미지만 보고 단순 캡션을 만들지 않는다. 관찰과 인사이트에 적힌 사용자의 관점, 주목 지점, 감각적 판단이 제목과 태그에 반드시 반영되어야 한다.",
      "이미지와 관찰/인사이트가 다르게 보일 때는 사용자의 관찰/인사이트를 우선하고, 이미지는 조형적 세부를 보완하는 데 사용한다.",
      "사용자가 직접 쓴 관찰과 인사이트는 이미지에 대한 설명이다. 이 설명문 자체가 아니라, 그 설명이 가리키는 실제 이미지 장면의 제목과 주제 태그를 제안한다.",
      "제목은 사용자의 관찰/인사이트와 이미지 안의 조형, 물성, 빛, 색, 배치, 리듬, 밀도, 여백, 대비, 맥락을 합쳐 이름 붙이는 방식으로 쓴다.",
      "제목에서 언어, 텍스트, 문장, 설명, 기록, 비어 있음, 의미, 무의미 같은 단어를 쓰지 않는다. 이미지 안에 실제 글자나 타이포그래피가 관찰 대상인 경우에도, 그 글자의 내용보다 시각적 상태와 조형 효과를 제목화한다.",
      "제목은 8~18자 정도의 짧은 한국어 문장 또는 명사구로 쓴다.",
      "태그는 아래 태그 카테고리와 기존 태그 DB를 우선 사용한다.",
      "같은 의미의 새 표현을 만들지 말고, 기존 태그 또는 권장 예시 중 가장 가까운 것을 재사용한다.",
      "기존 태그와 권장 예시로 설명할 수 없는 경우에만 새 태그를 만든다. 새 태그는 newTags에도 포함한다.",
      "모든 카테고리를 억지로 채우지 않는다. 실제로 중요하게 작동하는 카테고리에만 0~4개 태그를 넣는다.",
      "태그는 짧은 한국어 명사구로 쓴다. 해시태그 기호는 쓰지 않는다. 같은 카테고리 안에서는 중복 태그를 만들지 않는다.",
      "",
      `[관찰]\n${observation || "비어 있음"}`,
      `[인사이트]\n${insight || "비어 있음"}`,
      `[수집 시간]\n${[collectedAt, collectedTime].filter(Boolean).join(" ") || "미기록"}`,
      `[수집 공간]\n${collectedPlace || "미기록"}`,
      `[현재 카드 기존 태그]\n${existingTags.join(", ") || "없음"}`,
      `[태그 카테고리와 태그 DB]\n${categoryText}`,
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
              tags: {
                type: "OBJECT",
                properties: Object.fromEntries(tagCategoryIds.map((category) => [category, { type: "ARRAY", items: { type: "STRING" } }])),
                required: [...tagCategoryIds],
              },
              newTags: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    category: { type: "STRING" },
                    label: { type: "STRING" },
                    reason: { type: "STRING" },
                  },
                  required: ["category", "label"],
                },
              },
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
