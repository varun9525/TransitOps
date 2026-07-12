import { Router, Response } from "express";
import { getDb } from "../db";
import { AuthenticatedRequest, requireRole } from "../middleware/auth";

const router = Router();

// Helper to check if license is expired
function isLicenseExpired(expiryDate: string): boolean {
  return new Date(expiryDate) < new Date("2026-07-12");
}

router.get("/", async (req, res) => {
  try {
    const db = await getDb();
    const rows = await db.all("SELECT * FROM trips ORDER BY scheduledAt DESC;");
    return res.json(rows);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/", requireRole(["Fleet Manager"]), async (req: AuthenticatedRequest, res: Response) => {
  const { source, destination, vehicleId, driverId, cargo, plannedDistance, revenue, scheduledAt } = req.body;
  if (!source || !destination || !vehicleId || !driverId || cargo === undefined || plannedDistance === undefined || revenue === undefined || !scheduledAt) {
    return res.status(400).json({ error: "Missing required trip fields" });
  }

  try {
    const db = await getDb();
    const vehicle = await db.get("SELECT * FROM vehicles WHERE id = ?;", vehicleId);
    const driver = await db.get("SELECT * FROM drivers WHERE id = ?;", driverId);

    if (!vehicle || !driver) {
      return res.status(400).json({ error: "Vehicle or Driver not found" });
    }

    // Business validations
    if (vehicle.status === "In Shop" || vehicle.status === "Retired") {
      return res.status(400).json({ error: `${vehicle.registration} is ${vehicle.status.toLowerCase()} and unavailable` });
    }

    if (driver.status === "Suspended") {
      return res.status(400).json({ error: `${driver.name} is suspended and cannot be dispatched` });
    }

    if (isLicenseExpired(driver.licenseExpiry)) {
      return res.status(400).json({ error: `${driver.name}'s license has expired` });
    }

    if (cargo > vehicle.capacity) {
      return res.status(400).json({ error: `Load ${cargo} exceeds vehicle capacity ${vehicle.capacity}` });
    }

    // Check if driver or vehicle is already on trip
    if (vehicle.status === "On Trip") {
      return res.status(400).json({ error: `Vehicle ${vehicle.registration} is already on another active trip` });
    }
    if (driver.status === "On Trip") {
      return res.status(400).json({ error: `Driver ${driver.name} is already on another active trip` });
    }

    const tripCount = await db.get<{ count: number }>("SELECT COUNT(*) as count FROM trips;");
    const ref = `TRP-${2046 + (tripCount ? tripCount.count : 0)}`;
    const id = Math.random().toString(36).slice(2, 9);

    await db.run(
      `INSERT INTO trips (id, reference, source, destination, vehicleId, driverId, cargo, plannedDistance, revenue, status, scheduledAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      id, ref, source, destination, vehicleId, driverId, cargo, plannedDistance, revenue, "Draft", scheduledAt
    );

    const trip = await db.get("SELECT * FROM trips WHERE id = ?;", id);
    return res.status(201).json(trip);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/:id/dispatch", requireRole(["Fleet Manager"]), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const db = await getDb();
    const trip = await db.get("SELECT * FROM trips WHERE id = ?;", id);
    if (!trip) {
      return res.status(404).json({ error: "Trip not found" });
    }
    if (trip.status !== "Draft") {
      return res.status(400).json({ error: "Only draft trips can be dispatched" });
    }

    // Update statuses
    await db.run("UPDATE trips SET status = 'Dispatched' WHERE id = ?;", id);
    await db.run("UPDATE vehicles SET status = 'On Trip' WHERE id = ?;", trip.vehicleId);
    await db.run("UPDATE drivers SET status = 'On Trip' WHERE id = ?;", trip.driverId);

    const updatedTrip = await db.get("SELECT * FROM trips WHERE id = ?;", id);
    return res.json(updatedTrip);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/:id/complete", requireRole(["Fleet Manager", "Driver"]), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { actualDistance, finalOdometer, fuelLiters, fuelCost } = req.body;

  if (actualDistance === undefined || finalOdometer === undefined) {
    return res.status(400).json({ error: "actualDistance and finalOdometer are required" });
  }

  try {
    const db = await getDb();
    const trip = await db.get("SELECT * FROM trips WHERE id = ?;", id);
    if (!trip) {
      return res.status(404).json({ error: "Trip not found" });
    }
    if (trip.status !== "Dispatched") {
      return res.status(400).json({ error: "Only dispatched trips can be completed" });
    }

    const vehicle = await db.get("SELECT * FROM vehicles WHERE id = ?;", trip.vehicleId);
    if (vehicle && finalOdometer < vehicle.odometer) {
      return res.status(400).json({ error: `Final odometer cannot be less than the current vehicle odometer (${vehicle.odometer} km)` });
    }

    // Update statuses and vehicle odometer
    await db.run("UPDATE trips SET status = 'Completed', actualDistance = ? WHERE id = ?;", actualDistance, id);
    await db.run("UPDATE vehicles SET status = 'Available', odometer = ? WHERE id = ?;", finalOdometer, trip.vehicleId);
    await db.run("UPDATE drivers SET status = 'Available' WHERE id = ?;", trip.driverId);

    // If fuel details are provided, log them
    if (fuelLiters && fuelLiters > 0) {
      const fuelId = Math.random().toString(36).slice(2, 9);
      const date = new Date().toISOString().split("T")[0];
      await db.run(
        "INSERT INTO fuel_logs (id, vehicleId, liters, cost, odometer, date) VALUES (?, ?, ?, ?, ?, ?);",
        fuelId, trip.vehicleId, fuelLiters, fuelCost || 0, finalOdometer, date
      );
    }

    const updatedTrip = await db.get("SELECT * FROM trips WHERE id = ?;", id);
    return res.json(updatedTrip);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/:id/cancel", requireRole(["Fleet Manager"]), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const db = await getDb();
    const trip = await db.get("SELECT * FROM trips WHERE id = ?;", id);
    if (!trip) {
      return res.status(404).json({ error: "Trip not found" });
    }

    // Update status to Cancelled
    await db.run("UPDATE trips SET status = 'Cancelled' WHERE id = ?;", id);

    // If it was already dispatched, restore vehicle and driver status
    if (trip.status === "Dispatched") {
      await db.run("UPDATE vehicles SET status = 'Available' WHERE id = ?;", trip.vehicleId);
      await db.run("UPDATE drivers SET status = 'Available' WHERE id = ?;", trip.driverId);
    }

    const updatedTrip = await db.get("SELECT * FROM trips WHERE id = ?;", id);
    return res.json(updatedTrip);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
