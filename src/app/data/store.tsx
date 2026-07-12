import {
  createContext,
  useContext,
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
import {
  seedVehicles,
  seedDrivers,
  seedTrips,
  seedMaintenance,
  seedFuel,
  seedExpenses,
  seedUsers,
} from "./seed";

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

const uid = () => Math.random().toString(36).slice(2, 9);

interface StoreShape {
  user: User | null;
  users: User[];
  vehicles: Vehicle[];
  drivers: Driver[];
  trips: Trip[];
  maintenance: MaintenanceLog[];
  fuel: FuelLog[];
  expenses: Expense[];
  login: (email: string, role: Role) => void;
  logout: () => void;
  can: (r: Resource, a: Action) => boolean;
  vehicleName: (id: string) => string;
  driverName: (id: string) => string;
  // vehicles
  saveVehicle: (v: Vehicle) => void;
  deleteVehicle: (id: string) => void;
  // drivers
  saveDriver: (d: Driver) => void;
  // trips
  createTrip: (t: Omit<Trip, "id" | "reference" | "status">) => boolean;
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
  const [users] = useState<User[]>(seedUsers);
  const [vehicles, setVehicles] = useState<Vehicle[]>(seedVehicles);
  const [drivers, setDrivers] = useState<Driver[]>(seedDrivers);
  const [trips, setTrips] = useState<Trip[]>(seedTrips);
  const [maintenance, setMaintenance] = useState<MaintenanceLog[]>(seedMaintenance);
  const [fuel, setFuel] = useState<FuelLog[]>(seedFuel);
  const [expenses, setExpenses] = useState<Expense[]>(seedExpenses);

  const value = useMemo<StoreShape>(() => {
    const vehicleName = (id: string) =>
      vehicles.find((v) => v.id === id)?.registration ?? "—";
    const driverName = (id: string) => drivers.find((d) => d.id === id)?.name ?? "—";

    const setVehicleStatus = (id: string, status: Vehicle["status"]) =>
      setVehicles((prev) => prev.map((v) => (v.id === id ? { ...v, status } : v)));
    const setDriverStatus = (id: string, status: Driver["status"]) =>
      setDrivers((prev) => prev.map((d) => (d.id === id ? { ...d, status } : d)));

    return {
      user,
      users,
      vehicles,
      drivers,
      trips,
      maintenance,
      fuel,
      expenses,
      login: (email, role) => {
        const found = users.find((u) => u.email === email);
        setUser(found ?? { id: uid(), name: email.split("@")[0], email, role });
        toast.success(`Signed in as ${role}`);
      },
      logout: () => setUser(null),
      can: (r, a) => {
        if (!user) return false;
        return matrix[user.role]?.[r]?.includes(a) ?? false;
      },
      vehicleName,
      driverName,

      saveVehicle: (v) =>
        setVehicles((prev) => {
          const exists = prev.some((x) => x.id === v.id);
          toast.success(exists ? "Vehicle updated" : "Vehicle added");
          return exists ? prev.map((x) => (x.id === v.id ? v : x)) : [{ ...v, id: uid() }, ...prev];
        }),
      deleteVehicle: (id) => {
        if (trips.some((t) => t.vehicleId === id && t.status === "Dispatched")) {
          toast.error("Cannot delete a vehicle on an active trip");
          return;
        }
        setVehicles((prev) => prev.filter((v) => v.id !== id));
        toast.success("Vehicle removed");
      },

      saveDriver: (d) =>
        setDrivers((prev) => {
          const exists = prev.some((x) => x.id === d.id);
          toast.success(exists ? "Driver updated" : "Driver added");
          return exists ? prev.map((x) => (x.id === d.id ? d : x)) : [{ ...d, id: uid() }, ...prev];
        }),

      createTrip: (t) => {
        const vehicle = vehicles.find((v) => v.id === t.vehicleId);
        const driver = drivers.find((d) => d.id === t.driverId);
        if (!vehicle || !driver) {
          toast.error("Select a vehicle and driver");
          return false;
        }
        if (vehicle.status === "In Shop" || vehicle.status === "Retired") {
          toast.error(`${vehicle.registration} is ${vehicle.status.toLowerCase()} and unavailable`);
          return false;
        }
        if (driver.status === "Suspended") {
          toast.error(`${driver.name} is suspended and cannot be dispatched`);
          return false;
        }
        if (licenseExpired(driver)) {
          toast.error(`${driver.name}'s license has expired`);
          return false;
        }
        if (t.cargo > vehicle.capacity) {
          toast.error(`Load ${t.cargo} exceeds capacity ${vehicle.capacity}`);
          return false;
        }
        const ref = `TRP-${2046 + trips.length}`;
        setTrips((prev) => [{ ...t, id: uid(), reference: ref, status: "Draft" }, ...prev]);
        toast.success(`Trip ${ref} created`);
        return true;
      },
      dispatchTrip: (id) => {
        const trip = trips.find((t) => t.id === id);
        if (!trip) return;
        setTrips((prev) => prev.map((t) => (t.id === id ? { ...t, status: "Dispatched" } : t)));
        setVehicleStatus(trip.vehicleId, "On Trip");
        setDriverStatus(trip.driverId, "On Trip");
        toast.success(`${trip.reference} dispatched`);
      },
      completeTrip: (id, actualDistance, finalOdometer, fuelLiters, fuelCost) => {
        const trip = trips.find((t) => t.id === id);
        if (!trip) return;
        setTrips((prev) =>
          prev.map((t) => (t.id === id ? { ...t, status: "Completed", actualDistance } : t)),
        );
        setVehicles((prev) =>
          prev.map((v) =>
            v.id === trip.vehicleId ? { ...v, status: "Available", odometer: finalOdometer } : v,
          ),
        );
        setDriverStatus(trip.driverId, "Available");

        if (fuelLiters && fuelLiters > 0) {
          const cost = fuelCost ?? 0;
          setFuel((prev) => [
            {
              id: uid(),
              vehicleId: trip.vehicleId,
              liters: fuelLiters,
              cost: cost,
              odometer: finalOdometer,
              date: new Date().toISOString().split("T")[0],
            },
            ...prev,
          ]);
        }
        toast.success(`${trip.reference} completed`);
      },
      cancelTrip: (id) => {
        const trip = trips.find((t) => t.id === id);
        if (!trip) return;
        setTrips((prev) => prev.map((t) => (t.id === id ? { ...t, status: "Cancelled" } : t)));
        if (trip.status === "Dispatched") {
          setVehicleStatus(trip.vehicleId, "Available");
          setDriverStatus(trip.driverId, "Available");
        }
        toast(`${trip.reference} cancelled`);
      },

      addMaintenance: (m) => {
        setMaintenance((prev) => [{ ...m, id: uid(), status: "Open" }, ...prev]);
        setVehicleStatus(m.vehicleId, "In Shop");
        toast.success("Maintenance log opened");
      },
      closeMaintenance: (id) => {
        const log = maintenance.find((m) => m.id === id);
        if (!log) return;
        setMaintenance((prev) =>
          prev.map((m) =>
            m.id === id ? { ...m, status: "Closed", closedAt: "2026-07-12" } : m,
          ),
        );
        // return vehicle to service if no other open logs
        const others = maintenance.some(
          (m) => m.vehicleId === log.vehicleId && m.id !== id && m.status === "Open",
        );
        if (!others) {
          setVehicles((prev) =>
            prev.map((v) =>
              v.id === log.vehicleId && v.status !== "Retired"
                ? { ...v, status: "Available" }
                : v,
            ),
          );
        }
        toast.success("Maintenance closed");
      },

      addFuel: (f) => {
        setFuel((prev) => [{ ...f, id: uid() }, ...prev]);
        toast.success("Fuel log added");
      },
      addExpense: (e) => {
        setExpenses((prev) => [{ ...e, id: uid() }, ...prev]);
        toast.success("Expense added");
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
