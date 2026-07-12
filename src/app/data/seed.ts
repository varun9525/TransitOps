import type {
  Vehicle,
  Driver,
  Trip,
  MaintenanceLog,
  FuelLog,
  Expense,
  User,
} from "./types";

export const seedUsers: User[] = [
  { id: "u1", name: "Maya Okonkwo", email: "maya@transitops.io", role: "Fleet Manager" },
  { id: "u2", name: "Diego Ramirez", email: "diego@transitops.io", role: "Driver" },
  { id: "u3", name: "Sara Novak", email: "sara@transitops.io", role: "Safety Officer" },
  { id: "u4", name: "Liam Chen", email: "liam@transitops.io", role: "Financial Analyst" },
];

export const seedVehicles: Vehicle[] = [
  { id: "v1", registration: "KA-01-AB-1234", name: "Mercedes Sprinter", type: "Van", region: "North", capacity: 1500, status: "On Trip", odometer: 84200, acquisitionCost: 52000, year: 2022 },
  { id: "v2", registration: "KA-02-CD-5678", name: "Volvo FH16", type: "Truck", region: "North", capacity: 25000, status: "Available", odometer: 142900, acquisitionCost: 128000, year: 2021 },
  { id: "v3", registration: "KA-03-EF-9012", name: "Scania Interlink", type: "Bus", region: "South", capacity: 54, status: "In Shop", odometer: 210500, acquisitionCost: 96000, year: 2020 },
  { id: "v4", registration: "KA-04-GH-3456", name: "Ford Transit", type: "Van", region: "East", capacity: 1200, status: "Available", odometer: 45600, acquisitionCost: 41000, year: 2023 },
  { id: "v5", registration: "KA-05-IJ-7890", name: "Tata Ace", type: "Pickup", region: "South", capacity: 750, status: "On Trip", odometer: 67800, acquisitionCost: 18000, year: 2022 },
  { id: "v6", registration: "KA-06-KL-2345", name: "MAN TGX", type: "Truck", region: "West", capacity: 22000, status: "Available", odometer: 98700, acquisitionCost: 115000, year: 2021 },
  { id: "v7", registration: "KA-07-MN-6789", name: "Ashok Leyland", type: "Bus", region: "East", capacity: 48, status: "Available", odometer: 178300, acquisitionCost: 88000, year: 2019 },
  { id: "v8", registration: "KA-08-OP-0123", name: "Freight Trailer X", type: "Trailer", region: "West", capacity: 30000, status: "Retired", odometer: 312000, acquisitionCost: 64000, year: 2016 },
];

export const seedDrivers: Driver[] = [
  { id: "d1", name: "Arjun Mehta", license: "DL-1420110012345", licenseClass: "HMV", licenseExpiry: "2027-04-18", region: "North", status: "On Trip", safetyScore: 92, incidents: 0 },
  { id: "d2", name: "Priya Sharma", license: "DL-1420110067890", licenseClass: "LMV", licenseExpiry: "2026-09-02", region: "North", status: "Available", safetyScore: 88, incidents: 1 },
  { id: "d3", name: "Rohan Verma", license: "DL-1420110054321", licenseClass: "HMV", licenseExpiry: "2026-08-01", region: "South", status: "Available", safetyScore: 74, incidents: 3 },
  { id: "d4", name: "Neha Gupta", license: "DL-1420110098765", licenseClass: "PSV", licenseExpiry: "2028-01-25", region: "South", status: "On Trip", safetyScore: 96, incidents: 0 },
  { id: "d5", name: "Sameer Khan", license: "DL-1420110011223", licenseClass: "HMV", licenseExpiry: "2026-07-20", region: "West", status: "Off Duty", safetyScore: 81, incidents: 2 },
  { id: "d6", name: "Ananya Rao", license: "DL-1420110033445", licenseClass: "LMV", licenseExpiry: "2027-11-11", region: "East", status: "Available", safetyScore: 90, incidents: 0 },
  { id: "d7", name: "Vikram Singh", license: "DL-1420110055667", licenseClass: "HMV", licenseExpiry: "2026-07-15", region: "West", status: "Suspended", safetyScore: 58, incidents: 5 },
];

export const seedTrips: Trip[] = [
  { id: "t1", reference: "TRP-2041", source: "Bengaluru Hub", destination: "Chennai DC", vehicleId: "v1", driverId: "d1", cargo: 1200, plannedDistance: 350, revenue: 4200, status: "Dispatched", scheduledAt: "2026-07-12T08:00:00Z" },
  { id: "t2", reference: "TRP-2042", source: "Hyderabad", destination: "Pune Depot", vehicleId: "v5", driverId: "d4", cargo: 600, plannedDistance: 560, revenue: 6100, status: "Dispatched", scheduledAt: "2026-07-12T06:30:00Z" },
  { id: "t3", reference: "TRP-2039", source: "Mumbai Port", destination: "Nagpur", vehicleId: "v2", driverId: "d2", cargo: 18000, plannedDistance: 820, actualDistance: 835, revenue: 14800, status: "Completed", scheduledAt: "2026-07-08T05:00:00Z" },
  { id: "t4", reference: "TRP-2038", source: "Kochi", destination: "Coimbatore", vehicleId: "v7", driverId: "d6", cargo: 40, plannedDistance: 190, actualDistance: 188, revenue: 3200, status: "Completed", scheduledAt: "2026-07-06T09:15:00Z" },
  { id: "t5", reference: "TRP-2045", source: "Delhi", destination: "Jaipur", vehicleId: "v4", driverId: "d3", cargo: 900, plannedDistance: 280, revenue: 3600, status: "Draft", scheduledAt: "2026-07-14T07:00:00Z" },
];

export const seedMaintenance: MaintenanceLog[] = [
  { id: "m1", vehicleId: "v3", type: "Engine", description: "Coolant leak & belt replacement", cost: 1850, openedAt: "2026-07-05", status: "Open" },
  { id: "m2", vehicleId: "v2", type: "Tyres", description: "Full tyre rotation + 2 replacements", cost: 920, openedAt: "2026-06-22", closedAt: "2026-06-24", status: "Closed" },
  { id: "m3", vehicleId: "v6", type: "Brakes", description: "Brake pad service", cost: 430, openedAt: "2026-06-30", closedAt: "2026-07-01", status: "Closed" },
  { id: "m4", vehicleId: "v1", type: "Service", description: "Scheduled 80k km service", cost: 610, openedAt: "2026-06-18", closedAt: "2026-06-19", status: "Closed" },
];

export const seedFuel: FuelLog[] = [
  { id: "f1", vehicleId: "v1", liters: 62, cost: 5580, odometer: 84100, date: "2026-07-10" },
  { id: "f2", vehicleId: "v2", liters: 180, cost: 16200, odometer: 142700, date: "2026-07-09" },
  { id: "f3", vehicleId: "v5", liters: 40, cost: 3600, odometer: 67700, date: "2026-07-11" },
  { id: "f4", vehicleId: "v4", liters: 48, cost: 4320, odometer: 45500, date: "2026-07-08" },
  { id: "f5", vehicleId: "v6", liters: 165, cost: 14850, odometer: 98500, date: "2026-07-07" },
  { id: "f6", vehicleId: "v7", liters: 95, cost: 8550, odometer: 178100, date: "2026-07-06" },
];

export const seedExpenses: Expense[] = [
  { id: "e1", vehicleId: "v1", category: "Toll", description: "NH44 corridor tolls", amount: 480, date: "2026-07-10" },
  { id: "e2", vehicleId: "v2", category: "Insurance", description: "Quarterly premium", amount: 2100, date: "2026-07-01" },
  { id: "e3", vehicleId: "v5", category: "Permit", description: "Interstate permit renewal", amount: 650, date: "2026-06-28" },
  { id: "e4", vehicleId: "v6", category: "Toll", description: "Expressway tolls", amount: 390, date: "2026-07-05" },
];
