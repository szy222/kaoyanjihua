import { createHashRouter, Navigate } from "react-router-dom";

import { AppLayout } from "./layout";
import { LibraryPage } from "../pages/LibraryPage";
import { PlanPage } from "../pages/PlanPage";
import { SettingsPage } from "../pages/SettingsPage";
import { StatsPage } from "../pages/StatsPage";
import { TodayPage } from "../pages/TodayPage";

export const router = createHashRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/today" replace />,
      },
      {
        path: "today",
        element: <TodayPage />,
      },
      {
        path: "plan",
        element: <PlanPage />,
      },
      {
        path: "library",
        element: <LibraryPage />,
      },
      {
        path: "stats",
        element: <StatsPage />,
      },
      {
        path: "settings",
        element: <SettingsPage />,
      },
    ],
  },
]);
