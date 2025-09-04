import { useAuth } from "../context/AuthContext";
import { NavLink, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useState, useEffect } from "react";
import { GiWhistle } from "react-icons/gi";
import { FaCrown } from "react-icons/fa6";
import Loader from "../components/Loader";
import UsernameModal from "../components/UsernameModal";

const Dashboard = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [partidos, setPartidos] = useState<any[]>([]);
  const [selectedCompetition, setSelectedCompetition] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [predictedMatches, setPredictedMatches] = useState<Set<string>>(
    new Set()
  );
  const [predictedDetails, setPredictedDetails] = useState<
    Record<
      string,
      {
        home_goals: number | null;
        visit_goals: number | null;
        king_player_id?: string | null;
        king_name?: string | null;
      }
    >
  >({});
  const [usernameModalOpen, setUsernameModalOpen] = useState(false);

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
          king_id (id, name, photo),
          competition_id (id, name)
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

  // Fetch which matches have predictions for this user and details
  useEffect(() => {
    const fetchPredicted = async () => {
      if (!user?.id || partidos.length === 0) return;
      const ids = partidos.map((p) => p.id);
      const { data, error } = await supabase
        .from("predictions")
        .select("match_id, type, home_goals, visit_goals, player_id")
        .eq("user_id", user.id)
        .in("match_id", ids);
      if (error) {
        console.error("Error fetching user predictions:", error);
        return;
      }
      const set = new Set<string>((data ?? []).map((r: any) => r.match_id));
      setPredictedMatches(set);

      // Build details and fetch king player names
      const details: Record<
        string,
        {
          home_goals: number | null;
          visit_goals: number | null;
          king_player_id?: string | null;
          king_name?: string | null;
        }
      > = {};
      const kingIds = new Set<string>();
      (data ?? []).forEach((r: any) => {
        if (!details[r.match_id])
          details[r.match_id] = { home_goals: null, visit_goals: null };
        if (r.type === 1) {
          details[r.match_id].home_goals = r.home_goals ?? 0;
          details[r.match_id].visit_goals = r.visit_goals ?? 0;
        } else if (r.type === 3 && r.player_id) {
          details[r.match_id].king_player_id = r.player_id;
          kingIds.add(r.player_id);
        }
      });

      if (kingIds.size > 0) {
        const { data: players, error: pErr } = await supabase
          .from("players")
          .select("id, name")
          .in("id", Array.from(kingIds));
        if (!pErr) {
          const nameById: Record<string, string> = {};
          (players ?? []).forEach((p: any) => (nameById[p.id] = p.name));
          Object.values(details).forEach((d) => {
            if (d.king_player_id)
              d.king_name = nameById[d.king_player_id] ?? null;
          });
        }
      }
      setPredictedDetails(details);
    };
    fetchPredicted();
  }, [user?.id, partidos]);

  if (!user) {
    return <div>Please login to access the dashboard</div>;
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/login"); // Redirect after sign out
  };

  // Derive competitions from fetched matches
  const competitions = (() => {
    const map = new Map<string, { id: string; name: string }>();
    for (const m of partidos) {
      const id = m?.competition_id?.id;
      const name = m?.competition_id?.name ?? "Sin competencia";
      if (id) map.set(id, { id, name });
    }
    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  })();

  // Group matches by competition for the 'all' view
  const groupedByCompetition: Record<string, { name: string; matches: any[] }> =
    partidos.reduce(
      (acc: Record<string, { name: string; matches: any[] }>, m: any) => {
        const id = m?.competition_id?.id ?? "none";
        const name = m?.competition_id?.name ?? "Sin competencia";
        if (!acc[id]) acc[id] = { name, matches: [] };
        acc[id].matches.push(m);
        return acc;
      },
      {}
    );

  const onClickSubirPredicciones = (matchId: string) => {
    if (!profile?.username) {
      setUsernameModalOpen(true);
    } else {
      navigate(`/predicciones/${matchId}`);
    }
  };

  const renderMatchCard = (partido: any) => (
    <div
      key={partido.id}
      className="flex flex-col space-y-3 bg-card w-full max-w-2xl border items-center border-gray-600 bg-primary p-4 rounded-lg shadow-md shadow-black"
    >
      <p className="text-white  w-full text-center text-base font-semibold">
        {partido?.competition_id?.name ?? "Sin competencia"}
      </p>
      {/* removed badge when predicted */}
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
              const month = date.toLocaleString("es-ES", { month: "long" });
              const hours = date.getHours().toString().padStart(2, "0");
              const minutes = date.getMinutes().toString().padStart(2, "0");
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
            10 minutos antes del pitazo final.
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

      {partido.finished && (
        <NavLink
          to={`/match/${partido.id}`}
          className="mt-2 border hover:cursor-pointer border-gray-600 flex items-center justify-center gap-1 p-2 text-sm text-white rounded-md"
        >
          Ver calificaciones
        </NavLink>
      )}

      {partido.bettable && (
        <div className="w-full">
          {predictedMatches.has(partido.id) ? (
            <div className="w-full mt-1 flex items-center justify-between gap-3 border border-gray-600 rounded-md px-3 py-2">
              <div className="text-sm text-gray-200">
                {(() => {
                  const d = predictedDetails[partido.id];
                  const score = d
                    ? `${d.home_goals ?? 0}-${d.visit_goals ?? 0}`
                    : "-";
                  const k = d?.king_name ?? "-";
                  return (
                    <span>
                      Tu pronóstico:{" "}
                      <span className="text-yellow-400 font-semibold">
                        {score}
                      </span>{" "}
                      <br className="sm:hidden" />{" "}
                      {/* add a space between the two lines */}
                      <span className="hidden sm:inline">—</span> King del
                      Partido:{" "}
                      <span className="text-yellow-400 font-semibold">{k}</span>
                    </span>
                  );
                })()}
              </div>
              <NavLink
                to={`/predicciones/${partido.id}`}
                className="shrink-0 border border-gray-600 rounded-md px-2 py-1 text-sm text-gray-200 hover:border-yellow-600 hover:text-yellow-400"
              >
                Ver más
              </NavLink>
            </div>
          ) : (
            <button
              onClick={() => onClickSubirPredicciones(partido.id)}
              className="w-full mt-1 rounded-md bg-yellow-500/90 text-black font-semibold px-3 py-2 hover:bg-yellow-500"
            >
              Subir predicciones
            </button>
          )}
          {profile?.role === "staff" && (
            <button
              onClick={() => navigate(`/staff/predicciones/${partido.id}`)}
              className="w-full mt-2 rounded-md border border-yellow-600/60 text-yellow-400 font-medium px-3 py-2 hover:border-yellow-500"
            >
              Ver estadísticas de predicciones (Staff)
            </button>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="container max-w-2xl mx-auto p-4 pt-2 sm:pt-4 justify-center items-center">
      {profile?.role != "authenticated" && (
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-base w-full flex items-center underline underline-offset-4 gap-2 font-bold text-yellow-400">
            <FaCrown className="text-yellow-400 text-base inline-block" />{" "}
            Acceso total
          </h1>
        </div>
      )}
      {loading && <Loader />}

      {/* Competition filter badges */}
      <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedCompetition("all")}
          className={`whitespace-nowrap px-3 py-1 rounded-md border text-sm ${
            selectedCompetition === "all"
              ? "border-yellow-500 text-yellow-400 bg-yellow-500/10"
              : "border-gray-600 text-gray-300 hover:border-yellow-600 hover:text-yellow-400"
          }`}
        >
          Todas
        </button>
        {competitions.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedCompetition(c.id)}
            className={`whitespace-nowrap px-3 py-1 rounded-md border text-sm ${
              selectedCompetition === c.id
                ? "border-yellow-500 text-yellow-400 bg-yellow-500/10"
                : "border-gray-600 text-gray-300 hover:border-yellow-600 hover:text-yellow-400"
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {loading ? null : partidos.length === 0 ? (
          <p className="text-gray-400">No se encontraron partidos.</p>
        ) : (
          <div className="space-y-6 w-full flex flex-col items-center">
            {selectedCompetition === "all" ? (
              Object.entries(groupedByCompetition)
                .sort((a, b) => a[1].name.localeCompare(b[1].name))
                .map(([compId, group]) => (
                  <div
                    key={compId}
                    className="w-full flex flex-col items-center gap-3"
                  >
                    <div className="w-full max-w-2xl">
                      <h2 className="text-gray-300 text-sm uppercase tracking-wide border-b border-gray-700 pb-1">
                        {group.name}
                      </h2>
                    </div>
                    <div className="space-y-4 w-full flex flex-col items-center">
                      {group.matches.map((m) => renderMatchCard(m))}
                    </div>
                  </div>
                ))
            ) : (
              <div className="space-y-4 w-full flex flex-col items-center">
                {partidos
                  .filter((m) => m?.competition_id?.id === selectedCompetition)
                  .map((m) => renderMatchCard(m))}
              </div>
            )}
          </div>
        )}
      </div>

      <UsernameModal
        open={usernameModalOpen}
        onClose={() => setUsernameModalOpen(false)}
      />

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
