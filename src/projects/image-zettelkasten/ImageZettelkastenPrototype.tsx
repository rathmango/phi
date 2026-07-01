import { ArrowLeft, ChevronRight, Library, MoreHorizontal, RotateCcw, Search, Sparkles, Tags } from "lucide-react";
import * as exifr from "exifr";
import { toPng } from "html-to-image";
import JSZip from "jszip";
import { useEffect, useMemo, useRef, useState } from "react";
import Cropper from "react-easy-crop";
import type { Area, Point } from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";

type AppMode = "library" | "add";
type AddStep = "refine" | "metadata" | "observe" | "insight" | "suggest";
type GroupField = "topic" | "collectedAt" | "collectedPlace" | "sourceUrl" | "foundContext" | "element" | "composition" | "condition" | "context" | "effect";

type Observation = {
  element: string;
  composition: string;
  condition: string;
  context: string;
  effect: string;
  insight?: string;
};

type CardTags = {
  topic: string[];
  element: string[];
  composition: string[];
  condition: string[];
  context: string[];
  effect: string[];
};

type CropState = {
  crop: Point;
  zoom: number;
  rotation: number;
  croppedAreaPixels: Area | null;
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
};

type DraftCard = Omit<ImageCard, "id" | "number">;
type CardLike = (ImageCard | DraftCard) & { number?: string };
type SuggestionResult = { title: string; tags: string[] };

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
  topic: "주제 태그",
  collectedAt: "수집 시간",
  collectedPlace: "수집 공간",
  sourceUrl: "출처",
  foundContext: "발견 맥락",
  element: "요소 태그",
  composition: "구성 태그",
  condition: "상태 태그",
  context: "맥락 태그",
  effect: "효과 태그",
};

const emptyObservation: Observation = {
  element: "",
  composition: "",
  condition: "",
  context: "",
  effect: "",
};

const emptyTags: CardTags = {
  topic: [],
  element: [],
  composition: [],
  condition: [],
  context: [],
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
      topic: ["시간축", "아침", "그라디언트"],
      element: ["유약", "표면", "수직선"],
      composition: ["수직 리듬", "농도 변화"],
      condition: ["균열", "흐름"],
      context: ["길거리", "화분"],
      effect: ["깊이", "방향성"],
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
      topic: ["시간축", "점심", "그림자", "덩어리"],
      element: ["꽃", "가지", "그림자"],
      composition: ["군집", "분절"],
      condition: ["강한 햇빛", "고채도"],
      context: ["화단", "점심"],
      effect: ["강렬함", "분절감"],
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
      topic: ["직선", "깔끔한", "여백", "점"],
      element: ["건물", "하늘", "모서리"],
      composition: ["소실점", "반복선"],
      condition: ["맑음", "그늘"],
      context: ["공덕", "건축"],
      effect: ["시원함", "상승감"],
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
  if (value instanceof Date) return value;
  if (typeof value !== "string") return null;
  const match = value.match(/^(\d{4}):(\d{2}):(\d{2})\s+(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return null;
  const [, year, month, day, hour, minute, second = "0"] = match;
  return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
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
    const capturedAt = parseExifDate(metadata?.DateTimeOriginal) ?? parseExifDate(metadata?.CreateDate) ?? parseExifDate(metadata?.ModifyDate);
    const latitude = metadata?.latitude ?? metadata?.GPSLatitude;
    const longitude = metadata?.longitude ?? metadata?.GPSLongitude;
    const collectedPlace = typeof latitude === "number" && typeof longitude === "number" ? await reverseGeocodeKorean(latitude, longitude) : "";

    return {
      collectedAt: capturedAt ? formatCardDate(capturedAt) : today(),
      collectedTime: capturedAt ? formatCardTime(capturedAt) : nowTime(),
      collectedPlace,
    };
  } catch {
    return {
      collectedAt: today(),
      collectedTime: nowTime(),
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
  };
}

function tagStringToArray(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
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
  const tags = new Set<string>();
  if (text.includes("그림자")) tags.add("그림자");
  if (text.includes("재질") || text.includes("질감") || text.includes("표면")) tags.add("질감");
  if (text.includes("여백") || text.includes("하늘")) tags.add("여백");
  if (text.includes("색") || text.includes("대비")) tags.add("색");
  if (text.includes("선") || text.includes("직선")) tags.add("직선");
  if (text.includes("반복")) tags.add("반복");
  if (tags.size === 0) tags.add("관찰 필요");
  return Array.from(tags);
}

function getGroupValues(card: ImageCard, groupBy: GroupField) {
  if (groupBy === "topic") return card.tags.topic;
  if (groupBy === "element") return card.tags.element;
  if (groupBy === "composition") return card.tags.composition;
  if (groupBy === "condition") return card.tags.condition;
  if (groupBy === "context") return card.tags.context;
  if (groupBy === "effect") return card.tags.effect;
  if (groupBy === "sourceUrl") return [card.sourceUrl || "출처 미기록"];
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
  const haystack = [card.title, card.collectedAt, card.collectedPlace, card.sourceUrl, card.foundContext, observationText(card.observation), ...Object.values(card.tags).flat()].join(" ").toLowerCase();
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

function rotateSize(width: number, height: number, rotation: number) {
  const rotRad = getRadianAngle(rotation);
  return {
    width: Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height: Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
}

async function getCroppedImage(imageSrc: string, pixelCrop: Area, rotation = 0) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return imageSrc;

  const rotRad = getRadianAngle(rotation);
  const { width: bBoxWidth, height: bBoxHeight } = rotateSize(image.width, image.height, rotation);
  canvas.width = bBoxWidth;
  canvas.height = bBoxHeight;
  ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
  ctx.rotate(rotRad);
  ctx.translate(-image.width / 2, -image.height / 2);
  ctx.drawImage(image, 0, 0);

  const cropX = Math.min(Math.max(0, Math.round(pixelCrop.x)), canvas.width - 1);
  const cropY = Math.min(Math.max(0, Math.round(pixelCrop.y)), canvas.height - 1);
  const safeCrop = {
    x: cropX,
    y: cropY,
    width: Math.max(1, Math.min(Math.round(pixelCrop.width), canvas.width - cropX)),
    height: Math.max(1, Math.min(Math.round(pixelCrop.height), canvas.height - cropY)),
  };

  const data = ctx.getImageData(safeCrop.x, safeCrop.y, safeCrop.width, safeCrop.height);
  canvas.width = safeCrop.width;
  canvas.height = safeCrop.height;
  ctx.putImageData(data, 0, 0);
  return canvas.toDataURL("image/jpeg", 0.92);
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
  const topicTags = card.tags.topic.length > 0 ? card.tags.topic : ["태그 미정"];
  const timeLine = [card.collectedAt, card.collectedTime].filter(Boolean).join(" · ");
  const placeLine = card.collectedPlace;
  const imageNode = card.imageUrl ? <img className="h-full w-full object-cover" src={card.imageUrl} alt="" /> : <SampleVisual tone="cool" />;
  const imageCardPadding = exportMode ? "p-[44px]" : compact ? "p-5" : "p-2.5 sm:p-3.5 lg:p-4";
  const textCardPadding = exportMode ? "px-[54px] py-[54px]" : compact ? "px-6 py-6" : "px-3 py-3 sm:px-4 sm:py-4 lg:px-5 lg:py-5";
  const titleSize = exportMode ? "text-[54px] leading-[1.08]" : compact ? "text-[21px] leading-[1.22]" : "text-[13px] leading-[1.12] sm:text-[16px] lg:text-[19px]";

  return (
    <div className={classNames("relative grid min-w-0 max-w-full", exportMode && "h-[1417px] w-[2362px] grid-cols-2 overflow-hidden border border-[#b8b8bd] bg-white", !exportMode && (compact ? "grid-cols-1 gap-6" : "w-full grid-cols-2 overflow-hidden border border-[#b8b8bd] bg-white shadow-[0_10px_30px_rgba(0,0,0,0.12)]"))}>
      {!exportMode && !hideActions && (onEdit || onDelete || onExport) && (
        <div className="absolute right-3 top-3 z-30">
          <button className="grid h-8 w-8 place-items-center rounded-full bg-white/90 text-black shadow-md shadow-black/10 backdrop-blur" onClick={() => setMenuOpen((current) => !current)} type="button" aria-label="카드 메뉴">
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
      <article className={classNames("relative min-w-0 overflow-hidden bg-white", exportMode ? "h-full border-r border-[#b8b8bd]" : "aspect-[5/6]", compact ? "border border-[#b8b8bd] shadow-[0_1px_10px_rgba(0,0,0,0.14)]" : "border-r border-[#b8b8bd]", imageCardPadding)}>
        <div>
          <div className="flex items-center gap-2.5">
            <span className={classNames("inline-flex shrink-0 items-center justify-center rounded-full bg-black font-bold leading-none text-white", exportMode ? "h-[62px] w-[62px] text-[30px]" : compact ? "h-8 w-8 text-[16px]" : "h-5 w-5 text-[10px] sm:h-6 sm:w-6 sm:text-[12px]")}>{number}</span>
            <h3 className={classNames("font-bold", titleSize)}>{title}</h3>
          </div>
          <div className={classNames("mt-1 font-medium leading-tight text-black", exportMode ? "text-[24px]" : "text-[7px] sm:text-[9px] lg:text-[10px]")}>
            <p>{timeLine}</p>
            {placeLine && <p>{placeLine}</p>}
          </div>
        </div>
        <div className={classNames("absolute aspect-square overflow-hidden bg-[#dfe0e4]", exportMode ? "inset-x-[44px] bottom-[44px]" : "inset-x-2 bottom-2 sm:inset-x-3 sm:bottom-3")}>{imageNode}</div>
      </article>

      <article className={classNames("relative min-w-0 overflow-hidden bg-white", exportMode ? "h-full" : "aspect-[5/6]", compact ? "border border-[#b8b8bd] shadow-[0_1px_10px_rgba(0,0,0,0.14)]" : "", textCardPadding)}>
        <div className={classNames("absolute flex flex-wrap", exportMode ? "left-[54px] top-[54px] gap-[12px]" : "left-3 top-3 gap-1 sm:left-4 sm:top-4 lg:left-5 lg:top-5")}>
          {topicTags.map((tag) => <span className={classNames("rounded-full border border-black/70 font-semibold leading-none text-black/70", exportMode ? "px-[18px] py-[8px] text-[24px]" : "px-1.5 py-0.5 text-[8px] sm:px-2 sm:py-1 sm:text-[10px] lg:text-[11px]")} key={tag}>{tag}</span>)}
        </div>
        <div className={classNames("flex h-full flex-col", exportMode ? "gap-[42px] pt-[150px]" : "gap-3 pt-[40px] sm:gap-5 sm:pt-[54px]")}>
          <section>
            <p className={classNames("mb-1.5 font-bold text-black sm:mb-2", exportMode ? "text-[34px] leading-[1.35]" : compact ? "text-[18px] leading-[1.55]" : "text-[10px] leading-[1.38] sm:text-[12px] lg:text-[16px]")}>관찰</p>
            <p className={classNames("whitespace-pre-line font-medium", exportMode ? "text-[34px] leading-[1.5]" : compact ? "text-[18px] leading-[1.55]" : "text-[10px] leading-[1.42] sm:text-[12px] lg:text-[16px]")}>{observed}</p>
          </section>
          <section>
            <p className={classNames("mb-1.5 font-bold text-black sm:mb-2", exportMode ? "text-[34px] leading-[1.35]" : compact ? "text-[18px] leading-[1.55]" : "text-[10px] leading-[1.38] sm:text-[12px] lg:text-[16px]")}>인사이트</p>
            <p className={classNames("whitespace-pre-line font-medium", exportMode ? "text-[34px] leading-[1.5]" : compact ? "text-[18px] leading-[1.55]" : "text-[10px] leading-[1.42] sm:text-[12px] lg:text-[16px]")}>{insight}</p>
          </section>
        </div>
      </article>
    </div>
  );
}

function ExportCardSpread({ card }: { card: ImageCard }) {
  const observed = observationBody(card.observation);
  const insight = insightBody(card.observation);
  const topicTags = card.tags.topic.length > 0 ? card.tags.topic : ["태그 미정"];
  const timeLine = [card.collectedAt, card.collectedTime].filter(Boolean).join(" · ");
  const imageNode = card.imageUrl ? <img className="h-full w-full object-cover" src={card.imageUrl} alt="" /> : <SampleVisual tone="cool" />;

  return (
    <div className="grid h-[1417px] w-[2362px] grid-cols-2 overflow-hidden border border-[#b8b8bd] bg-white text-black">
      <article className="relative h-full overflow-hidden border-r border-[#b8b8bd] bg-white p-[46px]">
        <div>
          <div className="flex items-center gap-[22px]">
            <span className="inline-flex h-[92px] w-[92px] shrink-0 items-center justify-center rounded-full bg-black text-[46px] font-bold leading-none text-white">{card.number}</span>
            <h3 className="text-[74px] font-bold leading-[1.12]">{card.title}</h3>
          </div>
          <div className="mt-[14px] text-[36px] font-medium leading-[1.2] text-black">
            <p>{timeLine}</p>
            {card.collectedPlace && <p>{card.collectedPlace}</p>}
          </div>
        </div>
        <div className="absolute inset-x-[46px] bottom-[46px] aspect-square overflow-hidden bg-[#dfe0e4]">{imageNode}</div>
      </article>

      <article className="relative h-full overflow-hidden bg-white px-[58px] py-[58px]">
        <div className="absolute left-[58px] top-[58px] flex max-w-[920px] flex-wrap gap-[12px]">
          {topicTags.map((tag) => (
            <span className="rounded-full border border-black/70 px-[26px] py-[12px] text-[36px] font-semibold leading-none text-black/70" key={tag}>{tag}</span>
          ))}
        </div>
        <div className="flex h-full flex-col gap-[54px] pt-[160px]">
          <section>
            <p className="mb-[18px] text-[54px] font-bold leading-[1.38]">관찰</p>
            <p className="whitespace-pre-line text-[54px] font-medium leading-[1.42]">{observed}</p>
          </section>
          <section>
            <p className="mb-[18px] text-[54px] font-bold leading-[1.38]">인사이트</p>
            <p className="whitespace-pre-line text-[54px] font-medium leading-[1.42]">{insight}</p>
          </section>
        </div>
      </article>
    </div>
  );
}

export function ImageZettelkastenPrototype() {
  const [mode, setMode] = useState<AppMode>("library");
  const [cards, setCards] = useState<ImageCard[]>(sampleCards);
  const [groupBy, setGroupBy] = useState<GroupField>("topic");
  const [selectedGroupValue, setSelectedGroupValue] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<DraftCard>(createDraft);
  const [tagInput, setTagInput] = useState("");
  const [addStep, setAddStep] = useState<AddStep>("refine");
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ImageCard | null>(null);
  const [cropZoomInitialized, setCropZoomInitialized] = useState(false);
  const [cropFrameSize, setCropFrameSize] = useState(() => (typeof window === "undefined" ? 500 : Math.min(500, Math.max(280, window.innerWidth - 48))));
  const addImageInputRef = useRef<HTMLInputElement | null>(null);
  const cardExportRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const lastSuggestionRequestKey = useRef("");
  const [exporting, setExporting] = useState(false);
  const [llmSuggestion, setLlmSuggestion] = useState<SuggestionResult | null>(null);
  const [suggestionStatus, setSuggestionStatus] = useState<"idle" | "loading" | "error">("idle");
  const [suggestionError, setSuggestionError] = useState("");

  const filteredCards = useMemo(() => cards.filter((card) => cardMatchesQuery(card, query)), [cards, query]);
  const groups = useMemo(() => groupCards(filteredCards, groupBy), [filteredCards, groupBy]);
  const visibleCards = useMemo(() => {
    if (!selectedGroupValue) return filteredCards;
    return groups.find((group) => group.value === selectedGroupValue)?.cards ?? [];
  }, [filteredCards, groups, selectedGroupValue]);
  const fallbackTitle = useMemo(() => suggestTitle(draft.observation), [draft.observation]);
  const fallbackTags = useMemo(() => suggestTags(draft.observation), [draft.observation]);
  const suggestedTitle = llmSuggestion?.title || fallbackTitle;
  const suggestedTags = llmSuggestion?.tags.length ? llmSuggestion.tags : fallbackTags;
  const finalTitle = draft.title.trim() || suggestedTitle;
  const finalTopicTags = draft.tags.topic.length > 0 ? draft.tags.topic : suggestedTags;
  const suggestionRequestKey = useMemo(() => JSON.stringify({
    observation: observationBody(draft.observation),
    insight: insightBody(draft.observation),
    collectedAt: draft.collectedAt,
    collectedTime: draft.collectedTime,
    collectedPlace: draft.collectedPlace,
  }), [draft.collectedAt, draft.collectedPlace, draft.collectedTime, draft.observation]);

  useEffect(() => {
    if (addStep !== "suggest") return;
    if (lastSuggestionRequestKey.current === suggestionRequestKey) return;
    lastSuggestionRequestKey.current = suggestionRequestKey;
    void requestCardSuggestion();
  }, [addStep, suggestionRequestKey]);

  function updateDraft(next: Partial<DraftCard>) {
    setDraft((current) => ({ ...current, ...next }));
  }

  function updateCrop(next: Partial<CropState>) {
    setDraft((current) => ({ ...current, crop: { ...current.crop, ...next } }));
  }

  function startAddMode() {
    setEditingCardId(null);
    addImageInputRef.current?.click();
  }

  function closeAddMode() {
    setEditingCardId(null);
    setMode("library");
  }

  async function readImage(file: File | undefined) {
    if (!file) return;
    const metadata = await readExifMetadata(file);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setDraft({ ...createDraft(), imageUrl: reader.result, originalImageUrl: reader.result, fileName: "", collectedAt: metadata.collectedAt, collectedTime: metadata.collectedTime, collectedPlace: metadata.collectedPlace });
        setTagInput("");
        setLlmSuggestion(null);
        setSuggestionStatus("idle");
        setSuggestionError("");
        lastSuggestionRequestKey.current = "";
        setEditingCardId(null);
        setCropZoomInitialized(false);
        setCropFrameSize(typeof window === "undefined" ? 500 : Math.min(500, Math.max(280, window.innerWidth - 48)));
        setAddStep("refine");
        setMode("add");
      }
    };
    reader.readAsDataURL(file);
  }

  async function commitCrop() {
    if (!draft.originalImageUrl || !draft.crop.croppedAreaPixels) return draft.imageUrl;
    const cropped = await getCroppedImage(draft.originalImageUrl, draft.crop.croppedAreaPixels, draft.crop.rotation);
    updateDraft({ imageUrl: cropped });
    return cropped;
  }

  async function requestCardSuggestion() {
    setSuggestionStatus("loading");
    setSuggestionError("");
    try {
      const response = await fetch("/api/suggest-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          observation: observationBody(draft.observation),
          insight: insightBody(draft.observation),
          collectedAt: draft.collectedAt,
          collectedTime: draft.collectedTime,
          collectedPlace: draft.collectedPlace,
          existingTags: cards.flatMap((card) => card.tags.topic),
          relatedCards: cards.map((card) => ({
            title: card.title,
            observation: observationBody(card.observation),
            insight: insightBody(card.observation),
            tags: card.tags.topic,
          })),
        }),
      });
      if (!response.ok) throw new Error("suggestion request failed");
      const data = await response.json() as Partial<SuggestionResult>;
      const title = typeof data.title === "string" ? data.title.trim() : "";
      const tags = Array.isArray(data.tags) ? data.tags.map((tag) => String(tag).trim()).filter(Boolean) : [];
      if (!title && tags.length === 0) throw new Error("empty suggestion");
      setLlmSuggestion({ title: title || fallbackTitle, tags: tags.length ? tags : fallbackTags });
      setSuggestionStatus("idle");
    } catch {
      setLlmSuggestion(null);
      setSuggestionStatus("error");
      setSuggestionError("제안을 만들지 못했다. 기본 제안을 사용한다.");
    }
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
      if (next.id === "suggest") void requestCardSuggestion();
    }
  }

  function goPrev() {
    const currentIndex = addSteps.findIndex((step) => step.id === addStep);
    const prev = addSteps[currentIndex - 1];
    if (prev) setAddStep(prev.id);
    else closeAddMode();
  }

  async function saveDraftAsCard() {
    const committedImageUrl = addStep === "refine" ? await commitCrop() : draft.imageUrl;
    if (editingCardId) {
      setCards((current) => current.map((card) => card.id === editingCardId ? {
        ...card,
        title: finalTitle,
        imageUrl: committedImageUrl || draft.imageUrl,
        originalImageUrl: draft.originalImageUrl,
        collectedAt: draft.collectedAt,
        collectedTime: draft.collectedTime,
        collectedPlace: draft.collectedPlace || "미기록",
        sourceUrl: draft.sourceUrl,
        fileName: draft.fileName,
        foundContext: draft.foundContext,
        crop: draft.crop,
        observation: draft.observation,
        tags: { ...draft.tags, topic: finalTopicTags },
      } : card));
      setSelectedGroupValue(null);
      setEditingCardId(null);
      setMode("library");
      return;
    }

    const nextNumber = String(cards.reduce((max, card) => Math.max(max, Number.parseInt(card.number, 10) || 0), 0) + 1);
    const newCard: ImageCard = {
      id: `card-${Date.now()}`,
      number: nextNumber,
      title: finalTitle,
      imageUrl: committedImageUrl || draft.imageUrl,
      originalImageUrl: draft.originalImageUrl,
      collectedAt: draft.collectedAt,
      collectedTime: draft.collectedTime,
      collectedPlace: draft.collectedPlace || "미기록",
      sourceUrl: draft.sourceUrl,
      fileName: draft.fileName || "untitled-image",
      foundContext: draft.foundContext || "미기록",
      crop: draft.crop,
      observation: draft.observation,
      tags: { ...draft.tags, topic: finalTopicTags },
    };
    setCards((current) => [newCard, ...current]);
    setSelectedGroupValue(null);
    setMode("library");
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
      tags: { ...emptyTags, ...card.tags },
    });
    setTagInput(card.tags.topic.join(", "));
    setLlmSuggestion(null);
    setSuggestionStatus("idle");
    setSuggestionError("");
    lastSuggestionRequestKey.current = "";
    setEditingCardId(card.id);
    setAddStep("metadata");
    setMode("add");
  }

  function confirmDeleteCard() {
    if (!deleteTarget) return;
    setCards((current) => current.filter((card) => card.id !== deleteTarget.id));
    setDeleteTarget(null);
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
        const dataUrl = await toPng(node, {
          cacheBust: true,
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
      const dataUrl = await toPng(node, {
        cacheBust: true,
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

  if (mode === "add") {
    return (
      <div className="min-h-screen bg-[#f5f5f7] font-sans text-[#1d1d1f]">
        {addStep !== "refine" && (
          <header className="sticky top-0 z-20 border-b border-black/10 bg-[#f5f5f7]/90 px-4 py-3 backdrop-blur-xl sm:px-6 sm:py-4">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-5">
              <button className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold" onClick={goPrev} type="button">
                <ArrowLeft size={16} /> 이전
              </button>
              <div className="hidden flex-1 items-center justify-center gap-2 md:flex">
                {addSteps.map((step, index) => {
                  const active = step.id === addStep;
                  const done = addSteps.findIndex((item) => item.id === addStep) > index;
                  return (
                    <div className="flex items-center gap-2" key={step.id}>
                      <button className={classNames("rounded-full px-3 py-2 text-xs font-black", active && "bg-black text-white", done && "bg-[#0A84FF] text-white", !active && !done && "bg-white text-[#6e6e73]")} onClick={() => setAddStep(step.id)} type="button">
                        {index + 1}. {step.label}
                      </button>
                      {index < addSteps.length - 1 && <ChevronRight className="text-[#8e8e93]" size={14} />}
                    </div>
                  );
                })}
              </div>
              {addStep === "suggest" ? <button className="rounded-full bg-[#0A84FF] px-5 py-2 text-sm font-semibold text-white" onClick={saveDraftAsCard} type="button">완료</button> : <button className="rounded-full bg-black px-5 py-2 text-sm font-semibold text-white" onClick={goNext} type="button">다음</button>}
            </div>
          </header>
        )}

        <main className={classNames("mx-auto grid max-w-7xl gap-6", addStep === "refine" ? "px-0 py-0 sm:px-6 sm:py-6" : "px-6 py-8")}>
          {addStep === "refine" && (
            <section className="overflow-hidden bg-white shadow-2xl shadow-black/10 sm:rounded-[28px] sm:border sm:border-black/10">
              <div className="flex h-16 items-center justify-between border-b border-black/10 px-4 text-black sm:h-[76px] sm:px-6">
                <button className="rounded-full px-2 py-2 text-sm font-black text-black/55 sm:px-4" onClick={closeAddMode} type="button">취소</button>
                <div className="text-center">
                  <p className="text-[10px] font-black uppercase text-black/40 sm:text-xs">Crop</p>
                  <h2 className="text-base font-black sm:text-lg">1:1 관찰 이미지화</h2>
                </div>
                <button className="rounded-full bg-[#0A84FF] px-4 py-2 text-sm font-black text-white sm:px-5" onClick={goNext} type="button">선택</button>
              </div>

              <div className="relative h-[calc(100svh-212px)] min-h-[360px] bg-white sm:h-[620px]">
                <button className="absolute right-4 top-4 z-20 grid h-10 w-10 place-items-center rounded-full bg-white/90 text-black shadow-lg shadow-black/10 backdrop-blur" onClick={() => updateCrop({ crop: { x: 0, y: 0 }, zoom: 1, rotation: 0 })} type="button" aria-label="크롭 리셋">
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
                        containerClassName: "rounded-[28px]",
                        cropAreaClassName: "rounded-[3px]",
                      }}
                      style={{
                        containerStyle: {
                          backgroundColor: "#ffffff",
                        },
                        cropAreaStyle: {
                          border: "2px solid rgba(0,0,0,0.92)",
                          boxShadow: "0 0 0 9999px rgba(255,255,255,0.5), 0 0 0 1px rgba(255,255,255,0.75)",
                        },
                      }}
                      onCropChange={(crop) => updateCrop({ crop })}
                      onZoomChange={(zoom) => updateCrop({ zoom })}
                      onRotationChange={(rotation) => updateCrop({ rotation })}
                      onCropComplete={(_, croppedAreaPixels) => updateCrop({ croppedAreaPixels })}
                      onMediaLoaded={(mediaSize) => {
                        if (cropZoomInitialized || editingCardId) return;
                        const displayedImageWidth = Math.max(280, Math.round(mediaSize.width));
                        setCropFrameSize(displayedImageWidth);
                        updateCrop({ crop: { x: 0, y: 0 }, zoom: 1 });
                        setCropZoomInitialized(true);
                      }}
                    />
                  ) : (
                    <SampleVisual tone="cool" />
                  )}
                </div>
              </div>

              <div className="border-t border-black/10 bg-[#f5f5f7] px-4 py-3 text-black sm:px-6 sm:pb-6 sm:pt-5">
                <div className="mx-auto max-w-3xl">
                  <Control compact label="크롭 배율" value={`${draft.crop.zoom.toFixed(3)}x`} min={0.25} max={6} step={0.005} rangeValue={draft.crop.zoom} onChange={(value) => updateCrop({ zoom: value })} />
                  <Control compact label="기울기 보정" value={`${draft.crop.rotation.toFixed(1)}°`} min={-15} max={15} step={0.1} rangeValue={draft.crop.rotation} onChange={(value) => updateCrop({ rotation: value })} />
                </div>
              </div>
            </section>
          )}

          {addStep === "metadata" && (
            <section className="grid grid-cols-1 overflow-hidden rounded-[28px] border border-black/10 bg-white shadow-2xl shadow-black/10 lg:min-h-[680px] lg:grid-cols-[0.85fr_1.15fr] lg:rounded-[36px]">
              <div className="grid place-items-center bg-[#f5f5f7] p-4 lg:p-8">
                <div className="aspect-square w-full overflow-hidden bg-[#dfe0e4]">
                  {draft.imageUrl ? <img className="h-full w-full object-cover" src={draft.imageUrl} alt="" /> : <SampleVisual tone="paper" />}
                </div>
              </div>
              <div className="grid content-center gap-5 p-5 lg:gap-6 lg:p-10">
                <div><p className="text-xs font-semibold uppercase text-[#6e6e73] lg:text-sm">Metadata</p><h2 className="mt-2 text-2xl font-semibold lg:text-3xl">수집 정보</h2></div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="수집 날짜" value={draft.collectedAt} onChange={(value) => updateDraft({ collectedAt: value })} />
                  <Field label="수집 시간" value={draft.collectedTime} onChange={(value) => updateDraft({ collectedTime: value })} />
                  <Field wide label="수집 공간" value={draft.collectedPlace} onChange={(value) => updateDraft({ collectedPlace: value })} placeholder="공덕, 을지로, Pinterest..." />
                </div>
              </div>
            </section>
          )}

          {addStep === "observe" && (
            <section className="grid grid-cols-1 gap-4 lg:grid-cols-[420px_minmax(0,1fr)] lg:gap-6">
              <div className="grid content-start rounded-[28px] bg-white p-4 shadow-2xl shadow-black/10 lg:sticky lg:top-28 lg:h-[680px] lg:rounded-[36px] lg:p-5">
                <div className="aspect-square w-full overflow-hidden bg-[#dfe0e4]">
                  {draft.imageUrl ? <img className="h-full w-full object-cover" src={draft.imageUrl} alt="" /> : <SampleVisual tone="cool" />}
                </div>
              </div>
              <div className="grid gap-4">
                <div className="rounded-[24px] bg-white p-5 lg:rounded-[30px] lg:p-6"><p className="text-xs font-semibold uppercase text-[#6e6e73] lg:text-sm">Observation</p><h2 className="mt-2 text-2xl font-semibold lg:text-4xl">관찰을 쓴다</h2></div>
                <label className="grid gap-4 rounded-[24px] border border-black/10 bg-white p-5 lg:rounded-[28px] lg:p-6">
                  <span className="grid gap-1"><strong className="text-base font-semibold sm:text-lg">관찰</strong><small className="text-xs font-medium leading-5 text-[#6e6e73] sm:text-sm">눈에 보이는 요소, 구성, 상태, 맥락을 나누지 말고 하나의 문장 흐름으로 적는다.</small></span>
                  <textarea className="min-h-[260px] resize-y rounded-2xl border border-black/10 bg-white p-4 text-sm font-medium leading-7 sm:text-base sm:leading-8 lg:min-h-[460px] lg:p-5" value={observationBody(draft.observation) === "관찰 기록이 여기에 들어간다." ? "" : observationBody(draft.observation)} onChange={(event) => setDraft((current) => ({ ...current, observation: { ...current.observation, element: "", composition: "", condition: "", context: event.target.value } }))} />
                </label>
              </div>
            </section>
          )}

          {addStep === "insight" && (
            <section className="grid grid-cols-1 gap-4 lg:grid-cols-[420px_minmax(0,1fr)] lg:gap-6">
              <div className="grid content-start rounded-[28px] bg-white p-4 shadow-2xl shadow-black/10 lg:sticky lg:top-28 lg:h-[680px] lg:rounded-[36px] lg:p-5">
                <div className="aspect-square w-full overflow-hidden bg-[#dfe0e4]">
                  {draft.imageUrl ? <img className="h-full w-full object-cover" src={draft.imageUrl} alt="" /> : <SampleVisual tone="cool" />}
                </div>
              </div>
              <div className="grid gap-4">
                <div className="rounded-[24px] bg-white p-5 lg:rounded-[30px] lg:p-6"><p className="text-xs font-semibold uppercase text-[#6e6e73] lg:text-sm">Insight</p><h2 className="mt-2 text-2xl font-semibold lg:text-4xl">인사이트를 쓴다</h2></div>
                <label className="grid gap-4 rounded-[24px] border border-black/10 bg-white p-5 lg:rounded-[28px] lg:p-6">
                  <span className="grid gap-1"><strong className="text-base font-semibold sm:text-lg">인사이트</strong><small className="text-xs font-medium leading-5 text-[#6e6e73] sm:text-sm">이 장면이 왜 눈에 걸렸는지, 어떤 조형적 효과를 만드는지 적는다.</small></span>
                  <textarea className="min-h-[260px] resize-y rounded-2xl border border-black/10 bg-white p-4 text-sm font-medium leading-7 sm:text-base sm:leading-8 lg:min-h-[460px] lg:p-5" value={draft.observation.insight ?? ""} onChange={(event) => setDraft((current) => ({ ...current, observation: { ...current.observation, effect: "", insight: event.target.value } }))} />
                </label>
              </div>
            </section>
          )}

          {addStep === "suggest" && (
            <section className="grid grid-cols-1 gap-4 lg:min-h-[680px] lg:grid-cols-[1fr_1fr] lg:gap-6">
              <div className="rounded-[28px] bg-black p-5 text-white lg:rounded-[36px] lg:p-8"><Sparkles className="text-[#0A84FF]" size={28} /><p className="mt-5 text-xs font-semibold text-[#0A84FF] lg:mt-8 lg:text-sm">제안</p><div className="mt-6 rounded-[24px] bg-white p-5 text-black lg:mt-10 lg:rounded-[30px] lg:p-6"><div className="flex items-center justify-between gap-3"><span className="text-xs font-semibold text-[#6e6e73]">제안 제목</span><button className="rounded-full border border-black/10 px-3 py-1.5 text-xs font-semibold disabled:opacity-40" disabled={suggestionStatus === "loading"} onClick={requestCardSuggestion} type="button">{suggestionStatus === "loading" ? "생성 중" : "다시 제안"}</button></div><p className="mt-3 text-xl font-semibold lg:text-3xl">{suggestedTitle}</p>{suggestionError && <p className="mt-3 text-xs font-semibold text-[#ff3b30]">{suggestionError}</p>}</div><div className="mt-5 flex flex-wrap gap-2">{suggestedTags.map((tag) => <span className="rounded-full bg-[#0A84FF] px-3 py-2 text-xs font-semibold text-white lg:text-sm" key={tag}>{tag}</span>)}</div></div>
              <div className="grid content-center gap-5 rounded-[28px] bg-white p-5 lg:rounded-[36px] lg:p-8">
                <Field label="확정 제목" value={draft.title} onChange={(value) => updateDraft({ title: value })} placeholder={suggestedTitle} />
                <label className="grid gap-2 text-sm font-black text-black">
                  <span>확정 주제 태그</span>
                  <input className="rounded-2xl border border-black/10 bg-white px-4 py-3" value={tagInput} onChange={(event) => { setTagInput(event.target.value); updateDraft({ tags: { ...draft.tags, topic: tagStringToArray(event.target.value) } }); }} placeholder={suggestedTags.join(", ")} />
                  <small className="text-xs font-medium text-[#6e6e73]">쉼표를 입력하면 새로운 태그로 분리된다.</small>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(draft.tags.topic.length > 0 ? draft.tags.topic : suggestedTags).map((tag) => <span className="rounded-full border border-black/50 px-3 py-1.5 text-xs font-medium text-black/70" key={tag}>{tag}</span>)}
                  </div>
                </label>
                <button className="rounded-full border border-black/15 bg-[#f5f5f7] px-5 py-3 text-sm font-black" onClick={() => { updateDraft({ title: suggestedTitle, tags: { ...draft.tags, topic: suggestedTags } }); setTagInput(suggestedTags.join(", ")); }} type="button">제안값 사용</button>
              </div>
            </section>
          )}

        </main>

      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] font-sans text-[#1d1d1f]">
      <input ref={addImageInputRef} className="hidden" type="file" accept="image/*" onChange={(event) => { readImage(event.target.files?.[0]); event.currentTarget.value = ""; }} />
      <header className="sticky top-0 z-30 w-full border-b border-black/10 bg-[#f5f5f7]/95 px-4 py-3 backdrop-blur-xl sm:px-6 sm:py-4">
        <div className="mx-auto flex w-full max-w-[1540px] items-center gap-3 sm:gap-5">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-black text-white sm:h-12 sm:w-12 sm:rounded-2xl"><Library size={20} /></div>
          <div className="mr-auto min-w-0"><h1 className="truncate text-lg font-semibold sm:text-2xl sm:font-black">Image Zettelkasten</h1></div>
          <label className="hidden min-w-[320px] items-center gap-3 rounded-full border border-black/10 bg-white px-4 py-3 md:flex"><Search size={17} className="text-[#6e6e73]" /><input className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-[#8e8e93]" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="제목, 태그, 장소, 관찰 문장 검색" /></label>
          <button className="shrink-0 rounded-full bg-white px-3 py-2 text-xs font-semibold text-black disabled:opacity-45 sm:px-5 sm:py-3 sm:text-sm" disabled={exporting} onClick={exportAllCards} type="button">{exporting ? "내보내는 중" : "내보내기"}</button>
          <button className="shrink-0 rounded-full bg-black px-4 py-2 text-sm font-semibold text-white sm:px-5 sm:py-3 sm:font-black" onClick={startAddMode} type="button">새 카드</button>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1500px] gap-4 px-2 py-3 sm:px-6 sm:py-6">
        <section className="rounded-[24px] bg-[#e8e8eb] p-2 shadow-inner shadow-black/5 sm:rounded-[38px] sm:p-5">
          <div className="mb-3 sm:mb-5">
            <div className="flex max-w-full items-center gap-1.5 overflow-x-auto whitespace-nowrap py-1">
              <label className="relative flex shrink-0 items-center gap-1.5 rounded-full bg-white px-2.5 font-medium" style={{ height: 26, fontSize: 10, lineHeight: 1 }}>
                <Tags size={12} />
                <span style={{ fontSize: 10, lineHeight: 1 }}>정렬</span>
                <ChevronRight className="rotate-90" size={11} />
                <select className="absolute inset-0 h-full w-full cursor-pointer opacity-0" aria-label="정렬 기준" value={groupBy} onChange={(event) => { setGroupBy(event.target.value as GroupField); setSelectedGroupValue(null); }}>
                  {(Object.keys(groupFieldLabels) as GroupField[]).map((field) => <option key={field} value={field}>{groupFieldLabels[field]}</option>)}
                </select>
              </label>
              <button className={classNames("shrink-0 rounded-full px-2.5 font-medium", selectedGroupValue === null ? "bg-black text-white" : "bg-white text-black")} style={{ height: 26, fontSize: 10, lineHeight: 1 }} onClick={() => setSelectedGroupValue(null)} type="button">전체 {filteredCards.length}</button>
              {groups.map((group) => (
                <button className={classNames("shrink-0 rounded-full px-2.5 font-medium", selectedGroupValue === group.value ? "bg-[#0A84FF] text-white" : "bg-white text-black")} style={{ height: 26, fontSize: 10, lineHeight: 1 }} key={group.value} onClick={() => setSelectedGroupValue(group.value)} type="button">{group.value} {group.cards.length}</button>
              ))}
            </div>
          </div>

          {visibleCards.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:gap-5 xl:grid-cols-2">
              {visibleCards.map((card) => (
                <div className="min-w-0" key={card.id}>
                  <CardSpread card={card} hideActions={exporting} onEdit={() => startEditCard(card)} onExport={() => exportSingleCard(card)} onDelete={() => setDeleteTarget(card)} />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid min-h-[520px] place-items-center rounded-[28px] bg-white text-xl font-black">표시할 카드가 없습니다.</div>
          )}
        </section>
      </main>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 px-5 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[28px] bg-white p-6 shadow-2xl shadow-black/20">
            <h2 className="text-xl font-semibold">정말 삭제하시겠습니까?</h2>
            <p className="mt-2 text-sm font-medium leading-6 text-[#6e6e73]">삭제하면 이 카드 기록을 되돌릴 수 없습니다.</p>
            <div className="mt-6 flex justify-end gap-2">
              <button className="rounded-full bg-[#f5f5f7] px-5 py-3 text-sm font-semibold" onClick={() => setDeleteTarget(null)} type="button">취소</button>
              <button className="rounded-full bg-red-600 px-5 py-3 text-sm font-semibold text-white" onClick={confirmDeleteCard} type="button">확인</button>
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
      </div>

    </div>
  );
}

function Control({ label, value, min, max, step, rangeValue, onChange, dark = false, compact = false }: { label: string; value: string; min: number; max: number; step: number; rangeValue: number; onChange: (value: number) => void; dark?: boolean; compact?: boolean }) {
  if (compact) {
    return <div className="grid grid-cols-[96px_minmax(0,1fr)_72px] items-center gap-4 py-2"><span className="text-sm font-black text-black">{label}</span><input className="w-full accent-[#0A84FF]" min={min} max={max} step={step} type="range" value={rangeValue} onChange={(event) => onChange(Number(event.target.value))} /><strong className="text-right font-mono text-sm font-black text-[#6e6e73]">{value}</strong></div>;
  }

  return <div className={classNames("rounded-[24px] border p-4", dark ? "border-white/10 bg-[#2c2c2e]" : "border-black/10 bg-[#f5f5f7]")}><div className="flex items-center justify-between"><span className={classNames("text-sm font-black", dark ? "text-white" : "text-black")}>{label}</span><strong className={classNames("font-mono text-sm font-black", dark ? "text-white/55" : "text-[#6e6e73]")}>{value}</strong></div><input className="mt-4 w-full accent-[#0A84FF]" min={min} max={max} step={step} type="range" value={rangeValue} onChange={(event) => onChange(Number(event.target.value))} /></div>;
}

function Field({ label, value, onChange, placeholder, wide = false }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; wide?: boolean }) {
  return <label className={classNames("grid gap-2 text-sm font-semibold text-black", wide && "sm:col-span-2")}><span>{label}</span><input className="rounded-2xl border border-black/10 bg-white px-4 py-3" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></label>;
}
