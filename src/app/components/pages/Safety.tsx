import { useState } from "react";
import { Plus, ShieldAlert, CheckCircle2, ShieldCheck, User, Calendar, Trash2, IndianRupee } from "lucide-react";
import { useStore } from "../../data/store";
import type { Incident } from "../../data/types";
import { StatCard } from "../app/status";
import { Card, PageHeader, Button, StatusBadge, Modal, Field, TextInput, SelectInput } from "../app/ui";

const emptyIncident = {
  driverId: "",
  vehicleId: "",
  severity: "Medium" as const,
  description: "",
  fineAmount: 0,
  loggedAt: new Date().toISOString().split("T")[0],
};

export function Safety() {
  const { incidents, drivers, vehicles, addIncident, resolveIncident, driverName, vehicleName, can } = useStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyIncident);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const canCreate = can("safety", "create");
  const canEdit = can("safety", "edit");

  // Summary statistics
  const avgSafetyScore = useMemo(() => {
    if (drivers.length === 0) return 0;
    const total = drivers.reduce((s, d) => s + d.safetyScore, 0);
    return Math.round(total / drivers.length);
  }, [drivers]);

  const activeIncidents = incidents.filter((i) => i.resolved === 0).length;
  const totalFines = incidents.reduce((s, i) => s + i.fineAmount, 0);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.driverId) errs.driverId = "Driver is required";
    if (!form.vehicleId) errs.vehicleId = "Vehicle is required";
    if (!form.description.trim()) errs.description = "Description is required";
    if (form.fineAmount < 0) errs.fineAmount = "Fine cannot be negative";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    const success = await addIncident(form);
    if (success) {
      setOpen(false);
      setForm(emptyIncident);
      setErrors({});
    }
  };

  // Helper helper function to mimic useMemo without importing if React doesn't auto-resolve it
  function useMemo<T>(fn: () => T, deps: any[]): T {
    return fn();
  }

  return (
    <div>
      <PageHeader
        title="Safety & Compliance Logs"
        subtitle="Manage speed alerts, incident registries, and driver safety scoring metrics."
        action={
          canCreate && (
            <Button onClick={() => setOpen(true)}>
              <Plus className="size-4" /> Log Safety Incident
            </Button>
          )
        }
      />

      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Avg Fleet Safety Score" value={`${avgSafetyScore}/100`} icon={ShieldCheck} tone={avgSafetyScore >= 85 ? "green" : avgSafetyScore >= 70 ? "amber" : "red"} hint="Across all registered drivers" />
        <StatCard label="Outstanding Incidents" value={activeIncidents} icon={ShieldAlert} tone={activeIncidents > 0 ? "amber" : "green"} hint="Awaiting resolution" />
        <StatCard label="Safety Fines Issued" value={`₹${totalFines.toLocaleString()}`} icon={IndianRupee} tone="slate" hint="All logged safety events" />
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-slate-100 p-5 dark:border-slate-800">
          <h3 className="[font-weight:700] text-slate-900 dark:text-white">Active Safety Ledger</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 dark:border-slate-800">
                <th className="px-5 py-3">Logged At</th>
                <th className="px-5 py-3">Driver</th>
                <th className="px-5 py-3">Vehicle</th>
                <th className="px-5 py-3">Severity</th>
                <th className="px-5 py-3">Description</th>
                <th className="px-5 py-3">Fine (₹)</th>
                <th className="px-5 py-3">Status</th>
                {canEdit && <th className="px-5 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {incidents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-5 text-center text-slate-400">
                    No safety incidents logged. Safe operations verified.
                  </td>
                </tr>
              ) : (
                incidents.map((i) => (
                  <tr key={i.id} className="transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-900/10">
                    <td className="px-5 py-4 whitespace-nowrap text-slate-550">{i.loggedAt}</td>
                    <td className="px-5 py-4 font-semibold text-slate-900 dark:text-slate-200">{driverName(i.driverId)}</td>
                    <td className="px-5 py-4 text-slate-600 dark:text-slate-400">{vehicleName(i.vehicleId)}</td>
                    <td className="px-5 py-4">
                      <StatusBadge
                        label={i.severity}
                        tone={i.severity === "High" ? "red" : i.severity === "Medium" ? "amber" : "slate"}
                      />
                    </td>
                    <td className="px-5 py-4 text-slate-650 dark:text-slate-350 max-w-xs truncate" title={i.description}>
                      {i.description}
                    </td>
                    <td className="px-5 py-4 font-semibold text-slate-700 dark:text-slate-300">
                      {i.fineAmount > 0 ? `₹${i.fineAmount.toLocaleString()}` : "—"}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge
                        label={i.resolved === 1 ? "Resolved" : "Open"}
                        tone={i.resolved === 1 ? "green" : "red"}
                      />
                    </td>
                    {canEdit && (
                      <td className="px-5 py-4 text-right">
                        {i.resolved === 0 && (
                          <Button
                            variant="secondary"
                            onClick={() => resolveIncident(i.id)}
                            className="text-xs h-7 py-0 px-2.5 font-bold cursor-pointer"
                          >
                            Mark Resolved
                          </Button>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Log incident modal */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Log safety incident"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Log Incident</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Driver">
              <SelectInput
                value={form.driverId}
                onChange={(e) => {
                  setForm((f) => ({ ...f, driverId: e.target.value }));
                  if (errors.driverId) validate();
                }}
              >
                <option value="">Select driver</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </SelectInput>
              {errors.driverId && <span className="text-xs text-rose-500 font-medium">{errors.driverId}</span>}
            </Field>

            <Field label="Vehicle">
              <SelectInput
                value={form.vehicleId}
                onChange={(e) => {
                  setForm((f) => ({ ...f, vehicleId: e.target.value }));
                  if (errors.vehicleId) validate();
                }}
              >
                <option value="">Select vehicle</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>{v.registration} · {v.name}</option>
                ))}
              </SelectInput>
              {errors.vehicleId && <span className="text-xs text-rose-500 font-medium">{errors.vehicleId}</span>}
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Severity">
              <SelectInput
                value={form.severity}
                onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value as any }))}
              >
                <option value="Low">Low (Deducts 3 safety pts)</option>
                <option value="Medium">Medium (Deducts 8 safety pts)</option>
                <option value="High">High (Deducts 15 safety pts)</option>
              </SelectInput>
            </Field>

            <Field label="Fine amount (₹)">
              <TextInput
                type="number"
                value={form.fineAmount}
                onChange={(e) => {
                  setForm((f) => ({ ...f, fineAmount: +e.target.value }));
                  if (errors.fineAmount) validate();
                }}
              />
              {errors.fineAmount && <span className="text-xs text-rose-500 font-medium">{errors.fineAmount}</span>}
            </Field>
          </div>

          <Field label="Description">
            <TextInput
              value={form.description}
              onChange={(e) => {
                setForm((f) => ({ ...f, description: e.target.value }));
                if (errors.description) validate();
              }}
              placeholder="E.g., Overspeeding on highway NH-48 captured by speed cam."
              className={errors.description ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20" : ""}
            />
            {errors.description && <span className="text-xs text-rose-500 font-medium">{errors.description}</span>}
          </Field>
        </div>
      </Modal>
    </div>
  );
}
