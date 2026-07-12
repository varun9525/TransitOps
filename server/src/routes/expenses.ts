import { Router, Response } from "express";
import { getDb } from "../db";
import { AuthenticatedRequest, requireRole } from "../middleware/auth";

const router = Router(); // Expenses route - demo comment

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

    // Anti-fraud: Toll cap check
    if (category === "Tolls" && amount > 5000) {
      return res.status(400).json({ error: "Suspicious Toll Charge: Individual toll claims are capped at a maximum of ₹5,000 per receipt." });
    }

    // Driver ownership check
    if (req.user?.role === "Driver") {
      const activeTrip = await db.get(
        "SELECT * FROM trips WHERE driverId = (SELECT id FROM drivers WHERE name = ?) AND status = 'Dispatched' AND vehicleId = ?;",
        req.user.name, vehicleId
      );
      if (!activeTrip) {
        return res.status(403).json({ error: "Access Denied: Drivers can only submit expenses for their currently active vehicle/trip." });
      }
    }

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
