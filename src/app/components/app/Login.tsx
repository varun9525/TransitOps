import { useState } from "react";
import { ArrowRight, Bus, Lock, Mail, ShieldCheck, CircleCheck, Sun, Moon, Eye, EyeOff, User } from "lucide-react";
import { useStore } from "../../data/store";
import type { Role } from "../../data/types";
import { Button, Field, TextInput } from "./ui";
import { useTheme } from "../../data/theme";

const roles: { role: Role; blurb: string }[] = [
  { role: "Fleet Manager", blurb: "Assets, maintenance & lifecycle" },
  { role: "Driver", blurb: "Trips & active deliveries" },
  { role: "Safety Officer", blurb: "Compliance & safety scores" },
  { role: "Financial Analyst", blurb: "Costs, fuel & profitability" },
];

export function Login() {
  const { login, register } = useStore();
  const { mode, toggle } = useTheme();
  const [role, setRole] = useState<Role>("Fleet Manager");
  const [email, setEmail] = useState("admin@transitops.io");
  const [password, setPassword] = useState("demo1234");
  const [showPassword, setShowPassword] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    if (isRegister) {
      if (!name) return;
      await register(name, email, password, role);
    } else {
      await login(email, password, role);
    }
  };

  const pick = (r: Role) => {
    setRole(r);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <button
        onClick={toggle}
        aria-label="Toggle theme"
        className="absolute right-5 top-5 z-20 flex size-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 ct-shadow-soft hover:bg-slate-50"
      >
        {mode === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
      </button>

      {/* Blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="ct-float absolute -top-40 -right-24 size-[520px] rounded-full bg-gradient-to-br from-indigo-300/40 to-violet-300/40 blur-3xl" />
        <div className="ct-float-slow absolute -bottom-40 -left-24 size-[440px] rounded-full bg-gradient-to-br from-violet-200/50 to-indigo-200/40 blur-3xl" />
      </div>

      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-100 bg-white ct-shadow-hover lg:grid-cols-2">
        {/* Brand panel */}
        <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-indigo-600 to-violet-700 p-10 text-white lg:flex">
          <div className="pointer-events-none absolute -bottom-20 -right-20 size-72 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
              <Bus className="size-5" strokeWidth={2} />
            </span>
            <span className="[font-size:1.15rem] [font-weight:800] [letter-spacing:-0.02em]">
              TransitOps
            </span>
          </div>

          <div className="relative">
            <h2 className="[font-size:2.1rem] [font-weight:800] [letter-spacing:-0.03em] [line-height:1.12]">
              Run your entire fleet from one calm control room.
            </h2>
            <p className="mt-4 max-w-sm text-indigo-100 [line-height:1.6]">
              Vehicles, drivers, dispatch, maintenance and expenses — unified,
              rule-enforced and instantly visible.
            </p>
            <ul className="mt-7 flex flex-col gap-2.5 text-sm text-indigo-50">
              {["RBAC-secured access", "Live trip dispatch", "Automatic status cascades", "SQLite Database persistence"].map((t) => (
                <li key={t} className="flex items-center gap-2.5">
                  <CircleCheck className="size-4.5 text-emerald-300" /> {t}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative flex items-center gap-2 text-xs text-indigo-200">
            <ShieldCheck className="size-4" /> Enterprise-grade access control
          </div>
        </div>

        {/* Form */}
        <div className="p-8 sm:p-10">
          <div className="mb-6 flex items-center gap-2.5 lg:hidden">
            <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white">
              <Bus className="size-5" strokeWidth={2} />
            </span>
            <span className="[font-size:1.15rem] [font-weight:800] text-slate-900">TransitOps</span>
          </div>

          <h1 className="[font-size:1.5rem] [font-weight:800] [letter-spacing:-0.02em] text-slate-900">
            {isRegister ? "Create your account" : "Sign in to your workspace"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {isRegister ? "Register a new account to get started." : "Choose a role and sign in."}
          </p>

          <div className="mt-6 grid grid-cols-2 gap-2.5">
            {roles.map((r) => (
              <button
                key={r.role}
                type="button"
                onClick={() => pick(r.role)}
                className={`rounded-xl border p-3 text-left transition-all duration-200 ${
                  role === r.role
                    ? "border-indigo-500 bg-indigo-50/60 ring-1 ring-indigo-200"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <div className="text-sm font-semibold text-slate-900">{r.role}</div>
                <div className="mt-0.5 text-xs text-slate-500">{r.blurb}</div>
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="mt-6 space-y-4">
            {isRegister && (
              <Field label="Full Name">
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <TextInput
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-9"
                    placeholder="John Doe"
                    required
                  />
                </div>
              </Field>
            )}

            <Field label="Email">
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <TextInput
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  placeholder="you@company.com"
                  required
                />
              </div>
            </Field>

            <Field label="Password">
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <TextInput
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 pr-10"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </Field>

            <Button type="submit" className="group w-full mt-2">
              {isRegister ? `Register as ${role}` : `Sign in as ${role}`}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </form>

          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={() => setIsRegister(!isRegister)}
              className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
            >
              {isRegister ? "Already have an account? Sign in" : "Don't have an account? Register"}
            </button>
          </div>

          {!isRegister && (
            <p className="mt-3 text-center text-xs text-slate-400 font-medium">
              Default admin: admin@transitops.io / demo1234
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
