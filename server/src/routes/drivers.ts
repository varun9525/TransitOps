import { Router, Response } from "express";
import { getDb } from "../db";
import { AuthenticatedRequest, requireRole } from "../middleware/auth";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const db = await getDb();
    const rows = await db.all("SELECT * FROM drivers ORDER BY name ASC;");
    return res.json(rows);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

function validateDriver(data: any) {
  const { license, safetyScore, incidents } = data;
  if (license) {
    const licPattern = /^[A-Z0-9-]{8,22}$/i;
    if (!licPattern.test(license)) {
      return "Invalid License format. Must be between 8 and 22 alphanumeric characters/hyphens.";
    }
  }
  if (safetyScore !== undefined && (safetyScore < 0 || safetyScore > 100)) {
    return "Safety score must be between 0 and 100.";
  }
  if (incidents !== undefined && incidents < 0) {
    return "Incidents count cannot be negative.";
  }
  return null;
}

router.post("/", requireRole(["Fleet Manager", "Safety Officer"]), async (req: AuthenticatedRequest, res: Response) => {
  const { id, name, license, licenseClass, licenseExpiry, region, status, safetyScore, incidents } = req.body;
  if (!name || !license || !licenseClass || !licenseExpiry || !region || !status || safetyScore === undefined || incidents === undefined) {
    return res.status(400).json({ error: "Missing required driver fields" });
  }

  const validationError = validateDriver(req.body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  try {
    const db = await getDb();
    const existing = await db.get("SELECT * FROM drivers WHERE license = ?;", license);
    if (existing) {
      return res.status(400).json({ error: "License number must be unique" });
    }

    const uid = id || Math.random().toString(36).slice(2, 9);
    await db.run(
      "INSERT INTO drivers (id, name, license, licenseClass, licenseExpiry, region, status, safetyScore, incidents) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);",
      uid, name, license, licenseClass, licenseExpiry, region, status, safetyScore, incidents
    );

    const driver = await db.get("SELECT * FROM drivers WHERE id = ?;", uid);
    return res.status(201).json(driver);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.put("/:id", requireRole(["Fleet Manager", "Safety Officer"]), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { name, license, licenseClass, licenseExpiry, region, status, safetyScore, incidents } = req.body;

  const validationError = validateDriver(req.body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  try {
    const db = await getDb();
    const driver = await db.get("SELECT * FROM drivers WHERE id = ?;", id);
    if (!driver) {
      return res.status(404).json({ error: "Driver not found" });
    }

    if (license && license !== driver.license) {
      const existing = await db.get("SELECT * FROM drivers WHERE license = ?;", license);
      if (existing) {
        return res.status(400).json({ error: "License number must be unique" });
      }
    }

    await db.run(
      `UPDATE drivers SET 
        name = ?, license = ?, licenseClass = ?, licenseExpiry = ?, region = ?, 
        status = ?, safetyScore = ?, incidents = ?
       WHERE id = ?;`,
      name || driver.name,
      license || driver.license,
      licenseClass || driver.licenseClass,
      licenseExpiry || driver.licenseExpiry,
      region || driver.region,
      status || driver.status,
      safetyScore !== undefined ? safetyScore : driver.safetyScore,
      incidents !== undefined ? incidents : driver.incidents,
      id
    );

    const updated = await db.get("SELECT * FROM drivers WHERE id = ?;", id);
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", requireRole(["Fleet Manager"]), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const db = await getDb();
    // Check if driver has active trips
    const activeTrip = await db.get("SELECT * FROM trips WHERE driverId = ? AND status = 'Dispatched';", id);
    if (activeTrip) {
      return res.status(400).json({ error: "Cannot delete a driver who is on an active trip" });
    }

    const driver = await db.get("SELECT * FROM drivers WHERE id = ?;", id);
    if (!driver) {
      return res.status(404).json({ error: "Driver not found" });
    }

    await db.run("DELETE FROM drivers WHERE id = ?;", id);
    return res.json({ message: "Driver removed successfully" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
