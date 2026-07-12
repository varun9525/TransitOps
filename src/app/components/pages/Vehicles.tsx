import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Search, FileText, FileUp, Calendar } from "lucide-react";
import { useStore } from "../../data/store";
import type { Vehicle, VehicleType, VehicleStatus } from "../../data/types";
import { vehicleTone } from "../app/status";
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
  inputCls,
} from "../app/ui";

const empty: Vehicle = {
  id: "",
  registration: "",
  name: "",
  type: "Van",
  region: "North",
  capacity: 1000,
  status: "Available",
  odometer: 0,
  acquisitionCost: 0,
  year: 2024,
};

interface Doc {
  name: string;
  type: string;
  status: "Valid" | "Expired" | "Expiring Soon";
  expiryDate: string;
}

export function Vehicles() {
  const { vehicles, saveVehicle, deleteVehicle, fetchDocuments, addVehicleDocument, can, pageFilters } = useStore();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Vehicle>(empty);
  const [confirm, setConfirm] = useState<Vehicle | null>(null);

  // Filters & Sorting states
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [regionFilter, setRegionFilter] = useState("all");
  const [sort, setSort] = useState("default");

  useEffect(() => {
    if (pageFilters && pageFilters.status) {
      setStatusFilter(pageFilters.status);
    }
  }, [pageFilters]);

  // Document Management States
  const [activeDocVehicle, setActiveDocVehicle] = useState<Vehicle | null>(null);
  const [docList, setDocList] = useState<Doc[]>([]);
  const [docName, setDocName] = useState("");
  const [docExpiry, setDocExpiry] = useState("2027-01-01");

  const canEdit = can("vehicles", "edit");
  const canCreate = can("vehicles", "create");
  const canDelete = can("vehicles", "delete");

  // Filtering & Sorting Logic
  const filtered = vehicles.filter(
    (v) =>
      (v.registration.toLowerCase().includes(query.toLowerCase()) ||
        v.name.toLowerCase().includes(query.toLowerCase())) &&
      (typeFilter === "all" || v.type === typeFilter) &&
      (statusFilter === "all" || v.status === statusFilter) &&
      (regionFilter === "all" || v.region === regionFilter)
  );

  const sorted = [...filtered].sort((a, b) => {
    if (sort === "odo_asc") return a.odometer - b.odometer;
    if (sort === "odo_desc") return b.odometer - a.odometer;
    if (sort === "cost_desc") return b.acquisitionCost - a.acquisitionCost;
    if (sort === "capacity_desc") return b.capacity - a.capacity;
    if (sort === "year_desc") return b.year - a.year;
    return 0;
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.registration.trim()) {
      errs.registration = "Registration is required";
    } else if (!/^[A-Z]{2,3}-\d{2}-[A-Z]{1,3}-\d{4}$/i.test(form.registration)) {
      errs.registration = "Format must match (e.g. KA-01-AB-1234)";
    }
    if (!form.name.trim()) errs.name = "Model name is required";
    if (form.capacity <= 0) errs.capacity = "Capacity must be positive";
    if (form.odometer < 0) errs.odometer = "Odometer cannot be negative";
    if (form.acquisitionCost < 0) errs.acquisitionCost = "Acquisition cost cannot be negative";
    if (form.year < 1900 || form.year > 2100) errs.year = "Invalid year (1900-2100)";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const set = <K extends keyof Vehicle>(k: K, val: Vehicle[K]) => {
    setForm((f) => ({ ...f, [k]: val }));
  };

  const openNew = () => {
    setForm(empty);
    setErrors({});
    setOpen(true);
  };

  const openEdit = (v: Vehicle) => {
    setForm(v);
    setErrors({});
    setOpen(true);
  };

  const save = () => {
    if (!validate()) return;
    saveVehicle(form);
    setOpen(false);
  };

  const handleOpenDocs = async (v: Vehicle) => {
    setActiveDocVehicle(v);
    setDocName("");
    setDocExpiry("2027-01-01");
    const list = await fetchDocuments(v.id);
    setDocList(list);
  };

  const handleUploadDoc = async () => {
    if (!docName || !activeDocVehicle) return;
    const expiry = new Date(docExpiry);
    const now = new Date("2026-07-12");
    const diff = (expiry.getTime() - now.getTime()) / 86400000;
    
    let status: Doc["status"] = "Valid";
    if (diff < 0) status = "Expired";
    else if (diff <= 45) status = "Expiring Soon";

    const newDoc = {
      name: docName,
      type: "PDF",
      status,
      expiryDate: docExpiry,
    };

    await addVehicleDocument(activeDocVehicle.id, newDoc);
    const list = await fetchDocuments(activeDocVehicle.id);
    setDocList(list);
    toast.success(`Document "${docName}" added successfully for ${activeDocVehicle.registration}!`);
    setDocName("");
  };

  return (
    <div>
      <PageHeader
        title="Vehicle Registry"
        subtitle="Every asset in your fleet, with live status and lifecycle data."
        action={canCreate && <Button onClick={openNew}><Plus className="size-4" /> Add vehicle</Button>}
      />

      <Card className="overflow-hidden">
        {/* Filters and Sorting Toolbar */}
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
          <div className="relative max-w-sm flex-1 min-w-[200px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search registration or model…"
              className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>

          <div className="flex flex-wrap gap-2 md:ml-auto">
            <SelectInput value={sort} onChange={(e) => setSort(e.target.value)} className="h-10 w-[140px] py-1 text-sm">
              <option value="default">Default Sort</option>
              <option value="odo_asc">Odometer (Low-High)</option>
              <option value="odo_desc">Odometer (High-Low)</option>
              <option value="cost_desc">Cost (High-Low)</option>
              <option value="capacity_desc">Capacity (High-Low)</option>
              <option value="year_desc">Year (Newest)</option>
            </SelectInput>

            <SelectInput value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="h-10 w-[120px] py-1 text-sm">
              <option value="all">All Types</option>
              {["Van", "Truck", "Bus", "Pickup", "Trailer"].map((o) => <option key={o} value={o}>{o}</option>)}
            </SelectInput>

            <SelectInput value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 w-[120px] py-1 text-sm">
              <option value="all">All Statuses</option>
              {["Available", "On Trip", "In Shop", "Retired"].map((o) => <option key={o} value={o}>{o}</option>)}
            </SelectInput>

            <SelectInput value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)} className="h-10 w-[120px] py-1 text-sm">
              <option value="all">All Regions</option>
              {["North", "South", "East", "West"].map((o) => <option key={o} value={o}>{o}</option>)}
            </SelectInput>

            <span className="self-center text-sm text-slate-400 hidden lg:inline ml-2">{sorted.length} vehicles</span>
          </div>
        </div>

        {sorted.length === 0 ? (
          <div className="p-6"><EmptyState>No vehicles match your search.</EmptyState></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <th className="px-5 py-3">Registration</th>
                  <th className="px-5 py-3">Model</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Region</th>
                  <th className="px-5 py-3">Capacity</th>
                  <th className="px-5 py-3">Odometer</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sorted.map((v) => (
                  <tr key={v.id} className="transition-colors hover:bg-slate-50">
                    <td className="px-5 py-3 font-semibold text-slate-900">{v.registration}</td>
                    <td className="px-5 py-3 text-slate-600">{v.name}</td>
                    <td className="px-5 py-3 text-slate-600">{v.type}</td>
                    <td className="px-5 py-3 text-slate-600">{v.region}</td>
                    <td className="px-5 py-3 text-slate-600">{v.capacity.toLocaleString()}</td>
                    <td className="px-5 py-3 text-slate-600">{v.odometer.toLocaleString()} km</td>
                    <td className="px-5 py-3"><StatusBadge label={v.status} tone={vehicleTone(v.status)} /></td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenDocs(v)}
                          title="Manage Documents"
                          className="flex size-8 items-center justify-center rounded-lg text-slate-500 hover:bg-violet-50 hover:text-violet-600"
                        >
                          <FileText className="size-4" />
                        </button>
                        {canEdit && (
                          <button onClick={() => openEdit(v)} className="flex size-8 items-center justify-center rounded-lg text-slate-500 hover:bg-indigo-50 hover:text-indigo-600">
                            <Pencil className="size-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button onClick={() => setConfirm(v)} className="flex size-8 items-center justify-center rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600">
                            <Trash2 className="size-4" />
                          </button>
                        )}
                      </div>
                    </td>
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
        title={form.id ? "Edit vehicle" : "Add vehicle"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={!form.registration || !form.name}>{form.id ? "Save changes" : "Add vehicle"}</Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <Field label="Registration">
            <TextInput 
              value={form.registration} 
              onChange={(e) => { set("registration", e.target.value); if (errors.registration) validate(); }} 
              placeholder="KA-01-AB-1234" 
              className={errors.registration ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20" : ""}
            />
            {errors.registration && <span className="text-xs text-rose-500 font-medium">{errors.registration}</span>}
          </Field>
          <Field label="Model">
            <TextInput 
              value={form.name} 
              onChange={(e) => { set("name", e.target.value); if (errors.name) validate(); }} 
              placeholder="Volvo FH16" 
              className={errors.name ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20" : ""}
            />
            {errors.name && <span className="text-xs text-rose-500 font-medium">{errors.name}</span>}
          </Field>
          <Field label="Type">
            <SelectInput value={form.type} onChange={(e) => set("type", e.target.value as VehicleType)}>
              {["Van", "Truck", "Bus", "Pickup", "Trailer"].map((o) => <option key={o}>{o}</option>)}
            </SelectInput>
          </Field>
          <Field label="Region">
            <SelectInput value={form.region} onChange={(e) => set("region", e.target.value)}>
              {["North", "South", "East", "West"].map((o) => <option key={o}>{o}</option>)}
            </SelectInput>
          </Field>
          <Field label="Capacity">
            <TextInput 
              type="number" 
              value={form.capacity} 
              onChange={(e) => { set("capacity", +e.target.value); if (errors.capacity) validate(); }} 
              className={errors.capacity ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20" : ""}
            />
            {errors.capacity && <span className="text-xs text-rose-500 font-medium">{errors.capacity}</span>}
          </Field>
          <Field label="Odometer (km)">
            <TextInput 
              type="number" 
              value={form.odometer} 
              onChange={(e) => { set("odometer", +e.target.value); if (errors.odometer) validate(); }} 
              className={errors.odometer ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20" : ""}
            />
            {errors.odometer && <span className="text-xs text-rose-500 font-medium">{errors.odometer}</span>}
          </Field>
          <Field label="Acquisition cost (₹)">
            <TextInput 
              type="number" 
              value={form.acquisitionCost} 
              onChange={(e) => { set("acquisitionCost", +e.target.value); if (errors.acquisitionCost) validate(); }} 
              className={errors.acquisitionCost ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20" : ""}
            />
            {errors.acquisitionCost && <span className="text-xs text-rose-500 font-medium">{errors.acquisitionCost}</span>}
          </Field>
          <Field label="Year">
            <TextInput 
              type="number" 
              value={form.year} 
              onChange={(e) => { set("year", +e.target.value); if (errors.year) validate(); }} 
              className={errors.year ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20" : ""}
            />
            {errors.year && <span className="text-xs text-rose-500 font-medium">{errors.year}</span>}
          </Field>
          <Field label="Status">
            <SelectInput value={form.status} onChange={(e) => set("status", e.target.value as VehicleStatus)} className={inputCls}>
              {["Available", "On Trip", "In Shop", "Retired"].map((o) => <option key={o}>{o}</option>)}
            </SelectInput>
          </Field>
        </div>
      </Modal>

      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title="Remove vehicle"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirm(null)}>Cancel</Button>
            <Button variant="danger" onClick={() => { if (confirm) deleteVehicle(confirm.id); setConfirm(null); }}>Remove</Button>
          </>
        }
      >
        <p className="text-slate-600">
          Are you sure you want to remove <span className="font-semibold text-slate-900">{confirm?.registration}</span> from the registry? This cannot be undone.
        </p>
      </Modal>

      {/* Document Manager Modal */}
      <Modal
        open={!!activeDocVehicle}
        onClose={() => setActiveDocVehicle(null)}
        title={`Documents — ${activeDocVehicle?.registration}`}
        footer={<Button variant="secondary" onClick={() => setActiveDocVehicle(null)}>Done</Button>}
      >
        <div className="space-y-5">
          <div>
            <h4 className="text-sm font-semibold text-slate-900 mb-2">Uploaded Certificates &amp; Permits</h4>
            {docList.length === 0 ? (
              <p className="text-slate-400 text-xs py-2">No documents uploaded yet.</p>
            ) : (
              <div className="space-y-2.5">
                {docList.map((d, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 p-3 text-sm">
                    <div>
                      <div className="font-semibold text-zinc-800 dark:text-zinc-100 flex items-center gap-1.5">
                        <FileText className="size-4 text-violet-500 shrink-0" />
                        {d.name}
                      </div>
                      <div className="text-[11px] text-zinc-500 dark:text-zinc-300 mt-0.5 flex items-center gap-1">
                        <Calendar className="size-3 shrink-0" />
                        Expires on {d.expiryDate}
                      </div>
                    </div>
                    <StatusBadge
                      label={d.status}
                      tone={d.status === "Valid" ? "green" : d.status === "Expired" ? "red" : "amber"}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 pt-4">
            <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-1.5">
              <FileUp className="size-4 text-indigo-500" />
              Upload New Document
            </h4>
            
            <div className="space-y-3.5 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 p-4">
              <Field label="Document Name">
                <TextInput
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  placeholder="e.g. Pollution Certificate, State Permit"
                />
              </Field>
              <Field label="Expiration Date">
                <TextInput
                  type="date"
                  value={docExpiry}
                  onChange={(e) => setDocExpiry(e.target.value)}
                />
              </Field>
              <Button onClick={handleUploadDoc} className="w-full mt-2" disabled={!docName}>
                Simulate Upload &amp; Register
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
