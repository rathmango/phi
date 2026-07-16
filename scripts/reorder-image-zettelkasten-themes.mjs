import { createSign } from "node:crypto";
import { readFile } from "node:fs/promises";

const envText = await readFile(new URL("../.env.local", import.meta.url), "utf8");
const env = Object.fromEntries(envText.split(/\r?\n/).filter((line) => line && !line.startsWith("#") && line.includes("=")).map((line) => {
  const index = line.indexOf("=");
  return [line.slice(0, index), line.slice(index + 1).replace(/^['"]|['"]$/g, "")];
}));
const projectId = env.GOOGLE_CLOUD_PROJECT;
const serviceAccount = JSON.parse(Buffer.from(env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64, "base64").toString("utf8"));
if (!projectId || !serviceAccount?.client_email || !serviceAccount?.private_key) throw new Error("Google credentials are missing");

function base64Url(input) {
  return Buffer.from(input).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function accessToken() {
  const now = Math.floor(Date.now() / 1000);
  const tokenUri = serviceAccount.token_uri || "https://oauth2.googleapis.com/token";
  const unsigned = `${base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${base64Url(JSON.stringify({ iss: serviceAccount.client_email, scope: "https://www.googleapis.com/auth/datastore", aud: tokenUri, iat: now, exp: now + 3600 }))}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const assertion = `${unsigned}.${base64Url(signer.sign(serviceAccount.private_key))}`;
  const response = await fetch(tokenUri, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }) });
  if (!response.ok) throw new Error(await response.text());
  return (await response.json()).access_token;
}

const desiredThemes = [
  ["시간의 흔적은 흉내낼 수 없지", "시간의 흔적은\n흉내낼 수 없지"],
  ["진짜가 되고 싶어요", "진짜가\n되고 싶어요"],
  ["사라진 것이 표현되는 방법", "사라진 것이\n표현되는 방법"],
  ["해방", "해방"],
  ["희미하게 빛나는", "희미하게 빛나는"],
  ["귀여워!", "귀여워!"],
  ["호기심을 불러 일으키는 것들", "호기심을 불러\n일으키는 것들"],
  ["기능하는 것들의 패턴", "기능하는 것들의\n패턴"],
  ["자연이 보여주는 패턴", "자연이 보여주는\n패턴"],
  ["높은 채도는 시선을 끌어", "높은 채도는\n시선을 끌어"],
  ["정겨운 것들", "정겨운 것들"],
];

const normalize = (value) => String(value || "").replace(/\s+/g, " ").trim();
const token = await accessToken();
const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
const response = await fetch(`${baseUrl}/themes?pageSize=100`, { headers });
if (!response.ok) throw new Error(await response.text());
const documents = (await response.json()).documents || [];
const themes = documents.map((document) => ({ document, payload: JSON.parse(document.fields.payload.stringValue) }));
const byTitle = new Map(themes.map((theme) => [normalize(theme.payload.title), theme]));
const missing = desiredThemes.filter(([title]) => !byTitle.has(title)).map(([title]) => title);
if (missing.length) throw new Error(`Missing themes: ${missing.join(", ")}`);

for (const [index, [lookupTitle, displayTitle]] of desiredThemes.entries()) {
  const theme = byTitle.get(lookupTitle);
  const payload = { ...theme.payload, order: index + 1, title: displayTitle };
  const saveResponse = await fetch(theme.document.name.replace(/^projects\//, "https://firestore.googleapis.com/v1/projects/"), {
    method: "PATCH",
    headers,
    body: JSON.stringify({ fields: { payload: { stringValue: JSON.stringify(payload) }, updatedAt: { timestampValue: new Date().toISOString() } } }),
  });
  if (!saveResponse.ok) throw new Error(await saveResponse.text());
}

console.log(JSON.stringify(desiredThemes.map(([title], index) => ({ order: index + 1, title })), null, 2));
