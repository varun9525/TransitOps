import { useMemo } from "react";
import { Download, Gauge, TrendingUp, CircleDollarSign, PiggyBank } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";
import { useStore } from "../../data/store";
import { StatCard } from "../app/status";
import { Card, PageHeader, Button, EmptyState } from "../app/ui";

const tooltipStyle = {
  background: "var(--ct-surface)",
  border: "1px solid var(--ct-border)",
  borderRadius: 12,
  color: "var(--ct-text)",
  boxShadow: "0 4px 20px -2px rgba(79,70,229,0.15)",
  fontSize: 13,
};

export function Reports() {
  const { vehicles, trips, fuel, expenses, maintenance, vehicleName } = useStore();

  const completed = trips.filter((t) => t.status === "Completed");
  const totalRevenue = completed.reduce((s, t) => s + t.revenue, 0);
  const totalFuel = fuel.reduce((s, f) => s + f.cost, 0);
  const totalMaint = maintenance.reduce((s, m) => s + m.cost, 0);
  const totalExp = expenses.reduce((s, e) => s + e.amount, 0);
  const totalCost = totalFuel + totalMaint + totalExp;
  const profit = totalRevenue - totalCost;
  const roi = totalCost ? Math.round((profit / totalCost) * 100) : 0;

  const totalDistance = completed.reduce((s, t) => s + (t.actualDistance ?? t.plannedDistance), 0);
  const totalLiters = fuel.reduce((s, f) => s + f.liters, 0);
  const efficiency = totalLiters ? (totalDistance / totalLiters).toFixed(1) : "0";

  const operable = vehicles.filter((v) => v.status !== "Retired").length || 1;
  const utilization = Math.round((vehicles.filter((v) => v.status === "On Trip").length / operable) * 100);

  // per-vehicle P&L
  const perVehicle = useMemo(() => {
    return vehicles.map((v) => {
      const rev = completed.filter((t) => t.vehicleId === v.id).reduce((s, t) => s + t.revenue, 0);
      const cost =
        fuel.filter((f) => f.vehicleId === v.id).reduce((s, f) => s + f.cost, 0) +
        expenses.filter((e) => e.vehicleId === v.id).reduce((s, e) => s + e.amount, 0) +
        maintenance.filter((m) => m.vehicleId === v.id).reduce((s, m) => s + m.cost, 0);
      return { id: v.id, name: v.registration, revenue: rev, cost, profit: rev - cost };
    });
  }, [vehicles, completed, fuel, expenses, maintenance]);

  const revenueTrend = useMemo(() => {
    const byRef = [...completed].map((t, i) => ({
      name: t.reference,
      revenue: t.revenue,
      idx: i,
    }));
    return byRef;
  }, [completed]);

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

  return (
    <div>
      <PageHeader
        title="Reports & Analytics"
        subtitle="Financial and operational performance across the fleet."
        action={<Button variant="secondary" onClick={exportCsv}><Download className="size-4" /> Export CSV</Button>}
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Fuel Efficiency" value={`${efficiency} km/L`} icon={Gauge} tone="indigo" hint="Completed trips" />
        <StatCard label="Fleet Utilization" value={`${utilization}%`} icon={TrendingUp} tone="violet" hint="Active / operable" />
        <StatCard label="Operating Cost" value={`₹${totalCost.toLocaleString()}`} icon={CircleDollarSign} tone="amber" hint="Fuel + maint + exp" />
        <StatCard label="Net ROI" value={`${roi}%`} icon={PiggyBank} tone={roi >= 0 ? "green" : "red"} hint={`₹${profit.toLocaleString()} profit`} />
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h3 className="[font-weight:700] text-slate-900">Revenue by Trip</h3>
          <p className="mb-4 text-sm text-slate-500">Completed trip revenue</p>
          {revenueTrend.length === 0 ? (
            <EmptyState>No completed trips yet.</EmptyState>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={revenueTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4, fill: "#4f46e5" }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-6">
          <h3 className="[font-weight:700] text-slate-900">Profit by Vehicle</h3>
          <p className="mb-4 text-sm text-slate-500">Revenue minus operating cost</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={perVehicle} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip cursor={{ fill: "rgba(79,70,229,0.05)" }} contentStyle={tooltipStyle} />
              <Bar dataKey="profit" radius={[6, 6, 0, 0]}>
                {perVehicle.map((r) => (
                  <Cell key={r.id} fill={r.profit >= 0 ? "#10b981" : "#f43f5e"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-slate-100 p-5"><h3 className="[font-weight:700] text-slate-900">Vehicle P&amp;L</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                <th className="px-5 py-3">Vehicle</th>
                <th className="px-5 py-3">Revenue</th>
                <th className="px-5 py-3">Cost</th>
                <th className="px-5 py-3">Profit</th>
                <th className="px-5 py-3">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {perVehicle.map((r) => {
                const margin = r.revenue ? Math.round((r.profit / r.revenue) * 100) : 0;
                return (
                  <tr key={r.id} className="transition-colors hover:bg-slate-50">
                    <td className="px-5 py-3 font-semibold text-slate-900">{vehicleName(r.id)}</td>
                    <td className="px-5 py-3 text-slate-600">₹{r.revenue.toLocaleString()}</td>
                    <td className="px-5 py-3 text-slate-600">₹{r.cost.toLocaleString()}</td>
                    <td className={`px-5 py-3 font-semibold ${r.profit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>₹{r.profit.toLocaleString()}</td>
                    <td className="px-5 py-3 text-slate-600">{margin}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
