import { listTagsFromFirestore, seedTagCategories } from "./_google.js";

const GEMINI_MODEL = "gemini-3.1-flash-lite";
const tagCategories = [
  { id: "subject", label: "대상", description: "관찰의 중심이 되는 대상", examples: ["간판", "벽면", "창문", "문", "의자", "테이블", "조명", "포스터", "식물"] },
  { id: "composition", label: "구성", description: "형태, 배치, 여백과 깊이가 조직되는 방식", examples: ["직선", "곡선", "격자", "덩어리", "반복", "리듬", "정렬", "균형", "비대칭", "중첩", "분할", "밀도", "여백", "깊이감", "전경과 배경"] },
  { id: "color", label: "색·빛", description: "색, 명도, 채도와 빛이 함께 작동하는 방식", examples: ["고채도", "저채도", "명도 대비", "색상 대비", "보색 대비", "단색", "그라디언트", "무채색", "그림자", "직사광", "확산광", "역광", "반사광"] },
  { id: "material", label: "표면", description: "재료와 표면의 물성", examples: ["거친 표면", "매끈한 표면", "유광", "무광", "반사", "투명", "금속", "유리", "플라스틱", "페인트", "종이", "목재"] },
  { id: "effect", label: "인상", description: "조형 요소가 만드는 지배적인 감각", examples: ["안정감", "긴장감", "낯섦", "가벼움", "무거움", "차가움", "따뜻함", "유쾌함", "고요함", "속도감"] },
] as const;
const tagCategoryIds = tagCategories.map((category) => category.id);
type TagCategoryId = typeof tagCategoryIds[number];
const tagLimits: Record<TagCategoryId, number> = { subject: 1, composition: 2, color: 1, material: 1, effect: 1 };

type SuggestCardRequest = {
  observation?: string;
  insight?: string;
  collectedAt?: string;
  collectedTime?: string;
  collectedPlace?: string;
  image?: {
    mimeType?: string;
    data?: string;
  };
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
    next[category] = cleanTags(record[category]).slice(0, tagLimits[category]);
  });
  const nonSubjectCount = tagCategoryIds.filter((category) => category !== "subject").reduce((sum, category) => sum + next[category].length, 0);
  if (nonSubjectCount >= 5) next.subject = [];
  return next;
}

function canonicalStoredTag(tag: any) {
  let category = cleanText(tag?.category);
  let label = cleanText(tag?.label);
  if (category === "form" || category === "space") category = "composition";
  if (category === "light") category = "color";
  if (tag?.category === "color" && label === "우드") {
    category = "material";
    label = "목재";
  }
  if (tag?.category === "form" && label === "연기") {
    category = "subject";
  }
  if (tag?.category === "color" && label === "대비") label = "색상 대비";
  if (tag?.category === "effect" && label === "빈티지") label = "시간감";
  if (tag?.category === "effect" && label === "일체감") label = "통일감";
  if (tag?.category === "effect" && label === "사악함") return null;
  if (!tagCategoryIds.includes(category as TagCategoryId) || !label) return null;
  return { category: category as TagCategoryId, label, aliases: Array.isArray(tag?.aliases) ? tag.aliases : [], usageCount: Number(tag?.usageCount || 0) };
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
  }).filter((tag) => tagCategoryIds.includes(tag.category as TagCategoryId) && tag.label).slice(0, 3) : [];
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
    const imageMimeType = cleanText(body.image?.mimeType);
    const imageData = cleanText(body.image?.data);
    const image = imageMimeType.startsWith("image/") && imageData ? { mimeType: imageMimeType, data: imageData } : null;
    await seedTagCategories([...tagCategories]);
    const categoryList = tagCategories;
    const canonicalTags = (await listTagsFromFirestore()).map(canonicalStoredTag).filter(Boolean) as Array<{ category: TagCategoryId; label: string; aliases: string[]; usageCount: number }>;
    const canonicalTagMap = new Map<string, { category: TagCategoryId; label: string; aliases: string[]; usageCount: number }>();
    canonicalTags.forEach((tag) => {
      const key = `${tag.category}:${tag.label}`;
      const current = canonicalTagMap.get(key);
      canonicalTagMap.set(key, { ...tag, usageCount: (current?.usageCount || 0) + tag.usageCount, aliases: Array.from(new Set([...(current?.aliases || []), ...tag.aliases])) });
    });
    const tagsByCategory = Object.fromEntries(tagCategoryIds.map((category) => [
      category,
      Array.from(canonicalTagMap.values()).filter((tag) => tag.category === category && tag.usageCount > 0).sort((a, b) => b.usageCount - a.usageCount).slice(0, 24).map((tag) => ({
        label: tag.label,
        aliases: tag.aliases || [],
        usageCount: tag.usageCount || 0,
      })),
    ]));
    const categoryText = categoryList.map((category: any) => [
      `${category.id} (${category.label})`,
      `설명: ${category.description}`,
      `권장 예시: ${(category.examples || []).join(", ")}`,
      `기존 태그: ${(tagsByCategory[category.id] || []).map((tag: any) => `${tag.label}${tag.aliases?.length ? `[유사어: ${tag.aliases.join("/")}]` : ""}${tag.usageCount ? `(${tag.usageCount})` : ""}`).join(", ") || "없음"}`,
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
      "태그의 목적은 이미지를 자세히 묘사하는 것이 아니라, 나중에 여러 카드에서 반복되는 조형 원리를 비교하고 찾게 하는 것이다.",
      "먼저 관찰과 인사이트에서 이 장면을 지배하는 조형 작동을 2~3개 찾는다. 이미지에 보이는 모든 사물과 속성을 나열하지 않는다.",
      "태그는 총 3~5개만 제안한다. 대상은 최대 1개, 구성은 최대 2개, 색·빛·표면·인상은 각각 최대 1개다. 중요하지 않은 카테고리는 비워 둔다.",
      "기존 DB 어휘를 재사용하는 기준: 같은 카테고리여야 하고, 현재 장면에서의 의미가 사실상 같거나 직접적인 동의어여야 하며, 다른 카드와 비교할 때도 유용해야 한다.",
      "기존 태그의 사용 빈도는 의미가 같은 후보끼리 동률일 때만 우선순위로 사용한다. 자주 쓰였다는 이유만으로 의미가 덜 맞는 태그를 선택하지 않는다.",
      "기존 DB 어휘의 의미가 너무 넓거나 현재 장면과 다른 경우에는 억지로 재사용하지 않는다.",
      "새 어휘는 기존 DB와 권장 예시에 같은 의미나 직접적인 동의어가 없고, 앞으로 최소 3개 이상의 다른 이미지에도 반복 적용할 수 있을 만큼 재사용 가능할 때만 만든다.",
      "일회성 대상명, 긴 설명, 문장, 감상문, 두 개 이상의 개념을 합친 표현은 새 태그로 만들지 않는다.",
      "새 어휘를 만들었다면 tags와 newTags에 모두 넣고, reason에는 기존 어휘로 대체할 수 없는 차이를 한 문장으로 쓴다.",
      "태그는 1~4단어의 짧은 한국어 명사구로 쓴다. 해시태그 기호와 중복 표현은 쓰지 않는다.",
      "",
      `[관찰]\n${observation || "비어 있음"}`,
      `[인사이트]\n${insight || "비어 있음"}`,
      `[수집 시간]\n${[collectedAt, collectedTime].filter(Boolean).join(" ") || "미기록"}`,
      `[수집 공간]\n${collectedPlace || "미기록"}`,
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
