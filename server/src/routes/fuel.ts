import { Router, Response } from "express";
import { getDb } from "../db";
import { AuthenticatedRequest, requireRole } from "../middleware/auth";

const router = Router(); // Initialized router with Express Router

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
    
    // Check vehicle exists
    const v = await db.get("SELECT * FROM vehicles WHERE id = ?;", vehicleId);
    if (!v) {
      return res.status(400).json({ error: "Vehicle not found" });
    }
    
    // Fuel Cost check
    const rate = cost / liters;
    if (rate < 85 || rate > 105) {
      return res.status(400).json({ error: `Suspicious Fuel Cost: Rate of ₹${rate.toFixed(1)}/L is outside the allowed Indian standard (₹85–₹105/L). Entry rejected.` });
    }

    // Odometer progressive check
    if (odometer <= v.odometer) {
      return res.status(400).json({ error: `Invalid Odometer: Reading must be greater than the vehicle's current odometer (${v.odometer.toLocaleString()} km).` });
    }
    if (odometer > v.odometer + 1500) {
      return res.status(400).json({ error: `Odometer reading is unrealistically high (+${(odometer - v.odometer).toLocaleString()} km increase). Please verify.` });
    }

    // Driver ownership check
    if (req.user?.role === "Driver") {
      const activeTrip = await db.get(
        "SELECT * FROM trips WHERE driverId = (SELECT id FROM drivers WHERE name = ?) AND status = 'Dispatched' AND vehicleId = ?;",
        req.user.name, vehicleId
      );
      if (!activeTrip) {
        return res.status(403).json({ error: "Access Denied: Drivers can only submit logs for their currently active vehicle/trip." });
      }
    }

    const id = Math.random().toString(36).slice(2, 9);
    
    await db.run(
      "INSERT INTO fuel_logs (id, vehicleId, liters, cost, odometer, date) VALUES (?, ?, ?, ?, ?, ?);",
      id, vehicleId, liters, cost, odometer, date
    );

    // Also update vehicle's current odometer to matches
    await db.run("UPDATE vehicles SET odometer = ? WHERE id = ?;", odometer, vehicleId);

    const log = await db.get("SELECT * FROM fuel_logs WHERE id = ?;", id);
    return res.status(201).json(log);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
