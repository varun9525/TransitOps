import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { getDb } from "./db";
import { authenticate } from "./middleware/auth";

import authRouter from "./routes/auth";
import vehiclesRouter from "./routes/vehicles";
import driversRouter from "./routes/drivers";
import tripsRouter from "./routes/trips";
import maintenanceRouter from "./routes/maintenance";
import fuelRouter from "./routes/fuel";
import expensesRouter from "./routes/expenses";
import incidentsRouter from "./routes/incidents";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend dev server
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));

app.use(express.json());

// Apply token authentication parser globally
app.use(authenticate);

// Mount API Endpoints
app.use("/api/auth", authRouter);
app.use("/api/vehicles", vehiclesRouter);
app.use("/api/drivers", driversRouter);
app.use("/api/trips", tripsRouter);
app.use("/api/maintenance", maintenanceRouter);
app.use("/api/fuel", fuelRouter);
app.use("/api/expenses", expensesRouter);
app.use("/api/incidents", incidentsRouter);

// Database initialization & Server Boot
async function startServer() {
  try {
    console.log("Initializing SQLite Database...");
    await getDb();
    console.log("Database initialized & seeded successfully.");
    
    app.listen(PORT, () => {
      console.log(`TransitOps Backend running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start backend server:", err);
    process.exit(1);
  }
}

startServer();
