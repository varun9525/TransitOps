import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import type {
  Vehicle,
  Driver,
  Trip,
  MaintenanceLog,
  FuelLog,
  Expense,
  User,
  Role,
} from "./types";

/* ---------- RBAC ---------- */
export type Resource =
  | "dashboard"
  | "vehicles"
  | "drivers"
  | "trips"
  | "maintenance"
  | "fuel"
  | "reports"
  | "settings";
export type Action = "view" | "create" | "edit" | "delete";

export const resources: Resource[] = [
  "dashboard",
  "vehicles",
  "drivers",
  "trips",
  "maintenance",
  "fuel",
  "reports",
  "settings",
];
export const roles: Role[] = ["Fleet Manager", "Driver", "Safety Officer", "Financial Analyst"];

export const matrix: Record<Role, Partial<Record<Resource, Action[]>>> = {
  "Fleet Manager": {
    dashboard: ["view"],
    vehicles: ["view", "create", "edit", "delete"],
    drivers: ["view", "create", "edit"],
    trips: ["view", "create", "edit", "delete"],
    maintenance: ["view", "create", "edit"],
    fuel: ["view", "create"],
    reports: ["view"],
    settings: ["view", "edit"],
  },
  Driver: {
    dashboard: ["view"],
    trips: ["view", "edit"],
    vehicles: ["view"],
    fuel: ["view", "create"],
  },
  "Safety Officer": {
    dashboard: ["view"],
    drivers: ["view", "create", "edit"],
    vehicles: ["view"],
    trips: ["view"],
    maintenance: ["view", "create", "edit"],
    reports: ["view"],
  },
  "Financial Analyst": {
    dashboard: ["view"],
    reports: ["view"],
    fuel: ["view", "create"],
    vehicles: ["view"],
    trips: ["view"],
  },
};

/* ---------- helpers ---------- */
export function licenseExpired(d: Driver) {
  return new Date(d.licenseExpiry) < new Date("2026-07-12");
}
export function licenseExpiringSoon(d: Driver) {
  const now = new Date("2026-07-12").getTime();
  const exp = new Date(d.licenseExpiry).getTime();
  const days = (exp - now) / 86400000;
  return days >= 0 && days <= 45;
}

const API_URL = "http://localhost:5000/api";

async function apiCall(path: string, method = "GET", body?: any) {
  const token = localStorage.getItem("transitops-token");
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Something went wrong");
  }
  return data;
}

interface StoreShape {
  user: User | null;
  users: User[];
  vehicles: Vehicle[];
  drivers: Driver[];
  trips: Trip[];
  maintenance: MaintenanceLog[];
  fuel: FuelLog[];
  expenses: Expense[];
  login: (email: string, password: string, role: Role) => Promise<boolean>;
  register: (name: string, email: string, password: string, role: Role) => Promise<boolean>;
  logout: () => void;
  can: (r: Resource, a: Action) => boolean;
  vehicleName: (id: string) => string;
  driverName: (id: string) => string;
  // vehicles
  saveVehicle: (v: Vehicle) => void;
  deleteVehicle: (id: string) => void;
  fetchDocuments: (vehicleId: string) => Promise<any[]>;
  addVehicleDocument: (vehicleId: string, doc: any) => Promise<void>;
  // drivers
  saveDriver: (d: Driver) => void;
  // trips
  createTrip: (t: Omit<Trip, "id" | "reference" | "status">) => Promise<boolean>;
  dispatchTrip: (id: string) => void;
  completeTrip: (
    id: string,
    actualDistance: number,
    finalOdometer: number,
    fuelLiters?: number,
    fuelCost?: number,
  ) => void;
  cancelTrip: (id: string) => void;
  // maintenance
  addMaintenance: (m: Omit<MaintenanceLog, "id" | "status">) => void;
  closeMaintenance: (id: string) => void;
  // fuel + expense
  addFuel: (f: Omit<FuelLog, "id">) => void;
  addExpense: (e: Omit<Expense, "id">) => void;
}

const StoreContext = createContext<StoreShape | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceLog[]>([]);
  const [fuel, setFuel] = useState<FuelLog[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  // Function to load all data from backend
  const loadData = async () => {
    try {
      const [v, d, t, m, f, e, u] = await Promise.all([
        apiCall("/vehicles"),
        apiCall("/drivers"),
        apiCall("/trips"),
        apiCall("/maintenance"),
        apiCall("/fuel"),
        apiCall("/expenses"),
        apiCall("/auth/users"),
      ]);
      setVehicles(v);
      setDrivers(d);
      setTrips(t);
      setMaintenance(m);
      setFuel(f);
      setExpenses(e);
      setUsers(u);
    } catch (err: any) {
      console.error("Failed to load backend data:", err);
    }
  };

  // Auth initialization
  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem("transitops-token");
      if (!token) return;

      try {
        const data = await apiCall("/auth/me");
        setUser(data.user);
        loadData();
      } catch (err) {
        localStorage.removeItem("transitops-token");
        setUser(null);
      }
    };
    initializeAuth();
  }, []);

  const value = useMemo<StoreShape>(() => {
    const vehicleName = (id: string) =>
      vehicles.find((v) => v.id === id)?.registration ?? "—";
    const driverName = (id: string) => drivers.find((d) => d.id === id)?.name ?? "—";

    return {
      user,
      users,
      vehicles,
      drivers,
      trips,
      maintenance,
      fuel,
      expenses,
      login: async (email, password, role) => {
        try {
          const res = await apiCall("/auth/login", "POST", { email, password });
          localStorage.setItem("transitops-token", res.token);
          setUser(res.user);
          loadData();
          toast.success(`Signed in successfully as ${role}`);
          return true;
        } catch (err: any) {
          toast.error(err.message || "Failed to sign in");
          return false;
        }
      },
      register: async (name, email, password, role) => {
        try {
          const res = await apiCall("/auth/register", "POST", { name, email, password, role });
          localStorage.setItem("transitops-token", res.token);
          setUser(res.user);
          loadData();
          toast.success(`Registered and signed in as ${role}`);
          return true;
        } catch (err: any) {
          toast.error(err.message || "Registration failed");
          return false;
        }
      },
      logout: () => {
        localStorage.removeItem("transitops-token");
        setUser(null);
        toast.info("Signed out");
      },
      can: (r, a) => {
        if (!user) return false;
        return matrix[user.role]?.[r]?.includes(a) ?? false;
      },
      vehicleName,
      driverName,

      saveVehicle: async (v) => {
        try {
          const method = v.id ? "PUT" : "POST";
          const path = v.id ? `/vehicles/${v.id}` : "/vehicles";
          await apiCall(path, method, v);
          await loadData();
          toast.success(v.id ? "Vehicle updated" : "Vehicle added");
        } catch (err: any) {
          toast.error(err.message);
        }
      },
      deleteVehicle: async (id) => {
        try {
          await apiCall(`/vehicles/${id}`, "DELETE");
          await loadData();
          toast.success("Vehicle removed");
        } catch (err: any) {
          toast.error(err.message);
        }
      },
      fetchDocuments: async (vehicleId) => {
        try {
          return await apiCall(`/vehicles/${vehicleId}/documents`);
        } catch (err: any) {
          toast.error(err.message);
          return [];
        }
      },
      addVehicleDocument: async (vehicleId, doc) => {
        try {
          await apiCall(`/vehicles/${vehicleId}/documents`, "POST", doc);
        } catch (err: any) {
          toast.error(err.message);
        }
      },

      saveDriver: async (d) => {
        try {
          const method = d.id ? "PUT" : "POST";
          const path = d.id ? `/drivers/${d.id}` : "/drivers";
          await apiCall(path, method, d);
          await loadData();
          toast.success(d.id ? "Driver updated" : "Driver added");
        } catch (err: any) {
          toast.error(err.message);
        }
      },

      createTrip: async (t) => {
        try {
          await apiCall("/trips", "POST", t);
          await loadData();
          toast.success("Trip created");
          return true;
        } catch (err: any) {
          toast.error(err.message);
          return false;
        }
      },
      dispatchTrip: async (id) => {
        try {
          await apiCall(`/trips/${id}/dispatch`, "POST");
          await loadData();
          toast.success("Trip dispatched");
        } catch (err: any) {
          toast.error(err.message);
        }
      },
      completeTrip: async (id, actualDistance, finalOdometer, fuelLiters, fuelCost) => {
        try {
          await apiCall(`/trips/${id}/complete`, "POST", { actualDistance, finalOdometer, fuelLiters, fuelCost });
          await loadData();
          toast.success("Trip completed");
        } catch (err: any) {
          toast.error(err.message);
        }
      },
      cancelTrip: async (id) => {
        try {
          await apiCall(`/trips/${id}/cancel`, "POST");
          await loadData();
          toast.success("Trip cancelled");
        } catch (err: any) {
          toast.error(err.message);
        }
      },

      addMaintenance: async (m) => {
        try {
          await apiCall("/maintenance", "POST", m);
          await loadData();
          toast.success("Maintenance log opened");
        } catch (err: any) {
          toast.error(err.message);
        }
      },
      closeMaintenance: async (id) => {
        try {
          await apiCall(`/maintenance/${id}/close`, "POST");
          await loadData();
          toast.success("Maintenance closed");
        } catch (err: any) {
          toast.error(err.message);
        }
      },

      addFuel: async (f) => {
        try {
          await apiCall("/fuel", "POST", f);
          await loadData();
          toast.success("Fuel log added");
        } catch (err: any) {
          toast.error(err.message);
        }
      },
      addExpense: async (e) => {
        try {
          await apiCall("/expenses", "POST", e);
          await loadData();
          toast.success("Expense added");
        } catch (err: any) {
          toast.error(err.message);
        }
      },
    };
  }, [user, users, vehicles, drivers, trips, maintenance, fuel, expenses]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
