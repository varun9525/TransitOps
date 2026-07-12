import { type LucideIcon } from "lucide-react";
import { Card, IconTile, type Tone } from "./ui";
import type {
  VehicleStatus,
  DriverStatus,
  TripStatus,
  MaintenanceStatus,
} from "../../data/types";

export function vehicleTone(s: VehicleStatus): Tone {
  return s === "Available" ? "green" : s === "On Trip" ? "indigo" : s === "In Shop" ? "amber" : "slate";
}
export function driverTone(s: DriverStatus): Tone {
  return s === "Available" ? "green" : s === "On Trip" ? "indigo" : s === "Suspended" ? "red" : "slate";
}
export function tripTone(s: TripStatus): Tone {
  return s === "Completed" ? "green" : s === "Dispatched" ? "indigo" : s === "Cancelled" ? "red" : "slate";
}
export function maintTone(s: MaintenanceStatus): Tone {
  return s === "Open" ? "amber" : "green";
}
export function scoreTone(score: number): Tone {
  return score >= 85 ? "green" : score >= 70 ? "amber" : "red";
}

/* ---------- KPI stat card ---------- */
export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "indigo",
  hint,
  onClick,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: Tone;
  hint?: string;
  onClick?: () => void;
}) {
  return (
    <Card hover className="flex flex-col gap-3 p-5" onClick={onClick}>
      <div className="flex items-start justify-between">
        <span className="text-sm font-medium text-slate-500">{label}</span>
        <IconTile tone={tone} className="size-9">
          <Icon className="size-4.5" strokeWidth={2} />
        </IconTile>
      </div>
      <div className="[font-size:1.85rem] [font-weight:800] [letter-spacing:-0.02em] text-slate-900">
        {value}
      </div>
      {hint && <div className="-mt-1 text-sm text-slate-400">{hint}</div>}
    </Card>
  );
}
