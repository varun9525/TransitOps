import { useState, useEffect } from "react";
import { Plus, MapPin, Send, CircleCheck, Ban, Package, Activity, Gauge, Navigation } from "lucide-react";
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
  const { trips, vehicles, drivers, createTrip, dispatchTrip, completeTrip, cancelTrip, vehicleName, driverName, can, user, pageFilters } = useStore();
  const [tab, setTab] = useState<TripStatus | "All">("All");

  useEffect(() => {
    if (pageFilters && pageFilters.tab) {
      setTab(pageFilters.tab);
    }
  }, [pageFilters]);
  const [open, setOpen] = useState(false);
  const [complete, setComplete] = useState<string | null>(null);
  const [trackerTripId, setTrackerTripId] = useState<string | null>(null);
  const [simProgress, setSimProgress] = useState(0);

  useEffect(() => {
    let interval: any;
    if (trackerTripId) {
      setSimProgress(15);
      interval = setInterval(() => {
        setSimProgress((p) => {
          if (p >= 100) return 0;
          return p + 5;
        });
      }, 1000);
    } else {
      setSimProgress(0);
    }
    return () => clearInterval(interval);
  }, [trackerTripId]);
  
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

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [completeErrors, setCompleteErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.source.trim()) errs.source = "Origin is required";
    if (!form.destination.trim()) errs.destination = "Destination is required";
    if (!form.vehicleId) errs.vehicleId = "An available vehicle must be selected";
    if (!form.driverId) errs.driverId = "An available driver must be selected";
    if (form.cargo <= 0) {
      errs.cargo = "Cargo load must be greater than 0";
    } else {
      const v = vehicles.find((x) => x.id === form.vehicleId);
      if (v && form.cargo > v.capacity) {
        errs.cargo = `Cargo load (${form.cargo.toLocaleString()} kg) exceeds vehicle capacity (${v.capacity.toLocaleString()} kg)`;
      }
    }
    if (form.plannedDistance <= 0) errs.plannedDistance = "Planned distance must be positive";
    if (form.revenue <= 0) errs.revenue = "Revenue must be positive";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateCompletion = () => {
    const errs: Record<string, string> = {};
    if (actual <= 0) errs.actual = "Actual distance must be positive";
    const currOdo = activeVehicle?.odometer ?? 0;
    if (finalOdometer < currOdo) {
      errs.finalOdometer = `Final odometer must be at least ${currOdo} km`;
    }
    
    if (fuelLiters > 0 || fuelCost > 0) {
      if (fuelLiters <= 0) errs.fuelLiters = "Liters must be positive";
      if (fuelCost <= 0) errs.fuelCost = "Cost must be positive";
      if (fuelLiters > 0 && fuelCost > 0) {
        const rate = fuelCost / fuelLiters;
        if (rate < 85 || rate > 105) {
          errs.fuelCost = `Suspicious rate (₹${rate.toFixed(1)}/L) is outside standard ₹85–₹105/L.`;
        }
      }
    }
    setCompleteErrors(errs);
    return Object.keys(errs).length === 0;
  };

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
    setErrors({});
    setOpen(true);
  };

  const submit = async () => {
    if (!validate()) return;
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
                    <Button size="sm" className="flex-1 text-[11px]" onClick={() => dispatchTrip(t.id)}>
                      <Send className="size-3.5" /> Dispatch
                    </Button>
                  )}
                  {t.status === "Dispatched" && (
                    <>
                      <Button size="sm" variant="secondary" className="flex-1 text-[11px] border border-indigo-200 text-indigo-650 bg-white" onClick={() => setTrackerTripId(t.id)}>
                        <Activity className="size-3.5" /> Track Live
                      </Button>
                      <Button size="sm" className="flex-1 text-[11px]" onClick={() => handleOpenComplete(t.id)}>
                        <CircleCheck className="size-3.5" /> Complete
                      </Button>
                    </>
                  )}
                  <Button size="sm" variant="danger" className="text-[11px]" onClick={() => cancelTrip(t.id)}>
                    <Ban className="size-3.5" /> Cancel
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
          <Field label="Origin">
            <TextInput value={form.source} onChange={(e) => { set("source", e.target.value); if (errors.source) validate(); }} placeholder="Bengaluru Hub" className={errors.source ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20" : ""} />
            {errors.source && <span className="text-xs text-rose-500 font-medium">{errors.source}</span>}
          </Field>
          <Field label="Destination">
            <TextInput value={form.destination} onChange={(e) => { set("destination", e.target.value); if (errors.destination) validate(); }} placeholder="Chennai DC" className={errors.destination ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20" : ""} />
            {errors.destination && <span className="text-xs text-rose-500 font-medium">{errors.destination}</span>}
          </Field>
          <Field label="Vehicle">
            <SelectInput value={form.vehicleId} onChange={(e) => { set("vehicleId", e.target.value); if (errors.vehicleId) validate(); }}>
              {assignableVehicles.length === 0 ? (
                <option value="">No vehicles available</option>
              ) : (
                assignableVehicles.map((v) => <option key={v.id} value={v.id}>{v.registration} · cap {v.capacity} kg</option>)
              )}
            </SelectInput>
            {errors.vehicleId && <span className="text-xs text-rose-500 font-medium">{errors.vehicleId}</span>}
          </Field>
          <Field label="Driver">
            <SelectInput value={form.driverId} onChange={(e) => { set("driverId", e.target.value); if (errors.driverId) validate(); }}>
              {assignableDrivers.length === 0 ? (
                <option value="">No drivers available</option>
              ) : (
                assignableDrivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)
              )}
            </SelectInput>
            {errors.driverId && <span className="text-xs text-rose-500 font-medium">{errors.driverId}</span>}
          </Field>
          <Field label="Cargo / load (kg)">
            <TextInput type="number" value={form.cargo} onChange={(e) => { set("cargo", +e.target.value); if (errors.cargo) validate(); }} className={errors.cargo ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20" : ""} />
            {errors.cargo && <span className="text-xs text-rose-500 font-medium">{errors.cargo}</span>}
          </Field>
          <Field label="Planned distance (km)">
            <TextInput type="number" value={form.plannedDistance} onChange={(e) => { set("plannedDistance", +e.target.value); if (errors.plannedDistance) validate(); }} className={errors.plannedDistance ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20" : ""} />
            {errors.plannedDistance && <span className="text-xs text-rose-500 font-medium">{errors.plannedDistance}</span>}
          </Field>
          <Field label="Revenue (₹)">
            <TextInput type="number" value={form.revenue} onChange={(e) => { set("revenue", +e.target.value); if (errors.revenue) validate(); }} className={errors.revenue ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20" : ""} />
            {errors.revenue && <span className="text-xs text-rose-500 font-medium">{errors.revenue}</span>}
          </Field>
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
                  if (!validateCompletion()) return;
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
              <TextInput 
                type="number" 
                value={actual} 
                onChange={(e) => { handleActualChange(+e.target.value); if (completeErrors.actual) validateCompletion(); }} 
                className={completeErrors.actual ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20" : ""}
              />
              {completeErrors.actual && <span className="text-xs text-rose-500 font-medium">{completeErrors.actual}</span>}
            </Field>
            
            <Field label="Final odometer reading (km)">
              <TextInput 
                type="number" 
                value={finalOdometer} 
                onChange={(e) => { setFinalOdometer(+e.target.value); if (completeErrors.finalOdometer) validateCompletion(); }} 
                className={completeErrors.finalOdometer ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20" : ""}
              />
              {completeErrors.finalOdometer && <span className="text-xs text-rose-500 font-medium">{completeErrors.finalOdometer}</span>}
            </Field>
          </div>

          <div className="border-t border-slate-100 pt-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Fuel Logs (Optional)</h4>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Fuel Consumed (Liters)">
                <TextInput 
                  type="number" 
                  value={fuelLiters} 
                  onChange={(e) => { setFuelLiters(+e.target.value); if (completeErrors.fuelLiters || completeErrors.fuelCost) validateCompletion(); }} 
                  placeholder="e.g. 50" 
                  className={completeErrors.fuelLiters ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20" : ""}
                />
                {completeErrors.fuelLiters && <span className="text-xs text-rose-500 font-medium">{completeErrors.fuelLiters}</span>}
              </Field>
              <Field label="Fuel Cost (₹)">
                <TextInput 
                  type="number" 
                  value={fuelCost} 
                  onChange={(e) => { setFuelCost(+e.target.value); if (completeErrors.fuelCost) validateCompletion(); }} 
                  placeholder="e.g. 450" 
                  className={completeErrors.fuelCost ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20" : ""}
                />
                {completeErrors.fuelCost && <span className="text-xs text-rose-500 font-medium">{completeErrors.fuelCost}</span>}
              </Field>
            </div>
          </div>
        </div>
      </Modal>

      {/* Live tracking simulator modal */}
      {trackerTripId && (
        <Modal
          open={!!trackerTripId}
          onClose={() => setTrackerTripId(null)}
          title={`Live Dispatch Tracker — ${trips.find(x => x.id === trackerTripId)?.reference}`}
          footer={<Button onClick={() => setTrackerTripId(null)}>Close Tracker</Button>}
        >
          {(() => {
            const tripObj = trips.find(x => x.id === trackerTripId);
            if (!tripObj) return null;
            const speed = Math.round(62 + Math.sin(simProgress / 10) * 8);
            const fuelConsumed = Math.round((tripObj.plannedDistance * (simProgress / 100)) / 8);
            return (
              <div className="space-y-4 text-xs">
                <div className="bg-slate-950 rounded-xl p-4 border border-slate-900 relative" style={{ height: "160px" }}>
                  <svg className="w-full h-full" viewBox="0 0 500 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <pattern id="modalgrid" width="15" height="15" patternUnits="userSpaceOnUse">
                        <circle cx="1.5" cy="1.5" r="0.75" fill="#334155" opacity="0.3" />
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#modalgrid)" />
                    
                    {/* Simulated corridor path */}
                    <path d="M 50 60 Q 250 20 450 60" stroke="#4f46e5" strokeWidth="3" strokeDasharray="6 4" opacity="0.4" />
                    
                    {/* Origin node */}
                    <circle cx="50" cy="60" r="6" fill="#4f46e5" />
                    <text x="35" y="80" fill="#94a3b8" fontSize="9" fontWeight="bold">{tripObj.source}</text>
                    
                    {/* Destination node */}
                    <circle cx="450" cy="60" r="6" fill="#10b981" />
                    <text x="415" y="80" fill="#94a3b8" fontSize="9" fontWeight="bold">{tripObj.destination}</text>
                    
                    {/* Animated vehicle dot */}
                    {simProgress > 0 && (
                      <circle cx={50 + (400 * simProgress) / 100} cy={60 - Math.sin((Math.PI * simProgress) / 100) * 25} r="7" fill="#818cf8">
                        <animate attributeName="r" values="6;9;6" dur="1.5s" repeatCount="indefinite" />
                      </circle>
                    )}
                  </svg>
                  <span className="absolute bottom-2 right-2 flex items-center gap-1 bg-emerald-500/10 text-emerald-400 px-2 py-0.5 text-[9px] font-bold uppercase rounded border border-emerald-500/20">
                    ● Simulated GPS Active
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="border border-slate-100 rounded-xl p-3 bg-slate-50/50">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">CURRENT ROUTE PROGRESS</span>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden flex-1">
                        <div className="h-full bg-indigo-600 rounded-full transition-all duration-500" style={{ width: `${simProgress}%` }} />
                      </div>
                      <span className="font-bold text-slate-800 shrink-0 text-xs">{simProgress}%</span>
                    </div>
                  </div>

                  <div className="border border-slate-100 rounded-xl p-3 bg-slate-50/50 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">TRIP STATUS</span>
                      <span className="font-bold text-indigo-600 text-xs mt-1 block">DISPATCHED (IN TRANSIT)</span>
                    </div>
                    <Navigation className="size-6 text-indigo-500 shrink-0" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center border-t border-slate-100 pt-3">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Vehicle Speed</span>
                    <span className="text-sm font-bold text-slate-800 flex items-center justify-center gap-1 mt-0.5">
                      <Gauge className="size-4 text-slate-400" /> {speed} km/h
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Mock Fuel Burnt</span>
                    <span className="text-sm font-bold text-slate-800 mt-0.5 block">{fuelConsumed} L</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Cargo Temp</span>
                    <span className="text-sm font-bold text-emerald-650 mt-0.5 block">4.5°C (Stable)</span>
                  </div>
                </div>
              </div>
            );
          })()}
        </Modal>
      )}
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
