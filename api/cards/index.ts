import { listCardsFromFirestore, saveCardToFirestore, syncTagsFromCards, uploadCardImages } from "../_google.js";

export default async function handler(req: any, res: any) {
  try {
    if (req.method === "GET") {
      const cards = await listCardsFromFirestore();
      return res.status(200).json({ cards });
    }

    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      if (!body?.card?.id) return res.status(400).json({ error: "card.id is required" });
      const card = await uploadCardImages(body.card);
      await saveCardToFirestore(card);
      await syncTagsFromCards();
      return res.status(200).json({ card });
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
}
