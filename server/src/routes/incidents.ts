// Incidents API routing and safety compliance controls
import { Router, Response } from "express";
import { getDb } from "../db";
import { AuthenticatedRequest, requireRole } from "../middleware/auth";

const router = Router();

// GET all incidents
router.get("/", async (req, res) => {
  try {
    const db = await getDb();
    const rows = await db.all("SELECT * FROM incidents ORDER BY loggedAt DESC;");
    return res.json(rows);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST add a safety incident
router.post("/", requireRole(["Fleet Manager", "Safety Officer"]), async (req: AuthenticatedRequest, res: Response) => {
  const { driverId, vehicleId, severity, description, fineAmount, loggedAt } = req.body;
  if (!driverId || !vehicleId || !severity || !description || fineAmount === undefined || !loggedAt) {
    return res.status(400).json({ error: "Missing required incident fields" });
  }

  try {
    const db = await getDb();

    // Verify driver exists
    const drv = await db.get("SELECT * FROM drivers WHERE id = ?;", driverId);
    if (!drv) {
      return res.status(400).json({ error: "Driver not found" });
    }

    // Verify vehicle exists
    const veh = await db.get("SELECT * FROM vehicles WHERE id = ?;", vehicleId);
    if (!veh) {
      return res.status(400).json({ error: "Vehicle not found" });
    }

    const id = "inc_" + Math.random().toString(36).slice(2, 9);
    await db.run(
      "INSERT INTO incidents (id, driverId, vehicleId, severity, description, fineAmount, resolved, loggedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?);",
      id, driverId, vehicleId, severity, description, fineAmount, 0, loggedAt
    );

    // Calculate score deduction based on severity
    let deduction = 3;
    if (severity === "High") deduction = 15;
    else if (severity === "Medium") deduction = 8;

    const newSafetyScore = Math.max(0, drv.safetyScore - deduction);
    const newIncidentsCount = drv.incidents + 1;

    // Dynamically update driver profile
    await db.run(
      "UPDATE drivers SET safetyScore = ?, incidents = ? WHERE id = ?;",
      newSafetyScore, newIncidentsCount, driverId
    );

    const created = await db.get("SELECT * FROM incidents WHERE id = ?;", id);
    return res.status(201).json(created);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT resolve an incident
router.put("/:id/resolve", requireRole(["Fleet Manager", "Safety Officer"]), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const db = await getDb();
    const existing = await db.get("SELECT * FROM incidents WHERE id = ?;", id);
    if (!existing) {
      return res.status(404).json({ error: "Incident not found" });
    }

    await db.run("UPDATE incidents SET resolved = 1 WHERE id = ?;", id);
    const updated = await db.get("SELECT * FROM incidents WHERE id = ?;", id);
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
