import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";

import { StudyAppProvider } from "./app/StudyAppProvider";
import { router } from "./app/router";
import "./styles/global.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <StudyAppProvider>
      <RouterProvider router={router} />
    </StudyAppProvider>
  </React.StrictMode>,
);
