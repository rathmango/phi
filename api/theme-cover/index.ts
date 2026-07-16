import { getPayloadDocument, savePayloadDocument, uploadCardImages } from "../_google.js";

const COLLECTION = "settings";
const DOCUMENT_ID = "theme-cover";

export default async function handler(req: any, res: any) {
  try {
    if (req.method === "GET") {
      const cover = await getPayloadDocument(COLLECTION, DOCUMENT_ID);
      return res.status(200).json({ cover });
    }

    if (req.method === "PUT") {
      const imageUrl = typeof req.body?.imageUrl === "string" ? req.body.imageUrl : "";
      if (!imageUrl) return res.status(400).json({ error: "imageUrl is required" });
      const uploaded = await uploadCardImages({ id: DOCUMENT_ID, imageUrl, originalImageUrl: imageUrl });
      const cover = await savePayloadDocument(COLLECTION, DOCUMENT_ID, {
        imageUrl: uploaded.imageUrl,
        updatedAt: new Date().toISOString(),
      });
      return res.status(200).json({ cover });
    }

    res.setHeader("Allow", "GET, PUT");
    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
}
