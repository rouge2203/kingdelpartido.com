import { useAuth } from "../context/AuthContext";
import { NavLink, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useState, useEffect } from "react";
import { GiWhistle } from "react-icons/gi";
import { FaCrown } from "react-icons/fa6";
import Loader from "../components/Loader";

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [partidos, setPartidos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchPartidos = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("matches")
        .select(
          `
          *,
          team_home_id (id, name, badge),
          team_visit_id (id, name, badge),
          king_id (id, name, photo)
        `
        )
        .eq("visible", true)
        .order("datetime", { ascending: false });

      if (error) {
        console.error("Error fetching partidos:", error);
      } else {
        setPartidos(data);
        console.log("PARTIDOS WITH TEAMS --> ", data);
        setLoading(false);
      }
    };
    fetchPartidos();
  }, []);

  if (!user) {
    return <div>Please login to access the dashboard</div>;
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/login"); // Redirect after sign out
  };

  return (
    <div className="container max-w-2xl mx-auto p-4 sm:pt-10 justify-center items-center">
      {loading && <Loader />}
      <h1 className="text-2xl sm:text-4xl w-full flex sm:justify-center  items-center gap-2 font-bold text-yellow-400">
        <FaCrown className="text-yellow-400 text-2xl sm:text-4xl inline" /> King
        del Partido
      </h1>

      <div className="mt-4">
        {loading ? null : partidos.length === 0 ? (
          <p className="text-gray-400">No se encontraron partidos.</p>
        ) : (
          <div className="space-y-4  w-full flex flex-col items-center">
            {partidos.map((partido) => (
              <div
                key={partido.id}
                className="flex flex-col space-y-3 bg-card w-full max-w-2xl border items-center border-gray-600 bg-primary p-4 rounded-lg shadow-md shadow-black"
              >
                <p className="text-white  w-full text-center text-base font-semibold">
                  Primera División
                </p>
                {partido.stadium && (
                  <p className="text-gray-400 -mt-2  text-xs   w-full text-center font-semibold">
                    {partido.stadium}
                  </p>
                )}
                <div className="flex flex-row items-center justify-between w-full ">
                  <div className="flex flex-col items-center space-y-1 w-1/3">
                    <img
                      className="size-10 aspect-square"
                      src={partido.team_home_id.badge}
                    />
                    <p className="text-white text-base font-medium">
                      {partido.team_home_id.name}
                    </p>
                  </div>
                  {!partido.finished && partido.home_goals == null ? (
                    <p className="text-gray-400 w-1/3 text-center text-sm">
                      {(() => {
                        const date = new Date(partido.datetime);
                        const day = date.getDate();
                        const month = date.toLocaleString("es-ES", {
                          month: "long",
                        });
                        const hours = date
                          .getHours()
                          .toString()
                          .padStart(2, "0");
                        const minutes = date
                          .getMinutes()
                          .toString()
                          .padStart(2, "0");
                        return `${day} ${
                          month.charAt(0).toUpperCase() + month.slice(1)
                        } ${hours}:${minutes}`;
                      })()}
                    </p>
                  ) : (
                    <p className="text-gray-400 w-1/3 text-center text-2xl sm:text-3xl font-medium">
                      {partido.home_goals} - {partido.visit_goals}
                    </p>
                  )}
                  <div className="flex flex-col items-center space-y-1 w-1/3">
                    <img
                      className="size-10 aspect-square"
                      src={partido.team_visit_id.badge}
                    />
                    <p className="text-white text-base font-medium">
                      {partido.team_visit_id.name}
                    </p>
                  </div>
                </div>

                {!partido.ratable && !partido.finished && (
                  <div className="flex flex-col items-center">
                    <p className="text-sm text-center flex   text-gray-200 font-medium">
                      Podrás calificar a los jugadores hasta
                    </p>
                    <p className="text-sm text-center flex   text-gray-200 font-medium">
                      10 minutos antes pitazo final.
                      <span className="inline align-text-bottom ml-1">
                        <GiWhistle className="text-yellow-500 size-5 inline" />
                      </span>
                    </p>
                  </div>
                )}

                {partido.ratable && !partido.finished && (
                  <NavLink
                    to={`/match/${partido.id}`}
                    className="border hover:cursor-pointer border-yellow-500 flex items-center justify-center gap-1 p-2 text-sm text-white rounded-md shadow-md shadow-yellow-500/50"
                  >
                    <FaCrown className="text-yellow-500 text-sm inline" />
                    Calificar jugadores
                  </NavLink>
                )}

                {partido.finished && (
                  <div className="w-full max-w-lg bg-yellow-500/10 border border-gray-600 rounded-lg p-3 sm:p-4 flex items-center justify-between shadow-md shadow-black">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="relative">
                        <img
                          className="size-12 sm:size-14 rounded-full object-cover border-2 border-yellow-500"
                          src={partido.king_id.photo}
                          alt={`${partido.king_id.name} photo`}
                        />
                        <FaCrown className="absolute -top-2 -left-2 size-5 text-yellow-500 bg-black/60 rounded-full p-0.5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] sm:text-xs text-gray-400 tracking-wide uppercase">
                          King del Partido
                        </span>
                        <span className="text-white text-xl sm:text-2xl font-semibold leading-none">
                          {partido.king_id.name}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <span className="hidden sm:inline text-yellow-500 text-sm">
                        Votos
                      </span>
                      <span className="px-2 py-1 rounded-md bg-yellow-500/10 border border-yellow-500 text-yellow-400 text-sm sm:text-base font-semibold">
                        {partido.percentage_king}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-between items-center  mt-4">
        <div className="flex flex-col  self-center">
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
        <button
          onClick={handleSignOut}
          className=" text-white px-4 py-2 rounded-md border border-gray-600 hover:cursor-pointer"
        >
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
};

export default Dashboard;
