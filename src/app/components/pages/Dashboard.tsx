import { useMemo, useState } from "react";
import {
  Truck,
  CheckCircle2,
  Wrench,
  Route,
  Clock,
  Users,
  Gauge,
  TriangleAlert,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useStore, licenseExpired, licenseExpiringSoon } from "../../data/store";
import { StatCard, tripTone, vehicleTone } from "../app/status";
import { Card, PageHeader, StatusBadge, SelectInput } from "../app/ui";

const chartColors = ["#10b981", "#4f46e5", "#f59e0b", "#94a3b8"];
const tooltipStyle = {
  background: "var(--ct-surface)",
  border: "1px solid var(--ct-border)",
  borderRadius: 12,
  color: "var(--ct-text)",
  boxShadow: "0 4px 20px -2px rgba(79,70,229,0.15)",
  fontSize: 13,
};

export function Dashboard() {
  const { user, vehicles, drivers, trips } = useStore();
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [region, setRegion] = useState("all");

  const regions = useMemo(() => Array.from(new Set(vehicles.map((v) => v.region))), [vehicles]);

  const filtered = vehicles.filter(
    (v) =>
      (type === "all" || v.type === type) &&
      (status === "all" || v.status === status) &&
      (region === "all" || v.region === region),
  );

  const activeVehicles = vehicles.filter((v) => v.status === "On Trip").length;
  const available = vehicles.filter((v) => v.status === "Available").length;
  const inShop = vehicles.filter((v) => v.status === "In Shop").length;
  const activeTrips = trips.filter((t) => t.status === "Dispatched").length;
  const pendingTrips = trips.filter((t) => t.status === "Draft").length;
  const driversOnDuty = drivers.filter((d) => d.status === "On Trip" || d.status === "Available").length;
  const operable = vehicles.filter((v) => v.status !== "Retired").length || 1;
  const utilization = Math.round((activeVehicles / operable) * 100);

  const statusData = (["Available", "On Trip", "In Shop", "Retired"] as const).map((s, i) => ({
    name: s,
    value: vehicles.filter((v) => v.status === s).length,
    fill: chartColors[i],
  }));

  const regionData = regions.map((r) => ({
    region: r,
    vehicles: vehicles.filter((v) => v.region === r).length,
  }));

  const complianceAlerts = drivers.filter((d) => licenseExpired(d) || licenseExpiringSoon(d));
  const recentTrips = [...trips].slice(0, 5);

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${user?.name.split(" ")[0]}`}
        subtitle="Live operational snapshot across your fleet."
        action={
          <div className="flex flex-wrap gap-2">
            <Filter value={type} onChange={setType} label="Type" options={["Van", "Truck", "Bus", "Pickup", "Trailer"]} />
            <Filter value={status} onChange={setStatus} label="Status" options={["Available", "On Trip", "In Shop", "Retired"]} />
            <Filter value={region} onChange={setRegion} label="Region" options={regions} />
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Active Vehicles" value={activeVehicles} icon={Truck} tone="indigo" hint="Currently on trip" />
        <StatCard label="Available" value={available} icon={CheckCircle2} tone="green" hint="Ready to dispatch" />
        <StatCard label="In Maintenance" value={inShop} icon={Wrench} tone="amber" hint="In the shop" />
        <StatCard label="Fleet Utilization" value={`${utilization}%`} icon={Gauge} tone="violet" hint="Active / operable" />
        <StatCard label="Active Trips" value={activeTrips} icon={Route} tone="indigo" hint="Dispatched now" />
        <StatCard label="Pending Trips" value={pendingTrips} icon={Clock} tone="slate" hint="Awaiting dispatch" />
        <StatCard label="Drivers On Duty" value={driversOnDuty} icon={Users} tone="green" hint="Available + on trip" />
        <StatCard label="Compliance Alerts" value={complianceAlerts.length} icon={TriangleAlert} tone={complianceAlerts.length ? "red" : "slate"} hint="License issues" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <h3 className="[font-weight:700] text-slate-900">Vehicles by Region</h3>
          <p className="mb-4 text-sm text-slate-500">Distribution of fleet assets</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={regionData} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
              <XAxis dataKey="region" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip cursor={{ fill: "rgba(79,70,229,0.05)" }} contentStyle={tooltipStyle} />
              <Bar dataKey="vehicles" fill="#4f46e5" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="[font-weight:700] text-slate-900">Fleet Status</h3>
          <p className="mb-2 text-sm text-slate-500">Vehicle status split</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3} stroke="none">
                {statusData.map((d) => (
                  <Cell key={d.name} fill={d.fill} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {statusData.map((d) => (
              <div key={d.name} className="flex items-center gap-2 text-xs text-slate-500">
                <span className="size-2.5 rounded-full" style={{ background: d.fill }} />
                {d.name} · {d.value}
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="overflow-hidden lg:col-span-2">
          <div className="border-b border-slate-100 p-5">
            <h3 className="[font-weight:700] text-slate-900">Recent Trips</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {recentTrips.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-slate-900">
                    {t.source} → {t.destination}
                  </div>
                  <div className="text-xs text-slate-400">{t.reference}</div>
                </div>
                <StatusBadge label={t.status} tone={tripTone(t.status)} />
              </div>
            ))}
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b border-slate-100 p-5">
            <h3 className="[font-weight:700] text-slate-900">Filtered Fleet</h3>
            <p className="text-sm text-slate-500">{filtered.length} match current filters</p>
          </div>
          <div className="max-h-[260px] divide-y divide-slate-100 overflow-auto">
            {filtered.map((v) => (
              <div key={v.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">{v.registration}</div>
                  <div className="text-xs text-slate-400">{v.name}</div>
                </div>
                <StatusBadge label={v.status} tone={vehicleTone(v.status)} />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Filter({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <SelectInput value={value} onChange={(e) => onChange(e.target.value)} className="h-9 w-[130px] py-0">
      <option value="all">All {label}</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </SelectInput>
  );
}
