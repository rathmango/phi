import { ArrowLeft, Check, ChevronRight, Download, ImagePlus, Library, MoreHorizontal, RotateCcw, Search, SlidersHorizontal, Sparkles, Upload, X } from "lucide-react";
import * as exifr from "exifr";
import { toPng } from "html-to-image";
import JSZip from "jszip";
import { useEffect, useMemo, useRef, useState } from "react";
import Cropper from "react-easy-crop";
import type { Area, Point } from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";

type AppMode = "library" | "add";
type LibraryView = "cards" | "themes";
type AddStep = "refine" | "metadata" | "observe" | "insight" | "suggest";
type TagCategory = "subject" | "composition" | "color" | "material" | "effect";
type GroupField = TagCategory | "topic" | "collectedAt" | "collectedPlace";

type Observation = {
  element: string;
  composition: string;
  condition: string;
  context: string;
  effect: string;
  insight?: string;
};

type CardTags = Record<TagCategory, string[]>;

type CropState = {
  crop: Point;
  zoom: number;
  rotation: number;
  croppedAreaPixels: Area | null;
};

type CropMediaSize = {
  width: number;
  height: number;
};

type ImageCard = {
  id: string;
  number: string;
  title: string;
  imageUrl: string;
  originalImageUrl: string;
  collectedAt: string;
  collectedTime: string;
  collectedPlace: string;
  sourceUrl: string;
  fileName: string;
  foundContext: string;
  crop: CropState;
  observation: Observation;
  tags: CardTags;
  topics?: string[];
};

type ThemeCard = { id: string; order: number; title: string; description: string; cardNumbers: number[] };

type DraftCard = Omit<ImageCard, "id" | "number">;
type CardLike = (ImageCard | DraftCard) & { number?: string };
type SuggestionResult = { title: string; tags: CardTags; newTags?: Array<{ category: TagCategory; label: string; reason?: string }> };
type ImportRow = { id: string; fileName: string; observation: string; insight: string };
type ImportQueue = { rows: ImportRow[]; files: Record<string, File>; currentIndex: number; active: boolean };

const tagCategories: Array<{ id: TagCategory; label: string; description: string; examples: string[] }> = [
  { id: "subject", label: "대상", description: "관찰의 중심이 되는 대상", examples: ["간판", "벽면", "창문", "문", "의자", "조명", "식물"] },
  { id: "composition", label: "구성", description: "형태, 배치, 여백과 깊이가 조직되는 방식", examples: ["직선", "곡선", "격자", "반복", "정렬", "비대칭", "중첩", "여백", "깊이감"] },
  { id: "color", label: "색·빛", description: "색, 명도, 채도와 빛이 함께 작동하는 방식", examples: ["고채도", "무채색", "명도 대비", "색상 대비", "그라디언트", "그림자", "확산광", "역광"] },
  { id: "material", label: "표면", description: "재료와 표면의 물성", examples: ["거친 표면", "매끈한 표면", "유광", "무광", "반사", "투명", "금속", "유리", "페인트"] },
  { id: "effect", label: "인상", description: "조형 요소가 만드는 지배적인 감각", examples: ["안정감", "긴장감", "낯섦", "가벼움", "무거움", "차가움", "따뜻함", "고요함"] },
];
const tagCategoryIds = tagCategories.map((category) => category.id);

const addSteps: Array<{ id: AddStep; label: string }> = [
  { id: "refine", label: "관찰 이미지화" },
  { id: "metadata", label: "메타데이터" },
  { id: "observe", label: "관찰" },
  { id: "insight", label: "인사이트" },
  { id: "suggest", label: "제목/태그" },
];

const observationFields: Array<{ key: keyof Observation; label: string; prompt: string }> = [
  { key: "element", label: "요소", prompt: "무엇이 보이는가?" },
  { key: "composition", label: "구성", prompt: "어떻게 배치되어 있는가?" },
  { key: "condition", label: "상태", prompt: "재질, 낡음, 빛, 손상은 어떤가?" },
  { key: "context", label: "맥락", prompt: "어디에서 어떤 상황으로 만났는가?" },
  { key: "effect", label: "효과", prompt: "어떤 인상과 작용을 만드는가?" },
];

const groupFieldLabels: Record<GroupField, string> = {
  topic: "주제",
  collectedAt: "수집 시간",
  collectedPlace: "수집 공간",
  subject: "대상",
  composition: "구성",
  color: "색·빛",
  material: "표면",
  effect: "인상",
};

const emptyObservation: Observation = {
  element: "",
  composition: "",
  condition: "",
  context: "",
  effect: "",
};

const emptyTags: CardTags = {
  subject: [],
  composition: [],
  color: [],
  material: [],
  effect: [],
};

const sampleCards: ImageCard[] = [
  {
    id: "sample-01",
    number: "1",
    title: "중력이 그리는 그라디언트",
    imageUrl: "",
    originalImageUrl: "",
    collectedAt: "2026.04.24",
    collectedTime: "오전 11시 1분",
    collectedPlace: "귀갓길의 화분 표면",
    sourceUrl: "",
    fileName: "blue-glaze.jpg",
    foundContext: "아침 운동 후, 귀갓길에서 우연히 발견한 화분의 표면.",
    crop: { crop: { x: 0, y: 0 }, zoom: 1, rotation: 0, croppedAreaPixels: null },
    observation: {
      element: "파란 유약이 아래로 흐르며 세로 방향의 선을 만든다.",
      composition: "색의 농도가 위에서 아래로 달라지며 수직 리듬을 만든다.",
      condition: "표면에는 작은 균열과 유약의 흐름이 함께 남아 있다.",
      context: "길 위에서 본 일상 사물의 표면이지만 회화처럼 보였다.",
      effect: "깊이와 농도가 생겨 단순한 색 번짐보다 방향성을 가진 그라디언트처럼 느껴진다.",
    },
    tags: {
      subject: ["화분"],
      composition: ["수직 리듬", "깊이감"],
      color: ["그라디언트"],
      material: ["유약", "균열"],
      effect: ["방향성"],
    },
  },
  {
    id: "sample-02",
    number: "2",
    title: "그림자가 나누는 덩어리",
    imageUrl: "",
    originalImageUrl: "",
    collectedAt: "2026.04.24",
    collectedTime: "오후 1시 35분",
    collectedPlace: "큰 길에 진입하기 전 골목의 작은 화단",
    sourceUrl: "",
    fileName: "red-flowers.jpg",
    foundContext: "강한 붉은색 꽃이 그림자에 의해 여러 덩어리로 나뉘어 보였다.",
    crop: { crop: { x: 0, y: 0 }, zoom: 1, rotation: 0, croppedAreaPixels: null },
    observation: {
      element: "붉은 연산홍 꽃과 가지 사이의 어두운 그림자가 보인다.",
      composition: "동일한 색채 덩어리가 그림자로 잘려 개별 군집처럼 인식된다.",
      condition: "햇빛과 그늘이 강하게 갈라져 색의 밀도가 달라진다.",
      context: "길가 화단에서 점심 무렵 발견했다.",
      effect: "차분하게 갈라 앉은 그림자가 강렬한 붉은색을 덩어리로 나누어 준다.",
    },
    tags: {
      subject: ["화단"],
      composition: ["군집", "분절"],
      color: ["고채도", "명암 대비"],
      material: [],
      effect: ["강렬함"],
    },
  },
  {
    id: "sample-03",
    number: "3",
    title: "점",
    imageUrl: "",
    originalImageUrl: "",
    collectedAt: "2026.06.26",
    collectedTime: "오후 6시 21분",
    collectedPlace: "공덕",
    sourceUrl: "",
    fileName: "building-corner.jpg",
    foundContext: "하늘이 맑을 때 아래에서 위로 올려다본 건물 모서리.",
    crop: { crop: { x: 0, y: 0 }, zoom: 1, rotation: 0, croppedAreaPixels: null },
    observation: {
      element: "건물의 뾰족한 모서리와 하늘, 층층이 쌓인 띠가 보인다.",
      composition: "화면 위쪽 한 점으로 모서리와 반복선이 모인다.",
      condition: "하늘은 밝고 건물 하부는 어둡게 눌려 있다.",
      context: "공덕에서 건물 아래를 지나가며 위를 올려다봤다.",
      effect: "복잡한 요소가 사라지고 선과 빈 하늘만 남아 시원하다.",
    },
    tags: {
      subject: ["건물"],
      composition: ["소실점", "여백"],
      color: ["명암 대비"],
      material: [],
      effect: ["시원함"],
    },
  },
];

function today() {
  return new Date().toISOString().slice(0, 10).replaceAll("-", ".");
}

function nowTime() {
  const date = new Date();
  const hour = date.getHours();
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${hour >= 12 ? "오후" : "오전"} ${hour % 12 || 12}시 ${minute}분`;
}

function formatCardDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}.${month}.${day}`;
}

function formatCardTime(date: Date) {
  const hour = date.getHours();
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${hour >= 12 ? "오후" : "오전"} ${hour % 12 || 12}시 ${minute}분`;
}

function parseExifDate(value: unknown) {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value !== "string") return null;
  const exifMatch = value.trim().match(/^(\d{4}):(\d{2}):(\d{2})\s+(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (exifMatch) {
    const [, year, month, day, hour, minute, second = "0"] = exifMatch;
    return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function compactKoreanAddress(address: Record<string, string> | undefined) {
  if (!address) return "";
  const province = address.state || address.province || "";
  const city = address.city || address.town || address.county || "";
  const district = address.borough || address.city_district || address.district || address.county || "";
  const neighborhood = address.suburb || address.quarter || address.neighbourhood || address.village || address.hamlet || address.road || "";
  return [province, city, district, neighborhood].filter((value, index, array) => value && array.indexOf(value) === index).join(" ");
}

async function reverseGeocodeKorean(latitude: number, longitude: number) {
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&accept-language=ko`);
    if (!response.ok) return "";
    const data = await response.json();
    return compactKoreanAddress(data.address);
  } catch {
    return "";
  }
}

async function readExifMetadata(file: File) {
  try {
    const metadata = await exifr.parse(file, { exif: true, gps: true, tiff: true });
    const capturedAt = [
      metadata?.DateTimeOriginal,
      metadata?.CreateDate,
      metadata?.DateTimeDigitized,
      metadata?.DateCreated,
      metadata?.CreationDate,
      metadata?.MediaCreateDate,
      metadata?.ModifyDate,
      file.lastModified,
    ].map(parseExifDate).find((date): date is Date => date !== null) ?? null;
    const latitude = metadata?.latitude ?? metadata?.GPSLatitude;
    const longitude = metadata?.longitude ?? metadata?.GPSLongitude;
    const collectedPlace = typeof latitude === "number" && typeof longitude === "number" ? await reverseGeocodeKorean(latitude, longitude) : "";

    return {
      collectedAt: capturedAt ? formatCardDate(capturedAt) : today(),
      collectedTime: capturedAt ? formatCardTime(capturedAt) : nowTime(),
      collectedPlace,
    };
  } catch {
    const fileDate = parseExifDate(file.lastModified);
    return {
      collectedAt: fileDate ? formatCardDate(fileDate) : today(),
      collectedTime: fileDate ? formatCardTime(fileDate) : nowTime(),
      collectedPlace: "",
    };
  }
}

function createDraft(): DraftCard {
  return {
    title: "",
    imageUrl: "",
    originalImageUrl: "",
    collectedAt: today(),
    collectedTime: nowTime(),
    collectedPlace: "",
    sourceUrl: "",
    fileName: "",
    foundContext: "",
    crop: { crop: { x: 0, y: 0 }, zoom: 1, rotation: 0, croppedAreaPixels: null },
    observation: { ...emptyObservation },
    tags: { ...emptyTags },
    topics: [],
  };
}

function getDefaultCropFrameSize() {
  if (typeof window === "undefined") return 620;
  const isMobile = window.innerWidth < 640;
  const widthAllowance = isMobile ? window.innerWidth - 48 : window.innerWidth - 220;
  const heightAllowance = isMobile ? window.innerHeight - 270 : 620;
  return Math.max(280, Math.floor(Math.min(widthAllowance, heightAllowance)));
}

function tagStringToArray(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function normalizeTags(value: unknown): CardTags {
  const record = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const next: CardTags = { ...emptyTags };
  const append = (category: TagCategory, source: unknown) => {
    if (Array.isArray(source)) next[category] = [...next[category], ...tagStringToArray(source.join(","))];
  };
  tagCategoryIds.forEach((category) => {
    next[category] = Array.isArray(record[category]) ? tagStringToArray(record[category].join(",")) : [];
  });
  append("composition", record.form);
  append("composition", record.space);
  append("color", record.light);
  append("effect", record.topic);
  append("subject", record.element);
  append("material", record.condition);
  append("composition", record.context);
  tagCategoryIds.forEach((category) => {
    next[category] = Array.from(new Set(next[category].map((tag) => tag.trim()).filter(Boolean)));
  });
  return next;
}

function hasAnyTags(tags: CardTags) {
  return Object.values(tags).some((items) => items.length > 0);
}

function flattenTags(tags: CardTags) {
  return tagCategoryIds.flatMap((category) => tags[category].map((tag) => ({ category, label: tag })));
}

function tagMapToInputs(tags: CardTags) {
  return Object.fromEntries(tagCategoryIds.map((category) => [category, tags[category].join(", ")])) as Record<TagCategory, string>;
}

function normalizeCardImageUrl(value: string) {
  if (!value) return value;
  const withoutOrigin = value.replace(/^https?:\/\/[^/]+/, "");
  if (withoutOrigin.startsWith("/api/card-image?")) return withoutOrigin;
  if (withoutOrigin.startsWith("/api/card-images/")) {
    const objectName = withoutOrigin.slice("/api/card-images/".length).split("?")[0].split("/").map(decodeURIComponent).join("/");
    return `/api/card-image?path=${encodeURIComponent(objectName)}`;
  }
  return value;
}

function withExportCacheBust(value: string, cardId: string) {
  if (!value) return value;
  return `${value}${value.includes("?") ? "&" : "?"}export=${encodeURIComponent(cardId)}`;
}

async function waitForNodeImages(node: HTMLElement) {
  const images = Array.from(node.querySelectorAll("img"));
  await Promise.all(images.map((image) => {
    if (image.complete && image.naturalWidth > 0) return Promise.resolve();
    return new Promise<void>((resolve) => {
      image.addEventListener("load", () => resolve(), { once: true });
      image.addEventListener("error", () => resolve(), { once: true });
    });
  }));
}

function normalizeCard(card: ImageCard): ImageCard {
  return {
    ...card,
    imageUrl: normalizeCardImageUrl(card.imageUrl),
    originalImageUrl: normalizeCardImageUrl(card.originalImageUrl),
    tags: normalizeTags(card.tags),
    topics: Array.isArray(card.topics) ? card.topics.filter((topic): topic is string => typeof topic === "string" && Boolean(topic.trim())) : [],
  };
}

function normalizeFileName(value: string) {
  return value.trim().split(/[\\/]/).pop()?.toLowerCase() || "";
}

function normalizeFileStem(value: string) {
  return normalizeFileName(value).replace(/\.[^.]+$/, "");
}

function getImportFile(files: Record<string, File>, fileName: string) {
  return files[normalizeFileName(fileName)] || files[normalizeFileStem(fileName)];
}

function createImportFileMap(files: File[]) {
  const entries: Array<[string, File]> = [];
  files.forEach((file) => {
    entries.push([normalizeFileName(file.name), file]);
    entries.push([normalizeFileStem(file.name), file]);
  });
  return Object.fromEntries(entries);
}

function parseCsvRecords(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === "\"" && quoted && next === "\"") {
      value += "\"";
      index += 1;
    } else if (char === "\"") {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(value);
      value = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(value);
      if (row.some((item) => item.trim())) rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }

  row.push(value);
  if (row.some((item) => item.trim())) rows.push(row);
  return rows;
}

function parseImportCsv(text: string): ImportRow[] {
  const records = parseCsvRecords(text.replace(/^\uFEFF/, ""));
  const headers = (records[0] || []).map((header) => header.trim());
  const fieldIndex = (names: string[]) => headers.findIndex((header) => names.includes(header));
  const fileNameIndex = fieldIndex(["fileName", "filename", "image", "imageFile", "file"]);
  const observationIndex = fieldIndex(["observation", "관찰"]);
  const insightIndex = fieldIndex(["insight", "인사이트"]);

  if (fileNameIndex < 0) return [];
  return records.slice(1).map((record, index) => ({
    id: `import-${Date.now()}-${index}`,
    fileName: (record[fileNameIndex] || "").trim(),
    observation: observationIndex >= 0 ? (record[observationIndex] || "").trim() : "",
    insight: insightIndex >= 0 ? (record[insightIndex] || "").trim() : "",
  })).filter((row) => row.fileName);
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("file read failed"));
    };
    reader.onerror = () => reject(reader.error || new Error("file read failed"));
    reader.readAsDataURL(file);
  });
}

function observationText(observation: Observation) {
  return [...observationFields.map((field) => observation[field.key]), observation.insight].filter(Boolean).join(" ");
}

function observationBody(observation: Observation) {
  return [observation.element, observation.composition, observation.condition, observation.context].filter(Boolean).join(" ") || "관찰 기록이 여기에 들어간다.";
}

function insightBody(observation: Observation) {
  return observation.insight || observation.effect || "인사이트가 여기에 들어간다.";
}

function suggestTitle(observation: Observation) {
  const text = observationText(observation);
  if (text.includes("그림자")) return "그림자가 나누는 덩어리";
  if (text.includes("재질") || text.includes("질감") || text.includes("표면")) return "질감과 색채 대비";
  if (text.includes("여백") || text.includes("하늘")) return "점";
  if (text.includes("색") || text.includes("대비")) return "색채 대비가 만든 장면";
  if (text.includes("선") || text.includes("직선")) return "선이 만드는 질서";
  return "눈에 걸린 조형 기록";
}

function suggestTags(observation: Observation) {
  const text = observationText(observation);
  const tags = normalizeTags({});
  if (text.includes("그림자")) tags.color.push("그림자");
  if (text.includes("재질") || text.includes("질감") || text.includes("표면")) tags.material.push("질감");
  if (text.includes("여백") || text.includes("하늘")) tags.composition.push("여백");
  if (text.includes("색") || text.includes("대비")) tags.color.push("색상 대비");
  if (text.includes("선") || text.includes("직선")) tags.composition.push("직선");
  if (text.includes("반복")) tags.composition.push("반복");
  return tags;
}

function isTagCategory(value: GroupField): value is TagCategory {
  return (tagCategoryIds as string[]).includes(value);
}

function getGroupValues(card: ImageCard, groupBy: GroupField) {
  if (groupBy === "topic") return card.topics?.length ? card.topics : ["주제 미정"];
  if (isTagCategory(groupBy)) return card.tags[groupBy];
  return [card[groupBy] || "미기록"];
}

function groupCards(cards: ImageCard[], groupBy: GroupField) {
  const groups = new Map<string, ImageCard[]>();
  cards.forEach((card) => {
    getGroupValues(card, groupBy).forEach((value) => {
      groups.set(value, [...(groups.get(value) ?? []), card]);
    });
  });
  return Array.from(groups.entries()).map(([value, items]) => ({ value, cards: items }));
}

function cardMatchesQuery(card: ImageCard, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  const haystack = [card.title, card.collectedAt, card.collectedPlace, card.sourceUrl, card.foundContext, observationText(card.observation), ...(card.topics || []), ...Object.values(card.tags).flat()].join(" ").toLowerCase();
  return haystack.includes(normalized);
}

function classNames(...items: Array<string | false | null | undefined>) {
  return items.filter(Boolean).join(" ");
}

function createImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", reject);
    image.setAttribute("crossOrigin", "anonymous");
    image.src = url;
  });
}

function getRadianAngle(degreeValue: number) {
  return (degreeValue * Math.PI) / 180;
}

async function getCroppedImage(imageSrc: string, cropState: CropState, frameSize: number, mediaSize: CropMediaSize | null) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return imageSrc;

  const outputSize = 1800;
  const safeFrameSize = Math.max(1, frameSize || outputSize);
  const outputScale = outputSize / safeFrameSize;
  const baseWidth = mediaSize?.width || safeFrameSize;
  const baseHeight = mediaSize?.height || safeFrameSize;
  const renderedWidth = baseWidth * cropState.zoom * outputScale;
  const renderedHeight = baseHeight * cropState.zoom * outputScale;

  canvas.width = outputSize;
  canvas.height = outputSize;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, outputSize, outputSize);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.translate(outputSize / 2 + cropState.crop.x * outputScale, outputSize / 2 + cropState.crop.y * outputScale);
  ctx.rotate(getRadianAngle(cropState.rotation));
  ctx.drawImage(image, -renderedWidth / 2, -renderedHeight / 2, renderedWidth, renderedHeight);

  return canvas.toDataURL("image/jpeg", 0.86);
}

async function resizeImageDataUrl(imageSrc: string, maxSide: number, quality: number) {
  if (!imageSrc) return imageSrc;
  try {
    const image = await createImage(imageSrc);
    const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return imageSrc;
    canvas.width = width;
    canvas.height = height;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", quality);
  } catch {
    return imageSrc;
  }
}

async function createSuggestionImage(imageSrc: string) {
  if (!imageSrc) return null;
  try {
    const dataUrl = await resizeImageDataUrl(imageSrc, 768, 0.72);
    const [meta, data] = dataUrl.split(",");
    const mimeType = meta.match(/^data:(.*);base64$/)?.[1] || "image/jpeg";
    return data ? { mimeType, data } : null;
  } catch {
    return null;
  }
}

async function createStoredImage(imageSrc: string) {
  if (!imageSrc || !imageSrc.startsWith("data:image/")) return imageSrc;
  if (imageSrc.startsWith("data:image/jpeg")) return imageSrc;
  return resizeImageDataUrl(imageSrc, 1800, 0.86);
}

function SampleVisual({ tone = "warm" }: { tone?: "warm" | "cool" | "dark" | "paper" }) {
  const palettes = {
    warm: "from-[#e7d4a7] via-[#ad5538] to-[#2a2d21]",
    cool: "from-[#e7edf0] via-[#6e8b8d] to-[#142029]",
    dark: "from-[#1d2118] via-[#4b523c] to-[#d4b84f]",
    paper: "from-[#f5eedb] via-[#c7b990] to-[#1f241d]",
  };
  return (
    <div className={classNames("relative h-full min-h-full w-full overflow-hidden bg-gradient-to-br", palettes[tone])}>
      <div className="absolute left-[14%] top-[18%] h-[18%] w-[62%] rounded-full bg-white/80 mix-blend-screen" />
      <div className="absolute bottom-[20%] right-[16%] h-[30%] w-[30%] rounded-[38%] bg-black/80" />
      <div className="absolute bottom-[18%] left-[18%] h-[8%] w-[52%] rounded-full bg-[#0A84FF]/75" />
    </div>
  );
}

function CardImage({ card }: { card: ImageCard }) {
  if (card.imageUrl) return <img className="h-full w-full object-cover" src={card.imageUrl} alt="" />;
  const tones: Array<"warm" | "cool" | "dark" | "paper"> = ["cool", "warm", "dark", "paper"];
  const index = sampleCards.findIndex((item) => item.id === card.id);
  return <SampleVisual tone={tones[Math.max(0, index) % tones.length]} />;
}

function CardSpread({ card, compact = false, exportMode = false, hideActions = false, onEdit, onDelete, onExport }: { card: CardLike; compact?: boolean; exportMode?: boolean; hideActions?: boolean; onEdit?: () => void; onDelete?: () => void; onExport?: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const number = card.number || "--";
  const title = card.title || "제목 미정";
  const observed = observationBody(card.observation);
  const insight = insightBody(card.observation);
  const displayTags = (card.topics || []).slice(0, 5).map((label) => ({ category: "effect" as TagCategory, label }));
  const timeLine = [card.collectedAt, card.collectedTime].filter(Boolean).join(" · ");
  const placeLine = card.collectedPlace;
  const imageNode = card.imageUrl ? <img className="h-full w-full object-cover" src={card.imageUrl} alt="" /> : <SampleVisual tone="cool" />;
  const imageCardPadding = exportMode ? "p-[44px]" : compact ? "p-5" : "p-4 sm:p-5 lg:p-5";
  const textCardPadding = exportMode ? "px-[54px] py-[54px]" : compact ? "px-6 py-6" : "px-4 pb-5 pt-4 sm:px-5 sm:pb-6 lg:px-6 lg:py-6";
  const titleSize = exportMode ? "text-[54px] leading-[1.08]" : compact ? "text-[21px] leading-[1.22]" : "text-[20px] leading-[1.18] sm:text-[22px] lg:text-[19px]";
  const numberSize = exportMode ? "h-[62px] w-[62px] text-[30px]" : compact ? "h-8 w-8 text-[16px]" : "h-8 w-8 text-[14px] lg:h-7 lg:w-7 lg:text-[13px]";

  return (
    <div className={classNames("group/card relative grid min-w-0 max-w-full", exportMode && "h-[1417px] w-[2362px] grid-cols-2 overflow-hidden border border-[#b8b8bd] bg-white", !exportMode && (compact ? "grid-cols-1 gap-6" : "w-full grid-cols-1 overflow-hidden rounded-[22px] border border-black/10 bg-white shadow-[0_12px_34px_rgba(18,18,18,0.06)] sm:rounded-[26px] lg:grid-cols-2 lg:rounded-none lg:border-[#b8b8bd] lg:shadow-[0_12px_34px_rgba(18,18,18,0.08)]"))}>
      {!exportMode && !hideActions && (onEdit || onDelete || onExport) && (
        <div className={classNames("absolute right-3 top-3 z-30 transition-opacity duration-150 lg:group-hover/card:opacity-100 lg:group-focus-within/card:opacity-100", menuOpen ? "opacity-100" : "opacity-100 lg:pointer-events-none lg:opacity-0 lg:group-hover/card:pointer-events-auto lg:group-focus-within/card:pointer-events-auto")}>
          <button className="grid h-10 w-10 place-items-center rounded-full bg-white/92 text-black shadow-md shadow-black/10 backdrop-blur-xl" onClick={() => setMenuOpen((current) => !current)} type="button" aria-label="카드 메뉴">
            <MoreHorizontal size={18} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-28 overflow-hidden rounded-2xl border border-black/10 bg-white text-sm font-medium shadow-xl shadow-black/15">
              <button className="block w-full px-4 py-3 text-left hover:bg-[#f5f5f7]" onClick={() => { setMenuOpen(false); onEdit?.(); }} type="button">수정</button>
              <button className="block w-full px-4 py-3 text-left hover:bg-[#f5f5f7]" onClick={() => { setMenuOpen(false); onExport?.(); }} type="button">내보내기</button>
              <button className="block w-full px-4 py-3 text-left text-red-600 hover:bg-red-50" onClick={() => { setMenuOpen(false); onDelete?.(); }} type="button">삭제</button>
            </div>
          )}
        </div>
      )}
      <article className={classNames("relative min-w-0 overflow-hidden bg-white", exportMode ? "h-full border-r border-[#b8b8bd]" : "h-auto lg:aspect-[5/6]", compact ? "border border-[#b8b8bd] shadow-[0_1px_10px_rgba(0,0,0,0.14)]" : "border-b border-black/10 lg:border-b-0 lg:border-r lg:border-[#b8b8bd]", imageCardPadding)}>
        <div>
          <div className="flex items-center gap-3 pr-10 lg:pr-0">
            <span className={classNames("inline-flex shrink-0 items-center justify-center rounded-full bg-black font-bold leading-none text-white", numberSize)}>{number}</span>
            <h3 className={classNames("font-bold", titleSize)}>{title}</h3>
          </div>
          <div className={classNames("mt-2 font-normal leading-[1.45] text-[#5f5f63]", exportMode ? "text-[24px]" : "text-[12px] lg:text-[10px]")}>
            <p>{timeLine}</p>
            {placeLine && <p>{placeLine}</p>}
          </div>
        </div>
        <div className={classNames("aspect-square overflow-hidden bg-[#e6e6e3]", exportMode ? "absolute inset-x-[44px] bottom-[44px]" : "relative mt-4 w-full lg:absolute lg:inset-x-5 lg:bottom-5 lg:mt-0 lg:w-auto")}>{imageNode}</div>
      </article>

      <article className={classNames("relative min-w-0 overflow-hidden bg-white", exportMode ? "h-full" : "h-auto lg:aspect-[5/6]", compact ? "border border-[#b8b8bd] shadow-[0_1px_10px_rgba(0,0,0,0.14)]" : "", textCardPadding)}>
        <div className={classNames("flex flex-wrap", exportMode ? "absolute left-[54px] top-[54px] gap-[12px]" : "gap-1.5 lg:absolute lg:left-6 lg:top-6")}>
          {(displayTags.length > 0 ? displayTags : [{ category: "effect" as TagCategory, label: "주제 미정" }]).map((tag) => <span className={classNames("whitespace-nowrap rounded-full border border-black/70 font-semibold leading-none text-black/70", exportMode ? "px-[18px] py-[8px] text-[24px]" : "px-2 py-1 text-[10px] sm:px-2 sm:py-1 sm:text-[10px] lg:text-[11px]")} key={`${tag.category}-${tag.label}`}>{tag.label}</span>)}
        </div>
        <div className={classNames("flex h-full flex-col", exportMode ? "gap-[42px] pb-[90px] pt-[150px]" : "gap-5 pb-11 pt-5 lg:pb-10 lg:pt-[54px]")}>
          <section>
            <p className={classNames("mb-2 font-semibold text-black", exportMode ? "text-[34px] leading-[1.35]" : compact ? "text-[18px] leading-[1.55]" : "text-[15px] leading-[1.4] lg:text-[14px]")}>관찰</p>
            <p className={classNames("whitespace-pre-line font-normal text-[#252527]", exportMode ? "text-[30px] leading-[1.5]" : compact ? "text-[16px] leading-[1.55]" : "text-[14px] leading-[1.65] lg:text-[12px]")}>{observed}</p>
          </section>
          <section>
            <p className={classNames("mb-2 font-semibold text-black", exportMode ? "text-[34px] leading-[1.35]" : compact ? "text-[18px] leading-[1.55]" : "text-[15px] leading-[1.4] lg:text-[14px]")}>인사이트</p>
            <p className={classNames("whitespace-pre-line font-normal text-[#252527]", exportMode ? "text-[30px] leading-[1.5]" : compact ? "text-[16px] leading-[1.55]" : "text-[14px] leading-[1.65] lg:text-[12px]")}>{insight}</p>
          </section>
        </div>
        <span className={classNames("absolute inline-flex shrink-0 items-center justify-center rounded-full bg-black font-bold leading-none text-white", numberSize, exportMode ? "bottom-[44px] right-[44px]" : compact ? "bottom-5 right-5" : "bottom-4 right-4 sm:bottom-5 sm:right-5 lg:bottom-5 lg:right-5")}>{number}</span>
      </article>
    </div>
  );
}

function ExportCardSpread({ card }: { card: ImageCard }) {
  const observed = observationBody(card.observation);
  const insight = insightBody(card.observation);
  const displayTags = (card.topics || []).slice(0, 5).map((label) => ({ category: "effect" as TagCategory, label }));
  const timeLine = [card.collectedAt, card.collectedTime].filter(Boolean).join(" · ");
  const imageNode = card.imageUrl ? <img className="h-full w-full object-cover" crossOrigin="anonymous" src={withExportCacheBust(card.imageUrl, card.id)} alt="" /> : <SampleVisual tone="cool" />;

  return (
    <div className="grid h-[1417px] w-[2362px] grid-cols-2 overflow-hidden border border-[#b8b8bd] bg-white text-black">
      <article className="relative h-full overflow-hidden border-r border-[#b8b8bd] bg-white p-[46px]">
        <div>
          <div className="flex items-center gap-[22px]">
            <span className="inline-flex h-[92px] w-[92px] shrink-0 items-center justify-center rounded-full bg-black text-[46px] font-bold leading-none text-white">{card.number}</span>
            <h3 className="text-[56px] font-bold leading-[1.12]">{card.title}</h3>
          </div>
          <div className="mt-[14px] text-[36px] font-medium leading-[1.2] text-black">
            <p>{timeLine}</p>
            {card.collectedPlace && <p>{card.collectedPlace}</p>}
          </div>
        </div>
        <div className="absolute inset-x-[46px] bottom-[46px] aspect-square overflow-hidden bg-[#dfe0e4]">{imageNode}</div>
      </article>

      <article className="relative h-full overflow-hidden bg-white px-[58px] py-[58px]">
        <div className="absolute left-[58px] top-[58px] flex max-w-[980px] flex-wrap gap-[10px]">
          {(displayTags.length > 0 ? displayTags : [{ category: "effect" as TagCategory, label: "주제 미정" }]).map((tag) => (
            <span className="whitespace-nowrap rounded-full border border-black/70 px-[22px] py-[10px] text-[28px] font-semibold leading-none text-black/70" key={`${tag.category}-${tag.label}`}>{tag.label}</span>
          ))}
        </div>
        <div className="flex h-full flex-col gap-[54px] pb-[120px] pt-[160px]">
          <section>
            <p className="mb-[18px] text-[48px] font-bold leading-[1.38]">관찰</p>
            <p className="whitespace-pre-line text-[42px] font-normal leading-[1.42]">{observed}</p>
          </section>
          <section>
            <p className="mb-[18px] text-[48px] font-bold leading-[1.38]">인사이트</p>
            <p className="whitespace-pre-line text-[42px] font-normal leading-[1.42]">{insight}</p>
          </section>
        </div>
        <span className="absolute bottom-[46px] right-[46px] inline-flex h-[92px] w-[92px] items-center justify-center rounded-full bg-black text-[46px] font-bold leading-none text-white">{card.number}</span>
      </article>
    </div>
  );
}

function ThemeCardSpread({ theme, exportMode = false, onExport }: { theme: ThemeCard; exportMode?: boolean; onExport?: () => void }) {
  return (
    <div className={classNames("group/theme relative grid overflow-hidden border border-[#b8b8bd] bg-white", exportMode ? "h-[1417px] w-[2362px] grid-cols-2" : "grid-cols-1 rounded-[22px] shadow-[0_12px_34px_rgba(18,18,18,0.06)] sm:rounded-[26px] lg:aspect-[10/6] lg:grid-cols-2 lg:rounded-none")}>
      {!exportMode && onExport && <button className="absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full bg-white/92 opacity-100 shadow-md shadow-black/10 transition lg:pointer-events-none lg:opacity-0 lg:group-hover/theme:pointer-events-auto lg:group-hover/theme:opacity-100" onClick={onExport} type="button" aria-label={`${theme.title} 내보내기`}><Download size={17} /></button>}
      <article className={classNames("relative flex min-w-0 flex-col justify-between border-black/10 bg-white", exportMode ? "h-full border-r border-[#b8b8bd] p-[70px]" : "aspect-[5/6] border-b p-7 lg:aspect-auto lg:border-b-0 lg:border-r lg:p-8")}>
        <p className={classNames("font-medium text-[#85858a]", exportMode ? "text-[30px]" : "text-xs")}>주제 {String(theme.order).padStart(2, "0")}</p>
        <h2 className={classNames("max-w-[90%] break-keep font-bold tracking-[-0.035em]", exportMode ? "text-[112px] leading-[1.08]" : "text-[42px] leading-[1.08] sm:text-[50px] lg:text-[44px]")}>{theme.title}</h2>
        <p className={classNames("font-medium text-[#85858a]", exportMode ? "text-[28px]" : "text-xs")}>{theme.cardNumbers.length} cards</p>
      </article>
      <article className={classNames("relative flex min-w-0 items-center bg-white", exportMode ? "h-full p-[76px]" : "aspect-[5/6] p-7 lg:aspect-auto lg:p-8")}>
        <p className={classNames("whitespace-pre-line text-[#252527]", exportMode ? "text-[44px] font-light leading-[1.55]" : "text-[18px] font-normal leading-[1.7] sm:text-[20px] lg:text-[17px]")}>{theme.description}</p>
      </article>
    </div>
  );
}

export function ImageZettelkastenPrototype() {
  const [mode, setMode] = useState<AppMode>("library");
  const [libraryView, setLibraryView] = useState<LibraryView>("cards");
  const [cards, setCards] = useState<ImageCard[]>([]);
  const [themes, setThemes] = useState<ThemeCard[]>([]);
  const [groupBy, setGroupBy] = useState<GroupField>("topic");
  const [selectedGroupValue, setSelectedGroupValue] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<DraftCard>(createDraft);
  const [tagInputs, setTagInputs] = useState<Record<TagCategory, string>>(tagMapToInputs(emptyTags));
  const [addStep, setAddStep] = useState<AddStep>("refine");
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ImageCard | null>(null);
  const [deletingCard, setDeletingCard] = useState(false);
  const [cropZoomInitialized, setCropZoomInitialized] = useState(false);
  const [cropFrameSize, setCropFrameSize] = useState(getDefaultCropFrameSize);
  const [cropMediaSize, setCropMediaSize] = useState<CropMediaSize | null>(null);
  const addImageInputRef = useRef<HTMLInputElement | null>(null);
  const importCsvInputRef = useRef<HTMLInputElement | null>(null);
  const importImageInputRef = useRef<HTMLInputElement | null>(null);
  const cardExportRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const themeExportRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const lastSuggestionRequestKey = useRef("");
  const saveInFlightRef = useRef(false);
  const [exporting, setExporting] = useState(false);
  const [savingCard, setSavingCard] = useState(false);
  const [llmSuggestion, setLlmSuggestion] = useState<SuggestionResult | null>(null);
  const [suggestionStatus, setSuggestionStatus] = useState<"idle" | "loading" | "error">("idle");
  const [suggestionError, setSuggestionError] = useState("");
  const [cardsLoading, setCardsLoading] = useState(true);
  const [pendingImportRows, setPendingImportRows] = useState<ImportRow[]>([]);
  const [importQueue, setImportQueue] = useState<ImportQueue | null>(null);
  const [libraryMenuOpen, setLibraryMenuOpen] = useState(false);

  const filteredCards = useMemo(() => cards.filter((card) => cardMatchesQuery(card, query)), [cards, query]);
  const groups = useMemo(() => groupCards(filteredCards, groupBy), [filteredCards, groupBy]);
  const visibleCards = useMemo(() => {
    if (!selectedGroupValue) return filteredCards;
    return groups.find((group) => group.value === selectedGroupValue)?.cards ?? [];
  }, [filteredCards, groups, selectedGroupValue]);
  const fallbackTitle = useMemo(() => suggestTitle(draft.observation), [draft.observation]);
  const fallbackTags = useMemo(() => suggestTags(draft.observation), [draft.observation]);
  const suggestedTitle = llmSuggestion?.title || fallbackTitle;
  const suggestedTags = llmSuggestion && hasAnyTags(llmSuggestion.tags) ? llmSuggestion.tags : fallbackTags;
  const canAutoSuggest = !draft.title.trim() && !hasAnyTags(draft.tags);
  const finalTitle = canAutoSuggest ? suggestedTitle : draft.title.trim();
  const finalTags = canAutoSuggest ? suggestedTags : draft.tags;
  const currentImportRow = importQueue?.active ? importQueue.rows[importQueue.currentIndex] : null;
  const suggestionRequestKey = useMemo(() => JSON.stringify({
    observation: observationBody(draft.observation),
    insight: insightBody(draft.observation),
    collectedAt: draft.collectedAt,
    collectedTime: draft.collectedTime,
    collectedPlace: draft.collectedPlace,
  }), [draft.collectedAt, draft.collectedPlace, draft.collectedTime, draft.observation]);

  useEffect(() => {
    if (addStep !== "suggest") return;
    if (!canAutoSuggest) return;
    if (lastSuggestionRequestKey.current === suggestionRequestKey) return;
    lastSuggestionRequestKey.current = suggestionRequestKey;
    void requestCardSuggestion();
  }, [addStep, canAutoSuggest, suggestionRequestKey]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/cards")
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("load failed")))
      .then((data) => {
        if (!cancelled) setCards(Array.isArray(data.cards) ? data.cards.map(normalizeCard) : []);
      })
      .catch(() => {
        if (!cancelled) setCards(sampleCards);
      })
      .finally(() => {
        if (!cancelled) setCardsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/themes")
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("load failed")))
      .then((data) => {
        if (!cancelled) setThemes(Array.isArray(data.themes) ? data.themes : []);
      })
      .catch(() => {
        if (!cancelled) setThemes([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function updateDraft(next: Partial<DraftCard>) {
    setDraft((current) => ({ ...current, ...next }));
  }

  function updateCrop(next: Partial<CropState>) {
    setDraft((current) => ({ ...current, crop: { ...current.crop, ...next } }));
  }

  function startAddMode() {
    setEditingCardId(null);
    setImportQueue(null);
    setPendingImportRows([]);
    addImageInputRef.current?.click();
  }

  function closeAddMode() {
    setEditingCardId(null);
    setImportQueue(null);
    setPendingImportRows([]);
    setMode("library");
  }

  function advanceImportQueue() {
    if (!importQueue?.active) return false;
    const nextIndex = importQueue.currentIndex + 1;
    if (nextIndex < importQueue.rows.length) {
      const nextQueue = { ...importQueue, currentIndex: nextIndex };
      setImportQueue(nextQueue);
      void loadImportRow(nextQueue.rows, nextQueue.files, nextIndex);
    } else {
      setImportQueue(null);
      setPendingImportRows([]);
      setMode("library");
    }
    return true;
  }

  function skipCurrentImportRow() {
    if (savingCard) return;
    advanceImportQueue();
  }

  async function readImage(file: File | undefined) {
    if (!file) return;
    const metadata = await readExifMetadata(file);
    const reader = new FileReader();
    reader.onload = async () => {
      if (typeof reader.result === "string") {
        const workingImage = await resizeImageDataUrl(reader.result, 1800, 0.86);
        setDraft({ ...createDraft(), imageUrl: workingImage, originalImageUrl: workingImage, fileName: "", collectedAt: metadata.collectedAt, collectedTime: metadata.collectedTime, collectedPlace: metadata.collectedPlace });
        setTagInputs(tagMapToInputs(emptyTags));
        setLlmSuggestion(null);
        setSuggestionStatus("idle");
        setSuggestionError("");
        lastSuggestionRequestKey.current = "";
        setEditingCardId(null);
        setCropZoomInitialized(false);
        setCropMediaSize(null);
        setCropFrameSize(getDefaultCropFrameSize());
        setAddStep("refine");
        setMode("add");
      }
    };
    reader.readAsDataURL(file);
  }

  async function loadImportRow(rows: ImportRow[], files: Record<string, File>, currentIndex: number) {
    const row = rows[currentIndex];
    if (!row) return;
    const file = getImportFile(files, row.fileName);
    if (!file) {
      window.alert(`이미지 파일을 찾지 못했다: ${row.fileName}`);
      return;
    }
    const metadata = await readExifMetadata(file);
    const dataUrl = await fileToDataUrl(file);
    const workingImage = await resizeImageDataUrl(dataUrl, 1800, 0.86);
    setDraft({
      ...createDraft(),
      imageUrl: workingImage,
      originalImageUrl: workingImage,
      fileName: file.name,
      collectedAt: metadata.collectedAt,
      collectedTime: metadata.collectedTime,
      collectedPlace: metadata.collectedPlace,
      observation: { ...emptyObservation, context: row.observation, insight: row.insight },
    });
    setTagInputs(tagMapToInputs(emptyTags));
    setLlmSuggestion(null);
    setSuggestionStatus("idle");
    setSuggestionError("");
    lastSuggestionRequestKey.current = "";
    setEditingCardId(null);
    setCropZoomInitialized(false);
    setCropMediaSize(null);
    setCropFrameSize(getDefaultCropFrameSize());
    setAddStep("refine");
    setMode("add");
  }

  async function readImportCsv(file: File | undefined) {
    if (!file) return;
    const rows = parseImportCsv(await file.text());
    if (rows.length === 0) {
      window.alert("CSV에서 fileName 행을 찾지 못했다.");
      return;
    }
    setPendingImportRows(rows);
  }

  function readImportImages(fileList: FileList | null) {
    const files = fileList ? Array.from(fileList) : [];
    if (pendingImportRows.length === 0 || files.length === 0) return;
    const fileMap = createImportFileMap(files);
    const matchedRows = pendingImportRows.filter((row) => getImportFile(fileMap, row.fileName));
    if (matchedRows.length === 0) {
      window.alert("CSV와 매칭되는 이미지가 없다.");
      return;
    }
    const queue = { rows: matchedRows, files: fileMap, currentIndex: 0, active: true };
    setImportQueue(queue);
    void loadImportRow(queue.rows, queue.files, 0);
  }

  async function commitCrop() {
    if (!draft.originalImageUrl) return draft.imageUrl;
    const cropped = await getCroppedImage(draft.originalImageUrl, draft.crop, cropFrameSize, cropMediaSize);
    updateDraft({ imageUrl: cropped });
    return cropped;
  }

  async function requestCardSuggestion() {
    setSuggestionStatus("loading");
    setSuggestionError("");
    try {
      const suggestionImage = await createSuggestionImage(draft.imageUrl);
      const response = await fetch("/api/suggest-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          observation: observationBody(draft.observation),
          insight: insightBody(draft.observation),
          collectedAt: draft.collectedAt,
          collectedTime: draft.collectedTime,
          collectedPlace: draft.collectedPlace,
          image: suggestionImage,
        }),
      });
      if (!response.ok) throw new Error("suggestion request failed");
      const data = await response.json() as Partial<SuggestionResult>;
      const title = typeof data.title === "string" ? data.title.trim() : "";
      const tags = normalizeTags(data.tags);
      if (!title && !hasAnyTags(tags)) throw new Error("empty suggestion");
      const nextTitle = title || fallbackTitle;
      const nextTags = hasAnyTags(tags) ? tags : fallbackTags;
      setLlmSuggestion({ title: nextTitle, tags: nextTags });
      setDraft((current) => ({ ...current, title: nextTitle, tags: nextTags }));
      setTagInputs(tagMapToInputs(nextTags));
      setSuggestionStatus("idle");
    } catch {
      setLlmSuggestion(null);
      setSuggestionStatus("error");
      setSuggestionError("제안을 만들지 못했다. 기본 제안을 사용한다.");
    }
  }

  function updateCategoryTags(category: TagCategory, value: string) {
    setTagInputs((current) => ({ ...current, [category]: value }));
    updateDraft({ tags: { ...draft.tags, [category]: tagStringToArray(value) } });
  }

  function removeCategoryTag(category: TagCategory, tagToRemove: string) {
    const nextTags = draft.tags[category].filter((tag) => tag !== tagToRemove);
    updateDraft({ tags: { ...draft.tags, [category]: nextTags } });
    setTagInputs((current) => ({ ...current, [category]: nextTags.join(", ") }));
  }

  async function goNext() {
    if (addStep === "refine") {
      const cropped = await commitCrop();
      if (cropped) {
        setDraft((current) => ({ ...current, imageUrl: cropped }));
      }
    }
    const currentIndex = addSteps.findIndex((step) => step.id === addStep);
    const next = addSteps[currentIndex + 1];
    if (next) {
      setAddStep(next.id);
    }
  }

  function goPrev() {
    const currentIndex = addSteps.findIndex((step) => step.id === addStep);
    const prev = addSteps[currentIndex - 1];
    if (prev) setAddStep(prev.id);
    else closeAddMode();
  }

  async function saveDraftAsCard() {
    if (saveInFlightRef.current) return;
    saveInFlightRef.current = true;
    setSavingCard(true);

    try {
      const committedImageUrl = addStep === "refine" ? await commitCrop() : draft.imageUrl;
      const storedImageUrl = await createStoredImage(committedImageUrl || draft.imageUrl);
      if (editingCardId) {
        const updatedCard = {
          ...(cards.find((card) => card.id === editingCardId) as ImageCard),
          id: editingCardId,
          number: cards.find((card) => card.id === editingCardId)?.number || "1",
          title: finalTitle,
          imageUrl: storedImageUrl,
          originalImageUrl: storedImageUrl,
          collectedAt: draft.collectedAt,
          collectedTime: draft.collectedTime,
          collectedPlace: draft.collectedPlace || "미기록",
          sourceUrl: draft.sourceUrl,
          fileName: draft.fileName,
          foundContext: draft.foundContext,
          crop: draft.crop,
          observation: draft.observation,
          tags: finalTags,
          topics: draft.topics || [],
        };
        const response = await fetch(`/api/cards/${encodeURIComponent(editingCardId)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ card: updatedCard }),
        });
        if (!response.ok) {
          window.alert("카드를 저장하지 못했다.");
          return;
        }
        const data = await response.json();
        if (Array.isArray(data.cards)) {
          setCards(data.cards.map(normalizeCard));
        } else {
          setCards((current) => current.map((card) => card.id === editingCardId ? { ...card, ...normalizeCard(data.card) } : card));
        }
        setSelectedGroupValue(null);
        setEditingCardId(null);
        setMode("library");
        return;
      }

      const newCard: ImageCard = {
        id: `card-${Date.now()}`,
        number: "0",
        title: finalTitle,
        imageUrl: storedImageUrl,
        originalImageUrl: storedImageUrl,
        collectedAt: draft.collectedAt,
        collectedTime: draft.collectedTime,
        collectedPlace: draft.collectedPlace || "미기록",
        sourceUrl: draft.sourceUrl,
        fileName: draft.fileName || "untitled-image",
        foundContext: draft.foundContext || "미기록",
        crop: draft.crop,
        observation: draft.observation,
        tags: finalTags,
        topics: draft.topics || [],
      };
      const response = await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ card: newCard }),
      });
      if (!response.ok) {
        window.alert("카드를 저장하지 못했다.");
        return;
      }
      const data = await response.json();
      if (Array.isArray(data.cards)) {
        setCards(data.cards.map(normalizeCard));
      } else {
        setCards((current) => [normalizeCard(data.card), ...current]);
      }
      setSelectedGroupValue(null);
      if (importQueue?.active) {
        advanceImportQueue();
        return;
      }
      setMode("library");
    } finally {
      saveInFlightRef.current = false;
      setSavingCard(false);
    }
  }

  function startEditCard(card: ImageCard) {
    setDraft({
      title: card.title,
      imageUrl: card.imageUrl,
      originalImageUrl: card.originalImageUrl || card.imageUrl,
      collectedAt: card.collectedAt,
      collectedTime: card.collectedTime,
      collectedPlace: card.collectedPlace,
      sourceUrl: card.sourceUrl,
      fileName: card.fileName,
      foundContext: card.foundContext,
      crop: card.crop,
      observation: { ...emptyObservation, ...card.observation },
      tags: normalizeTags(card.tags),
      topics: card.topics || [],
    });
    setTagInputs(tagMapToInputs(normalizeTags(card.tags)));
    setLlmSuggestion(null);
    setSuggestionStatus("idle");
    setSuggestionError("");
    lastSuggestionRequestKey.current = "";
    setCropMediaSize(null);
    setEditingCardId(card.id);
    setAddStep("metadata");
    setMode("add");
  }

  async function confirmDeleteCard() {
    if (!deleteTarget || deletingCard) return;
    setDeletingCard(true);
    try {
      const response = await fetch(`/api/cards/${encodeURIComponent(deleteTarget.id)}`, { method: "DELETE" });
      if (!response.ok) {
        window.alert("카드를 삭제하지 못했다.");
        return;
      }
      const data = await response.json();
      if (Array.isArray(data.cards)) {
        setCards(data.cards.map(normalizeCard));
      } else {
        setCards((current) => current.filter((card) => card.id !== deleteTarget.id));
      }
      setDeleteTarget(null);
    } finally {
      setDeletingCard(false);
    }
  }

  async function exportAllCards() {
    if (exporting) return;
    setExporting(true);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    try {
      const zip = new JSZip();
      for (const card of cards) {
        const node = cardExportRefs.current[card.id];
        if (!node) continue;
        await waitForNodeImages(node);
        const dataUrl = await toPng(node, {
          cacheBust: true,
          includeQueryParams: true,
          pixelRatio: 1,
          width: 2362,
          height: 1417,
          canvasWidth: 2362,
          canvasHeight: 1417,
        });
        zip.file(`card-${card.number}.png`, dataUrl.split(",")[1], { base64: true });
      }
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "image-zettelkasten-cards.zip";
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  async function exportSingleCard(card: ImageCard) {
    if (exporting) return;
    setExporting(true);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    try {
      const node = cardExportRefs.current[card.id];
      if (!node) return;
      await waitForNodeImages(node);
      const dataUrl = await toPng(node, {
        cacheBust: true,
        includeQueryParams: true,
        pixelRatio: 1,
        width: 2362,
        height: 1417,
        canvasWidth: 2362,
        canvasHeight: 1417,
      });
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `card-${card.number}.png`;
      link.click();
    } finally {
      setExporting(false);
    }
  }

  async function exportAllThemes() {
    if (exporting) return;
    setExporting(true);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    try {
      const zip = new JSZip();
      for (const theme of themes) {
        const node = themeExportRefs.current[theme.id];
        if (!node) continue;
        const dataUrl = await toPng(node, { pixelRatio: 1, width: 2362, height: 1417, canvasWidth: 2362, canvasHeight: 1417 });
        zip.file(`theme-${String(theme.order).padStart(2, "0")}.png`, dataUrl.split(",")[1], { base64: true });
      }
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "image-zettelkasten-themes.zip";
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  async function exportSingleTheme(theme: ThemeCard) {
    if (exporting) return;
    setExporting(true);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    try {
      const node = themeExportRefs.current[theme.id];
      if (!node) return;
      const dataUrl = await toPng(node, { pixelRatio: 1, width: 2362, height: 1417, canvasWidth: 2362, canvasHeight: 1417 });
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `theme-${String(theme.order).padStart(2, "0")}.png`;
      link.click();
    } finally {
      setExporting(false);
    }
  }

  if (mode === "add") {
    return (
    <div className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,#fbfbf9_0%,#f2f2ef_42%,#ecece8_100%)] font-sans text-[#171719]">
        {addStep !== "refine" && (
          <header className="sticky top-0 z-30 border-b border-black/8 bg-[#f8f8f6]/92 px-3 py-2.5 backdrop-blur-2xl sm:px-6 sm:py-3">
            <div className="mx-auto flex max-w-7xl items-center gap-3 sm:gap-6">
              <button className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-sm font-medium transition-colors hover:bg-black/5 sm:px-3" onClick={goPrev} type="button">
                <ArrowLeft size={19} /><span className="hidden sm:inline">이전</span>
              </button>
              <div className="min-w-0 flex-1">
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <strong className="truncate text-sm font-semibold sm:text-base">{addSteps.find((step) => step.id === addStep)?.label}</strong>
                  <span className="shrink-0 text-[11px] font-medium text-[#737377]">{addSteps.findIndex((step) => step.id === addStep) + 1} / {addSteps.length}</span>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-black/8">
                  <div className="h-full rounded-full bg-[#1769ff] transition-[width] duration-300" style={{ width: `${((addSteps.findIndex((step) => step.id === addStep) + 1) / addSteps.length) * 100}%` }} />
                </div>
              </div>
              {addStep === "suggest" ? (
                <button className="hidden h-11 shrink-0 items-center gap-2 rounded-full bg-[#1769ff] px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45 sm:inline-flex" disabled={savingCard} onClick={saveDraftAsCard} type="button">
                  {savingCard && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
                  <span>{savingCard ? "저장 중" : "완료"}</span>
                </button>
              ) : <button className="hidden h-11 shrink-0 rounded-full bg-black px-5 text-sm font-semibold text-white sm:block" onClick={goNext} type="button">다음</button>}
            </div>
          </header>
        )}

        <main className={classNames("mx-auto grid w-full max-w-7xl gap-4 pb-28 sm:gap-6 sm:pb-10", addStep === "refine" ? "px-0 py-0 sm:px-6 sm:py-5" : "px-3 py-3 sm:px-6 sm:py-6")}>
          {importQueue && currentImportRow && (
            <div className="mx-4 mt-4 rounded-2xl bg-black px-4 py-3 text-sm font-semibold text-white sm:mx-0 sm:mt-0">
              대량 임포트 {importQueue.currentIndex + 1}/{importQueue.rows.length} · {currentImportRow.fileName}
            </div>
          )}
          {addStep === "refine" && (
            <section className="overflow-hidden bg-white sm:rounded-[24px] sm:border sm:border-black/8 sm:shadow-[0_20px_60px_rgba(18,18,18,0.08)]">
              <div className="flex h-14 items-center justify-between border-b border-black/8 px-3 text-black sm:h-[68px] sm:px-5">
                <div className="flex items-center gap-2">
                  <button className="h-10 rounded-full px-2 text-sm font-medium text-[#66666a] sm:px-3" onClick={closeAddMode} type="button">취소</button>
                  {importQueue?.active && <button className="h-10 rounded-full border border-black/10 bg-white px-3 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-45" disabled={savingCard} onClick={skipCurrentImportRow} type="button">건너뛰기</button>}
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-semibold text-black/40">1 / 5</p>
                  <h2 className="text-sm font-semibold sm:text-base">관찰 이미지</h2>
                </div>
                <button className="h-10 rounded-full bg-[#1769ff] px-4 text-sm font-semibold text-white sm:px-5" onClick={goNext} type="button">다음</button>
              </div>

              <div className="relative h-[calc(100svh-196px)] min-h-[380px] bg-[#ececea] sm:h-[min(66vh,680px)]">
                <button className="absolute right-3 top-3 z-20 grid h-11 w-11 place-items-center rounded-full bg-white/92 text-black shadow-lg shadow-black/10 backdrop-blur-xl" onClick={() => updateCrop({ crop: { x: 0, y: 0 }, zoom: 1, rotation: 0 })} type="button" aria-label="크롭 리셋">
                  <RotateCcw size={18} />
                </button>
                <div className="absolute inset-0">
                  {draft.originalImageUrl ? (
                    <Cropper
                      image={draft.originalImageUrl}
                      crop={draft.crop.crop}
                      zoom={draft.crop.zoom}
                      rotation={draft.crop.rotation}
                      aspect={1}
                      cropShape="rect"
                      objectFit="contain"
                      showGrid={false}
                      zoomWithScroll={false}
                      minZoom={0.25}
                      cropSize={{ width: cropFrameSize, height: cropFrameSize }}
                      classes={{
                        containerClassName: "",
                        cropAreaClassName: "rounded-[2px]",
                      }}
                      style={{
                        containerStyle: {
                          backgroundColor: "#ececea",
                        },
                        cropAreaStyle: {
                          border: "2px solid rgba(0,0,0,0.92)",
                          boxShadow: "0 0 0 9999px rgba(246,246,243,0.66), 0 0 0 1px rgba(255,255,255,0.8)",
                        },
                      }}
                      onCropChange={(crop) => updateCrop({ crop })}
                      onZoomChange={(zoom) => updateCrop({ zoom })}
                      onRotationChange={(rotation) => updateCrop({ rotation })}
                      onCropComplete={(_, croppedAreaPixels) => updateCrop({ croppedAreaPixels })}
                      onMediaLoaded={(mediaSize) => {
                        setCropMediaSize({ width: mediaSize.width, height: mediaSize.height });
                        if (cropZoomInitialized || editingCardId) return;
                        const mediaFrameSize = Math.floor(Math.min(mediaSize.width, mediaSize.height));
                        setCropFrameSize(Math.max(280, Math.min(getDefaultCropFrameSize(), mediaFrameSize)));
                        updateCrop({ crop: { x: 0, y: 0 }, zoom: 1 });
                        setCropZoomInitialized(true);
                      }}
                    />
                  ) : (
                    <SampleVisual tone="cool" />
                  )}
                </div>
              </div>

              <div className="border-t border-black/8 bg-[#f8f8f6] px-4 py-2.5 text-black sm:px-6 sm:py-4">
                <div className="mx-auto max-w-3xl">
                  <Control compact label="크롭 배율" value={`${draft.crop.zoom.toFixed(3)}x`} min={0.25} max={6} step={0.005} rangeValue={draft.crop.zoom} onChange={(value) => updateCrop({ zoom: value })} />
                  <Control compact label="기울기 보정" value={`${draft.crop.rotation.toFixed(1)}°`} min={-15} max={15} step={0.1} rangeValue={draft.crop.rotation} onChange={(value) => updateCrop({ rotation: value })} />
                </div>
              </div>
            </section>
          )}

          {addStep === "metadata" && (
            <section className="grid grid-cols-1 overflow-hidden rounded-[24px] border border-black/8 bg-white shadow-[0_20px_60px_rgba(18,18,18,0.07)] lg:min-h-[680px] lg:grid-cols-[0.85fr_1.15fr] lg:rounded-[30px]">
              <div className="grid place-items-center bg-[#e9e9e6] p-3 sm:p-5 lg:p-8">
                <div className="aspect-square w-full max-w-[560px] overflow-hidden bg-[#dededb]">
                  {draft.imageUrl ? <img className="h-full w-full object-cover" src={draft.imageUrl} alt="" /> : <SampleVisual tone="paper" />}
                </div>
              </div>
              <div className="grid content-center gap-6 p-5 sm:p-7 lg:p-10">
                <div><p className="text-xs font-medium text-[#77777b]">2 / 5</p><h2 className="mt-1 text-2xl font-semibold tracking-[-0.02em] lg:text-3xl">언제, 어디에서 발견했나요?</h2><p className="mt-2 text-sm font-normal leading-6 text-[#707074]">사진의 촬영 정보를 불러왔습니다. 필요한 부분만 고치면 됩니다.</p></div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="수집 날짜" value={draft.collectedAt} onChange={(value) => updateDraft({ collectedAt: value })} />
                  <Field label="수집 시간" value={draft.collectedTime} onChange={(value) => updateDraft({ collectedTime: value })} />
                  <Field wide label="수집 공간" value={draft.collectedPlace} onChange={(value) => updateDraft({ collectedPlace: value })} placeholder="공덕, 을지로, Pinterest..." />
                </div>
              </div>
            </section>
          )}

          {addStep === "observe" && (
            <section className="grid grid-cols-1 gap-3 lg:grid-cols-[360px_minmax(0,1fr)] lg:gap-5">
              <div className="rounded-[22px] bg-white p-3 shadow-[0_14px_40px_rgba(18,18,18,0.06)] lg:sticky lg:top-24 lg:rounded-[26px] lg:p-4">
                <div className="aspect-square w-full overflow-hidden bg-[#dededb]">
                  {draft.imageUrl ? <img className="h-full w-full object-cover" src={draft.imageUrl} alt="" /> : <SampleVisual tone="cool" />}
                </div>
              </div>
              <div className="grid gap-3">
                <div className="rounded-[22px] bg-white px-5 py-4 lg:rounded-[26px] lg:px-6 lg:py-5"><p className="text-xs font-medium text-[#77777b]">3 / 5</p><h2 className="mt-1 text-2xl font-semibold tracking-[-0.02em] lg:text-3xl">무엇이 눈에 걸렸나요?</h2></div>
                <label className="grid gap-4 rounded-[22px] border border-black/8 bg-white p-5 lg:rounded-[26px] lg:p-6">
                  <span className="grid gap-1.5"><strong className="text-base font-semibold">관찰</strong><small className="text-xs font-normal leading-5 text-[#707074] sm:text-sm">보이는 요소와 배치, 빛, 재질, 발견한 상황을 자연스럽게 적어보세요.</small></span>
                  <textarea autoFocus className="min-h-[300px] resize-none rounded-[18px] border border-black/8 bg-[#f7f7f5] p-4 text-[15px] font-normal leading-7 outline-none transition focus:border-[#1769ff] focus:bg-white lg:min-h-[500px] lg:p-5 lg:text-base lg:leading-8" value={observationBody(draft.observation) === "관찰 기록이 여기에 들어간다." ? "" : observationBody(draft.observation)} onChange={(event) => setDraft((current) => ({ ...current, observation: { ...current.observation, element: "", composition: "", condition: "", context: event.target.value } }))} placeholder="예: 얇은 철판의 모서리를 따라 빛이 번지고, 반복되는 수직선 사이로 작은 그림자가 생긴다…" />
                </label>
              </div>
            </section>
          )}

          {addStep === "insight" && (
            <section className="grid grid-cols-1 gap-3 lg:grid-cols-[360px_minmax(0,1fr)] lg:gap-5">
              <div className="rounded-[22px] bg-white p-3 shadow-[0_14px_40px_rgba(18,18,18,0.06)] lg:sticky lg:top-24 lg:rounded-[26px] lg:p-4">
                <div className="aspect-square w-full overflow-hidden bg-[#dededb]">
                  {draft.imageUrl ? <img className="h-full w-full object-cover" src={draft.imageUrl} alt="" /> : <SampleVisual tone="cool" />}
                </div>
              </div>
              <div className="grid gap-3">
                <div className="rounded-[22px] bg-white px-5 py-4 lg:rounded-[26px] lg:px-6 lg:py-5"><p className="text-xs font-medium text-[#77777b]">4 / 5</p><h2 className="mt-1 text-2xl font-semibold tracking-[-0.02em] lg:text-3xl">왜 계속 보고 싶었나요?</h2></div>
                <label className="grid gap-4 rounded-[22px] border border-black/8 bg-white p-5 lg:rounded-[26px] lg:p-6">
                  <span className="grid gap-1.5"><strong className="text-base font-semibold">인사이트</strong><small className="text-xs font-normal leading-5 text-[#707074] sm:text-sm">이 장면이 만드는 조형적 효과와 다른 작업에 가져가고 싶은 원리를 적어보세요.</small></span>
                  <textarea autoFocus className="min-h-[300px] resize-none rounded-[18px] border border-black/8 bg-[#f7f7f5] p-4 text-[15px] font-normal leading-7 outline-none transition focus:border-[#1769ff] focus:bg-white lg:min-h-[500px] lg:p-5 lg:text-base lg:leading-8" value={draft.observation.insight ?? ""} onChange={(event) => setDraft((current) => ({ ...current, observation: { ...current.observation, effect: "", insight: event.target.value } }))} placeholder="예: 동일한 간격의 선보다 미세하게 어긋난 간격이 표면에 더 살아 있는 리듬을 만든다…" />
                </label>
              </div>
            </section>
          )}

          {addStep === "suggest" && (
            <section className="grid grid-cols-1 gap-3 lg:min-h-[680px] lg:grid-cols-[0.8fr_1.2fr] lg:gap-5">
              <div className="rounded-[22px] bg-[#101012] p-5 text-white shadow-[0_18px_50px_rgba(18,18,18,0.12)] lg:rounded-[28px] lg:p-7"><div className="flex items-center justify-between"><div className="grid h-10 w-10 place-items-center rounded-full bg-[#1769ff]"><Sparkles size={19} /></div><span className="text-xs font-medium text-white/55">5 / 5</span></div><h2 className="mt-5 text-2xl font-semibold tracking-[-0.02em] lg:text-3xl">기록의 이름과<br />조형 언어를 정리합니다.</h2><div className="mt-6 rounded-[18px] bg-white/8 p-4 lg:mt-8"><div className="flex items-center justify-between gap-3"><span className="text-xs font-medium text-white/55">AI 제안</span><button className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-medium disabled:opacity-40" disabled={suggestionStatus === "loading"} onClick={requestCardSuggestion} type="button">다시 제안</button></div>{suggestionStatus === "loading" ? <div className="grid place-items-center py-12"><span className="h-7 w-7 animate-spin rounded-full border-2 border-white/20 border-t-white" /></div> : <><p className="mt-4 text-xl font-semibold leading-snug">{draft.title || suggestedTitle}</p><div className="mt-4 flex flex-wrap gap-1.5">{flattenTags(hasAnyTags(draft.tags) ? draft.tags : suggestedTags).map((tag) => <span className="rounded-full bg-white/10 px-2.5 py-1.5 text-xs font-medium text-white/85" key={`${tag.category}-${tag.label}`}>{tag.label}</span>)}</div></>}{suggestionError && <p className="mt-3 text-xs font-medium text-[#ff6961]">{suggestionError}</p>}</div></div>
              <div className="grid content-start gap-5 rounded-[22px] bg-white p-5 lg:rounded-[28px] lg:p-7">
                <Field label="제목" value={draft.title} onChange={(value) => updateDraft({ title: value })} />
                <div className="grid gap-4 sm:grid-cols-2">
                  {tagCategories.map((category) => (
                    <label className="grid content-start gap-2 text-sm font-semibold text-black" key={category.id}>
                      <span>{category.label}</span>
                      <input className="rounded-[15px] border border-black/8 bg-[#f7f7f5] px-3.5 py-3 font-normal outline-none transition focus:border-[#1769ff] focus:bg-white" value={tagInputs[category.id]} onChange={(event) => updateCategoryTags(category.id, event.target.value)} placeholder={category.examples.slice(0, 3).join(", ")} />
                      <div className="flex flex-wrap gap-2">
                        {draft.tags[category.id].map((tag) => <span className="group inline-flex items-center gap-1 rounded-full border border-black/20 px-2.5 py-1.5 text-xs font-medium text-black/70" key={`${category.id}-${tag}`}>{tag}<button className="inline-flex rounded-full p-0.5 text-black/45 hover:bg-black hover:text-white" onClick={() => removeCategoryTag(category.id, tag)} type="button" aria-label={`${tag} 삭제`}><X size={12} /></button></span>)}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </section>
          )}

        </main>

        {addStep !== "refine" && (
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-black/8 bg-[#f8f8f6]/94 px-3 pb-[calc(10px+env(safe-area-inset-bottom))] pt-2.5 backdrop-blur-2xl sm:hidden">
            <div className="mx-auto flex max-w-lg gap-2">
              <button className="h-12 flex-1 rounded-full bg-black/6 text-sm font-semibold text-black" onClick={goPrev} type="button">이전</button>
              {addStep === "suggest" ? (
                <button className="inline-flex h-12 flex-[1.7] items-center justify-center gap-2 rounded-full bg-[#1769ff] text-sm font-semibold text-white disabled:opacity-45" disabled={savingCard} onClick={saveDraftAsCard} type="button">{savingCard ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <Check size={17} />}{savingCard ? "저장 중" : "기록 저장"}</button>
              ) : <button className="h-12 flex-[1.7] rounded-full bg-black text-sm font-semibold text-white" onClick={goNext} type="button">다음</button>}
            </div>
          </div>
        )}

      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,#fbfbf9_0%,#f2f2ef_42%,#ecece8_100%)] font-sans text-[#171719]">
      <input ref={addImageInputRef} className="hidden" type="file" accept="image/*" onChange={(event) => { readImage(event.target.files?.[0]); event.currentTarget.value = ""; }} />
      <input ref={importCsvInputRef} className="hidden" type="file" accept=".csv,text/csv" onChange={(event) => { void readImportCsv(event.target.files?.[0]); event.currentTarget.value = ""; }} />
      <input ref={importImageInputRef} className="hidden" type="file" multiple accept="image/*" onChange={(event) => { readImportImages(event.target.files); event.currentTarget.value = ""; }} />
      <header className="sticky top-0 z-30 w-full border-b border-black/8 bg-[#f8f8f6]/92 backdrop-blur-2xl">
        <div className="mx-auto flex w-full max-w-[1500px] items-center gap-3 px-4 py-3 sm:gap-4 sm:px-6 sm:py-4">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] bg-black text-white sm:h-11 sm:w-11"><Library size={19} strokeWidth={1.8} /></div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2"><h1 className="truncate text-[19px] font-semibold tracking-[-0.025em] sm:text-[22px]">{libraryView === "cards" ? "수집함" : "주제 카드"}</h1><span className="text-xs font-medium text-[#7b7b80]">{libraryView === "cards" ? cards.length : themes.length}</span></div>
            <p className="hidden text-xs font-normal text-[#85858a] sm:block">매일 발견한 조형 언어의 아카이브</p>
          </div>
          <button className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-black px-3.5 text-[13px] font-semibold text-white sm:hidden" onClick={startAddMode} type="button"><ImagePlus size={16} /> 새 기록</button>
          <label className="hidden h-11 min-w-[280px] max-w-[380px] flex-1 items-center gap-2.5 rounded-full bg-black/5 px-4 md:flex"><Search size={17} className="text-[#77777b]" /><input className="w-full bg-transparent text-sm font-normal outline-none placeholder:text-[#8c8c91]" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="장면, 장소, 태그 검색" /></label>
          <div className="relative shrink-0">
            <button className="grid h-10 w-10 place-items-center rounded-full bg-white text-black shadow-sm shadow-black/5 transition hover:bg-black/5 sm:h-11 sm:w-11" aria-label="가져오기 및 내보내기" aria-expanded={libraryMenuOpen} onClick={() => setLibraryMenuOpen((current) => !current)} type="button"><MoreHorizontal size={19} /></button>
            {libraryMenuOpen && <div className="absolute right-0 z-50 mt-2 grid w-48 overflow-hidden rounded-[18px] border border-black/8 bg-white p-1.5 text-sm font-medium shadow-[0_18px_50px_rgba(18,18,18,0.15)]">
              <button className="flex h-11 items-center gap-3 rounded-[13px] px-3 text-left hover:bg-black/5" onClick={() => { setLibraryMenuOpen(false); importCsvInputRef.current?.click(); }} type="button"><Upload size={16} /> 대량 임포트</button>
              <button className="flex h-11 items-center gap-3 rounded-[13px] px-3 text-left hover:bg-black/5 disabled:opacity-45" disabled={exporting} onClick={() => { setLibraryMenuOpen(false); void (libraryView === "cards" ? exportAllCards() : exportAllThemes()); }} type="button"><Download size={16} /> {exporting ? "내보내는 중" : "전체 내보내기"}</button>
              <a className="flex h-11 items-center gap-3 rounded-[13px] px-3 hover:bg-black/5" href="/image-zettelkasten-import-template.csv" onClick={() => setLibraryMenuOpen(false)} download>CSV 템플릿</a>
            </div>}
          </div>
          <button className="hidden h-11 shrink-0 items-center gap-2 rounded-full bg-black px-5 text-sm font-semibold text-white sm:inline-flex" onClick={startAddMode} type="button"><ImagePlus size={17} /> 새 기록</button>
        </div>
        <div className="px-4 pb-3 md:hidden">
          <label className="mx-auto flex h-11 w-full max-w-[720px] items-center gap-2.5 rounded-[14px] bg-black/5 px-3.5"><Search size={17} className="text-[#77777b]" /><input className="w-full bg-transparent text-[15px] font-normal outline-none placeholder:text-[#8c8c91]" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="장면, 장소, 태그 검색" /></label>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-[1500px] gap-4 px-3 pb-10 pt-4 sm:px-6 sm:pt-6">
        <nav className="flex w-fit rounded-full bg-black/5 p-1">
          <button className={classNames("h-9 rounded-full px-4 text-xs font-semibold transition", libraryView === "cards" ? "bg-black text-white" : "text-black/55")} onClick={() => setLibraryView("cards")} type="button">수집 카드</button>
          <button className={classNames("h-9 rounded-full px-4 text-xs font-semibold transition", libraryView === "themes" ? "bg-black text-white" : "text-black/55")} onClick={() => setLibraryView("themes")} type="button">주제 카드</button>
        </nav>
        <section className={classNames("min-w-0", libraryView !== "cards" && "hidden")}>
          <div className="mb-4 sm:mb-5">
            <div className="flex max-w-full items-center gap-2 overflow-x-auto whitespace-nowrap pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <label className="relative flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-black/8 bg-white px-3 text-xs font-medium shadow-sm shadow-black/[0.03]">
                <SlidersHorizontal size={13} />
                <span>{groupFieldLabels[groupBy]}</span>
                <ChevronRight className="rotate-90" size={11} />
                <select className="absolute inset-0 h-full w-full cursor-pointer opacity-0" aria-label="정렬 기준" value={groupBy} onChange={(event) => { setGroupBy(event.target.value as GroupField); setSelectedGroupValue(null); }}>
                  {(Object.keys(groupFieldLabels) as GroupField[]).map((field) => <option key={field} value={field}>{groupFieldLabels[field]}</option>)}
                </select>
              </label>
              <button className={classNames("h-9 shrink-0 rounded-full px-3 text-xs font-medium transition-colors", selectedGroupValue === null ? "bg-black text-white" : "border border-black/8 bg-white text-black")} onClick={() => setSelectedGroupValue(null)} type="button">전체 <span className="ml-1 opacity-60">{filteredCards.length}</span></button>
              {groups.map((group) => (
                <button className={classNames("h-9 shrink-0 rounded-full px-3 text-xs font-medium transition-colors", selectedGroupValue === group.value ? "bg-[#1769ff] text-white" : "border border-black/8 bg-white text-black")} key={group.value} onClick={() => setSelectedGroupValue(group.value)} type="button">{group.value} <span className="ml-1 opacity-60">{group.cards.length}</span></button>
              ))}
            </div>
          </div>

          {cardsLoading ? (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">{[0, 1, 2, 3].map((item) => <div className="aspect-[5/6] animate-pulse rounded-[22px] bg-black/5 sm:rounded-[26px] lg:aspect-[10/6] lg:rounded-none" key={item} />)}</div>
          ) : visibleCards.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:gap-5 xl:grid-cols-2">
              {visibleCards.map((card) => (
                <div className="min-w-0" key={card.id}>
                  <CardSpread card={card} hideActions={exporting} onEdit={() => startEditCard(card)} onExport={() => exportSingleCard(card)} onDelete={() => setDeleteTarget(card)} />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid min-h-[52svh] place-items-center rounded-[24px] border border-dashed border-black/15 bg-white/55 px-6 text-center"><div><p className="text-lg font-semibold">아직 보이는 기록이 없습니다.</p><p className="mt-2 text-sm font-normal text-[#77777b]">필터를 바꾸거나 새 장면을 수집해보세요.</p></div></div>
          )}
        </section>
        {libraryView === "themes" && <section className="grid min-w-0 grid-cols-1 gap-4 sm:gap-5 xl:grid-cols-2">
          {themes.map((theme) => <ThemeCardSpread key={theme.id} theme={theme} onExport={() => void exportSingleTheme(theme)} />)}
          {themes.length === 0 && <div className="col-span-full grid min-h-[52svh] place-items-center rounded-[24px] border border-dashed border-black/15 bg-white/55 px-6 text-center"><div><p className="text-lg font-semibold">아직 주제 카드가 없습니다.</p><p className="mt-2 text-sm text-[#77777b]">주제 데이터가 등록되면 이곳에 표시됩니다.</p></div></div>}
        </section>}
      </main>

      {pendingImportRows.length > 0 && !importQueue?.active && (
        <div className="fixed inset-0 z-50 grid place-items-end bg-black/30 px-3 pb-[calc(12px+env(safe-area-inset-bottom))] backdrop-blur-sm sm:place-items-center sm:p-5">
          <div className="w-full max-w-md rounded-[26px] bg-white p-5 shadow-2xl shadow-black/20 sm:p-6">
            <p className="text-xs font-semibold text-[#77777b]">대량 임포트</p>
            <h2 className="mt-1 text-xl font-semibold tracking-[-0.02em]">CSV {pendingImportRows.length}개 항목을 읽었습니다.</h2>
            <p className="mt-2 text-sm font-normal leading-6 text-[#6e6e73]">CSV의 파일명과 연결할 이미지들을 한 번에 선택하세요. 일부 이미지만 선택해도 매칭된 항목만 진행합니다.</p>
            <div className="mt-6 grid grid-cols-[0.8fr_1.2fr] gap-2">
              <button className="h-12 rounded-full bg-black/6 text-sm font-semibold" onClick={() => setPendingImportRows([])} type="button">취소</button>
              <button className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-black text-sm font-semibold text-white" onClick={() => importImageInputRef.current?.click()} type="button"><ImagePlus size={17} /> 이미지 선택</button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 px-5 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[28px] bg-white p-6 shadow-2xl shadow-black/20">
            <h2 className="text-xl font-semibold">정말 삭제하시겠습니까?</h2>
            <p className="mt-2 text-sm font-medium leading-6 text-[#6e6e73]">삭제하면 이 카드 기록을 되돌릴 수 없습니다.</p>
            <div className="mt-6 flex justify-end gap-2">
              <button className="rounded-full bg-[#f5f5f7] px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45" disabled={deletingCard} onClick={() => setDeleteTarget(null)} type="button">취소</button>
              <button className="inline-flex items-center gap-2 rounded-full bg-red-600 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45" disabled={deletingCard} onClick={confirmDeleteCard} type="button">
                {deletingCard && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
                <span>{deletingCard ? "삭제 중" : "확인"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="pointer-events-none fixed -left-[10000px] top-0 opacity-0" aria-hidden="true">
        {cards.map((card) => (
          <div ref={(node) => { cardExportRefs.current[card.id] = node; }} key={card.id}>
            <ExportCardSpread card={card} />
          </div>
        ))}
        {themes.map((theme) => <div ref={(node) => { themeExportRefs.current[theme.id] = node; }} key={theme.id}><ThemeCardSpread theme={theme} exportMode /></div>)}
      </div>

    </div>
  );
}

function Control({ label, value, min, max, step, rangeValue, onChange, dark = false, compact = false }: { label: string; value: string; min: number; max: number; step: number; rangeValue: number; onChange: (value: number) => void; dark?: boolean; compact?: boolean }) {
  if (compact) {
    return <div className="grid grid-cols-[76px_minmax(0,1fr)_58px] items-center gap-3 py-1.5 sm:grid-cols-[96px_minmax(0,1fr)_72px] sm:gap-4"><span className="text-xs font-semibold text-black sm:text-sm">{label}</span><input className="w-full accent-[#1769ff]" min={min} max={max} step={step} type="range" value={rangeValue} onChange={(event) => onChange(Number(event.target.value))} /><strong className="text-right font-mono text-xs font-semibold text-[#707074] sm:text-sm">{value}</strong></div>;
  }

  return <div className={classNames("rounded-[18px] border p-4", dark ? "border-white/10 bg-[#2c2c2e]" : "border-black/8 bg-[#f7f7f5]")}><div className="flex items-center justify-between"><span className={classNames("text-sm font-semibold", dark ? "text-white" : "text-black")}>{label}</span><strong className={classNames("font-mono text-sm font-semibold", dark ? "text-white/55" : "text-[#707074]")}>{value}</strong></div><input className="mt-4 w-full accent-[#1769ff]" min={min} max={max} step={step} type="range" value={rangeValue} onChange={(event) => onChange(Number(event.target.value))} /></div>;
}

function Field({ label, value, onChange, placeholder, wide = false }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; wide?: boolean }) {
  return <label className={classNames("grid gap-2 text-sm font-semibold text-black", wide && "sm:col-span-2")}><span>{label}</span><input className="h-12 rounded-[15px] border border-black/8 bg-[#f7f7f5] px-4 font-normal outline-none transition placeholder:text-[#9a9a9e] focus:border-[#1769ff] focus:bg-white" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></label>;
}
