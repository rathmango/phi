import { createSign } from "node:crypto";
import { readFile } from "node:fs/promises";

const csvPath = process.argv[2];
if (!csvPath) throw new Error("CSV path is required");

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

function parseCsv(text) {
  const titleLineBreaks = new Map([
    ["시간의 흔적은 흉내낼 수 없지", "시간의 흔적은\n흉내낼 수 없지"],
    ["호기심을 불러 일으키는 것들", "호기심을 불러\n일으키는 것들"],
    ["사라진 것이 표현되는 방법", "사라진 것이\n표현되는 방법"],
    ["높은 채도는 시선을 끌어", "높은 채도는\n시선을 끌어"],
  ]);
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') quoted = false;
      else cell += character;
    } else if (character === '"') quoted = true;
    else if (character === ",") {
      row.push(cell);
      cell = "";
    } else if (character === "\n") {
      row.push(cell.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      cell = "";
    } else cell += character;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.slice(1).filter((values) => values.some(Boolean)).map((values, index) => {
    const topicLabel = values[0].trim();
    return {
      id: `theme-${String(index + 1).padStart(2, "0")}`,
      order: index + 1,
      title: titleLineBreaks.get(topicLabel) || topicLabel,
      topicLabel,
      description: values[1].trim(),
      cardNumbers: values[2].split(",").map((value) => Number(value.trim())).filter(Number.isFinite),
    };
  });
}

const token = await accessToken();
const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

async function listCollection(collection, pageSize = 500) {
  const response = await fetch(`${baseUrl}/${collection}?pageSize=${pageSize}`, { headers });
  if (!response.ok) throw new Error(await response.text());
  const data = await response.json();
  return (data.documents || []).map((document) => JSON.parse(document.fields.payload.stringValue));
}

async function saveDocument(collection, id, payload) {
  const response = await fetch(`${baseUrl}/${collection}/${encodeURIComponent(id)}`, { method: "PATCH", headers, body: JSON.stringify({ fields: { payload: { stringValue: JSON.stringify(payload) }, updatedAt: { timestampValue: new Date().toISOString() } } }) });
  if (!response.ok) throw new Error(await response.text());
}

const themes = parseCsv((await readFile(csvPath, "utf8")).replace(/^\uFEFF/, ""));
const cards = await listCollection("cards");
const themeByCardNumber = new Map();
themes.forEach((theme) => theme.cardNumbers.forEach((number) => themeByCardNumber.set(String(number), theme.topicLabel)));
const emptyTags = { subject: [], composition: [], color: [], material: [], effect: [] };

for (const theme of themes) await saveDocument("themes", theme.id, theme);
for (const card of cards) {
  const topic = themeByCardNumber.get(String(card.number));
  await saveDocument("cards", card.id, { ...card, tags: emptyTags, topics: topic ? [topic] : [] });
}

console.log(JSON.stringify({ themes: themes.length, cards: cards.length, assigned: cards.filter((card) => themeByCardNumber.has(String(card.number))).length, unassigned: cards.filter((card) => !themeByCardNumber.has(String(card.number))).map((card) => card.number) }, null, 2));
