import { useMemo, useState } from "react";
import { Plus, Fuel as FuelIcon, Receipt, TrendingUp } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { useStore } from "../../data/store";
import { StatCard } from "../app/status";
import {
  Card,
  PageHeader,
  Button,
  Modal,
  Field,
  TextInput,
  SelectInput,
  EmptyState,
} from "../app/ui";

const tooltipStyle = {
  background: "var(--ct-surface)",
  border: "1px solid var(--ct-border)",
  borderRadius: 12,
  color: "var(--ct-text)",
  boxShadow: "0 4px 20px -2px rgba(79,70,229,0.15)",
  fontSize: 13,
};

type Tab = "fuel" | "expenses";

export function Fuel() {
  const { fuel, expenses, vehicles, addFuel, addExpense, vehicleName, can } = useStore();
  const [tab, setTab] = useState<Tab>("fuel");
  const [open, setOpen] = useState(false);
  const canCreate = can("fuel", "create");

  const [fuelForm, setFuelForm] = useState({
    vehicleId: vehicles[0]?.id ?? "",
    liters: 40,
    cost: 4000,
    odometer: 0,
    date: "2026-07-12",
  });
  const [expForm, setExpForm] = useState({
    vehicleId: vehicles[0]?.id ?? "",
    category: "Tolls",
    description: "",
    amount: 500,
    date: "2026-07-12",
  });

  const totalFuel = fuel.reduce((s, f) => s + f.cost, 0);
  const totalLiters = fuel.reduce((s, f) => s + f.liters, 0);
  const totalExp = expenses.reduce((s, e) => s + e.amount, 0);

  const costByVehicle = useMemo(() => {
    return vehicles
      .map((v) => ({
        name: v.registration,
        fuel: fuel.filter((f) => f.vehicleId === v.id).reduce((s, f) => s + f.cost, 0),
        expenses: expenses.filter((e) => e.vehicleId === v.id).reduce((s, e) => s + e.amount, 0),
      }))
      .filter((r) => r.fuel || r.expenses);
  }, [vehicles, fuel, expenses]);

  const submit = () => {
    if (tab === "fuel") {
      addFuel(fuelForm);
    } else {
      if (!expForm.description) return;
      addExpense(expForm);
    }
    setOpen(false);
  };

  return (
    <div>
      <PageHeader
        title="Fuel & Expenses"
        subtitle="Track fuel consumption and operating costs across the fleet."
        action={canCreate && <Button onClick={() => setOpen(true)}><Plus className="size-4" /> Add {tab === "fuel" ? "fuel" : "expense"}</Button>}
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Fuel Cost" value={`₹${totalFuel.toLocaleString()}`} icon={FuelIcon} tone="indigo" />
        <StatCard label="Total Litres" value={totalLiters.toLocaleString()} icon={FuelIcon} tone="violet" />
        <StatCard label="Other Expenses" value={`₹${totalExp.toLocaleString()}`} icon={Receipt} tone="amber" />
        <StatCard label="Combined Spend" value={`₹${(totalFuel + totalExp).toLocaleString()}`} icon={TrendingUp} tone="green" />
      </div>

      <Card className="mb-6 p-6">
        <h3 className="[font-weight:700] text-slate-900">Cost by Vehicle</h3>
        <p className="mb-4 text-sm text-slate-500">Fuel vs other expenses</p>
        {costByVehicle.length === 0 ? (
          <EmptyState>No cost data yet.</EmptyState>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={costByVehicle} barCategoryGap="25%">
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip cursor={{ fill: "rgba(79,70,229,0.05)" }} contentStyle={tooltipStyle} />
              <Bar dataKey="fuel" name="Fuel" stackId="a" fill="#4f46e5" radius={[0, 0, 0, 0]} />
              <Bar dataKey="expenses" name="Expenses" stackId="a" fill="#7c3aed" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      <div className="mb-5 flex gap-2">
        {(["fuel", "expenses"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium capitalize transition-all ${
              tab === t ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white ct-shadow-btn" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {t === "fuel" ? "Fuel Logs" : "Expenses"}
          </button>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          {tab === "fuel" ? (
            fuel.length === 0 ? (
              <div className="p-6"><EmptyState>No fuel logs yet.</EmptyState></div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <th className="px-5 py-3">Vehicle</th>
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3">Litres</th>
                    <th className="px-5 py-3">Odometer</th>
                    <th className="px-5 py-3">Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {fuel.map((f) => (
                    <tr key={f.id} className="transition-colors hover:bg-slate-50">
                      <td className="px-5 py-3 font-semibold text-slate-900">{vehicleName(f.vehicleId)}</td>
                      <td className="px-5 py-3 text-slate-600">{f.date}</td>
                      <td className="px-5 py-3 text-slate-600">{f.liters} L</td>
                      <td className="px-5 py-3 text-slate-600">{f.odometer.toLocaleString()} km</td>
                      <td className="px-5 py-3 text-slate-600">₹{f.cost.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          ) : expenses.length === 0 ? (
            <div className="p-6"><EmptyState>No expenses yet.</EmptyState></div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <th className="px-5 py-3">Vehicle</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3">Description</th>
                  <th className="px-5 py-3">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expenses.map((e) => (
                  <tr key={e.id} className="transition-colors hover:bg-slate-50">
                    <td className="px-5 py-3 font-semibold text-slate-900">{vehicleName(e.vehicleId)}</td>
                    <td className="px-5 py-3 text-slate-600">{e.date}</td>
                    <td className="px-5 py-3 text-slate-600">{e.category}</td>
                    <td className="px-5 py-3 text-slate-600">{e.description}</td>
                    <td className="px-5 py-3 text-slate-600">₹{e.amount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={tab === "fuel" ? "Add fuel log" : "Add expense"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit}>Add {tab === "fuel" ? "fuel" : "expense"}</Button>
          </>
        }
      >
        {tab === "fuel" ? (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Vehicle">
              <SelectInput value={fuelForm.vehicleId} onChange={(e) => setFuelForm((f) => ({ ...f, vehicleId: e.target.value }))}>
                {vehicles.map((v) => <option key={v.id} value={v.id}>{v.registration}</option>)}
              </SelectInput>
            </Field>
            <Field label="Date"><TextInput type="date" value={fuelForm.date} onChange={(e) => setFuelForm((f) => ({ ...f, date: e.target.value }))} /></Field>
            <Field label="Litres"><TextInput type="number" value={fuelForm.liters} onChange={(e) => setFuelForm((f) => ({ ...f, liters: +e.target.value }))} /></Field>
            <Field label="Cost (₹)"><TextInput type="number" value={fuelForm.cost} onChange={(e) => setFuelForm((f) => ({ ...f, cost: +e.target.value }))} /></Field>
            <Field label="Odometer (km)"><TextInput type="number" value={fuelForm.odometer} onChange={(e) => setFuelForm((f) => ({ ...f, odometer: +e.target.value }))} /></Field>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Vehicle">
              <SelectInput value={expForm.vehicleId} onChange={(e) => setExpForm((f) => ({ ...f, vehicleId: e.target.value }))}>
                {vehicles.map((v) => <option key={v.id} value={v.id}>{v.registration}</option>)}
              </SelectInput>
            </Field>
            <Field label="Category">
              <SelectInput value={expForm.category} onChange={(e) => setExpForm((f) => ({ ...f, category: e.target.value }))}>
                {["Tolls", "Parking", "Insurance", "Fines", "Cleaning", "Misc"].map((o) => <option key={o}>{o}</option>)}
              </SelectInput>
            </Field>
            <Field label="Amount (₹)"><TextInput type="number" value={expForm.amount} onChange={(e) => setExpForm((f) => ({ ...f, amount: +e.target.value }))} /></Field>
            <Field label="Date"><TextInput type="date" value={expForm.date} onChange={(e) => setExpForm((f) => ({ ...f, date: e.target.value }))} /></Field>
            <div className="col-span-2">
              <Field label="Description"><TextInput value={expForm.description} onChange={(e) => setExpForm((f) => ({ ...f, description: e.target.value }))} placeholder="Toll charges Bengaluru–Chennai" /></Field>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
