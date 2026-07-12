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
