import { useState } from "react";
import { Link } from "react-router-dom";
import { LuMail } from "react-icons/lu";
import logo from "../assets/monkey_logo.png";
import { supabase } from "../lib/supabaseClient";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const redirectTo = `${window.location.origin}/recover-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });
      if (error) {
        setError(error.message);
      } else {
        setMessage(
          "Hemos enviado un correo con instrucciones para restablecer tu contraseña."
        );
      }
    } catch (err: any) {
      setError(err?.message || "Ocurrió un error al enviar el correo.");
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
              Recuperar acceso
            </h1>
            <p className="text-gray-400 text-sm">
              Ingresa tu correo y te enviaremos instrucciones
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 my-8">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-md p-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}
            {message && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-md p-3">
                <p className="text-green-400 text-sm">{message}</p>
              </div>
            )}
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-sm font-medium text-gray-200"
              >
                Correo electrónico
              </label>
              <div className="relative mt-1.5">
                <LuMail className="absolute left-3 top-4 h-4 w-4 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-black border border-gray-600 rounded-md text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-colors"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 bg-yellow-400 hover:bg-yellow-500 text-black font-semibold py-2.5 rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-yellow-400/20"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent"></div>
                  Enviando...
                </div>
              ) : (
                "Enviar instrucciones"
              )}
            </button>
          </form>

          <div className="text-center">
            <p className="text-gray-400 text-sm">
              ¿Recordaste tu contraseña?{" "}
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
