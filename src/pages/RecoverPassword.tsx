import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LuLock, LuEye, LuEyeOff, LuCheck } from "react-icons/lu";
import logo from "../assets/monkey_logo.png";
import { supabase } from "../lib/supabaseClient";

export default function RecoverPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const navigate = useNavigate();

  // Verify there's an active session from the reset link
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(!!session);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setMessage("");
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setError(
          error.message ||
            "No se pudo actualizar la contraseña. Abre el enlace del correo nuevamente."
        );
      } else {
        setMessage(
          "¡Contraseña actualizada correctamente! Ya puedes iniciar sesión."
        );
        // Optionally redirect to login after a short delay
        setTimeout(() => navigate("/login"), 1200);
      }
    } catch (err: any) {
      setError(err?.message || "Ocurrió un error al actualizar la contraseña.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="bg-primary border border-gray-600 rounded-lg p-6 shadow-md bg-card shadow-black">
          {/* Header */}
          <div className="text-center space-y-2 flex flex-col items-center">
            <img src={logo} alt="King del Partido logo" className="size-30" />
            <h1 className="text-3xl font-bold text-yellow-400">
              Nueva contraseña
            </h1>
            <p className="text-gray-400 text-sm">Ingresa tu nueva contraseña</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 my-8">
            {hasSession === false && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-md p-3">
                <p className="text-yellow-400 text-sm">
                  No encontramos una sesión activa. Asegúrate de abrir este
                  formulario desde el enlace recibido en tu correo.
                </p>
              </div>
            )}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-md p-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}
            {message && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-md p-3">
                <div className="flex items-center gap-2">
                  <LuCheck className="h-4 w-4 text-green-400" />
                  <p className="text-green-400 text-sm">{message}</p>
                </div>
              </div>
            )}
            {/* Password Field */}
            <div className="space-y-2">
              <label
                htmlFor="password"
                className="text-sm font-medium text-gray-200"
              >
                Contraseña
              </label>
              <div className="relative mt-1.5">
                <LuLock className="absolute left-3 top-4 h-4 w-4 text-gray-400" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full pl-10 pr-12 py-2.5 bg-black border border-gray-600 rounded-md text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-colors"
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
                htmlFor="confirmPassword"
                className="text-sm font-medium text-gray-200"
              >
                Confirmar contraseña
              </label>
              <div className="relative mt-1.5">
                <LuLock className="absolute left-3 top-4 h-4 w-4 text-gray-400" />
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirma tu contraseña"
                  className="w-full pl-10 pr-12 py-2.5 bg-black border border-gray-600 rounded-md text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-colors"
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

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-md p-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 bg-yellow-400 hover:bg-yellow-500 text-black font-semibold py-2.5 rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-yellow-400/20"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent"></div>
                  Guardando...
                </div>
              ) : (
                "Actualizar contraseña"
              )}
            </button>
          </form>

          <div className="text-center">
            <p className="text-gray-400 text-sm">
              ¿Ya la actualizaste?{" "}
              <Link
                to="/login"
                className="text-yellow-400 hover:text-yellow-300 font-medium transition-colors"
              >
                Inicia sesión
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
