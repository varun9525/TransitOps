import { Router, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getDb } from "../db";
import { AuthenticatedRequest, requireAuth } from "../middleware/auth";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "transitops-super-secret-key-1234!";

router.post("/register", requireAuth, async (req: AuthenticatedRequest, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    const db = await getDb();

    // Only Fleet Managers are authorized to register accounts
    if (!req.user || req.user.role !== "Fleet Manager") {
      return res.status(403).json({ error: "Access denied: Only Fleet Managers can register new employee accounts." });
    }

    // Check if user already exists
    const existing = await db.get("SELECT * FROM users WHERE email = ?;", email);
    if (existing) {
      return res.status(400).json({ error: "Email already registered" });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const id = Math.random().toString(36).slice(2, 9);

    await db.run(
      "INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?);",
      id, name, email, hashedPassword, role
    );

    return res.status(201).json({ user: { id, name, email, role } });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/login", async (req, res) => {
  const { email, password, role } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    const db = await getDb();
    const user = await db.get("SELECT * FROM users WHERE email = ?;", email);
    if (!user) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const valid = bcrypt.compareSync(password, user.password);
    if (!valid) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    if (role && user.role !== role) {
      return res.status(400).json({ error: `Selected role does not match your registered role: ${user.role}` });
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "1d" }
    );
    return res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/me", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  return res.json({ user: req.user });
});

router.get("/users", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = await getDb();
    const rows = await db.all("SELECT id, name, email, role FROM users ORDER BY name ASC;");
    return res.json(rows);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
