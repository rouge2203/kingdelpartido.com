import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Loader from "./Loader";

export default function StaffRoute() {
  const { user, loading, profile, profileLoading } = useAuth();

  if (loading || profileLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (profile?.role !== "staff") {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
