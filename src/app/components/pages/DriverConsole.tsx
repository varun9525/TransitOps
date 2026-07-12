import { useState } from "react";
import { Truck, CheckCircle2, User, Calendar, MapPin, Gauge, Shield, Plus, Fuel, Landmark, ArrowRight, CheckSquare } from "lucide-react";
import { useStore } from "../../data/store";
import { Card, Button, Modal, Field, TextInput, SelectInput } from "../app/ui";
import { toast } from "sonner";

export function DriverConsole() {
  const { user, drivers, trips, vehicles, addFuel, addExpense, completeTrip, vehicleName } = useStore();

  const [fuelOpen, setFuelOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);

  const [scanningFuel, setScanningFuel] = useState(false);
  const [scanningExp, setScanningExp] = useState(false);

  const simulateScanFuel = () => {
    setScanningFuel(true);
    setTimeout(() => {
      setScanningFuel(false);
      if (assignedVehicle) {
        setFuelForm((f) => ({
          ...f,
          liters: 70,
          cost: 6650, // ₹95/L
          odometer: assignedVehicle.odometer + 450,
        }));
      }
      toast.success("Fuel receipt scanned successfully! Pre-filled liters, cost, and odometer.");
    }, 1500);
  };

  const simulateScanExp = () => {
    setScanningExp(true);
    setTimeout(() => {
      setScanningExp(false);
      setExpForm((f) => ({
        ...f,
        category: "Tolls",
        amount: 850,
        description: "Expressway toll ticket scan #NH48",
      }));
      toast.success("Toll ticket scanned successfully! Pre-filled toll amount.");
    }, 1500);
  };

  // Fuel form state
  const [fuelForm, setFuelForm] = useState({
    liters: 0,
    cost: 0,
    odometer: 0,
    date: new Date().toISOString().split("T")[0],
  });
  const [fuelErrors, setFuelErrors] = useState<Record<string, string>>({});

  // Expense form state
  const [expForm, setExpForm] = useState({
    category: "Tolls",
    amount: 0,
    description: "",
    date: new Date().toISOString().split("T")[0],
  });
  const [expErrors, setExpErrors] = useState<Record<string, string>>({});

  // Complete trip form state
  const [completeForm, setCompleteForm] = useState({
    actualDistance: 0,
    finalOdometer: 0,
  });
  const [completeErrors, setCompleteErrors] = useState<Record<string, string>>({});

  // Find current driver profile
  const driver = drivers.find((d) => d.name === user?.name);
  
  // Find current active dispatched trip
  const activeTrip = trips.find((t) => t.driverId === driver?.id && t.status === "Dispatched");
  const assignedVehicle = vehicles.find((v) => v.id === activeTrip?.vehicleId);

  // Recent completed trips by this driver
  const myCompletedTrips = trips.filter((t) => t.driverId === driver?.id && t.status === "Completed");

  // Fuel validation
  const validateFuel = () => {
    const errs: Record<string, string> = {};
    if (fuelForm.liters <= 0) errs.liters = "Liters must be greater than 0";
    if (fuelForm.cost <= 0) errs.cost = "Cost must be greater than 0";
    if (fuelForm.liters > 0 && fuelForm.cost > 0) {
      const rate = fuelForm.cost / fuelForm.liters;
      if (rate < 85 || rate > 105) {
        errs.cost = `Suspicious rate (₹${rate.toFixed(1)}/L) is outside standard ₹85–₹105/L.`;
      }
    }
    if (assignedVehicle) {
      if (fuelForm.odometer <= assignedVehicle.odometer) {
        errs.odometer = `Odometer must exceed vehicle's current odometer (${assignedVehicle.odometer.toLocaleString()} km)`;
      } else if (fuelForm.odometer > assignedVehicle.odometer + 1500) {
        errs.odometer = "Warning: Reading is unrealistically high (+1500 km).";
      }
    }
    setFuelErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleAddFuel = async () => {
    if (!validateFuel() || !activeTrip) return;
    await addFuel({
      vehicleId: activeTrip.vehicleId,
      ...fuelForm,
    });
    setFuelOpen(false);
    setFuelForm({
      liters: 0,
      cost: 0,
      odometer: 0,
      date: new Date().toISOString().split("T")[0],
    });
    setFuelErrors({});
  };

  // Expense validation
  const validateExpense = () => {
    const errs: Record<string, string> = {};
    if (expForm.amount <= 0) errs.amount = "Amount must be positive";
    if (expForm.category === "Tolls" && expForm.amount > 5000) {
      errs.amount = "Toll expense exceeds maximum allowed limit of ₹5,000 per entry.";
    }
    if (!expForm.description.trim()) errs.description = "Description is required";
    setExpErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleAddExpense = async () => {
    if (!validateExpense() || !activeTrip) return;
    await addExpense({
      vehicleId: activeTrip.vehicleId,
      ...expForm,
    });
    setExpenseOpen(false);
    setExpForm({
      category: "Tolls",
      amount: 0,
      description: "",
      date: new Date().toISOString().split("T")[0],
    });
    setExpErrors({});
  };

  // Complete validation
  const validateComplete = () => {
    const errs: Record<string, string> = {};
    if (completeForm.actualDistance <= 0) errs.actualDistance = "Distance must be positive";
    if (assignedVehicle) {
      const minOdo = assignedVehicle.odometer + completeForm.actualDistance;
      if (completeForm.finalOdometer < minOdo) {
        errs.finalOdometer = `Odometer must be at least ${minOdo.toLocaleString()} km based on distance`;
      }
    }
    setCompleteErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCompleteTrip = async () => {
    if (!validateComplete() || !activeTrip) return;
    await completeTrip(
      activeTrip.id,
      completeForm.actualDistance,
      completeForm.finalOdometer
    );
    setCompleteOpen(false);
    setCompleteErrors({});
  };

  const handleOpenComplete = () => {
    if (!activeTrip || !assignedVehicle) return;
    setCompleteForm({
      actualDistance: activeTrip.plannedDistance,
      finalOdometer: assignedVehicle.odometer + activeTrip.plannedDistance,
    });
    setCompleteErrors({});
    setCompleteOpen(true);
  };

  const handleOpenFuel = () => {
    if (!assignedVehicle) return;
    setFuelForm({
      liters: 0,
      cost: 0,
      odometer: assignedVehicle.odometer,
      date: new Date().toISOString().split("T")[0],
    });
    setFuelErrors({});
    setFuelOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Driver welcome banner */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 p-6 text-white shadow-xl dark:border dark:border-slate-800">
        <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">Driver Profile</span>
        <h2 className="text-xl font-bold mt-1 text-white">{user?.name}</h2>
        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/10 pt-4 text-center">
          <div>
            <span className="text-[10px] text-indigo-200 block">SAFETY SCORE</span>
            <span className="text-lg font-extrabold text-emerald-400">{driver?.safetyScore ?? 100}%</span>
          </div>
          <div>
            <span className="text-[10px] text-indigo-200 block">COMPLETED</span>
            <span className="text-lg font-extrabold">{myCompletedTrips.length} Trips</span>
          </div>
          <div>
            <span className="text-[10px] text-indigo-200 block">INCIDENTS</span>
            <span className={`text-lg font-extrabold ${driver?.incidents && driver.incidents > 0 ? "text-rose-400" : "text-slate-300"}`}>
              {driver?.incidents ?? 0}
            </span>
          </div>
        </div>
      </div>

      {activeTrip ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Active Dispatched Trip</h3>
            <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400">
              {activeTrip.reference}
            </span>
          </div>

          <Card className="p-5 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] text-slate-400 font-bold block uppercase">ROUTE</span>
                <span className="font-bold text-slate-900 text-sm dark:text-white flex items-center gap-1.5 mt-0.5">
                  {activeTrip.source} <ArrowRight className="size-3 text-slate-400" /> {activeTrip.destination}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">VEHICLE ASSIGNED</span>
                <span className="font-semibold text-slate-800 dark:text-slate-300 text-xs mt-0.5">
                  {vehicleName(activeTrip.vehicleId)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-3 dark:border-slate-800 text-xs">
              <div>
                <span className="text-slate-450 block font-semibold">Planned distance</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{activeTrip.plannedDistance} km</span>
              </div>
              <div>
                <span className="text-slate-450 block font-semibold">Cargo Weight</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{activeTrip.cargo.toLocaleString()} kg</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2">
              <Button
                variant="secondary"
                onClick={handleOpenFuel}
                className="flex flex-col items-center justify-center p-2.5 h-auto text-[11px] gap-1 cursor-pointer"
              >
                <Fuel className="size-4 text-indigo-650" /> Log Fuel
              </Button>
              <Button
                variant="secondary"
                onClick={() => { setExpErrors({}); setExpenseOpen(true); }}
                className="flex flex-col items-center justify-center p-2.5 h-auto text-[11px] gap-1 cursor-pointer"
              >
                <Landmark className="size-4 text-indigo-650" /> Log Toll
              </Button>
              <Button
                onClick={handleOpenComplete}
                className="flex flex-col items-center justify-center p-2.5 h-auto text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white gap-1 cursor-pointer border-none"
              >
                <CheckSquare className="size-4" /> Complete
              </Button>
            </div>
          </Card>
        </div>
      ) : (
        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Trip Status</h3>
          <Card className="p-8 text-center space-y-3">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-850">
              <Truck className="size-6" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 dark:text-slate-200">Awaiting Dispatch</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                No active dispatched trip is currently assigned to you. The Fleet Manager will dispatch your route shortly.
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* Profile Details & License */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">License & Region Details</h3>
        <Card className="p-4 space-y-3 text-xs">
          <div className="flex justify-between items-center py-1">
            <span className="text-slate-450 font-semibold">License Plate No.</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">{driver?.license}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-t border-slate-50 dark:border-slate-850">
            <span className="text-slate-450 font-semibold">Class Group</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">{driver?.licenseClass}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-t border-slate-50 dark:border-slate-850">
            <span className="text-slate-450 font-semibold">License Expiry</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">{driver?.licenseExpiry}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-t border-slate-50 dark:border-slate-850">
            <span className="text-slate-450 font-semibold">Assigned Region</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">{driver?.region}</span>
          </div>
        </Card>
      </div>

      {/* Log Fuel Modal */}
      <Modal
        open={fuelOpen}
        onClose={() => setFuelOpen(false)}
        title="Log Trip Fuel Fill"
        footer={
          <>
            <Button variant="secondary" onClick={() => setFuelOpen(false)}>Cancel</Button>
            <Button onClick={handleAddFuel}>Submit Log</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-indigo-50/50 border border-indigo-100/50 rounded-xl p-3.5 text-xs text-indigo-905 dark:bg-indigo-500/10 dark:border-indigo-500/20 dark:text-indigo-200">
            <div>
              <span className="font-bold block">🤖 Auto OCR Scanner</span>
              <span className="text-[10px] text-slate-400">Scan fuel pump receipt image</span>
            </div>
            <Button
              variant="secondary"
              disabled={scanningFuel}
              onClick={simulateScanFuel}
              className="h-8 py-0 px-3 cursor-pointer shrink-0 font-bold bg-white text-indigo-650 border-indigo-200"
            >
              {scanningFuel ? "Scanning..." : "Scan fuel receipt"}
            </Button>
          </div>
          <Field label="Assigned Vehicle">
            <TextInput value={assignedVehicle ? `${assignedVehicle.registration} (${assignedVehicle.name})` : ""} disabled />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Liters Filled">
              <TextInput
                type="number"
                value={fuelForm.liters}
                onChange={(e) => {
                  setFuelForm((f) => ({ ...f, liters: +e.target.value }));
                  if (fuelErrors.liters || fuelErrors.cost) validateFuel();
                }}
                className={fuelErrors.liters ? "border-rose-500" : ""}
              />
              {fuelErrors.liters && <span className="text-xs text-rose-500 font-medium">{fuelErrors.liters}</span>}
            </Field>
            <Field label="Total Cost (₹)">
              <TextInput
                type="number"
                value={fuelForm.cost}
                onChange={(e) => {
                  setFuelForm((f) => ({ ...f, cost: +e.target.value }));
                  if (fuelErrors.cost) validateFuel();
                }}
                className={fuelErrors.cost ? "border-rose-500" : ""}
              />
              {fuelErrors.cost && <span className="text-xs text-rose-500 font-medium">{fuelErrors.cost}</span>}
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Odometer Reading (km)">
              <TextInput
                type="number"
                value={fuelForm.odometer}
                onChange={(e) => {
                  setFuelForm((f) => ({ ...f, odometer: +e.target.value }));
                  if (fuelErrors.odometer) validateFuel();
                }}
                className={fuelErrors.odometer ? "border-rose-500" : ""}
              />
              {fuelErrors.odometer && <span className="text-xs text-rose-500 font-medium">{fuelErrors.odometer}</span>}
            </Field>
            <Field label="Date">
              <TextInput
                type="date"
                value={fuelForm.date}
                onChange={(e) => setFuelForm((f) => ({ ...f, date: e.target.value }))}
              />
            </Field>
          </div>
        </div>
      </Modal>

      <Modal
        open={expenseOpen}
        onClose={() => setExpenseOpen(false)}
        title="Log Trip Toll / Expense"
        footer={
          <>
            <Button variant="secondary" onClick={() => setExpenseOpen(false)}>Cancel</Button>
            <Button onClick={handleAddExpense}>Submit Expense</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-indigo-50/50 border border-indigo-100/50 rounded-xl p-3.5 text-xs text-indigo-905 dark:bg-indigo-500/10 dark:border-indigo-500/20 dark:text-indigo-200">
            <div>
              <span className="font-bold block">🤖 Auto OCR Scanner</span>
              <span className="text-[10px] text-slate-400">Scan highway toll slip receipt</span>
            </div>
            <Button
              variant="secondary"
              disabled={scanningExp}
              onClick={simulateScanExp}
              className="h-8 py-0 px-3 cursor-pointer shrink-0 font-bold bg-white text-indigo-650 border-indigo-200"
            >
              {scanningExp ? "Scanning..." : "Scan toll receipt"}
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Category">
              <SelectInput
                value={expForm.category}
                onChange={(e) => setExpForm((f) => ({ ...f, category: e.target.value }))}
              >
                <option value="Tolls">Tolls</option>
                <option value="Parking">Parking</option>
                <option value="Misc">Misc / Repair</option>
              </SelectInput>
            </Field>
            <Field label="Amount (₹)">
              <TextInput
                type="number"
                value={expForm.amount}
                onChange={(e) => {
                  setExpForm((f) => ({ ...f, amount: +e.target.value }));
                  if (expErrors.amount) validateExpense();
                }}
                className={expErrors.amount ? "border-rose-500" : ""}
              />
              {expErrors.amount && <span className="text-xs text-rose-500 font-medium">{expErrors.amount}</span>}
            </Field>
          </div>
          <Field label="Description">
            <TextInput
              value={expForm.description}
              onChange={(e) => {
                setExpForm((f) => ({ ...f, description: e.target.value }));
                if (expErrors.description) validateExpense();
              }}
              placeholder="e.g. NH-48 toll plaza receipt cost"
              className={expErrors.description ? "border-rose-500" : ""}
            />
            {expErrors.description && <span className="text-xs text-rose-500 font-medium">{expErrors.description}</span>}
          </Field>
        </div>
      </Modal>

      {/* Complete Trip Modal */}
      <Modal
        open={completeOpen}
        onClose={() => setCompleteOpen(false)}
        title="Complete Assigned Route"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCompleteOpen(false)}>Cancel</Button>
            <Button onClick={handleCompleteTrip}>Submit Completion</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Actual Distance (km)">
              <TextInput
                type="number"
                value={completeForm.actualDistance}
                onChange={(e) => {
                  setCompleteForm((f) => ({ ...f, actualDistance: +e.target.value }));
                  if (completeErrors.actualDistance) validateComplete();
                }}
                className={completeErrors.actualDistance ? "border-rose-500" : ""}
              />
              {completeErrors.actualDistance && <span className="text-xs text-rose-500 font-medium">{completeErrors.actualDistance}</span>}
            </Field>
            <Field label="Final Odometer Reading (km)">
              <TextInput
                type="number"
                value={completeForm.finalOdometer}
                onChange={(e) => {
                  setCompleteForm((f) => ({ ...f, finalOdometer: +e.target.value }));
                  if (completeErrors.finalOdometer) validateComplete();
                }}
                className={completeErrors.finalOdometer ? "border-rose-500" : ""}
              />
              {completeErrors.finalOdometer && <span className="text-xs text-rose-500 font-medium">{completeErrors.finalOdometer}</span>}
            </Field>
          </div>
          <p className="text-[11px] text-slate-450 bg-slate-50 p-2.5 rounded-lg">
            Submitting this completes the active dispatcher route and automatically returns the assigned vehicle status to <b>Available</b>.
          </p>
        </div>
      </Modal>
    </div>
  );
}
