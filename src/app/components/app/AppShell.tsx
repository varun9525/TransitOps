import { useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  Truck,
  Users,
  Route,
  Wrench,
  Fuel,
  BarChart3,
  Settings,
  Bus,
  Search,
  Bell,
  Menu,
  X,
  LogOut,
  ChevronDown,
  Sun,
  Moon,
} from "lucide-react";
import { useStore } from "../../data/store";
import type { Resource } from "../../data/store";
import { useTheme } from "../../data/theme";

export type Page =
  | "dashboard"
  | "vehicles"
  | "drivers"
  | "trips"
  | "maintenance"
  | "fuel"
  | "reports"
  | "settings";

const nav: { id: Page; label: string; icon: typeof Truck; resource: Resource }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, resource: "dashboard" },
  { id: "vehicles", label: "Vehicle Registry", icon: Truck, resource: "vehicles" },
  { id: "drivers", label: "Drivers & Safety", icon: Users, resource: "drivers" },
  { id: "trips", label: "Trip Dispatcher", icon: Route, resource: "trips" },
  { id: "maintenance", label: "Maintenance", icon: Wrench, resource: "maintenance" },
  { id: "fuel", label: "Fuel & Expenses", icon: Fuel, resource: "fuel" },
  { id: "reports", label: "Reports", icon: BarChart3, resource: "reports" },
  { id: "settings", label: "Settings & RBAC", icon: Settings, resource: "settings" },
];

export function AppShell({
  page,
  setPage,
  children,
}: {
  page: Page;
  setPage: (p: Page) => void;
  children: ReactNode;
}) {
  const { user, logout, can } = useStore();
  const { mode, toggle } = useTheme();
  const [drawer, setDrawer] = useState(false);
  const [menu, setMenu] = useState(false);

  const items = nav.filter((n) => can(n.resource, "view"));

  const NavList = ({ onNavigate }: { onNavigate?: () => void }) => (
    <nav className="flex flex-col gap-1 px-3">
      {items.map((n) => {
        const active = page === n.id;
        return (
          <button
            key={n.id}
            onClick={() => {
              setPage(n.id);
              onNavigate?.();
            }}
            className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
              active
                ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white ct-shadow-btn"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <n.icon className="size-4.5" strokeWidth={2} />
            {n.label}
          </button>
        );
      })}
    </nav>
  );

  const Brand = () => (
    <div className="flex items-center gap-2.5 px-6 py-5">
      <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white ct-shadow-btn">
        <Bus className="size-5" strokeWidth={2} />
      </span>
      <div>
        <div className="[font-size:1.05rem] [font-weight:800] [letter-spacing:-0.02em] text-slate-900">
          TransitOps
        </div>
        <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Fleet Control
        </div>
      </div>
    </div>
  );

  const initials = user?.name.split(" ").map((s) => s[0]).slice(0, 2).join("") ?? "";

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Sidebar (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-100 bg-white lg:block">
        <Brand />
        <NavList />
      </aside>

      {/* Mobile drawer */}
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setDrawer(false)} />
          <div className="absolute inset-y-0 left-0 w-64 bg-white ct-shadow-hover">
            <div className="flex items-center justify-between pr-3">
              <Brand />
              <button onClick={() => setDrawer(false)} className="flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100">
                <X className="size-5" />
              </button>
            </div>
            <NavList onNavigate={() => setDrawer(false)} />
          </div>
        </div>
      )}

      {/* Main */}
      <div className="lg:pl-64">
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-100 bg-white/80 px-4 backdrop-blur-xl sm:px-6">
          <button
            onClick={() => setDrawer(true)}
            className="flex size-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden"
          >
            <Menu className="size-5" />
          </button>

          <div className="relative hidden max-w-md flex-1 sm:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              placeholder="Search vehicles, trips, drivers…"
              className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={toggle}
              aria-label="Toggle theme"
              className="flex size-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
            >
              {mode === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
            </button>
            <button className="relative flex size-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100">
              <Bell className="size-5" />
              <span className="absolute right-2.5 top-2.5 size-2 rounded-full bg-rose-500 ring-2 ring-white" />
            </button>

            <div className="relative">
              <button
                onClick={() => setMenu((v) => !v)}
                className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 hover:bg-slate-100"
              >
                <span className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 text-xs font-bold text-white">
                  {initials}
                </span>
                <span className="hidden text-left sm:block">
                  <span className="block text-sm font-semibold leading-tight text-slate-900">{user?.name}</span>
                  <span className="block text-xs leading-tight text-slate-400">{user?.role}</span>
                </span>
                <ChevronDown className="size-4 text-slate-400" />
              </button>
              {menu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
                  <div className="absolute right-0 z-20 mt-2 w-52 overflow-hidden rounded-xl border border-slate-100 bg-white py-1 ct-shadow-hover">
                    <div className="border-b border-slate-100 px-4 py-3">
                      <div className="text-sm font-semibold text-slate-900">{user?.name}</div>
                      <div className="text-xs text-slate-400">{user?.email}</div>
                    </div>
                    <button
                      onClick={logout}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50"
                    >
                      <LogOut className="size-4" /> Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="ct-fade-up">{children}</div>
        </main>
      </div>
    </div>
  );
}
