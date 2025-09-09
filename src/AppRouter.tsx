import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import NotFound from "./pages/NotFound";
import Dashboard from "./pages/Dashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Match from "./pages/Match";
import ForgotPassword from "./pages/ForgotPassword";
import RecoverPassword from "./pages/RecoverPassword";
import Demo from "./pages/Demo";
import Predicciones from "./pages/Predicciones";
import StaffRoute from "./components/StaffRoute";
import StaffPredicciones from "./pages/StaffPredicciones";
import Leaderboard from "./pages/Leaderboard";

function AppRouter() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="*" element={<NotFound />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/recover-password" element={<RecoverPassword />} />
        <Route path="/demo" element={<Demo />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/match/:id" element={<Match />} />
            <Route path="/predicciones/:id" element={<Predicciones />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route element={<StaffRoute />}>
              <Route
                path="/staff/predicciones/:id"
                element={<StaffPredicciones />}
              />
            </Route>
          </Route>
        </Route>
      </Routes>
    </Router>
  );
}

export default AppRouter;
