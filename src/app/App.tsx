import { useState, type ReactNode } from "react";
import { Toaster } from "sonner";
import { StoreProvider, useStore } from "./data/store";
import { ThemeProvider, useTheme } from "./data/theme";
import { AppShell, type Page } from "./components/app/AppShell";
import { Login } from "./components/app/Login";
import { Dashboard } from "./components/pages/Dashboard";
import { Vehicles } from "./components/pages/Vehicles";
import { Drivers } from "./components/pages/Drivers";
import { Trips } from "./components/pages/Trips";
import { Maintenance } from "./components/pages/Maintenance";
import { Fuel } from "./components/pages/Fuel";
import { Reports } from "./components/pages/Reports";
import { Settings } from "./components/pages/Settings";
import { Safety } from "./components/pages/Safety";
import { DriverConsole } from "./components/pages/DriverConsole";

function Shell() {
  const { user, currentPage, navigateTo } = useStore();

  if (!user) return <Login />;

  // Driver console enforcement redirect
  if (user.role === "Driver" && currentPage !== "driver-console") {
    navigateTo("driver-console");
  }

  const pages: Record<Page, ReactNode> = {
    dashboard: <Dashboard />,
    vehicles: <Vehicles />,
    drivers: <Drivers />,
    trips: <Trips />,
    maintenance: <Maintenance />,
    fuel: <Fuel />,
    reports: <Reports />,
    settings: <Settings />,
    safety: <Safety />,
    "driver-console": <DriverConsole />,
  };

  return (
    <AppShell page={currentPage} setPage={navigateTo}>
      {pages[currentPage]}
    </AppShell>
  );
}

function ThemedToaster() {
  const { mode } = useTheme();
  return <Toaster position="top-right" richColors theme={mode} />;
}

export default function App() {
  return (
    <ThemeProvider>
      <StoreProvider>
        <Shell />
        <ThemedToaster />
      </StoreProvider>
    </ThemeProvider>
  );
}
