import { Router, Response } from "express";
import { getDb } from "../db";
import { AuthenticatedRequest, requireRole } from "../middleware/auth";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const db = await getDb();
    const rows = await db.all("SELECT * FROM expenses ORDER BY date DESC;");
    return res.json(rows);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/", requireRole(["Fleet Manager", "Driver", "Financial Analyst"]), async (req: AuthenticatedRequest, res: Response) => {
  const { vehicleId, category, description, amount, date } = req.body;
  if (!vehicleId || !category || !description || amount === undefined || !date) {
    return res.status(400).json({ error: "Missing required expense fields" });
  }

  try {
    const db = await getDb();
    const id = Math.random().toString(36).slice(2, 9);
    
    await db.run(
      "INSERT INTO expenses (id, vehicleId, category, description, amount, date) VALUES (?, ?, ?, ?, ?, ?);",
      id, vehicleId, category, description, amount, date
    );

    const expense = await db.get("SELECT * FROM expenses WHERE id = ?;", id);
    return res.status(201).json(expense);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
