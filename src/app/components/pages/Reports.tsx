import { useMemo, useState } from "react";
import { Download, Gauge, TrendingUp, CircleDollarSign, PiggyBank, FileText, Search, User, MapPin, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  Legend,
} from "recharts";
import { useStore } from "../../data/store";
import { StatCard } from "../app/status";
import { Card, PageHeader, Button, EmptyState, Modal, StatusBadge } from "../app/ui";

const tooltipStyle = {
  background: "var(--ct-surface)",
  border: "1px solid var(--ct-border)",
  borderRadius: 12,
  color: "var(--ct-text)",
  boxShadow: "0 4px 20px -2px rgba(79,70,229,0.15)",
  fontSize: 13,
};

export function Reports() {
  const { vehicles, trips, fuel, expenses, maintenance, vehicleName, driverName, drivers, navigateTo } = useStore();

  const [filterVehicleId, setFilterVehicleId] = useState("All");
  const [filterDriverId, setFilterDriverId] = useState("All");
  const [routeQuery, setRouteQuery] = useState("");
  const [timeframe, setTimeframe] = useState("All");
  const [chartMetric, setChartMetric] = useState("revenue"); // revenue, cost, profit, combined
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);

  const completed = trips.filter((t) => t.status === "Completed");

  // Dynamic filter application
  const filteredCompletedTrips = useMemo(() => {
    return completed.filter((t) => {
      if (filterVehicleId !== "All" && t.vehicleId !== filterVehicleId) return false;
      if (filterDriverId !== "All" && t.driverId !== filterDriverId) return false;
      if (routeQuery.trim() !== "") {
        const q = routeQuery.toLowerCase();
        const matchesRoute = t.source.toLowerCase().includes(q) || t.destination.toLowerCase().includes(q);
        if (!matchesRoute) return false;
      }
      const tripTime = new Date(t.scheduledAt).getTime();
      const refTime = new Date("2026-07-12").getTime();
      if (timeframe === "7days") return tripTime >= refTime - 7 * 86400000;
      if (timeframe === "30days") return tripTime >= refTime - 30 * 86400000;
      return true;
    });
  }, [completed, filterVehicleId, filterDriverId, routeQuery, timeframe]);

  const filteredFuel = useMemo(() => {
    return fuel.filter((f) => {
      if (filterVehicleId !== "All" && f.vehicleId !== filterVehicleId) return false;
      if (filterDriverId !== "All") {
        // match logs that align with a trip for the selected driver
        const hasMatchingTrip = trips.some(
          (t) => t.driverId === filterDriverId && t.vehicleId === f.vehicleId && t.scheduledAt === f.date
        );
        if (!hasMatchingTrip) return false;
      }
      const logTime = new Date(f.date).getTime();
      const refTime = new Date("2026-07-12").getTime();
      if (timeframe === "7days") return logTime >= refTime - 7 * 86400000;
      if (timeframe === "30days") return logTime >= refTime - 30 * 86400000;
      return true;
    });
  }, [fuel, filterVehicleId, filterDriverId, trips, timeframe]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (filterVehicleId !== "All" && e.vehicleId !== filterVehicleId) return false;
      if (filterDriverId !== "All") {
        // match logs that align with a trip for the selected driver
        const hasMatchingTrip = trips.some(
          (t) => t.driverId === filterDriverId && t.vehicleId === e.vehicleId && t.scheduledAt === e.date
        );
        if (!hasMatchingTrip) return false;
      }
      const logTime = new Date(e.date).getTime();
      const refTime = new Date("2026-07-12").getTime();
      if (timeframe === "7days") return logTime >= refTime - 7 * 86400000;
      if (timeframe === "30days") return logTime >= refTime - 30 * 86400000;
      return true;
    });
  }, [expenses, filterVehicleId, filterDriverId, trips, timeframe]);

  const filteredMaint = useMemo(() => {
    return maintenance.filter((m) => {
      if (filterVehicleId !== "All" && m.vehicleId !== filterVehicleId) return false;
      const logTime = new Date(m.openedAt).getTime();
      const refTime = new Date("2026-07-12").getTime();
      if (timeframe === "7days") return logTime >= refTime - 7 * 86400000;
      if (timeframe === "30days") return logTime >= refTime - 30 * 86400000;
      return true;
    });
  }, [maintenance, filterVehicleId, timeframe]);

  // Aggregate Metrics
  const totalRevenue = filteredCompletedTrips.reduce((s, t) => s + t.revenue, 0);
  const totalFuel = filteredFuel.reduce((s, f) => s + f.cost, 0);
  const totalMaint = filteredMaint.reduce((s, m) => s + m.cost, 0);
  const totalExp = filteredExpenses.reduce((s, e) => s + e.amount, 0);
  const totalCost = totalFuel + totalMaint + totalExp;
  const profit = totalRevenue - totalCost;
  const roi = totalCost ? Math.round((profit / totalCost) * 100) : 0;

  const totalDistance = filteredCompletedTrips.reduce((s, t) => s + (t.actualDistance ?? t.plannedDistance), 0);
  const totalLiters = filteredFuel.reduce((s, f) => s + f.liters, 0);
  const efficiency = totalLiters ? (totalDistance / totalLiters).toFixed(1) : "0";

  const operable = vehicles.filter((v) => v.status !== "Retired").length || 1;
  const utilization = Math.round((vehicles.filter((v) => v.status === "On Trip").length / operable) * 100);

  // per-vehicle P&L (filtered)
  const perVehicle = useMemo(() => {
    return vehicles
      .map((v) => {
        const rev = filteredCompletedTrips.filter((t) => t.vehicleId === v.id).reduce((s, t) => s + t.revenue, 0);
        const cost =
          filteredFuel.filter((f) => f.vehicleId === v.id).reduce((s, f) => s + f.cost, 0) +
          filteredExpenses.filter((e) => e.vehicleId === v.id).reduce((s, e) => s + e.amount, 0) +
          filteredMaint.filter((m) => m.vehicleId === v.id).reduce((s, m) => s + m.cost, 0);
        return { id: v.id, name: v.registration, revenue: rev, cost, profit: rev - cost };
      })
      .filter((r) => r.revenue > 0 || r.cost > 0);
  }, [vehicles, filteredCompletedTrips, filteredFuel, filteredExpenses, filteredMaint]);

  const trendData = useMemo(() => {
    return [...filteredCompletedTrips].reverse().map((t) => {
      const tripFuel = fuel.filter((f) => f.vehicleId === t.vehicleId && f.date === t.scheduledAt).reduce((s, f) => s + f.cost, 0);
      const tripExp = expenses.filter((e) => e.vehicleId === t.vehicleId && e.date === t.scheduledAt).reduce((s, e) => s + e.amount, 0);
      const cost = tripFuel + tripExp;
      return {
        name: t.reference,
        revenue: t.revenue,
        cost,
        profit: t.revenue - cost,
      };
    });
  }, [filteredCompletedTrips, fuel, expenses]);

  const exportCsv = () => {
    const header = ["Vehicle", "Revenue", "Cost", "Profit"];
    const lines = perVehicle.map((r) => [vehicleName(r.id), r.revenue, r.cost, r.profit].join(","));
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "transitops-report.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectedTrip = trips.find((t) => t.id === selectedTripId);

  // Sub-metrics linked to the selected trip for detail modal
  const tripFuelLogs = useMemo(() => {
    if (!selectedTrip) return [];
    return fuel.filter((f) => f.vehicleId === selectedTrip.vehicleId && f.date === selectedTrip.scheduledAt);
  }, [selectedTrip, fuel]);

  const tripExpenses = useMemo(() => {
    if (!selectedTrip) return [];
    return expenses.filter((e) => e.vehicleId === selectedTrip.vehicleId && e.date === selectedTrip.scheduledAt);
  }, [selectedTrip, expenses]);

  const tripTotalFuelCost = tripFuelLogs.reduce((s, f) => s + f.cost, 0);
  const tripTotalExpenses = tripExpenses.reduce((s, e) => s + e.amount, 0);
  const tripTotalSpend = tripTotalFuelCost + tripTotalExpenses;

  // Anti-theft verification variables
  const isTripFuelPriceValid = useMemo(() => {
    if (tripFuelLogs.length === 0) return true;
    return tripFuelLogs.every((f) => {
      const rate = f.cost / f.liters;
      return rate >= 85 && rate <= 105;
    });
  }, [tripFuelLogs]);

  const isTripTollValid = useMemo(() => {
    if (tripExpenses.length === 0) return true;
    return tripExpenses.every((e) => {
      if (e.category === "Tolls" && e.amount > 5000) return false;
      return true;
    });
  }, [tripExpenses]);

  // odometer verification
  const isTripOdometerValid = useMemo(() => {
    if (!selectedTrip) return true;
    if (selectedTrip.actualDistance === null) return true;
    if (tripFuelLogs.length === 0) return true;
    // Odometer reading in fuel log must check out
    const fuelOdos = tripFuelLogs.map((f) => f.odometer);
    const maxFuelOdo = Math.max(...fuelOdos);
    const vehicleObj = vehicles.find((v) => v.id === selectedTrip.vehicleId);
    if (!vehicleObj) return true;
    return maxFuelOdo <= vehicleObj.odometer;
  }, [selectedTrip, tripFuelLogs, vehicles]);

  const selectedVehicleObj = useMemo(() => {
    if (!selectedTrip) return null;
    return vehicles.find((v) => v.id === selectedTrip.vehicleId);
  }, [selectedTrip, vehicles]);

  return (
    <div>
      <PageHeader
        title="Reports & Analytics"
        subtitle="Financial and operational performance across the fleet."
        action={
          <div className="flex gap-2 print:hidden">
            <Button variant="secondary" onClick={() => window.print()}><FileText className="size-4" /> Print PDF</Button>
            <Button variant="secondary" onClick={exportCsv}><Download className="size-4" /> Export CSV</Button>
          </div>
        }
      />

      {/* Dynamic Filters panel */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 rounded-xl border border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/30 print:hidden">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-slate-500">Filter Vehicle:</span>
          <select
            value={filterVehicleId}
            onChange={(e) => setFilterVehicleId(e.target.value)}
            className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs outline-none focus:border-indigo-500 focus:bg-white text-slate-850 dark:bg-slate-950 dark:border-slate-850 dark:text-slate-200"
          >
            <option value="All">All Vehicles</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>{v.registration} ({v.name})</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-slate-500">Filter Driver:</span>
          <select
            value={filterDriverId}
            onChange={(e) => setFilterDriverId(e.target.value)}
            className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs outline-none focus:border-indigo-500 focus:bg-white text-slate-850 dark:bg-slate-950 dark:border-slate-850 dark:text-slate-200"
          >
            <option value="All">All Drivers</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-slate-500">Search Route:</span>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-450" />
            <input
              type="text"
              value={routeQuery}
              onChange={(e) => setRouteQuery(e.target.value)}
              placeholder="e.g. Pune, Delhi..."
              className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 text-xs outline-none focus:border-indigo-500 focus:bg-white text-slate-850 dark:bg-slate-950 dark:border-slate-850 dark:text-slate-200"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-slate-500">Timeframe:</span>
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs outline-none focus:border-indigo-500 focus:bg-white text-slate-850 dark:bg-slate-950 dark:border-slate-850 dark:text-slate-200"
          >
            <option value="All">All Time</option>
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
          </select>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Fuel Efficiency" value={`${efficiency} km/L`} icon={Gauge} tone="indigo" hint="Completed trips" />
        <StatCard label="Fleet Utilization" value={`${utilization}%`} icon={TrendingUp} tone="violet" hint="Active / operable" />
        <StatCard label="Operating Cost" value={`₹${totalCost.toLocaleString()}`} icon={CircleDollarSign} tone="amber" hint="Fuel + maint + exp" />
        <StatCard label="Net ROI" value={`${roi}%`} icon={PiggyBank} tone={roi >= 0 ? "green" : "red"} hint={`₹${profit.toLocaleString()} profit`} />
      </div>

      {/* Main Premium Area Chart */}
      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <h3 className="[font-weight:700] text-slate-900 dark:text-white">Financial Trends by Trip</h3>
              <p className="text-sm text-slate-500">Trip-by-trip analytics ledger</p>
            </div>
            <div className="flex gap-1 border border-slate-100 bg-slate-55 rounded-lg p-1 dark:border-slate-800 dark:bg-slate-900/60 print:hidden">
              {["revenue", "cost", "profit", "combined"].map((m) => (
                <button
                  key={m}
                  onClick={() => setChartMetric(m)}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-semibold uppercase transition-all ${
                    chartMetric === m ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {trendData.length === 0 ? (
            <EmptyState>No completed trips matching standard filters.</EmptyState>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend iconType="circle" fontSize={12} />
                {(chartMetric === "revenue" || chartMetric === "combined") && (
                  <Area name="Revenue (₹)" type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRev)" />
                )}
                {(chartMetric === "cost" || chartMetric === "combined") && (
                  <Area name="Operating Cost (₹)" type="monotone" dataKey="cost" stroke="#f59e0b" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCost)" />
                )}
                {(chartMetric === "profit" || chartMetric === "combined") && (
                  <Area name="Net Profit (₹)" type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorProfit)" />
                )}
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Profit by Vehicle side chart */}
        <Card className="p-6 lg:col-span-1">
          <h3 className="[font-weight:700] text-slate-900 dark:text-white">Margin Contribution</h3>
          <p className="mb-4 text-sm text-slate-500">P&L Contribution by registration</p>
          {perVehicle.length === 0 ? (
            <EmptyState>No asset margin records.</EmptyState>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={perVehicle} barCategoryGap="25%">
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: "rgba(79,70,229,0.04)" }} contentStyle={tooltipStyle} />
                <Bar dataKey="profit" name="Profit Margin (₹)" radius={[6, 6, 0, 0]}>
                  {perVehicle.map((r) => (
                    <Cell key={r.id} fill={r.profit >= 0 ? "#10b981" : "#f43f5e"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Vehicle P&L */}
        <Card className="overflow-hidden lg:col-span-1">
          <div className="flex items-center justify-between border-b border-slate-100 p-5 dark:border-slate-800">
            <h3 className="[font-weight:700] text-slate-900 dark:text-white">Vehicle P&amp;L Summary</h3>
            <button
              onClick={() => navigateTo("vehicles")}
              className="text-xs font-semibold text-indigo-650 hover:underline flex items-center gap-1 cursor-pointer print:hidden"
            >
              Manage Vehicles <ArrowRight className="size-3" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-medium">
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {perVehicle.length === 0 ? (
                  <tr><td className="p-5 text-center text-slate-400">No vehicle records</td></tr>
                ) : (
                  perVehicle.map((r) => (
                    <tr key={r.id} className="transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-900/10">
                      <td className="px-5 py-4 font-semibold text-slate-900 dark:text-slate-100">{vehicleName(r.id)}</td>
                      <td className="px-5 py-4 text-slate-650">
                        <div className="text-[10px] text-slate-450 uppercase font-bold">Rev / Cost</div>
                        <div className="dark:text-slate-350">₹{r.revenue.toLocaleString()} / ₹{r.cost.toLocaleString()}</div>
                      </td>
                      <td className={`px-5 py-4 font-bold text-right ${r.profit >= 0 ? "text-emerald-650" : "text-rose-650"}`}>
                        ₹{r.profit.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Completed Trips Audit Ledger */}
        <Card className="overflow-hidden lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 p-5 dark:border-slate-800">
            <div>
              <h3 className="[font-weight:700] text-slate-900 dark:text-white">Completed Trips Performance</h3>
              <p className="text-xs text-slate-450 mt-0.5">Click on any trip to see detailed routes, margins, and anti-fraud audits</p>
            </div>
            <button
              onClick={() => navigateTo("trips")}
              className="text-xs font-semibold text-indigo-650 hover:underline flex items-center gap-1 cursor-pointer print:hidden"
            >
              View All Trips <ArrowRight className="size-3" />
            </button>
          </div>
          <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 dark:border-slate-800">
                  <th className="px-4 py-2.5">Trip Ref</th>
                  <th className="px-4 py-2.5">Route</th>
                  <th className="px-4 py-2.5">Vehicle</th>
                  <th className="px-4 py-2.5">Distance</th>
                  <th className="px-4 py-2.5">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredCompletedTrips.length === 0 ? (
                  <tr><td colSpan={5} className="p-5 text-center text-slate-400">No completed trips match selected filters</td></tr>
                ) : (
                  filteredCompletedTrips.map((t) => (
                    <tr
                      key={t.id}
                      onClick={() => setSelectedTripId(t.id)}
                      className="transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-900/10 cursor-pointer text-xs"
                    >
                      <td className="px-4 py-3.5 font-bold text-indigo-650 hover:underline">{t.reference}</td>
                      <td className="px-4 py-3.5 text-slate-850 font-semibold dark:text-slate-105">{t.source} → {t.destination}</td>
                      <td className="px-4 py-3.5 text-slate-600 dark:text-slate-400">{vehicleName(t.vehicleId)}</td>
                      <td className="px-4 py-3.5 text-slate-600 dark:text-slate-400">{t.actualDistance ?? t.plannedDistance} km</td>
                      <td className="px-4 py-3.5 text-slate-850 font-bold dark:text-slate-200">₹{t.revenue.toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Trip Detail Audit Modal */}
      {selectedTrip && (
        <Modal
          open={!!selectedTripId}
          onClose={() => setSelectedTripId(null)}
          title={`Trip Audit Ledger — ${selectedTrip.reference}`}
          footer={<Button onClick={() => setSelectedTripId(null)}>Close Ledger</Button>}
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4 dark:bg-slate-900/30">
              <div>
                <span className="text-[10px] text-slate-400 block font-bold uppercase">CORRIDOR ROUTE</span>
                <span className="font-bold text-slate-900 text-sm dark:text-white">{selectedTrip.source} → {selectedTrip.destination}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-bold uppercase">STATUS</span>
                <StatusBadge label={selectedTrip.status} tone="green" />
              </div>
              <div className="flex items-center gap-2 mt-1">
                <MapPin className="size-4 text-slate-450 shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">ASSIGNED VEHICLE</span>
                  <span className="font-semibold text-slate-750 dark:text-slate-300">{vehicleName(selectedTrip.vehicleId)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <User className="size-4 text-slate-450 shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">ASSIGNED DRIVER</span>
                  <span className="font-semibold text-slate-750 dark:text-slate-300">{driverName(selectedTrip.driverId)}</span>
                </div>
              </div>
            </div>

            {/* Cargo load capacity visual indicator */}
            {selectedVehicleObj && (
              <div className="border border-slate-100 dark:border-slate-800 rounded-xl p-3 bg-white dark:bg-slate-950/40">
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="font-semibold text-slate-650 dark:text-slate-400">Cargo Payload Load</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {selectedTrip.cargo.toLocaleString()} kg / {selectedVehicleObj.capacity.toLocaleString()} kg (
                    {Math.round((selectedTrip.cargo / selectedVehicleObj.capacity) * 100)}% Capacity)
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-850 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      selectedTrip.cargo > selectedVehicleObj.capacity ? "bg-rose-500 animate-pulse" : "bg-indigo-600"
                    }`}
                    style={{ width: `${Math.min(100, Math.round((selectedTrip.cargo / selectedVehicleObj.capacity) * 100))}%` }}
                  />
                </div>
                {selectedTrip.cargo > selectedVehicleObj.capacity && (
                  <span className="text-[10px] text-rose-500 font-semibold block mt-1">
                    ⚠ Overloaded Payload Risk: Loaded cargo exceeds vehicle capacity safety guidelines.
                  </span>
                )}
              </div>
            )}

            <div className="grid grid-cols-3 gap-3 text-center border-y border-slate-100 py-3 dark:border-slate-800">
              <div>
                <span className="text-[10px] text-slate-400 block font-bold uppercase">Revenue</span>
                <span className="text-sm font-bold text-emerald-650">₹{selectedTrip.revenue.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-bold uppercase">Actual Distance</span>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{selectedTrip.actualDistance ?? selectedTrip.plannedDistance} km</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-bold uppercase">Expenses Linked</span>
                <span className={`text-sm font-bold ${tripTotalSpend > 0 ? "text-amber-650" : "text-slate-500"}`}>₹{tripTotalSpend.toLocaleString()}</span>
              </div>
            </div>

            {/* Expense breakdown list */}
            <div className="space-y-2">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-450">Linked Expense Registry</h4>
              {tripFuelLogs.length === 0 && tripExpenses.length === 0 ? (
                <div className="text-center text-slate-400 py-4 border border-dashed border-slate-200 rounded-lg">
                  No fuel logs or other expenses were submitted for this trip.
                </div>
              ) : (
                <div className="max-h-[160px] overflow-y-auto space-y-1.5 border border-slate-100 rounded-xl p-2 bg-slate-50/20 dark:border-slate-800">
                  {tripFuelLogs.map((f) => (
                    <div key={f.id} className="flex justify-between items-center text-xs p-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-lg">
                      <div>
                        <span className="font-semibold text-slate-800 dark:text-slate-250">Fuel Consumption Log</span>
                        <span className="text-[10px] text-slate-450 block">{f.liters}L filled · Odometer: {f.odometer.toLocaleString()} km</span>
                      </div>
                      <span className="font-bold text-slate-700 dark:text-slate-300">₹{f.cost.toLocaleString()}</span>
                    </div>
                  ))}
                  {tripExpenses.map((e) => (
                    <div key={e.id} className="flex justify-between items-center text-xs p-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-lg">
                      <div>
                        <span className="font-semibold text-slate-800 dark:text-slate-250">{e.category} — {e.description}</span>
                        <span className="text-[10px] text-slate-450 block">{e.date}</span>
                      </div>
                      <span className="font-bold text-slate-700 dark:text-slate-300">₹{e.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Anti-Theft Expense Auditing Badges */}
            <div className="space-y-2">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-450">Anti-Theft Compliance Audit Report</h4>
              <div className="space-y-1.5">
                <div className={`flex justify-between items-center p-2.5 rounded-lg border text-xs ${
                  isTripFuelPriceValid ? "bg-emerald-50/50 border-emerald-100/50 dark:bg-emerald-950/10 dark:border-emerald-900/20" : "bg-rose-50/50 border-rose-100/50 dark:bg-rose-950/10 dark:border-rose-900/20"
                }`}>
                  <span className="font-semibold text-slate-750 dark:text-slate-300">Fuel Cost rate Claims Audit</span>
                  <span className={`font-bold flex items-center gap-1 ${isTripFuelPriceValid ? "text-emerald-650" : "text-rose-650"}`}>
                    {isTripFuelPriceValid ? (
                      <>
                        <CheckCircle2 className="size-4" /> AUTO-VERIFIED (₹85–₹105/L diesel standard)
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="size-4" /> SUSPICIOUS CLAIM: Rates outside Indian standard range (₹85–₹105/L)
                      </>
                    )}
                  </span>
                </div>

                <div className={`flex justify-between items-center p-2.5 rounded-lg border text-xs ${
                  isTripTollValid ? "bg-emerald-50/50 border-emerald-100/50 dark:bg-emerald-950/10 dark:border-emerald-900/20" : "bg-rose-50/50 border-rose-100/50 dark:bg-rose-950/10 dark:border-rose-900/20"
                }`}>
                  <span className="font-semibold text-slate-750 dark:text-slate-300">Highway Toll Bills Cap Audit</span>
                  <span className={`font-bold flex items-center gap-1 ${isTripTollValid ? "text-emerald-650" : "text-rose-650"}`}>
                    {isTripTollValid ? (
                      <>
                        <CheckCircle2 className="size-4" /> AUTO-VERIFIED (Individual tolls under ₹5,000 max cap)
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="size-4" /> AUDIT ALERT: Single toll bill exceeds ₹5,000 limit
                      </>
                    )}
                  </span>
                </div>

                <div className={`flex justify-between items-center p-2.5 rounded-lg border text-xs ${
                  isTripOdometerValid ? "bg-emerald-50/50 border-emerald-100/50 dark:bg-emerald-950/10 dark:border-emerald-900/20" : "bg-rose-50/50 border-rose-100/50 dark:bg-rose-950/10 dark:border-rose-900/20"
                }`}>
                  <span className="font-semibold text-slate-750 dark:text-slate-300">Odometer Progression Validation</span>
                  <span className={`font-bold flex items-center gap-1 ${isTripOdometerValid ? "text-emerald-650" : "text-rose-650"}`}>
                    {isTripOdometerValid ? (
                      <>
                        <CheckCircle2 className="size-4" /> AUTO-VERIFIED (Progressive sequence alignment matches)
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="size-4" /> MILEAGE DISCREPANCY: Logged odometer exceeds active database readings
                      </>
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
