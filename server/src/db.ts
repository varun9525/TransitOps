import sqlite3 from "sqlite3";
import { open, Database } from "sqlite";
import path from "path";
import bcrypt from "bcryptjs";

let db: Database<sqlite3.Database, sqlite3.Statement> | null = null;

export async function getDb() {
  if (db) return db;

  const dbPath = path.resolve(__dirname, "../transitops.db");
  db = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });

  // Enable foreign keys
  await db.run("PRAGMA foreign_keys = ON;");

  // Create tables
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS vehicles (
      id TEXT PRIMARY KEY,
      registration TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      region TEXT NOT NULL,
      capacity INTEGER NOT NULL,
      status TEXT NOT NULL,
      odometer INTEGER NOT NULL,
      acquisitionCost INTEGER NOT NULL,
      year INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS drivers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      license TEXT UNIQUE NOT NULL,
      licenseClass TEXT NOT NULL,
      licenseExpiry TEXT NOT NULL,
      region TEXT NOT NULL,
      status TEXT NOT NULL,
      safetyScore INTEGER NOT NULL,
      incidents INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS trips (
      id TEXT PRIMARY KEY,
      reference TEXT UNIQUE NOT NULL,
      source TEXT NOT NULL,
      destination TEXT NOT NULL,
      vehicleId TEXT NOT NULL,
      driverId TEXT NOT NULL,
      cargo INTEGER NOT NULL,
      plannedDistance INTEGER NOT NULL,
      actualDistance INTEGER,
      revenue INTEGER NOT NULL,
      status TEXT NOT NULL,
      scheduledAt TEXT NOT NULL,
      FOREIGN KEY (vehicleId) REFERENCES vehicles(id) ON DELETE CASCADE,
      FOREIGN KEY (driverId) REFERENCES drivers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS maintenance_logs (
      id TEXT PRIMARY KEY,
      vehicleId TEXT NOT NULL,
      type TEXT NOT NULL,
      description TEXT NOT NULL,
      cost INTEGER NOT NULL,
      openedAt TEXT NOT NULL,
      closedAt TEXT,
      status TEXT NOT NULL,
      FOREIGN KEY (vehicleId) REFERENCES vehicles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS fuel_logs (
      id TEXT PRIMARY KEY,
      vehicleId TEXT NOT NULL,
      liters INTEGER NOT NULL,
      cost INTEGER NOT NULL,
      odometer INTEGER NOT NULL,
      date TEXT NOT NULL,
      FOREIGN KEY (vehicleId) REFERENCES vehicles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      vehicleId TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      amount INTEGER NOT NULL,
      date TEXT NOT NULL,
      FOREIGN KEY (vehicleId) REFERENCES vehicles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS vehicle_documents (
      id TEXT PRIMARY KEY,
      vehicleId TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT NOT NULL,
      expiryDate TEXT NOT NULL,
      FOREIGN KEY (vehicleId) REFERENCES vehicles(id) ON DELETE CASCADE
    );
  `);

  await seedDatabase(db);

  return db;
}

async function seedDatabase(database: Database<sqlite3.Database, sqlite3.Statement>) {
  // Check if users table is empty
  const userCount = await database.get<{ count: number }>("SELECT COUNT(*) as count FROM users;");
  if (userCount && userCount.count > 0) return;

  const hashedPassword = bcrypt.hashSync("demo1234", 10);

  // Seed Users (Indian Profiles)
  const users = [
    { id: "u1", name: "Rahul Sharma", email: "rahul@transitops.io", password: hashedPassword, role: "Fleet Manager" },
    { id: "u2", name: "Amit Patel", email: "amit@transitops.io", password: hashedPassword, role: "Driver" },
    { id: "u3", name: "Priya Nair", email: "priya@transitops.io", password: hashedPassword, role: "Safety Officer" },
    { id: "u4", name: "Karan Gupta", email: "karan@transitops.io", password: hashedPassword, role: "Financial Analyst" },
  ];

  for (const u of users) {
    await database.run(
      "INSERT OR IGNORE INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?);",
      u.id, u.name, u.email, u.password, u.role
    );
  }

  // Seed Vehicles (Indian Truck/Pickup/Van Models and MH/DL/KA registrations)
  const vehicles = [
    { id: "v1", registration: "MH-12-PQ-9876", name: "Tata Ultra Truck", type: "Truck", region: "West", capacity: 12000, status: "On Trip", odometer: 42100, acquisitionCost: 2800000, year: 2022 },
    { id: "v2", registration: "DL-01-CA-4321", name: "Mahindra Bolero Pik-Up", type: "Pickup", region: "North", capacity: 1500, status: "Available", odometer: 18400, acquisitionCost: 950000, year: 2023 },
    { id: "v3", registration: "KA-51-MD-5544", name: "Tata Winger Passenger", type: "Van", region: "South", capacity: 2000, status: "In Shop", odometer: 67200, acquisitionCost: 1600000, year: 2021 },
    { id: "v4", registration: "HR-55-XY-1234", name: "Ashok Leyland Dost", type: "Pickup", region: "North", capacity: 1250, status: "Available", odometer: 29800, acquisitionCost: 820000, year: 2022 },
    { id: "v5", registration: "KA-03-GG-7788", name: "Eicher Pro 2049", type: "Truck", region: "South", capacity: 3500, status: "On Trip", odometer: 11200, acquisitionCost: 1450000, year: 2024 },
    { id: "v6", registration: "GJ-01-ZZ-9900", name: "BharatBenz 2823C", type: "Truck", region: "West", capacity: 28000, status: "Available", odometer: 89300, acquisitionCost: 4500000, year: 2021 },
    { id: "v7", registration: "WB-02-HH-8899", name: "Tata Magic Express", type: "Bus", region: "East", capacity: 15, status: "Available", odometer: 104500, acquisitionCost: 1850000, year: 2020 },
    { id: "v8", registration: "TN-09-AA-5555", name: "Force Traveller 3050", type: "Van", region: "South", capacity: 2500, status: "Retired", odometer: 324000, acquisitionCost: 1100000, year: 2015 },
  ];

  for (const v of vehicles) {
    await database.run(
      "INSERT OR IGNORE INTO vehicles (id, registration, name, type, region, capacity, status, odometer, acquisitionCost, year) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);",
      v.id, v.registration, v.name, v.type, v.region, v.capacity, v.status, v.odometer, v.acquisitionCost, v.year
    );
  }

  // Seed Vehicle Documents
  const docs = [
    { id: "doc1", vehicleId: "v1", name: "National Permit (All India)", type: "PDF", status: "Valid", expiryDate: "2027-03-31" },
    { id: "doc2", vehicleId: "v1", name: "Third Party Insurance", type: "PDF", status: "Valid", expiryDate: "2027-02-15" },
    { id: "doc3", vehicleId: "v1", name: "Pollution Under Control (PUC)", type: "PDF", status: "Expiring Soon", expiryDate: "2026-08-01" },
    { id: "doc4", vehicleId: "v2", name: "Fitness Certificate", type: "PDF", status: "Valid", expiryDate: "2031-05-20" },
    { id: "doc5", vehicleId: "v2", name: "State Permit (Delhi NCR)", type: "PDF", status: "Valid", expiryDate: "2026-11-30" },
    { id: "doc6", vehicleId: "v3", name: "Fitness Certificate", type: "PDF", status: "Valid", expiryDate: "2029-08-14" },
    { id: "doc7", vehicleId: "v3", name: "Commercial Insurance", type: "PDF", status: "Expired", expiryDate: "2026-06-01" },
  ];

  for (const d of docs) {
    await database.run(
      "INSERT OR IGNORE INTO vehicle_documents (id, vehicleId, name, type, status, expiryDate) VALUES (?, ?, ?, ?, ?, ?);",
      d.id, d.vehicleId, d.name, d.type, d.status, d.expiryDate
    );
  }

  // Seed Drivers (Indian Names & DL Formats)
  const drivers = [
    { id: "d1", name: "Suresh Kumar", license: "DL-1420110012345", licenseClass: "HMV", licenseExpiry: "2027-04-18", region: "North", status: "On Trip", safetyScore: 94, incidents: 0 },
    { id: "d2", name: "Vijay Yadav", license: "MH-1220150067890", licenseClass: "HMV", licenseExpiry: "2026-09-02", region: "West", status: "Available", safetyScore: 89, incidents: 1 },
    { id: "d3", name: "Rajesh Patel", license: "GJ-0120180054321", licenseClass: "LMV", licenseExpiry: "2026-08-01", region: "West", status: "Available", safetyScore: 78, incidents: 2 },
    { id: "d4", name: "Anand Pillai", license: "KA-5120190098765", licenseClass: "HMV", licenseExpiry: "2028-01-25", region: "South", status: "On Trip", safetyScore: 96, incidents: 0 },
    { id: "d5", name: "Manpreet Singh", license: "PB-0220200011223", licenseClass: "HMV", licenseExpiry: "2026-07-20", region: "North", status: "Off Duty", safetyScore: 83, incidents: 2 },
    { id: "d6", name: "Debashis Sen", license: "WB-0220170033445", licenseClass: "PSV", licenseExpiry: "2027-11-11", region: "East", status: "Available", safetyScore: 91, incidents: 0 },
    { id: "d7", name: "Sanjay Dutt", license: "MH-0120120055667", licenseClass: "HMV", licenseExpiry: "2026-07-15", region: "West", status: "Suspended", safetyScore: 55, incidents: 6 },
  ];

  for (const d of drivers) {
    await database.run(
      "INSERT OR IGNORE INTO drivers (id, name, license, licenseClass, licenseExpiry, region, status, safetyScore, incidents) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);",
      d.id, d.name, d.license, d.licenseClass, d.licenseExpiry, d.region, d.status, d.safetyScore, d.incidents
    );
  }

  // Seed Trips (Indian Cargo Routes & Appropriate Rupee Revenues)
  const trips = [
    { id: "t1", reference: "TRP-2041", source: "Mumbai JNPT Port", destination: "Pune Logistics Hub", vehicleId: "v1", driverId: "d1", cargo: 9500, plannedDistance: 150, revenue: 35000, status: "Dispatched", scheduledAt: "2026-07-12T08:00:00Z" },
    { id: "t2", reference: "TRP-2042", source: "Bengaluru Warehouse", destination: "Chennai DC", vehicleId: "v5", driverId: "d4", cargo: 2200, plannedDistance: 350, revenue: 45000, status: "Dispatched", scheduledAt: "2026-07-12T06:30:00Z" },
    { id: "t3", reference: "TRP-2039", source: "Delhi Cargo Terminal", destination: "Jaipur Depot", vehicleId: "v2", driverId: "d2", cargo: 1100, plannedDistance: 270, actualDistance: 275, revenue: 18000, status: "Completed", scheduledAt: "2026-07-08T05:00:00Z" },
    { id: "t4", reference: "TRP-2038", source: "Kolkata Port", destination: "Jamshedpur Factory", vehicleId: "v7", driverId: "d6", cargo: 12, plannedDistance: 280, actualDistance: 282, revenue: 22000, status: "Completed", scheduledAt: "2026-07-06T09:15:00Z" },
    { id: "t5", reference: "TRP-2045", source: "Ahmedabad GIDC", destination: "Surat Hub", vehicleId: "v4", driverId: "d3", cargo: 800, plannedDistance: 260, revenue: 15000, status: "Draft", scheduledAt: "2026-07-14T07:00:00Z" },
  ];

  for (const t of trips) {
    await database.run(
      "INSERT OR IGNORE INTO trips (id, reference, source, destination, vehicleId, driverId, cargo, plannedDistance, actualDistance, revenue, status, scheduledAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);",
      t.id, t.reference, t.source, t.destination, t.vehicleId, t.driverId, t.cargo, t.plannedDistance, t.actualDistance || null, t.revenue, t.status, t.scheduledAt
    );
  }

  // Seed Maintenance Logs (Estimated INR Costs)
  const maintenance = [
    { id: "m1", vehicleId: "v3", type: "Engine", description: "Injectors service & filter change", cost: 18000, openedAt: "2026-07-05", closedAt: null, status: "Open" },
    { id: "m2", vehicleId: "v2", type: "Tyres", description: "Mahindra Pik-Up tyre rotation", cost: 4500, openedAt: "2026-06-22", closedAt: "2026-06-24", status: "Closed" },
    { id: "m3", vehicleId: "v6", type: "Brakes", description: "BharatBenz brake pad replacement", cost: 12500, openedAt: "2026-06-30", closedAt: "2026-07-01", status: "Closed" },
    { id: "m4", vehicleId: "v1", type: "Service", description: "Tata Ultra scheduled 40k service", cost: 9500, openedAt: "2026-06-18", closedAt: "2026-06-19", status: "Closed" },
  ];

  for (const m of maintenance) {
    await database.run(
      "INSERT OR IGNORE INTO maintenance_logs (id, vehicleId, type, description, cost, openedAt, closedAt, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?);",
      m.id, m.vehicleId, m.type, m.description, m.cost, m.openedAt, m.closedAt, m.status
    );
  }

  // Seed Fuel Logs (Liters and INR Costs)
  const fuel = [
    { id: "f1", vehicleId: "v1", liters: 95, cost: 8550, odometer: 42050, date: "2026-07-10" },
    { id: "f2", vehicleId: "v2", liters: 45, cost: 4050, odometer: 18350, date: "2026-07-09" },
    { id: "f3", vehicleId: "v5", liters: 80, cost: 7200, odometer: 11100, date: "2026-07-11" },
    { id: "f4", vehicleId: "v4", liters: 38, cost: 3420, odometer: 29700, date: "2026-07-08" },
    { id: "f5", vehicleId: "v6", liters: 210, cost: 18900, odometer: 89100, date: "2026-07-07" },
    { id: "f6", vehicleId: "v7", liters: 65, cost: 5850, odometer: 104300, date: "2026-07-06" },
  ];

  for (const f of fuel) {
    await database.run(
      "INSERT OR IGNORE INTO fuel_logs (id, vehicleId, liters, cost, odometer, date) VALUES (?, ?, ?, ?, ?, ?);",
      f.id, f.vehicleId, f.liters, f.cost, f.odometer, f.date
    );
  }

  // Seed Expenses (Tolls, Insurance, Permits in INR range)
  const expenses = [
    { id: "e1", vehicleId: "v1", category: "Toll", description: "Mumbai-Pune Expressway toll", amount: 650, date: "2026-07-10" },
    { id: "e2", vehicleId: "v2", category: "Insurance", description: "Mahindra third party premium", amount: 15000, date: "2026-07-01" },
    { id: "e3", vehicleId: "v5", category: "Permit", description: "Karnataka state permit fees", amount: 4800, date: "2026-06-28" },
    { id: "e4", vehicleId: "v6", category: "Toll", description: "Gujarat toll plaza corridor", amount: 1200, date: "2026-07-05" },
  ];

  for (const e of expenses) {
    await database.run(
      "INSERT OR IGNORE INTO expenses (id, vehicleId, category, description, amount, date) VALUES (?, ?, ?, ?, ?, ?);",
      e.id, e.vehicleId, e.category, e.description, e.amount, e.date
    );
  }
}
