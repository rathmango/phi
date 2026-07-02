import { createSign } from "node:crypto";

type ServiceAccountKey = {
  client_email: string;
  private_key: string;
  token_uri?: string;
};

type GoogleToken = {
  access_token: string;
  expires_in: number;
};

let cachedToken: { token: string; expiresAt: number } | null = null;

function base64Url(input: string | Buffer) {
  return Buffer.from(input).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function getServiceAccountKey(): ServiceAccountKey {
  const encoded = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64;
  if (!encoded) throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY_BASE64 is not configured");
  return JSON.parse(Buffer.from(encoded, "base64").toString("utf8"));
}

function getProjectId() {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT;
  if (!projectId) throw new Error("GOOGLE_CLOUD_PROJECT is not configured");
  return projectId;
}

export function getBucketName() {
  const bucket = process.env.GOOGLE_CLOUD_STORAGE_BUCKET;
  if (!bucket) throw new Error("GOOGLE_CLOUD_STORAGE_BUCKET is not configured");
  return bucket;
}

export async function getAccessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.token;

  const key = getServiceAccountKey();
  const now = Math.floor(Date.now() / 1000);
  const tokenUri = key.token_uri || "https://oauth2.googleapis.com/token";
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: key.client_email,
    scope: "https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/devstorage.full_control",
    aud: tokenUri,
    iat: now,
    exp: now + 3600,
  };
  const unsigned = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(claim))}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const assertion = `${unsigned}.${base64Url(signer.sign(key.private_key))}`;

  const response = await fetch(tokenUri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!response.ok) throw new Error(`Google token request failed: ${await response.text()}`);
  const data = await response.json() as GoogleToken;
  cachedToken = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return cachedToken.token;
}

function firestoreBaseUrl() {
  return `https://firestore.googleapis.com/v1/projects/${getProjectId()}/databases/(default)/documents`;
}

function cardDocumentUrl(id: string) {
  return `${firestoreBaseUrl()}/cards/${encodeURIComponent(id)}`;
}

function collectionUrl(collection: string) {
  return `${firestoreBaseUrl()}/${collection}`;
}

function documentUrl(collection: string, id: string) {
  return `${collectionUrl(collection)}/${encodeURIComponent(id)}`;
}

function payloadToFields(payload: unknown) {
  const now = new Date().toISOString();
  return {
    payload: { stringValue: JSON.stringify(payload) },
    updatedAt: { timestampValue: now },
  };
}

export async function listCardsFromFirestore() {
  const cards = await listPayloadCollection("cards", 200);
  return sortCardsByCollectedTime(cards);
}

export async function listPayloadCollection(collection: string, pageSize = 200) {
  const token = await getAccessToken();
  const response = await fetch(`${collectionUrl(collection)}?pageSize=${pageSize}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (response.status === 404) return [];
  if (!response.ok) throw new Error(`Firestore ${collection} list failed: ${await response.text()}`);
  const data = await response.json();
  return Array.isArray(data.documents) ? data.documents.map((document: any) => {
    const payload = document?.fields?.payload?.stringValue;
    if (!payload) return null;
    try {
      return JSON.parse(payload);
    } catch {
      return null;
    }
  }).filter(Boolean) : [];
}

export async function getPayloadDocument(collection: string, id: string) {
  const token = await getAccessToken();
  const response = await fetch(documentUrl(collection, id), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Firestore ${collection} get failed: ${await response.text()}`);
  const data = await response.json();
  const payload = data?.fields?.payload?.stringValue;
  if (!payload) return null;
  return JSON.parse(payload);
}

export async function saveCardToFirestore(card: any) {
  return savePayloadDocument("cards", card.id, card);
}

export async function savePayloadDocument(collection: string, id: string, payload: any) {
  const token = await getAccessToken();
  const response = await fetch(documentUrl(collection, id), {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields: payloadToFields(payload) }),
  });
  if (!response.ok) throw new Error(`Firestore ${collection} save failed: ${await response.text()}`);
  return payload;
}

export async function deleteCardFromFirestore(id: string) {
  const token = await getAccessToken();
  const response = await fetch(cardDocumentUrl(id), {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok && response.status !== 404) throw new Error(`Firestore delete failed: ${await response.text()}`);
}

function parseCollectedDateTime(card: any) {
  const dateText = typeof card?.collectedAt === "string" ? card.collectedAt : "";
  const timeText = typeof card?.collectedTime === "string" ? card.collectedTime : "";
  const dateMatch = dateText.match(/(\d{4})[.-](\d{1,2})[.-](\d{1,2})/);
  let year = 9999;
  let month = 12;
  let day = 31;
  if (dateMatch) {
    year = Number(dateMatch[1]);
    month = Number(dateMatch[2]);
    day = Number(dateMatch[3]);
  }

  const timeMatch = timeText.match(/(오전|오후)?\s*(\d{1,2})시(?:\s*(\d{1,2})분)?/);
  let hour = 23;
  let minute = 59;
  if (timeMatch) {
    hour = Number(timeMatch[2]);
    minute = Number(timeMatch[3] || 0);
    if (timeMatch[1] === "오후" && hour < 12) hour += 12;
    if (timeMatch[1] === "오전" && hour === 12) hour = 0;
  }

  return Date.UTC(year, month - 1, day, hour, minute);
}

function sortCardsByCollectedTime(cards: any[]) {
  return [...cards].sort((a, b) => {
    const diff = parseCollectedDateTime(a) - parseCollectedDateTime(b);
    if (diff !== 0) return diff;
    return String(a.id || "").localeCompare(String(b.id || ""));
  });
}

export async function renumberCardsByCollectedTime() {
  const cards = sortCardsByCollectedTime(await listPayloadCollection("cards", 500));
  const numberedCards = cards.map((card: any, index) => ({ ...card, number: String(index + 1) }));
  await Promise.all(numberedCards.map((card: any) => saveCardToFirestore(card)));
  return numberedCards;
}

export async function listTagsFromFirestore() {
  return listPayloadCollection("tags", 500);
}

export async function listTagCategoriesFromFirestore() {
  return listPayloadCollection("tag_categories", 100);
}

function slugifyTag(value: string) {
  const slug = value.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^\p{Letter}\p{Number}-]/gu, "");
  return slug || String(Date.now());
}

export async function seedTagCategories(categories: Array<Record<string, unknown>>) {
  const existing = await listTagCategoriesFromFirestore();
  if (existing.length > 0) return existing;
  await Promise.all(categories.map((category: any) => savePayloadDocument("tag_categories", String(category.id), category)));
  return categories;
}

export async function upsertTagsFromCard(tags: Record<string, string[]>) {
  const existingTags = await listTagsFromFirestore();
  const existingMap = new Map(existingTags.map((tag: any) => [`${tag.category}:${tag.label}`, tag]));
  const now = new Date().toISOString();
  const writes: Promise<unknown>[] = [];

  Object.entries(tags || {}).forEach(([category, labels]) => {
    if (!Array.isArray(labels)) return;
    labels.forEach((label) => {
      const cleanLabel = typeof label === "string" ? label.trim() : "";
      if (!cleanLabel) return;
      const existing = existingMap.get(`${category}:${cleanLabel}`);
      const payload = {
        id: `${category}-${slugifyTag(cleanLabel)}`,
        label: cleanLabel,
        category,
        aliases: existing?.aliases || [],
        source: existing?.source || "user",
        usageCount: Number(existing?.usageCount || 0) + 1,
        createdAt: existing?.createdAt || now,
        updatedAt: now,
      };
      writes.push(savePayloadDocument("tags", payload.id, payload));
    });
  });

  await Promise.all(writes);
}

export async function syncTagsFromCards() {
  const cards = await listCardsFromFirestore();
  const existingTags = await listTagsFromFirestore();
  const existingMap = new Map(existingTags.map((tag: any) => [`${tag.category}:${tag.label}`, tag]));
  const counts = new Map<string, { category: string; label: string; count: number }>();

  cards.forEach((card: any) => {
    Object.entries(card.tags || {}).forEach(([category, labels]) => {
      if (!Array.isArray(labels)) return;
      Array.from(new Set(labels.map((label) => (typeof label === "string" ? label.trim() : "")).filter(Boolean))).forEach((label) => {
        const key = `${category}:${label}`;
        const current = counts.get(key);
        counts.set(key, { category, label, count: (current?.count || 0) + 1 });
      });
    });
  });

  const now = new Date().toISOString();
  const writes: Promise<unknown>[] = [];

  counts.forEach(({ category, label, count }) => {
    const existing = existingMap.get(`${category}:${label}`);
    const payload = {
      id: existing?.id || `${category}-${slugifyTag(label)}`,
      label,
      category,
      aliases: existing?.aliases || [],
      source: existing?.source || "user",
      usageCount: count,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };
    writes.push(savePayloadDocument("tags", payload.id, payload));
  });

  existingTags.forEach((tag: any) => {
    const key = `${tag.category}:${tag.label}`;
    if (counts.has(key)) return;
    writes.push(savePayloadDocument("tags", tag.id || `${tag.category}-${slugifyTag(tag.label)}`, { ...tag, usageCount: 0, updatedAt: now }));
  });

  await Promise.all(writes);
}

function parseDataUrl(value: string) {
  const match = value.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
}

function publicObjectUrl(bucket: string, name: string) {
  return `/api/card-images/${name.split("/").map(encodeURIComponent).join("/")}`;
}

function storageObjectNameFromUrl(value: unknown) {
  if (typeof value !== "string") return "";
  const withoutOrigin = value.replace(/^https?:\/\/[^/]+/, "");
  if (withoutOrigin.startsWith("/api/card-images/")) {
    return withoutOrigin.slice("/api/card-images/".length).split("?")[0].split("/").map(decodeURIComponent).join("/");
  }

  const bucket = getBucketName();
  const publicPrefix = `https://storage.googleapis.com/${bucket}/`;
  if (value.startsWith(publicPrefix)) {
    return value.slice(publicPrefix.length).split("?")[0].split("/").map(decodeURIComponent).join("/");
  }
  return "";
}

export async function uploadCardImages(card: any) {
  const parsed = typeof card.imageUrl === "string" ? parseDataUrl(card.imageUrl) : null;
  if (!parsed) return card;

  const token = await getAccessToken();
  const bucket = getBucketName();
  const extension = parsed.mimeType === "image/png" ? "png" : "jpg";
  const objectName = `cards/${card.id}.${extension}`;
  const uploadUrl = `https://storage.googleapis.com/upload/storage/v1/b/${bucket}/o?uploadType=media&name=${encodeURIComponent(objectName)}`;
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": parsed.mimeType,
    },
    body: Buffer.from(parsed.data, "base64"),
  });
  if (!response.ok) throw new Error(`Storage upload failed: ${await response.text()}`);
  const uploadedObject = await response.json().catch(() => null);
  const storedObjectName = typeof uploadedObject?.name === "string" && uploadedObject.name ? uploadedObject.name : objectName;
  const imageUrl = publicObjectUrl(bucket, storedObjectName);
  return { ...card, imageUrl, originalImageUrl: imageUrl };
}

export async function deleteStorageObject(objectName: string) {
  if (!objectName) return;
  const token = await getAccessToken();
  const bucket = getBucketName();
  const response = await fetch(`https://storage.googleapis.com/storage/v1/b/${bucket}/o/${encodeURIComponent(objectName)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok && response.status !== 404) throw new Error(`Storage delete failed: ${await response.text()}`);
}

export async function deleteCardAndAssets(id: string) {
  const card = await getPayloadDocument("cards", id);
  const objects = new Set<string>();
  if (card) {
    objects.add(storageObjectNameFromUrl(card.imageUrl));
    objects.add(storageObjectNameFromUrl(card.originalImageUrl));
  }
  await Promise.all(Array.from(objects).filter(Boolean).map((objectName) => deleteStorageObject(objectName)));
  await deleteCardFromFirestore(id);
  const cards = await renumberCardsByCollectedTime();
  await syncTagsFromCards();
  return cards;
}

export async function downloadStorageObject(objectName: string) {
  const token = await getAccessToken();
  const bucket = getBucketName();
  const response = await fetch(`https://storage.googleapis.com/storage/v1/b/${bucket}/o/${encodeURIComponent(objectName)}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`Storage download failed: ${await response.text()}`);
  const contentType = response.headers.get("content-type") || "image/jpeg";
  const arrayBuffer = await response.arrayBuffer();
  return { contentType, buffer: Buffer.from(arrayBuffer) };
}
