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

function payloadToFields(payload: unknown) {
  const now = new Date().toISOString();
  return {
    payload: { stringValue: JSON.stringify(payload) },
    updatedAt: { timestampValue: now },
  };
}

export async function listCardsFromFirestore() {
  const token = await getAccessToken();
  const response = await fetch(`${firestoreBaseUrl()}/cards?pageSize=200`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (response.status === 404) return [];
  if (!response.ok) throw new Error(`Firestore list failed: ${await response.text()}`);
  const data = await response.json();
  const cards = Array.isArray(data.documents) ? data.documents.map((document: any) => {
    const payload = document?.fields?.payload?.stringValue;
    if (!payload) return null;
    try {
      return JSON.parse(payload);
    } catch {
      return null;
    }
  }).filter(Boolean) : [];
  return cards.sort((a: any, b: any) => (Number.parseInt(b.number, 10) || 0) - (Number.parseInt(a.number, 10) || 0));
}

export async function saveCardToFirestore(card: any) {
  const token = await getAccessToken();
  const response = await fetch(cardDocumentUrl(card.id), {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields: payloadToFields(card) }),
  });
  if (!response.ok) throw new Error(`Firestore save failed: ${await response.text()}`);
  return card;
}

export async function deleteCardFromFirestore(id: string) {
  const token = await getAccessToken();
  const response = await fetch(cardDocumentUrl(id), {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok && response.status !== 404) throw new Error(`Firestore delete failed: ${await response.text()}`);
}

function parseDataUrl(value: string) {
  const match = value.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
}

function publicObjectUrl(bucket: string, name: string) {
  return `/api/card-images/${name.split("/").map(encodeURIComponent).join("/")}`;
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
  const imageUrl = publicObjectUrl(bucket, objectName);
  return { ...card, imageUrl, originalImageUrl: imageUrl };
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
