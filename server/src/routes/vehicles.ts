import { Router, Response } from "express";
import { getDb } from "../db";
import { AuthenticatedRequest, requireRole } from "../middleware/auth";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const db = await getDb();
    const rows = await db.all("SELECT * FROM vehicles ORDER BY registration ASC;");
    return res.json(rows);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

function validateVehicle(data: any) {
  const { registration, capacity, odometer, acquisitionCost, year } = data;
  if (registration) {
    const regPattern = /^[A-Z]{2}-\d{2}-[A-Z0-9]{1,3}-\d{4}$/;
    if (!regPattern.test(registration)) {
      return "Invalid Registration format. Must match Indian RTO standard (e.g., MH-12-PQ-9876).";
    }
  }
  if (capacity !== undefined && capacity <= 0) {
    return "Capacity must be greater than 0 kg.";
  }
  if (odometer !== undefined && odometer < 0) {
    return "Odometer reading cannot be negative.";
  }
  if (acquisitionCost !== undefined && acquisitionCost <= 0) {
    return "Acquisition cost must be greater than 0.";
  }
  if (year !== undefined && (year < 1995 || year > 2027)) {
    return "Manufacturing year must be between 1995 and 2027.";
  }
  return null;
}

router.post("/", requireRole(["Fleet Manager"]), async (req: AuthenticatedRequest, res: Response) => {
  const { id, registration, name, type, region, capacity, status, odometer, acquisitionCost, year } = req.body;
  if (!registration || !name || !type || !region || capacity === undefined || !status || odometer === undefined || acquisitionCost === undefined || year === undefined) {
    return res.status(400).json({ error: "Missing required vehicle fields" });
  }

  const validationError = validateVehicle(req.body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  try {
    const db = await getDb();
    const existing = await db.get("SELECT * FROM vehicles WHERE registration = ?;", registration);
    if (existing) {
      return res.status(400).json({ error: "Registration number must be unique" });
    }

    const uid = id || Math.random().toString(36).slice(2, 9);
    await db.run(
      "INSERT INTO vehicles (id, registration, name, type, region, capacity, status, odometer, acquisitionCost, year) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);",
      uid, registration, name, type, region, capacity, status, odometer, acquisitionCost, year
    );

    const vehicle = await db.get("SELECT * FROM vehicles WHERE id = ?;", uid);
    return res.status(201).json(vehicle);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.put("/:id", requireRole(["Fleet Manager"]), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { registration, name, type, region, capacity, status, odometer, acquisitionCost, year } = req.body;

  const validationError = validateVehicle(req.body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  try {
    const db = await getDb();
    const vehicle = await db.get("SELECT * FROM vehicles WHERE id = ?;", id);
    if (!vehicle) {
      return res.status(404).json({ error: "Vehicle not found" });
    }

    // If registration is changing, check uniqueness
    if (registration && registration !== vehicle.registration) {
      const existing = await db.get("SELECT * FROM vehicles WHERE registration = ?;", registration);
      if (existing) {
        return res.status(400).json({ error: "Registration number must be unique" });
      }
    }

    await db.run(
      `UPDATE vehicles SET 
        registration = ?, name = ?, type = ?, region = ?, capacity = ?, 
        status = ?, odometer = ?, acquisitionCost = ?, year = ?
       WHERE id = ?;`,
      registration || vehicle.registration,
      name || vehicle.name,
      type || vehicle.type,
      region || vehicle.region,
      capacity !== undefined ? capacity : vehicle.capacity,
      status || vehicle.status,
      odometer !== undefined ? odometer : vehicle.odometer,
      acquisitionCost !== undefined ? acquisitionCost : vehicle.acquisitionCost,
      year !== undefined ? year : vehicle.year,
      id
    );

    const updated = await db.get("SELECT * FROM vehicles WHERE id = ?;", id);
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", requireRole(["Fleet Manager"]), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const db = await getDb();
    // Check if vehicle has active trips
    const activeTrip = await db.get("SELECT * FROM trips WHERE vehicleId = ? AND status = 'Dispatched';", id);
    if (activeTrip) {
      return res.status(400).json({ error: "Cannot delete a vehicle on an active trip" });
    }

    await db.run("DELETE FROM vehicles WHERE id = ?;", id);
    return res.json({ message: "Vehicle removed successfully" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/:id/documents", async (req, res) => {
  try {
    const db = await getDb();
    const rows = await db.all("SELECT * FROM vehicle_documents WHERE vehicleId = ?;", req.params.id);
    return res.json(rows);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/:id/documents", async (req, res) => {
  const { name, type, status, expiryDate } = req.body;
  try {
    const db = await getDb();
    const docId = Math.random().toString(36).slice(2, 9);
    await db.run(
      "INSERT INTO vehicle_documents (id, vehicleId, name, type, status, expiryDate) VALUES (?, ?, ?, ?, ?, ?);",
      docId, req.params.id, name, type, status, expiryDate
    );
    const doc = await db.get("SELECT * FROM vehicle_documents WHERE id = ?;", docId);
    return res.status(201).json(doc);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
