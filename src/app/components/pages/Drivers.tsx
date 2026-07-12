import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, ShieldAlert, ShieldCheck, Mail, Search, Users, TriangleAlert, Award, Lock } from "lucide-react";
import { useStore, licenseExpired, licenseExpiringSoon } from "../../data/store";
import type { Driver, DriverStatus } from "../../data/types";
import { driverTone, StatCard } from "../app/status";
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
} from "../app/ui";

const empty: Driver = {
  id: "",
  name: "",
  license: "",
  licenseClass: "LMV",
  licenseExpiry: "2027-01-01",
  region: "North",
  status: "Available",
  safetyScore: 85,
  incidents: 0,
};

export function Drivers() {
  const { drivers, saveDriver, deleteDriver, register, can, pageFilters } = useStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Driver>(empty);
  const [saving, setSaving] = useState(false);

  // Filter/Search/Sort States
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("default");
  const [regionFilter, setRegionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    if (pageFilters && pageFilters.status) {
      setStatusFilter(pageFilters.status);
    }
    if (pageFilters && pageFilters.sort) {
      setSort(pageFilters.sort);
    }
  }, [pageFilters]);

  // Account provisioning states for new drivers
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const canEdit = can("drivers", "edit");
  const canCreate = can("drivers", "create");
  const canDelete = can("drivers", "delete");

  const set = <K extends keyof Driver>(k: K, val: Driver[K]) => setForm((f) => ({ ...f, [k]: val }));
  
  const openNew = () => { 
    setForm(empty); 
    setEmail("");
    setPassword("");
    setErrors({});
    setOpen(true); 
  };
  
  const openEdit = (d: Driver) => { 
    setForm(d); 
    setEmail("");
    setPassword("");
    setErrors({});
    setOpen(true); 
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Full name is required";
    if (!form.license.trim()) {
      errs.license = "License number is required";
    } else if (!/^[A-Z0-9-]{8,22}$/i.test(form.license)) {
      errs.license = "License must be 8-22 alphanumeric characters/hyphens";
    }
    if (!form.licenseExpiry) {
      errs.licenseExpiry = "License expiry date is required";
    }
    if (form.incidents < 0) {
      errs.incidents = "Incidents count cannot be negative";
    }

    if (!form.id) {
      if (!email.trim()) {
        errs.email = "Login email is required";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errs.email = "Please enter a valid email address";
      }
      if (!password) {
        errs.password = "Initial password is required";
      } else if (password.length < 6) {
        errs.password = "Password must be at least 6 characters";
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const save = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (!form.id) {
        // Create user account first
        const success = await register(form.name, email, password, "Driver");
        if (!success) {
          setSaving(false);
          return;
        }
      }
      await saveDriver(form);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (d: Driver) => {
    if (!confirm(`Are you sure you want to remove driver "${d.name}"?`)) return;
    await deleteDriver(d.id);
  };

  const handleSendReminder = (d: Driver) => {
    toast.success(`License renewal reminder sent to ${d.name} (${d.license})`);
  };

  const avgScore = Math.round(drivers.reduce((s, d) => s + d.safetyScore, 0) / (drivers.length || 1));
  const expiring = drivers.filter((d) => licenseExpiringSoon(d) || licenseExpired(d)).length;

  // Filter & Sort Logic
  const filtered = drivers.filter(
    (d) =>
      d.name.toLowerCase().includes(query.toLowerCase()) &&
      (regionFilter === "all" || d.region === regionFilter) &&
      (statusFilter === "all" || d.status === statusFilter)
  );

  const sorted = [...filtered].sort((a, b) => {
    if (sort === "name") {
      return a.name.localeCompare(b.name);
    }
    if (sort === "score") {
      return b.safetyScore - a.safetyScore;
    }
    if (sort === "expiry") {
      return new Date(a.licenseExpiry).getTime() - new Date(b.licenseExpiry).getTime();
    }
    return 0;
  });

  const isFormValid = form.name && form.license && form.licenseExpiry && (form.id || (email && password));

  return (
    <div>
      <PageHeader
        title="Drivers & Safety Profiles"
        subtitle="Track licenses, safety scores and compliance across your team."
        action={canCreate && <Button onClick={openNew}><Plus className="size-4" /> Add driver</Button>}
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="Total Drivers" value={drivers.length} icon={Users} tone="indigo" />
        <StatCard label="Avg Safety Score" value={avgScore} icon={Award} tone="green" hint="Fleet-wide" />
        <StatCard label="License Alerts" value={expiring} icon={TriangleAlert} tone={expiring ? "red" : "slate"} hint="Expired or expiring" />
      </div>

      {/* Filter and Sort Toolbar */}
      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/30">
        <div className="relative max-w-xs flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search driver name…"
            className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-850 dark:bg-slate-950 dark:text-slate-200"
          />
        </div>

        <div className="flex flex-wrap gap-2 md:ml-auto">
          <SelectInput value={sort} onChange={(e) => setSort(e.target.value)} className="h-10 w-[150px] py-1 text-sm">
            <option value="default">Default Sort</option>
            <option value="name">Sort by Name</option>
            <option value="score">Sort by Safety Score</option>
            <option value="expiry">Sort by License Expiry</option>
          </SelectInput>

          <SelectInput value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)} className="h-10 w-[140px] py-1 text-sm">
            <option value="all">All Regions</option>
            {["North", "South", "East", "West"].map((r) => <option key={r} value={r}>{r}</option>)}
          </SelectInput>

          <SelectInput value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 w-[140px] py-1 text-sm">
            <option value="all">All Statuses</option>
            {["Available", "On Trip", "Off Duty", "Suspended"].map((s) => <option key={s} value={s}>{s}</option>)}
          </SelectInput>
        </div>
      </div>

      {sorted.length === 0 ? (
        <Card className="p-10 flex justify-center text-center">
          <div className="text-slate-400 text-sm">No drivers match the current filters.</div>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sorted.map((d) => {
            const expired = licenseExpired(d);
            const soon = licenseExpiringSoon(d);
            return (
              <Card key={d.id} hover className="flex flex-col gap-4 p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex size-11 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 text-sm font-bold text-white">
                      {d.name.split(" ").map((s) => s[0]).slice(0, 2).join("")}
                    </span>
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">{d.name}</div>
                      <div className="text-xs text-slate-400">{d.region} region</div>
                    </div>
                  </div>
                  <StatusBadge label={d.status} tone={driverTone(d.status)} />
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-slate-400">License</div>
                    <div className="font-medium text-slate-700 dark:text-slate-300">{d.licenseClass}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">Incidents</div>
                    <div className="font-medium text-slate-700 dark:text-slate-300">{d.incidents}</div>
                  </div>
                </div>

                {/* Safety score bar */}
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-slate-400">Safety score</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{d.safetyScore}/100</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className={`h-full rounded-full ${
                        d.safetyScore >= 85 ? "bg-emerald-500" : d.safetyScore >= 70 ? "bg-amber-500" : "bg-rose-500"
                      }`}
                      style={{ width: `${d.safetyScore}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                    expired ? "text-rose-600" : soon ? "text-amber-600" : "text-emerald-600"
                  }`}>
                    {expired ? <ShieldAlert className="size-4" /> : <ShieldCheck className="size-4" />}
                    {expired ? "License expired" : soon ? "Expiring soon" : "License valid"}
                    <span className="font-normal text-slate-400">· {d.licenseExpiry}</span>
                  </span>
                  
                  <div className="flex items-center gap-1.5">
                    {(expired || soon) && (
                      <button
                        onClick={() => handleSendReminder(d)}
                        title="Send license renewal reminder"
                        className="flex size-8 items-center justify-center rounded-lg text-slate-500 hover:bg-amber-50 hover:text-amber-600 dark:text-slate-400 dark:hover:bg-amber-950/20"
                      >
                        <Mail className="size-4" />
                      </button>
                    )}
                    {canEdit && (
                      <button onClick={() => openEdit(d)} className="flex size-8 items-center justify-center rounded-lg text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-indigo-950/20">
                        <Pencil className="size-4" />
                      </button>
                    )}
                    {canDelete && (
                      <button onClick={() => handleDelete(d)} className="flex size-8 items-center justify-center rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-950/20" title="Remove driver">
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={form.id ? "Edit driver" : "Add driver"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving || !isFormValid}>{saving ? "Saving…" : form.id ? "Save changes" : "Add driver"}</Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <Field label="Full name">
            <TextInput 
              value={form.name} 
              onChange={(e) => { set("name", e.target.value); if (errors.name) validate(); }} 
              className={errors.name ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20" : ""}
            />
            {errors.name && <span className="text-xs text-rose-500 font-medium">{errors.name}</span>}
          </Field>
          <Field label="License no.">
            <TextInput 
              value={form.license} 
              onChange={(e) => { set("license", e.target.value); if (errors.license) validate(); }} 
              placeholder="e.g. MH12AB123456"
              className={errors.license ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20" : ""}
            />
            {errors.license && <span className="text-xs text-rose-500 font-medium">{errors.license}</span>}
          </Field>
          <Field label="License class">
            <SelectInput value={form.licenseClass} onChange={(e) => set("licenseClass", e.target.value)}>
              {["LMV", "HMV", "PSV"].map((o) => <option key={o}>{o}</option>)}
            </SelectInput>
          </Field>
          <Field label="License expiry">
            <TextInput 
              type="date" 
              value={form.licenseExpiry} 
              onChange={(e) => { set("licenseExpiry", e.target.value); if (errors.licenseExpiry) validate(); }} 
              className={errors.licenseExpiry ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20" : ""}
            />
            {errors.licenseExpiry && <span className="text-xs text-rose-500 font-medium">{errors.licenseExpiry}</span>}
          </Field>
          <Field label="Region">
            <SelectInput value={form.region} onChange={(e) => set("region", e.target.value)}>
              {["North", "South", "East", "West"].map((o) => <option key={o}>{o}</option>)}
            </SelectInput>
          </Field>
          <Field label="Status">
            <SelectInput value={form.status} onChange={(e) => set("status", e.target.value as DriverStatus)}>
              {["Available", "On Trip", "Off Duty", "Suspended"].map((o) => <option key={o}>{o}</option>)}
            </SelectInput>
          </Field>
          <Field label="Incidents">
            <TextInput 
              type="number" 
              value={form.incidents} 
              onChange={(e) => { set("incidents", +e.target.value); if (errors.incidents) validate(); }} 
              className={errors.incidents ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20" : ""}
            />
            {errors.incidents && <span className="text-xs text-rose-500 font-medium">{errors.incidents}</span>}
          </Field>
          <Field label={`Safety score · ${form.safetyScore}`}>
            <input type="range" min={0} max={100} value={form.safetyScore} onChange={(e) => set("safetyScore", +e.target.value)} className="w-full accent-indigo-600" />
          </Field>

          {/* Account Creation Section for New Drivers */}
          {!form.id && (
            <div className="col-span-2 border-t border-slate-100 dark:border-slate-800 pt-3 mt-3 space-y-3">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Lock className="size-3.5 text-indigo-500" /> User Credentials provisioning
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Login Email">
                  <TextInput 
                    type="email" 
                    value={email} 
                    onChange={(e) => { setEmail(e.target.value); if (errors.email) validate(); }} 
                    placeholder="driver@company.com"
                    className={errors.email ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20" : ""}
                    required 
                  />
                  {errors.email && <span className="text-xs text-rose-500 font-medium">{errors.email}</span>}
                </Field>
                <Field label="Initial Password">
                  <TextInput 
                    type="password" 
                    value={password} 
                    onChange={(e) => { setPassword(e.target.value); if (errors.password) validate(); }} 
                    placeholder="Initial password"
                    className={errors.password ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20" : ""}
                    required 
                  />
                  {errors.password && <span className="text-xs text-rose-500 font-medium">{errors.password}</span>}
                </Field>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
