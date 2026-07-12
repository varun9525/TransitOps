import { useState } from "react";
import { Check, Minus, ShieldCheck, Users as UsersIcon } from "lucide-react";
import { useStore, resources, roles, matrix } from "../../data/store";
import { Card, PageHeader, StatusBadge, type Tone } from "../app/ui";

const roleTone = (r: string): Tone =>
  r === "Fleet Manager" ? "indigo" : r === "Safety Officer" ? "violet" : r === "Financial Analyst" ? "amber" : "slate";

export function Settings() {
  const { user, users } = useStore();
  const [prefs, setPrefs] = useState({ email: true, digest: false, alerts: true });

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
        <Card className="p-5 lg:col-span-2">
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
