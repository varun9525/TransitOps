import { useState } from "react";
import { Plus, MapPin, Send, CircleCheck, Ban, Package } from "lucide-react";
import { useStore, licenseExpired } from "../../data/store";
import type { TripStatus } from "../../data/types";
import { tripTone } from "../app/status";
import { toast } from "sonner";
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

const tabs: (TripStatus | "All")[] = ["All", "Draft", "Dispatched", "Completed", "Cancelled"];

export function Trips() {
  const { trips, vehicles, drivers, createTrip, dispatchTrip, completeTrip, cancelTrip, vehicleName, driverName, can, user } = useStore();
  const [tab, setTab] = useState<TripStatus | "All">("All");
  const [open, setOpen] = useState(false);
  const [complete, setComplete] = useState<string | null>(null);
  
  // Trip completion states
  const [actual, setActual] = useState(0);
  const [finalOdometer, setFinalOdometer] = useState(0);
  const [fuelLiters, setFuelLiters] = useState(0);
  const [fuelCost, setFuelCost] = useState(0);

  const canCreate = can("trips", "create");
  const canEdit = can("trips", "edit");

  // Filter assignable vehicles & drivers based on business rules
  const assignableVehicles = vehicles.filter((v) => v.status === "Available");
  const assignableDrivers = drivers.filter(
    (d) => d.status === "Available" && !licenseExpired(d)
  );

  const [form, setForm] = useState({
    source: "",
    destination: "",
    vehicleId: "",
    driverId: "",
    cargo: 500,
    plannedDistance: 100,
    revenue: 1000,
    scheduledAt: "2026-07-15T08:00:00Z",
  });
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const isDriver = user?.role === "Driver";
  const activeDriver = isDriver ? drivers.find((d) => d.name === user?.name) : null;
  const filteredTrips = isDriver
    ? trips.filter((t) => activeDriver && t.driverId === activeDriver.id)
    : trips;
  const rows = filteredTrips.filter((t) => tab === "All" || t.status === tab);

  const openNew = () => {
    const firstV = assignableVehicles[0];
    const firstD = assignableDrivers[0];
    setForm({
      source: "",
      destination: "",
      vehicleId: firstV?.id ?? "",
      driverId: firstD?.id ?? "",
      cargo: 500,
      plannedDistance: 100,
      revenue: 1000,
      scheduledAt: "2026-07-15T08:00:00Z",
    });
    setOpen(true);
  };

  const submit = async () => {
    if (!form.source || !form.destination) {
      toast.error("Source and destination are required");
      return;
    }
    if (!form.vehicleId) {
      toast.error("An available vehicle must be selected");
      return;
    }
    if (!form.driverId) {
      toast.error("An available driver must be selected");
      return;
    }
    const success = await createTrip(form);
    if (success) setOpen(false);
  };

  const tripToComplete = trips.find((t) => t.id === complete);
  const activeVehicle = vehicles.find((v) => v.id === tripToComplete?.vehicleId);

  const handleOpenComplete = (tripId: string) => {
    const t = trips.find((x) => x.id === tripId);
    if (!t) return;
    const v = vehicles.find((x) => x.id === t.vehicleId);
    const currOdo = v?.odometer ?? 0;
    setComplete(tripId);
    setActual(t.plannedDistance);
    setFinalOdometer(currOdo + t.plannedDistance);
    setFuelLiters(0);
    setFuelCost(0);
  };

  const handleActualChange = (val: number) => {
    setActual(val);
    if (tripToComplete) {
      const v = vehicles.find((x) => x.id === tripToComplete.vehicleId);
      const currOdo = v?.odometer ?? 0;
      setFinalOdometer(currOdo + val);
    }
  };

  return (
    <div>
      <PageHeader
        title="Trip Dispatcher"
        subtitle="Plan, dispatch and track trips with automatic validation."
        action={canCreate && <Button onClick={openNew}><Plus className="size-4" /> New trip</Button>}
      />

      <div className="mb-5 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition-all ${
              tab === t ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white ct-shadow-btn" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState>No trips in this view.</EmptyState>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((t) => (
            <Card key={t.id} hover className="flex flex-col gap-4 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-400">{t.reference}</div>
                  <div className="mt-1 flex items-center gap-2 font-semibold text-slate-900">
                    <MapPin className="size-4 text-indigo-500" />
                    {t.source}
                  </div>
                  <div className="ml-6 text-sm text-slate-500">→ {t.destination}</div>
                </div>
                <StatusBadge label={t.status} tone={tripTone(t.status)} />
              </div>

              <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 text-sm">
                <Meta label="Vehicle" value={vehicleName(t.vehicleId)} />
                <Meta label="Driver" value={driverName(t.driverId)} />
                <Meta label="Cargo" value={`${t.cargo.toLocaleString()} kg`} icon />
                <Meta label="Distance" value={`${t.actualDistance ?? t.plannedDistance} km`} />
                <Meta label="Revenue" value={`₹${t.revenue.toLocaleString()}`} />
              </div>

              {canEdit && (t.status === "Draft" || t.status === "Dispatched") && (
                <div className="flex gap-2 border-t border-slate-100 pt-3">
                  {t.status === "Draft" && (
                    <Button size="sm" className="flex-1" onClick={() => dispatchTrip(t.id)}>
                      <Send className="size-4" /> Dispatch
                    </Button>
                  )}
                  {t.status === "Dispatched" && (
                    <Button size="sm" className="flex-1" onClick={() => handleOpenComplete(t.id)}>
                      <CircleCheck className="size-4" /> Complete
                    </Button>
                  )}
                  <Button size="sm" variant="danger" onClick={() => cancelTrip(t.id)}>
                    <Ban className="size-4" /> Cancel
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* New trip modal */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Create trip"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit}>Create trip</Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <Field label="Origin"><TextInput value={form.source} onChange={(e) => set("source", e.target.value)} placeholder="Bengaluru Hub" /></Field>
          <Field label="Destination"><TextInput value={form.destination} onChange={(e) => set("destination", e.target.value)} placeholder="Chennai DC" /></Field>
          <Field label="Vehicle">
            <SelectInput value={form.vehicleId} onChange={(e) => set("vehicleId", e.target.value)}>
              {assignableVehicles.length === 0 ? (
                <option value="">No vehicles available</option>
              ) : (
                assignableVehicles.map((v) => <option key={v.id} value={v.id}>{v.registration} · cap {v.capacity} kg</option>)
              )}
            </SelectInput>
          </Field>
          <Field label="Driver">
            <SelectInput value={form.driverId} onChange={(e) => set("driverId", e.target.value)}>
              {assignableDrivers.length === 0 ? (
                <option value="">No drivers available</option>
              ) : (
                assignableDrivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)
              )}
            </SelectInput>
          </Field>
          <Field label="Cargo / load (kg)"><TextInput type="number" value={form.cargo} onChange={(e) => set("cargo", +e.target.value)} /></Field>
          <Field label="Planned distance (km)"><TextInput type="number" value={form.plannedDistance} onChange={(e) => set("plannedDistance", +e.target.value)} /></Field>
          <Field label="Revenue (₹)"><TextInput type="number" value={form.revenue} onChange={(e) => set("revenue", +e.target.value)} /></Field>
        </div>

        {form.vehicleId && form.plannedDistance > 0 && (
          <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 text-xs text-indigo-700 space-y-1 dark:border-indigo-500/20 dark:bg-indigo-500/10">
            <span className="font-semibold text-indigo-900 dark:text-indigo-200">💡 Dynamic Fuel Cost Estimate:</span>
            <div className="flex justify-between items-center mt-1">
              <span>Planned Distance: <strong>{form.plannedDistance} km</strong></span>
              <span>Vehicle Type: <strong>{vehicles.find(v => v.id === form.vehicleId)?.type} ({vehicles.find(v => v.id === form.vehicleId)?.type === "Truck" ? 6 : vehicles.find(v => v.id === form.vehicleId)?.type === "Van" ? 10 : vehicles.find(v => v.id === form.vehicleId)?.type === "Pickup" ? 12 : 8} km/L)</strong></span>
            </div>
            <div className="flex justify-between items-center text-sm font-semibold text-indigo-900 dark:text-indigo-100 border-t border-indigo-100/50 dark:border-indigo-500/20 pt-1.5 mt-1.5">
              <span>Estimated Liters: <strong>{(form.plannedDistance / (vehicles.find(v => v.id === form.vehicleId)?.type === "Truck" ? 6 : vehicles.find(v => v.id === form.vehicleId)?.type === "Van" ? 10 : vehicles.find(v => v.id === form.vehicleId)?.type === "Pickup" ? 12 : 8)).toFixed(1)} L</strong></span>
              <span>Estimated Cost: <strong>₹{Math.round((form.plannedDistance / (vehicles.find(v => v.id === form.vehicleId)?.type === "Truck" ? 6 : vehicles.find(v => v.id === form.vehicleId)?.type === "Van" ? 10 : vehicles.find(v => v.id === form.vehicleId)?.type === "Pickup" ? 12 : 8)) * 90).toLocaleString()}</strong></span>
            </div>
          </div>
        )}
        <p className="mt-4 flex items-start gap-2 rounded-lg bg-indigo-50 px-3 py-2.5 text-xs text-indigo-700">
          <Package className="mt-0.5 size-4 shrink-0" />
          Trips are validated against vehicle capacity, availability and driver license before creation.
        </p>
      </Modal>

      {/* Complete modal */}
      <Modal
        open={!!complete}
        onClose={() => setComplete(null)}
        title="Complete trip"
        footer={
          <>
            <Button variant="secondary" onClick={() => setComplete(null)}>Cancel</Button>
            <Button
              onClick={() => {
                if (complete) {
                  const currOdo = activeVehicle?.odometer ?? 0;
                  if (finalOdometer < currOdo) {
                    toast.error(`Final odometer must be at least ${currOdo} km`);
                    return;
                  }
                  completeTrip(complete, actual, finalOdometer, fuelLiters, fuelCost);
                }
                setComplete(null);
              }}
            >
              Mark completed
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Vehicle Current Odometer</div>
            <div className="text-lg font-bold text-slate-900">{(activeVehicle?.odometer ?? 0).toLocaleString()} km</div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <Field label="Actual distance (km)">
              <TextInput type="number" value={actual} onChange={(e) => handleActualChange(+e.target.value)} />
            </Field>
            
            <Field label="Final odometer reading (km)">
              <TextInput type="number" value={finalOdometer} onChange={(e) => setFinalOdometer(+e.target.value)} />
            </Field>
          </div>

          <div className="border-t border-slate-100 pt-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Fuel Logs (Optional)</h4>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Fuel Consumed (Liters)">
                <TextInput type="number" value={fuelLiters} onChange={(e) => setFuelLiters(+e.target.value)} placeholder="e.g. 50" />
              </Field>
              <Field label="Fuel Cost (₹)">
                <TextInput type="number" value={fuelCost} onChange={(e) => setFuelCost(+e.target.value)} placeholder="e.g. 450" />
              </Field>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function Meta({ label, value, icon }: { label: string; value: string; icon?: boolean }) {
  return (
    <div>
      <div className="text-xs text-slate-400">{label}</div>
      <div className="flex items-center gap-1 font-medium text-slate-700">
        {icon && <Package className="size-3.5 text-slate-400" />}
        {value}
      </div>
    </div>
  );
}
