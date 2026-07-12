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
  MapPin,
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
  const { user, vehicles, drivers, trips, maintenance, navigateTo } = useStore();
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
  
  const serviceDueVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      if (v.status === "Retired" || v.status === "In Shop") return false;
      const closedLogs = maintenance.filter((m) => m.vehicleId === v.id && m.status === "Closed").length;
      if (v.odometer > 40000 && closedLogs === 0) return true;
      if (v.odometer > 60000 && closedLogs <= 1) return true;
      return false;
    });
  }, [vehicles, maintenance]);

  const recentTrips = [...trips].slice(0, 5);

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${user?.name.split(" ")[0]}`}
        subtitle="Live operational snapshot across your fleet."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Active Vehicles" value={activeVehicles} icon={Truck} tone="indigo" hint="Currently on trip" onClick={() => navigateTo("vehicles", { status: "On Trip" })} />
        <StatCard label="Available" value={available} icon={CheckCircle2} tone="green" hint="Ready to dispatch" onClick={() => navigateTo("vehicles", { status: "Available" })} />
        <StatCard label="In Maintenance" value={inShop} icon={Wrench} tone="amber" hint="In the shop" onClick={() => navigateTo("vehicles", { status: "In Shop" })} />
        <StatCard label="Fleet Utilization" value={`${utilization}%`} icon={Gauge} tone="violet" hint="Active / operable" onClick={() => navigateTo("vehicles")} />
        <StatCard label="Active Trips" value={activeTrips} icon={Route} tone="indigo" hint="Dispatched now" onClick={() => navigateTo("trips", { tab: "Dispatched" })} />
        <StatCard label="Pending Trips" value={pendingTrips} icon={Clock} tone="slate" hint="Awaiting dispatch" onClick={() => navigateTo("trips", { tab: "Draft" })} />
        <StatCard label="Drivers On Duty" value={driversOnDuty} icon={Users} tone="green" hint="Available + on trip" onClick={() => navigateTo("drivers")} />
        <StatCard label="Compliance Alerts" value={complianceAlerts.length} icon={TriangleAlert} tone={complianceAlerts.length ? "red" : "slate"} hint="License issues" onClick={() => navigateTo("drivers", { sort: "expiry" })} />
      </div>

      {serviceDueVehicles.length > 0 && (
        <div className="mt-6 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-500 flex items-center gap-1.5">
            <TriangleAlert className="size-4 animate-bounce" />
            Preventive Maintenance Alerts
          </h4>
          <div className="grid gap-4 md:grid-cols-2">
            {serviceDueVehicles.map((v) => (
              <div key={v.id} className="flex items-center justify-between rounded-xl border border-amber-100 bg-amber-50/50 p-4 text-xs text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                <div>
                  <div className="font-semibold text-amber-900 dark:text-amber-250 text-sm">
                    {v.registration} · {v.name}
                  </div>
                  <div className="mt-1">
                    Odometer: <strong>{v.odometer.toLocaleString()} km</strong> · Status: <span className="font-semibold text-amber-700 dark:text-amber-400">Scheduled Service Overdue</span>
                  </div>
                </div>
                <Button
                  size="sm"
                  className="!bg-indigo-600 hover:!bg-indigo-700 !text-white border-none shadow-none font-semibold text-[11px] h-7 px-2.5 rounded-lg shrink-0 cursor-pointer"
                  onClick={() => navigateTo("maintenance")}
                >
                  Schedule Service
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

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

      <Card className="mt-6 p-5">
        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3 dark:border-slate-800">
          <div>
            <h3 className="[font-weight:700] text-slate-900 flex items-center gap-2">
              <MapPin className="size-5 text-indigo-500" />
              Live Route Tracking Map
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Real-time simulated telemetry along major freight corridors</p>
          </div>
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Live Telemetry Active
          </span>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          <div className="lg:col-span-3 bg-slate-950/90 rounded-xl p-4 border border-slate-900 overflow-hidden relative" style={{ minHeight: "220px" }}>
            <svg className="w-full h-full min-h-[200px]" viewBox="0 0 700 200" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <circle cx="2" cy="2" r="1" fill="#334155" opacity="0.3" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />

              {/* Delhi -> Jaipur */}
              <path d="M 120 40 L 240 90" stroke="#f59e0b" strokeWidth="2" strokeDasharray="4 4" opacity="0.6" />
              <circle r="8" fill="#f59e0b" opacity="0.2">
                <animateMotion path="M 120 40 L 240 90" dur="8s" repeatCount="indefinite" />
                <animate attributeName="r" values="4;10;4" dur="2s" repeatCount="indefinite" />
              </circle>
              <circle r="4" fill="#fbbf24">
                <animateMotion path="M 120 40 L 240 90" dur="8s" repeatCount="indefinite" />
              </circle>

              {/* Mumbai -> Pune */}
              <path d="M 100 130 L 210 170" stroke="#38bdf8" strokeWidth="2" strokeDasharray="4 4" opacity="0.6" />
              <circle r="8" fill="#38bdf8" opacity="0.2">
                <animateMotion path="M 100 130 L 210 170" dur="5s" repeatCount="indefinite" />
                <animate attributeName="r" values="4;10;4" dur="2s" repeatCount="indefinite" />
              </circle>
              <circle r="4" fill="#38bdf8">
                <animateMotion path="M 100 130 L 210 170" dur="5s" repeatCount="indefinite" />
              </circle>

              {/* Bengaluru -> Chennai */}
              <path d="M 450 160 L 590 140" stroke="#34d399" strokeWidth="2" strokeDasharray="4 4" opacity="0.6" />
              <circle r="8" fill="#34d399" opacity="0.2">
                <animateMotion path="M 450 160 L 590 140" dur="6s" repeatCount="indefinite" />
                <animate attributeName="r" values="4;10;4" dur="2s" repeatCount="indefinite" />
              </circle>
              <circle r="4" fill="#34d399">
                <animateMotion path="M 450 160 L 590 140" dur="6s" repeatCount="indefinite" />
              </circle>

              {/* Nodes and Labels */}
              <circle cx="120" cy="40" r="5" fill="#f59e0b" />
              <text x="120" y="25" fill="#94a3b8" fontSize="10" fontWeight="600" textAnchor="middle">Delhi NCR</text>
              
              <circle cx="240" cy="90" r="5" fill="#f59e0b" />
              <text x="240" y="105" fill="#94a3b8" fontSize="10" fontWeight="600" textAnchor="middle">Jaipur Depot</text>

              <circle cx="100" cy="130" r="5" fill="#38bdf8" />
              <text x="100" y="120" fill="#94a3b8" fontSize="10" fontWeight="600" textAnchor="middle">Mumbai JNPT</text>
              
              <circle cx="210" cy="170" r="5" fill="#38bdf8" />
              <text x="210" y="185" fill="#94a3b8" fontSize="10" fontWeight="600" textAnchor="middle">Pune Logistics</text>

              <circle cx="450" cy="160" r="5" fill="#34d399" />
              <text x="450" y="175" fill="#94a3b8" fontSize="10" fontWeight="600" textAnchor="middle">Bengaluru WH</text>
              
              <circle cx="590" cy="140" r="5" fill="#34d399" />
              <text x="590" y="130" fill="#94a3b8" fontSize="10" fontWeight="600" textAnchor="middle">Chennai DC</text>
            </svg>
          </div>

          <div className="space-y-3 flex flex-col justify-center">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Corridors</h4>
            <div className="space-y-2">
              <div className="rounded-lg border border-slate-100 p-2.5 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/30 text-xs">
                <div className="flex justify-between items-center font-semibold">
                  <span className="text-slate-800 dark:text-slate-200">MH-12-PQ-9876</span>
                  <span className="text-sky-500 font-bold">West</span>
                </div>
                <div className="text-slate-500 mt-0.5">Mumbai JNPT → Pune Hub</div>
              </div>
              <div className="rounded-lg border border-slate-100 p-2.5 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/30 text-xs">
                <div className="flex justify-between items-center font-semibold">
                  <span className="text-slate-800 dark:text-slate-200">DL-01-CA-4321</span>
                  <span className="text-amber-500 font-bold">North</span>
                </div>
                <div className="text-slate-500 mt-0.5">Delhi NCR → Jaipur Depot</div>
              </div>
              <div className="rounded-lg border border-slate-100 p-2.5 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/30 text-xs">
                <div className="flex justify-between items-center font-semibold">
                  <span className="text-slate-800 dark:text-slate-200">KA-03-GG-7788</span>
                  <span className="text-emerald-500 font-bold">South</span>
                </div>
                <div className="text-slate-500 mt-0.5">Bengaluru WH → Chennai DC</div>
              </div>
            </div>
          </div>
        </div>
      </Card>

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
          <div className="border-b border-slate-100 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="[font-weight:700] text-slate-900">Filtered Fleet</h3>
                <p className="text-sm text-slate-500">{filtered.length} match current filters</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Filter value={type} onChange={setType} label="Type" options={["Van", "Truck", "Bus", "Pickup", "Trailer"]} />
              <Filter value={status} onChange={setStatus} label="Status" options={["Available", "On Trip", "In Shop", "Retired"]} />
              <Filter value={region} onChange={setRegion} label="Region" options={regions} />
            </div>
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
