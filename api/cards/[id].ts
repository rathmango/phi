import { deleteCardFromFirestore, saveCardToFirestore, uploadCardImages } from "../_google.js";

export default async function handler(req: any, res: any) {
  const id = String(req.query.id || "");
  if (!id) return res.status(400).json({ error: "id is required" });

  try {
    if (req.method === "PUT") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      if (!body?.card) return res.status(400).json({ error: "card is required" });
      const card = await uploadCardImages({ ...body.card, id });
      await saveCardToFirestore(card);
      return res.status(200).json({ card });
    }

    if (req.method === "DELETE") {
      await deleteCardFromFirestore(id);
      return res.status(200).json({ ok: true });
    }

    res.setHeader("Allow", "PUT, DELETE");
    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
}
