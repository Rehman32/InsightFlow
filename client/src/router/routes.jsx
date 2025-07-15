import { createBrowserRouter } from "react-router-dom";
import Login from "../pages/Login";
import Dashboard from "../pages/Dashboard";
import MeetingRoom from "../pages/MeetingRoom";
import Summary from "../pages/Summary";
import Signup from "../pages/Signup";
import ProtectedRoute from "./ProtectedRoute";

const router = createBrowserRouter([
  { path: "/", element: <Login /> },
  {
    path: "/dashboard",
    element: (
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: "/meeting/:id",
    element: (
      <ProtectedRoute>
        <MeetingRoom />
      </ProtectedRoute>
    ),
  },
  { path: "/signup", element: <Signup /> },
  {
    path: "/summary/:id",
    element: (
      <ProtectedRoute>
        <Summary />
      </ProtectedRoute>
    ),
  },
]);

export default router;
