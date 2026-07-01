import { downloadStorageObject } from "../_google";

export default async function handler(req: any, res: any) {
  const path = Array.isArray(req.query.path) ? req.query.path.join("/") : String(req.query.path || "");
  if (!path) return res.status(400).json({ error: "path is required" });

  try {
    const image = await downloadStorageObject(path);
    res.setHeader("Content-Type", image.contentType);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    return res.status(200).send(image.buffer);
  } catch (error) {
    return res.status(404).json({ error: error instanceof Error ? error.message : "Not found" });
  }
}
