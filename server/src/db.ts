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

  // Seed a default admin user if no users exist (needed for first login)
  await seedDefaultAdmin(db);
  await seedDemoData(db);

  return db;
}

async function seedDefaultAdmin(database: Database<sqlite3.Database, sqlite3.Statement>) {
  const userCount = await database.get<{ count: number }>("SELECT COUNT(*) as count FROM users;");
  if (userCount && userCount.count > 0) return;

  const hashedPassword = bcrypt.hashSync("demo1234", 10);

  // Only create one default admin so the system can be accessed
  await database.run(
    "INSERT OR IGNORE INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?);",
    "u1", "Admin", "admin@transitops.io", hashedPassword, "Fleet Manager"
  );

  console.log("Created default admin user: admin@transitops.io / demo1234 (Fleet Manager)");
}

async function seedDemoData(database: Database<sqlite3.Database, sqlite3.Statement>) {
  await seedRows(database, "users", [
    ["u1", "Admin", "admin@transitops.io", await hashPassword("demo1234"), "Fleet Manager"],
    ["u2", "Aman Sharma", "aman.sharma@transitops.io", await hashPassword("demo1234"), "Driver"],
    ["u3", "Neha Rao", "neha.rao@transitops.io", await hashPassword("demo1234"), "Safety Officer"],
    ["u4", "Vikram Patel", "vikram.patel@transitops.io", await hashPassword("demo1234"), "Financial Analyst"],
  ], "id");

  await seedRows(database, "vehicles", [
    ["veh1", "MH-12-AB-4821", "Mumbai City Bus", "Bus", "West", 48, "On Trip", 84210, 12500000, 2022],
    ["veh2", "DL-01-TR-7845", "Delhi Cargo Van", "Van", "North", 18, "Available", 125400, 2850000, 2021],
    ["veh3", "KA-05-HQ-9184", "Bengaluru Freight Truck", "Truck", "South", 26, "In Shop", 213450, 9800000, 2020],
    ["veh4", "GJ-01-CM-5571", "Ahmedabad Shuttle Pickup", "Pickup", "West", 6, "Available", 65420, 1650000, 2023],
  ], "id");

  await seedRows(database, "drivers", [
    ["drv1", "Rajesh Kumar", "MH12DL9845", "HMV", "2026-11-15", "West", "On Trip", 92, 1],
    ["drv2", "Priya Nair", "DL01TR5521", "LMV", "2027-03-20", "North", "Available", 96, 0],
    ["drv3", "Imran Khan", "KA05PSV7712", "PSV", "2026-08-20", "South", "Available", 88, 0],
    ["drv4", "Sneha Patil", "GJ01HMV6618", "HMV", "2026-09-30", "West", "Available", 89, 2],
  ], "id");

  await seedRows(database, "trips", [
    ["trp1", "TRP-2046", "Mumbai", "Pune", "veh1", "drv1", 32, 148, null, 180000, "Dispatched", "2026-07-12"],
    ["trp2", "TRP-2047", "Delhi", "Jaipur", "veh2", "drv2", 12, 282, 291, 95000, "Completed", "2026-07-09"],
    ["trp3", "TRP-2048", "Bengaluru", "Mysuru", "veh4", "drv4", 8, 145, null, 65000, "Draft", "2026-07-14"],
  ], "id");

  await seedRows(database, "maintenance_logs", [
    ["mnt1", "veh3", "Engine Service", "Gearbox inspection and coolant flush at Bengaluru workshop", 42000, "2026-07-11", null, "Open"],
    ["mnt2", "veh4", "Annual Inspection", "Routine inspection completed at Ahmedabad depot", 8500, "2026-06-20", "2026-06-23", "Closed"],
  ], "id");

  await seedRows(database, "fuel_logs", [
    ["fuel1", "veh1", 260, 22750, 84210, "2026-07-12"],
    ["fuel2", "veh2", 180, 17100, 125400, "2026-07-10"],
  ], "id");

  await seedRows(database, "expenses", [
    ["exp1", "veh1", "Tolls", "Mumbai-Pune expressway tolls", 3800, "2026-07-12"],
    ["exp2", "veh4", "Parking", "Bengaluru depot parking", 1200, "2026-07-09"],
  ], "id");

  await seedRows(database, "vehicle_documents", [
    ["doc1", "veh1", "Insurance Policy", "Insurance", "Valid", "2027-02-28"],
    ["doc2", "veh2", "Fitness Certificate", "Compliance", "Valid", "2026-12-31"],
    ["doc3", "veh3", "Pollution Certificate", "Compliance", "Expiring Soon", "2026-08-05"],
  ], "id");
}

async function seedRows(
  database: Database<sqlite3.Database, sqlite3.Statement>,
  table: string,
  rows: unknown[][],
  primaryKey: string,
) {
  for (const row of rows) {
    const placeholders = row.map(() => "?").join(", ");
    await database.run(
      `INSERT OR IGNORE INTO ${table} (${getColumns(table, primaryKey).join(", ")}) VALUES (${placeholders});`,
      ...row,
    );
  }
}

function getColumns(table: string, primaryKey: string) {
  switch (table) {
    case "users":
      return [primaryKey, "name", "email", "password", "role"];
    case "vehicles":
      return [primaryKey, "registration", "name", "type", "region", "capacity", "status", "odometer", "acquisitionCost", "year"];
    case "drivers":
      return [primaryKey, "name", "license", "licenseClass", "licenseExpiry", "region", "status", "safetyScore", "incidents"];
    case "trips":
      return [primaryKey, "reference", "source", "destination", "vehicleId", "driverId", "cargo", "plannedDistance", "actualDistance", "revenue", "status", "scheduledAt"];
    case "maintenance_logs":
      return [primaryKey, "vehicleId", "type", "description", "cost", "openedAt", "closedAt", "status"];
    case "fuel_logs":
      return [primaryKey, "vehicleId", "liters", "cost", "odometer", "date"];
    case "expenses":
      return [primaryKey, "vehicleId", "category", "description", "amount", "date"];
    case "vehicle_documents":
      return [primaryKey, "vehicleId", "name", "type", "status", "expiryDate"];
    default:
      return [primaryKey];
  }
}

async function hashPassword(password: string) {
  return bcrypt.hashSync(password, 10);
}
