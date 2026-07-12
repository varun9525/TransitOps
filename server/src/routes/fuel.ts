import { Router, Response } from "express";
import { getDb } from "../db";
import { AuthenticatedRequest, requireRole } from "../middleware/auth";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const db = await getDb();
    const rows = await db.all("SELECT * FROM fuel_logs ORDER BY date DESC;");
    return res.json(rows);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/", requireRole(["Fleet Manager", "Driver", "Financial Analyst"]), async (req: AuthenticatedRequest, res: Response) => {
  const { vehicleId, liters, cost, odometer, date } = req.body;
  if (!vehicleId || liters === undefined || cost === undefined || odometer === undefined || !date) {
    return res.status(400).json({ error: "Missing required fuel log fields" });
  }

  try {
    const db = await getDb();
    const id = Math.random().toString(36).slice(2, 9);
    
    await db.run(
      "INSERT INTO fuel_logs (id, vehicleId, liters, cost, odometer, date) VALUES (?, ?, ?, ?, ?, ?);",
      id, vehicleId, liters, cost, odometer, date
    );

    const log = await db.get("SELECT * FROM fuel_logs WHERE id = ?;", id);
    return res.status(201).json(log);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
