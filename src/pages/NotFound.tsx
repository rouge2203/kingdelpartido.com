import { Link } from "react-router-dom";
import { FaCrown } from "react-icons/fa6";
import { LuArrowLeft } from "react-icons/lu";
import { TiHome } from "react-icons/ti";

function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-black">
      <div className="w-full max-w-md space-y-6 text-center">
        {/* Header with Crown */}
        <div className="space-y-4">
          <div className="flex justify-center items-center gap-2">
            <FaCrown className="text-yellow-400 text-3xl" />
            <h1 className="text-3xl font-bold text-yellow-400">
              King del Partido
            </h1>
          </div>
        </div>

        {/* 404 Message */}
        <div className="bg-primary border border-gray-600 rounded-lg p-8 shadow-md shadow-black">
          <div className="space-y-4">
            <div className="text-8xl font-bold text-yellow-400 opacity-50">
              404
            </div>
            <h2 className="text-2xl font-bold text-white">
              Página no encontrada
            </h2>
            <p className="text-gray-400 text-sm">
              La página que estás buscando no existe o ha sido movida.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Link
            to="/dashboard"
            className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-semibold py-2.5 px-4 rounded-md transition-colors duration-200 shadow-md shadow-yellow-400/20 flex items-center justify-center gap-2"
          >
            <TiHome className="h-4 w-4" />
            Ir al Dashboard
          </Link>

          <button
            onClick={() => window.history.back()}
            className="w-full border border-gray-600 hover:border-gray-500 text-gray-200 hover:text-white font-medium py-2.5 px-4 rounded-md transition-colors duration-200 flex items-center justify-center gap-2"
          >
            <LuArrowLeft className="h-4 w-4" />
            Volver atrás
          </button>
        </div>

        {/* Login Link */}
        <div className="text-center pt-4">
          <p className="text-gray-400 text-sm">
            ¿Necesitas acceder?{" "}
            <Link
              to="/login"
              className="text-yellow-400 hover:text-yellow-300 font-medium transition-colors"
            >
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default NotFound;
