import { Outlet } from "react-router-dom";

import { BottomNav } from "../components/common/BottomNav";

export function AppLayout() {
  return (
    <div className="app-shell">
      <main className="app-content">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
