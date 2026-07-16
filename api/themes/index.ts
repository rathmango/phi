import { listPayloadCollection } from "../_google.js";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const themes = await listPayloadCollection("themes", 100);
    themes.sort((a: any, b: any) => Number(a.order || 0) - Number(b.order || 0));
    return res.status(200).json({ themes });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
}
