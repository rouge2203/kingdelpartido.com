import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { Link, useNavigate } from "react-router-dom";
import { LuMail, LuLock, LuEye, LuEyeOff } from "react-icons/lu";
import logo from "../assets/monkey_logo.png";

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      if (error.status === 400) {
        console.log("error", error.message);
        setError("Correo electrónico o contraseña incorrectos");
      } else {
        setError(error.message);
      }
    } else {
      navigate("/dashboard");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center  justify-center p-4 ">
      <div className="w-full max-w-md space-y-6">
        {/* Login Form */}

        <div className="bg-primary border border-gray-600 bg-card rounded-lg p-6 shadow-md shadow-black">
          {/* Header */}
          <div className="text-center space-y-2 flex flex-col items-center">
            <img src={logo} alt="King del Partido logo" className="size-30 " />
            <div className="flex justify-center items-center gap-2">
              {/* <FaCrown className="text-yellow-400 text-3xl" /> */}
              <h1 className="text-3xl font-bold text-yellow-400">
                King del Partido
              </h1>
            </div>
            <p className="text-gray-400 text-sm">
              Inicia sesión para comenzar a calificar jugadores
            </p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4 my-8">
            {/* Email Field */}
            <div className="space-y-2">
              <label
                className="text-sm font-medium text-gray-200 "
                htmlFor="email"
              >
                Correo electrónico
              </label>
              <div className="relative mt-1.5">
                <LuMail className="absolute left-3  top-4 h-4 w-4 text-gray-400" />
                <input
                  className="w-full pl-10 pr-4 py-2.5 bg-black border border-gray-600 rounded-md text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-colors"
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  className="text-sm font-medium text-gray-200"
                  htmlFor="password"
                >
                  Contraseña
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-yellow-400 hover:text-yellow-300 font-medium transition-colors"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <div className="relative mt-1.5">
                <LuLock className="absolute left-3 top-4 h-4 w-4 text-gray-400" />
                <input
                  className="w-full pl-10 pr-12 py-2.5 bg-black border border-gray-600 rounded-md text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-colors"
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-4 text-gray-400 hover:text-gray-300 transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <LuEyeOff className="h-4 w-4" />
                  ) : (
                    <LuEye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-md p-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              className="w-full mt-4 bg-yellow-400 hover:bg-yellow-500 text-black font-semibold py-2.5 rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-yellow-400/20"
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent"></div>
                  Iniciando sesión...
                </div>
              ) : (
                "Iniciar sesión"
              )}
            </button>
          </form>
          {/* Sign Up Link */}
          <div className="text-center">
            <p className="text-gray-400 text-sm">
              ¿No tienes cuenta?{" "}
              <Link
                to="/signup"
                className="text-yellow-400 hover:text-yellow-300 font-medium transition-colors"
              >
                Regístrate aquí
              </Link>
            </p>
          </div>
        </div>
        <span className="text-gray-400 text-sm">Powered by</span>
        <a
          href="https://lobsterlabs.net"
          target="_blank"
          rel="noopener noreferrer"
        >
          <img
            src={
              "https://mafisa-group-assets.nyc3.cdn.digitaloceanspaces.com/kingdelpartido/assets/lobster_logo_white.png"
            }
            alt="lobster logo"
            className="h-4 w-auto"
          />
        </a>
      </div>
    </div>
  );
}
