# TransitOps — Smart Transport Operations Platform

TransitOps is a real-world ready, enterprise-grade fleet and transport management SaaS. It enables managers, safety officers, financial analysts, and drivers to collaborate seamlessly with central data synchronization, dynamic analytics, active route simulators, and compliance tracking.

---

## 🚀 Key Enterprise Features

### 1. Unified Operations Dashboard
*   **Live Metrics**: Monitors active vehicles, driver duty status, fleet utilization, and compliance alerts.
*   **Preventive Maintenance Alerts**: Automatically flags vehicles due for service based on mathematical odometer threshold checks.
*   **Regional Analytics**: Visual representation of vehicle distributions using interactive charts.

### 2. Safety & Compliance Registry
*   **Incident Logs**: Allows Safety Officers to document speeding, hard braking, or route violations.
*   **Safety Scores**: Dynamically recalculates driver safety ratings (High: -15, Medium: -8, Low: -3 points) upon logging incidents.
*   **Fines Ledger**: Tracks compliance penalties and fine amounts in Indian Rupees (₹).

### 3. Interactive Route Simulator & Live Dispatch Tracker
*   **Simulated Corridor GPS**: Plots dispatched routes on a simulated dashboard map.
*   **Real-time Telemetry**: Animates the truck’s progress, showing live speed fluctuations, estimated ETA, fuel burn, and cargo safety metrics.

### 4. AI Receipt OCR Scanner (Simulated)
*   **Automated Logistics Data**: Drivers and managers can simulate uploading receipt images to automatically extract litres, total fuel costs, and odometer readings.
*   **Indian Standard Rate Checks**: Ensures rate compliance, warning users of suspicious prices outside standard ranges.

### 5. Role-Based Access Control (RBAC)
*   **Fleet Managers**: Full CRUD control over drivers, vehicles, maintenance logs, and dispatching.
*   **Safety Officers**: View and document safety logs and incidents.
*   **Financial Analysts**: Access cost dashboards, fuel spend audits, and revenue trackers.
*   **Drivers**: Access a mobile-optimized, single-pane console to track routes, complete dispatches, and log trip expenses.

---

## 🛠️ Architecture & Tech Stack

*   **Frontend**: React (Vite), TypeScript, Tailwind CSS, Lucide icons, Recharts.
*   **Backend**: Node.js, Express, SQLite3 (Database storage with seed scripts).
*   **State Management**: Context-based React Store Provider for real-time synchronization.

---

## 🏁 Getting Started

### Prerequisites
*   Node.js (v18+)
*   npm

### Installation & Run

1. Clone the repository and navigate to the project directory:
   ```bash
   git clone https://github.com/varun9525/TransitOps.git
   cd TransitOps
   ```

2. Install parent & workspace dependencies:
   ```bash
   npm run init
   ```

3. Run the development server (runs frontend on `http://localhost:5173` and backend on `http://localhost:5000` concurrently):
   ```bash
   npm run dev
   ```

4. Build production assets:
   ```bash
   npm run build
   ```