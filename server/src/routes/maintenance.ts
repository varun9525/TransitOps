import { Router, Response } from "express";
import { getDb } from "../db";
import { AuthenticatedRequest, requireRole } from "../middleware/auth";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const db = await getDb();
    const rows = await db.all("SELECT * FROM maintenance_logs ORDER BY openedAt DESC;");
    return res.json(rows);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/", requireRole(["Fleet Manager", "Safety Officer"]), async (req: AuthenticatedRequest, res: Response) => {
  const { vehicleId, type, description, cost, openedAt } = req.body;
  if (!vehicleId || !type || !description || cost === undefined || !openedAt) {
    return res.status(400).json({ error: "Missing required maintenance fields" });
  }

  try {
    const db = await getDb();
    const id = Math.random().toString(36).slice(2, 9);
    
    // Add maintenance record
    await db.run(
      "INSERT INTO maintenance_logs (id, vehicleId, type, description, cost, openedAt, status) VALUES (?, ?, ?, ?, ?, ?, ?);",
      id, vehicleId, type, description, cost, openedAt, "Open"
    );

    // Set vehicle status to In Shop
    await db.run("UPDATE vehicles SET status = 'In Shop' WHERE id = ?;", vehicleId);

    const log = await db.get("SELECT * FROM maintenance_logs WHERE id = ?;", id);
    return res.status(201).json(log);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/:id/close", requireRole(["Fleet Manager", "Safety Officer"]), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const db = await getDb();
    const log = await db.get("SELECT * FROM maintenance_logs WHERE id = ?;", id);
    if (!log) {
      return res.status(404).json({ error: "Maintenance log not found" });
    }

    const closedAt = new Date().toISOString().split("T")[0];
    await db.run("UPDATE maintenance_logs SET status = 'Closed', closedAt = ? WHERE id = ?;", closedAt, id);

    // Check if there are other open logs for this vehicle
    const others = await db.get(
      "SELECT * FROM maintenance_logs WHERE vehicleId = ? AND id != ? AND status = 'Open';",
      log.vehicleId, id
    );

    if (!others) {
      // Revert vehicle to Available if not Retired
      const vehicle = await db.get("SELECT * FROM vehicles WHERE id = ?;", log.vehicleId);
      if (vehicle && vehicle.status !== "Retired") {
        await db.run("UPDATE vehicles SET status = 'Available' WHERE id = ?;", log.vehicleId);
      }
    }

    const updatedLog = await db.get("SELECT * FROM maintenance_logs WHERE id = ?;", id);
    return res.json(updatedLog);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
