import { useState } from "react";
import { Plus, Wrench, CircleDollarSign, CircleCheck } from "lucide-react";
import { useStore } from "../../data/store";
import { maintTone, StatCard } from "../app/status";
import {
  Card,
  PageHeader,
  Button,
  StatusBadge,
  Modal,
  Field,
  TextInput,
  SelectInput,
  EmptyState,
} from "../app/ui";

export function Maintenance() {
  const { maintenance, vehicles, addMaintenance, closeMaintenance, vehicleName, can } = useStore();
  const [open, setOpen] = useState(false);
  const canCreate = can("maintenance", "create");
  const canEdit = can("maintenance", "edit");

  const [form, setForm] = useState({
    vehicleId: vehicles[0]?.id ?? "",
    type: "Service",
    description: "",
    cost: 500,
    openedAt: "2026-07-12",
  });
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const openCount = maintenance.filter((m) => m.status === "Open").length;
  const totalCost = maintenance.reduce((s, m) => s + m.cost, 0);

  const submit = () => {
    if (!form.description) return;
    addMaintenance(form);
    setOpen(false);
    setForm((f) => ({ ...f, description: "" }));
  };

  return (
    <div>
      <PageHeader
        title="Maintenance"
        subtitle="Service logs and shop status across the fleet."
        action={canCreate && <Button onClick={() => setOpen(true)}><Plus className="size-4" /> Open log</Button>}
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="Open Logs" value={openCount} icon={Wrench} tone="amber" hint="In progress" />
        <StatCard label="In Shop" value={vehicles.filter((v) => v.status === "In Shop").length} icon={Wrench} tone="indigo" />
        <StatCard label="Total Cost" value={`₹${totalCost.toLocaleString()}`} icon={CircleDollarSign} tone="violet" hint="All logs" />
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-slate-100 p-5"><h3 className="[font-weight:700] text-slate-900">Service Logs</h3></div>
        {maintenance.length === 0 ? (
          <div className="p-6"><EmptyState>No maintenance logs yet.</EmptyState></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <th className="px-5 py-3">Vehicle</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Description</th>
                  <th className="px-5 py-3">Opened</th>
                  <th className="px-5 py-3">Cost</th>
                  <th className="px-5 py-3">Status</th>
                  {canEdit && <th className="px-5 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {maintenance.map((m) => (
                  <tr key={m.id} className="transition-colors hover:bg-slate-50">
                    <td className="px-5 py-3 font-semibold text-slate-900">{vehicleName(m.vehicleId)}</td>
                    <td className="px-5 py-3 text-slate-600">{m.type}</td>
                    <td className="px-5 py-3 text-slate-600">{m.description}</td>
                    <td className="px-5 py-3 text-slate-600">{m.openedAt}</td>
                    <td className="px-5 py-3 text-slate-600">₹{m.cost.toLocaleString()}</td>
                    <td className="px-5 py-3"><StatusBadge label={m.status} tone={maintTone(m.status)} /></td>
                    {canEdit && (
                      <td className="px-5 py-3 text-right">
                        {m.status === "Open" && (
                          <Button size="sm" variant="secondary" onClick={() => closeMaintenance(m.id)}>
                            <CircleCheck className="size-4" /> Close
                          </Button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Open maintenance log"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit}>Open log</Button>
          </>
        }
      >
        <div className="grid gap-4">
          <Field label="Vehicle">
            <SelectInput value={form.vehicleId} onChange={(e) => set("vehicleId", e.target.value)}>
              {vehicles.map((v) => <option key={v.id} value={v.id}>{v.registration} · {v.name}</option>)}
            </SelectInput>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Type">
              <SelectInput value={form.type} onChange={(e) => set("type", e.target.value)}>
                {["Service", "Engine", "Brakes", "Tyres", "Electrical", "Bodywork"].map((o) => <option key={o}>{o}</option>)}
              </SelectInput>
            </Field>
            <Field label="Estimated cost (₹)"><TextInput type="number" value={form.cost} onChange={(e) => set("cost", +e.target.value)} /></Field>
          </div>
          <Field label="Description"><TextInput value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Describe the work required…" /></Field>
        </div>
        <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2.5 text-xs text-amber-700">
          Opening a log automatically moves the vehicle to <b>In Shop</b> status.
        </p>
      </Modal>
    </div>
  );
}
