export type Role = "Fleet Manager" | "Driver" | "Safety Officer" | "Financial Analyst";

export type VehicleType = "Van" | "Truck" | "Bus" | "Pickup" | "Trailer";
export type VehicleStatus = "Available" | "On Trip" | "In Shop" | "Retired";
export type DriverStatus = "Available" | "On Trip" | "Off Duty" | "Suspended";
export type TripStatus = "Draft" | "Dispatched" | "Completed" | "Cancelled";
export type MaintenanceStatus = "Open" | "Closed";

export interface Vehicle {
  id: string;
  registration: string;
  name: string;
  type: VehicleType;
  region: string;
  capacity: number;
  status: VehicleStatus;
  odometer: number;
  acquisitionCost: number;
  year: number;
}

export interface Driver {
  id: string;
  name: string;
  license: string;
  licenseClass: string;
  licenseExpiry: string; // ISO date
  region: string;
  status: DriverStatus;
  safetyScore: number; // 0-100
  incidents: number;
}

export interface Trip {
  id: string;
  reference: string;
  source: string;
  destination: string;
  vehicleId: string;
  driverId: string;
  cargo: number; // load weight/pax
  plannedDistance: number;
  actualDistance?: number;
  revenue: number;
  status: TripStatus;
  scheduledAt: string;
}

export interface MaintenanceLog {
  id: string;
  vehicleId: string;
  type: string;
  description: string;
  cost: number;
  openedAt: string;
  closedAt?: string;
  status: MaintenanceStatus;
}

export interface FuelLog {
  id: string;
  vehicleId: string;
  liters: number;
  cost: number;
  odometer: number;
  date: string;
}

export interface Expense {
  id: string;
  vehicleId: string;
  category: string;
  description: string;
  amount: number;
  date: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}
