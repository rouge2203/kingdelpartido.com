import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { Link } from "react-router-dom";
import { LuMail, LuLock, LuEye, LuEyeOff, LuCheck } from "react-icons/lu";
import logo from "../assets/monkey_logo.png";

export default function SignUp() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setMessage("");

    // Validate password match
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    // Validate password length
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email: email,
      password: password,
    });

    if (error) {
      if (error.status === 422) {
        console.log("error", error.status);
        setError("Correo electrónico ya existe");
      } else {
        setError(error.message);
      }
    } else {
      setMessage(
        "¡Listo! Te hemos enviado un correo para confirmar tu cuenta. Revisa tu correo para completar el registro."
      );
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 ">
      <div className="w-full max-w-md space-y-6">
        {/* Sign Up Form */}
        <div className="bg-primary border border-gray-600 rounded-lg p-6 shadow-md bg-card shadow-black">
          {/* Header */}
          <div className="text-center space-y-2 flex flex-col items-center">
            <img src={logo} alt="King del Partido logo" className="size-30 " />
            <div className="flex justify-center items-center gap-2">
              <h1 className="text-3xl font-bold text-yellow-400">
                King del Partido
              </h1>
            </div>
            <p className="text-gray-400 text-sm">
              Crea tu cuenta para comenzar
            </p>
          </div>
          <form onSubmit={handleSignUp} className="space-y-4 my-8">
            {/* Email Field */}
            <div className="space-y-2">
              <label
                className="text-sm font-medium text-gray-200"
                htmlFor="email"
              >
                Correo electrónico
              </label>
              <div className="relative mt-1.5">
                <LuMail className="absolute left-3 top-4 h-4 w-4 text-gray-400" />
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
              <label
                className="text-sm font-medium text-gray-200"
                htmlFor="password"
              >
                Contraseña
              </label>
              <div className="relative mt-1.5">
                <LuLock className="absolute left-3 top-4 h-4 w-4 text-gray-400" />
                <input
                  className="w-full pl-10 pr-12 py-2.5 bg-black border border-gray-600 rounded-md text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-colors"
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres"
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

            {/* Confirm Password Field */}
            <div className="space-y-2">
              <label
                className="text-sm font-medium text-gray-200"
                htmlFor="confirmPassword"
              >
                Confirmar contraseña
              </label>
              <div className="relative mt-1.5">
                <LuLock className="absolute left-3 top-4 h-4 w-4 text-gray-400" />
                <input
                  className="w-full pl-10 pr-12 py-2.5 bg-black border border-gray-600 rounded-md text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-colors"
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirma tu contraseña"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-4 text-gray-400 hover:text-gray-300 transition-colors"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
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

            {/* Success Message */}
            {message && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-md p-3">
                <div className="flex items-center gap-2">
                  <LuCheck className="h-4 w-4 text-green-400" />
                  <p className="text-green-400 text-sm">{message}</p>
                </div>
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
                  Creando cuenta...
                </div>
              ) : (
                "Crear cuenta"
              )}
            </button>
          </form>
          {/* Login Link */}
          <div className="text-center">
            <p className="text-gray-400 text-sm">
              ¿Ya tienes cuenta?{" "}
              <Link
                to="/login"
                className="text-yellow-400 hover:text-yellow-300 font-medium transition-colors"
              >
                Inicia sesión aquí
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
