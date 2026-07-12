import { useState } from "react";
import { Check, Minus, ShieldCheck, Users as UsersIcon, UserPlus } from "lucide-react";
import { useStore, resources, roles, matrix } from "../../data/store";
import type { Role } from "../../data/types";
import { Card, PageHeader, StatusBadge, type Tone, Field, TextInput, SelectInput, Button } from "../app/ui";

const roleTone = (r: string): Tone =>
  r === "Fleet Manager" ? "indigo" : r === "Safety Officer" ? "violet" : r === "Financial Analyst" ? "amber" : "slate";

export function Settings() {
  const { user, users, register, saveDriver } = useStore();
  const [prefs, setPrefs] = useState({ email: true, digest: false, alerts: true });
  
  const [empName, setEmpName] = useState("");
  const [empEmail, setEmpEmail] = useState("");
  const [empPassword, setEmpPassword] = useState("");
  const [empRole, setEmpRole] = useState<Role>("Driver");

  // Driver fields (shown when role === "Driver")
  const [driverLicense, setDriverLicense] = useState("");
  const [driverLicenseClass, setDriverLicenseClass] = useState("LMV");
  const [driverLicenseExpiry, setDriverLicenseExpiry] = useState("2027-01-01");
  const [driverRegion, setDriverRegion] = useState("North");

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!empName.trim()) errs.name = "Full name is required";
    if (!empEmail.trim()) {
      errs.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(empEmail)) {
      errs.email = "Invalid email format";
    }
    if (!empPassword) {
      errs.password = "Password is required";
    } else if (empPassword.length < 6) {
      errs.password = "Password must be at least 6 characters";
    }

    if (empRole === "Driver") {
      if (!driverLicense.trim()) {
        errs.license = "License number is required";
      } else if (!/^[A-Z0-9-]{8,22}$/i.test(driverLicense)) {
        errs.license = "License must be 8-22 alphanumeric characters/hyphens";
      }
      if (!driverLicenseExpiry) {
        errs.licenseExpiry = "License expiry date is required";
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    const success = await register(empName, empEmail, empPassword, empRole);
    if (success) {
      if (empRole === "Driver") {
        await saveDriver({
          id: "",
          name: empName,
          license: driverLicense,
          licenseClass: driverLicenseClass as any,
          licenseExpiry: driverLicenseExpiry,
          region: driverRegion,
          status: "Available",
          safetyScore: 85,
          incidents: 0
        });
      }
      // Reset state
      setEmpName("");
      setEmpEmail("");
      setEmpPassword("");
      setDriverLicense("");
      setDriverLicenseClass("LMV");
      setDriverLicenseExpiry("2027-01-01");
      setDriverRegion("North");
      setErrors({});
    }
    setLoading(false);
  };

  const isManager = user?.role === "Fleet Manager";
  const isFormValid = empName && empEmail && empPassword && (empRole !== "Driver" || (driverLicense && driverLicenseExpiry));

  return (
    <div>
      <PageHeader title="Settings & Access" subtitle="Manage your team, roles and platform preferences." />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Team */}
        <Card className="overflow-hidden lg:col-span-1">
          <div className="flex items-center gap-2 border-b border-slate-100 p-5">
            <UsersIcon className="size-4 text-indigo-500" />
            <h3 className="[font-weight:700] text-slate-900">Team Members</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {users.map((u) => (
              <div key={u.id} className="flex items-center gap-3 px-5 py-3.5">
                <span className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 text-sm font-bold text-white">
                  {u.name.split(" ").map((s) => s[0]).slice(0, 2).join("")}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-semibold text-slate-900">{u.name}</span>
                    {u.id === user?.id && <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-600">YOU</span>}
                  </div>
                  <div className="truncate text-xs text-slate-400">{u.email}</div>
                </div>
                <StatusBadge label={u.role} tone={roleTone(u.role)} />
              </div>
            ))}
          </div>
        </Card>

        {/* Preferences */}
        <Card className={`p-5 ${isManager ? "lg:col-span-1" : "lg:col-span-2"}`}>
          <div className="mb-4 flex items-center gap-2">
            <ShieldCheck className="size-4 text-indigo-500" />
            <h3 className="[font-weight:700] text-slate-900">Preferences</h3>
          </div>
          <div className="space-y-1">
            {([
              ["email", "Email notifications", "Receive dispatch and completion updates by email"],
              ["digest", "Weekly digest", "A summary of fleet performance every Monday"],
              ["alerts", "Compliance alerts", "Get notified about license and maintenance issues"],
            ] as const).map(([key, title, desc]) => (
              <label key={key} className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-3 hover:bg-slate-50">
                <div>
                  <div className="font-medium text-slate-800">{title}</div>
                  <div className="text-xs text-slate-400">{desc}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setPrefs((p) => ({ ...p, [key]: !p[key] }))}
                  className={`relative h-6 w-11 rounded-full transition-colors ${prefs[key] ? "bg-gradient-to-r from-indigo-600 to-violet-600" : "bg-slate-200"}`}
                >
                  <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${prefs[key] ? "left-[22px]" : "left-0.5"}`} />
                </button>
              </label>
            ))}
          </div>
        </Card>

        {/* Add Employee Form (Fleet Manager Only) */}
        {isManager && (
          <Card className="p-5 lg:col-span-1">
            <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
              <UserPlus className="size-4 text-indigo-500 animate-pulse" />
              <h3 className="[font-weight:700] text-slate-900">Add Employee</h3>
            </div>
            <form onSubmit={handleAddEmployee} className="space-y-3">
              <Field label="Full Name">
                <TextInput 
                  value={empName} 
                  onChange={(e) => { setEmpName(e.target.value); if (errors.name) validate(); }} 
                  placeholder="e.g. Anand Pillai" 
                  className={errors.name ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20" : ""}
                  required 
                />
                {errors.name && <span className="text-xs text-rose-500 font-medium">{errors.name}</span>}
              </Field>
              <Field label="Email Address">
                <TextInput 
                  type="email" 
                  value={empEmail} 
                  onChange={(e) => { setEmpEmail(e.target.value); if (errors.email) validate(); }} 
                  placeholder="name@transitops.io" 
                  className={errors.email ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20" : ""}
                  required 
                />
                {errors.email && <span className="text-xs text-rose-500 font-medium">{errors.email}</span>}
              </Field>
              <Field label="Initial Password">
                <TextInput 
                  type="password" 
                  value={empPassword} 
                  onChange={(e) => { setEmpPassword(e.target.value); if (errors.password) validate(); }} 
                  placeholder="Initial password (min 6 chars)" 
                  className={errors.password ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20" : ""}
                  required 
                />
                {errors.password && <span className="text-xs text-rose-500 font-medium">{errors.password}</span>}
              </Field>
              <Field label="Role Designation">
                <SelectInput value={empRole} onChange={(e: any) => setEmpRole(e.target.value)}>
                  <option value="Driver">Driver</option>
                  <option value="Safety Officer">Safety Officer</option>
                  <option value="Financial Analyst">Financial Analyst</option>
                  <option value="Fleet Manager">Fleet Manager</option>
                </SelectInput>
              </Field>

              {/* Dynamic Driver Fields */}
              {empRole === "Driver" && (
                <div className="border-t border-slate-100 pt-3 mt-3 space-y-3">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Driver Profile Registration</div>
                  <Field label="License Number">
                    <TextInput 
                      value={driverLicense} 
                      onChange={(e) => { setDriverLicense(e.target.value); if (errors.license) validate(); }} 
                      placeholder="e.g. MH12AB123456" 
                      className={errors.license ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20" : ""}
                      required 
                    />
                    {errors.license && <span className="text-xs text-rose-500 font-medium">{errors.license}</span>}
                  </Field>
                  <Field label="License Class">
                    <SelectInput value={driverLicenseClass} onChange={(e) => setDriverLicenseClass(e.target.value)}>
                      <option value="LMV">Light Motor Vehicle (LMV)</option>
                      <option value="HMV">Heavy Motor Vehicle (HMV)</option>
                      <option value="PSV">Public Service Vehicle (PSV)</option>
                    </SelectInput>
                  </Field>
                  <Field label="License Expiry">
                    <TextInput 
                      type="date" 
                      value={driverLicenseExpiry} 
                      onChange={(e) => { setDriverLicenseExpiry(e.target.value); if (errors.licenseExpiry) validate(); }} 
                      className={errors.licenseExpiry ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20" : ""}
                      required 
                    />
                    {errors.licenseExpiry && <span className="text-xs text-rose-500 font-medium">{errors.licenseExpiry}</span>}
                  </Field>
                  <Field label="Region Assignment">
                    <SelectInput value={driverRegion} onChange={(e) => setDriverRegion(e.target.value)}>
                      <option value="North">North</option>
                      <option value="South">South</option>
                      <option value="East">East</option>
                      <option value="West">West</option>
                    </SelectInput>
                  </Field>
                </div>
              )}

              <Button type="submit" className="w-full mt-2" disabled={loading || !isFormValid}>
                {loading ? "Registering..." : "Create Account"}
              </Button>
            </form>
          </Card>
        )}
      </div>

      {/* RBAC matrix */}
      <Card className="mt-6 overflow-hidden">
        <div className="border-b border-slate-100 p-5">
          <h3 className="[font-weight:700] text-slate-900">Role-Based Access Control</h3>
          <p className="text-sm text-slate-500">Permissions granted to each role across the platform.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                <th className="px-5 py-3">Resource</th>
                {roles.map((r) => (
                  <th key={r} className="px-5 py-3">{r}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {resources.map((res) => (
                <tr key={res} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-semibold capitalize text-slate-900">{res}</td>
                  {roles.map((role) => {
                    const actions = matrix[role]?.[res];
                    return (
                      <td key={role} className="px-5 py-3">
                        {actions && actions.length ? (
                          <div className="flex flex-wrap gap-1">
                            {actions.map((a) => (
                              <span key={a} className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-1.5 py-0.5 text-[11px] font-medium capitalize text-indigo-600">
                                <Check className="size-3" /> {a}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <Minus className="size-4 text-slate-300" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
