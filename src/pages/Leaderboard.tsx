import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import Loader from "../components/Loader";
import { FaCrown, FaTrophy, FaMedal, FaEye, FaTimes } from "react-icons/fa";
import { PiSoccerBallFill } from "react-icons/pi";
import { MdOutlineScoreboard } from "react-icons/md";
import { StarIcon } from "@heroicons/react/20/solid";

// Countdown Timer Component
const CountdownTimer = () => {
  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    const targetDate = new Date("2025-09-14T15:00:00-05:00"); // September 14, 2025 at 15:00 COT

    const updateCountdown = () => {
      const now = new Date();
      const difference = targetDate.getTime() - now.getTime();

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor(
          (difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
        );
        const minutes = Math.floor(
          (difference % (1000 * 60 * 60)) / (1000 * 60)
        );
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
      } else {
        setTimeLeft("¡Premio finalizado!");
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-black/30 rounded-lg px-3 py-2 border border-orange-500/30">
      <p className="text-orange-300 text-sm font-medium">⏰ Tiempo restante:</p>
      <p className="text-yellow-400 text-lg font-bold font-mono">{timeLeft}</p>
    </div>
  );
};

type ProfileRow = {
  id: string;
  username: string;
  points: number;
};

type MatchRow = {
  id: string;
  datetime: string;
  stadium?: string | null;
  finished?: boolean | null;
  home_goals?: number | null;
  visit_goals?: number | null;
  team_home_id: { id: string; name: string; badge: string };
  team_visit_id: { id: string; name: string; badge: string };
  competition_id?: { id: string; name: string } | null;
};

type PredictionRow = {
  id: string;
  user_id: string;
  match_id: string;
  type: number; // 1=score, 2=scorer, 3=king
  home_goals?: number | null;
  visit_goals?: number | null;
  player_id?: string | null;
  multiplier?: boolean | null;
};

type PlayerRow = {
  id: string;
  name: string;
  photo?: string | null;
};

type UserPrediction = {
  match: MatchRow;
  predictions: PredictionRow[];
  players: { [playerId: string]: PlayerRow };
};

function Leaderboard() {
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [selectedUser, setSelectedUser] = useState<ProfileRow | null>(null);
  const [userPredictions, setUserPredictions] = useState<UserPrediction[]>([]);
  const [dialogLoading, setDialogLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, points")
        .not("username", "is", null)
        .order("points", { ascending: false });

      if (error) throw error;
      setProfiles(data || []);
    } catch (e: any) {
      console.error("Error fetching leaderboard:", e);
      setError("Error cargando tabla de posiciones");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPredictions = async (userId: string) => {
    try {
      setDialogLoading(true);

      // Fetch all predictions for this user
      const { data: predictions, error: predError } = await supabase
        .from("predictions")
        .select(
          "id, user_id, match_id, type, home_goals, visit_goals, player_id, multiplier"
        )
        .eq("user_id", userId);

      if (predError) throw predError;

      if (!predictions || predictions.length === 0) {
        setUserPredictions([]);
        return;
      }

      // Get unique match IDs
      const matchIds = [...new Set(predictions.map((p) => p.match_id))];

      // Fetch match details
      const { data: matches, error: matchError } = await supabase
        .from("matches")
        .select(
          `
          id, datetime, stadium, finished, home_goals, visit_goals,
          team_home_id (id, name, badge),
          team_visit_id (id, name, badge),
          competition_id (id, name)
        `
        )
        .in("id", matchIds)
        .order("datetime", { ascending: false });

      if (matchError) throw matchError;

      // Get unique player IDs for scorer and king predictions
      const playerIds = [
        ...new Set(
          predictions.filter((p) => p.player_id).map((p) => p.player_id!)
        ),
      ];

      let players: PlayerRow[] = [];
      if (playerIds.length > 0) {
        const { data: playersData, error: playersError } = await supabase
          .from("players")
          .select("id, name, photo")
          .in("id", playerIds);

        if (playersError) throw playersError;
        players = playersData || [];
      }

      // Group predictions by match
      const userPredictionsGrouped: UserPrediction[] = (matches || []).map(
        (match) => {
          const matchPredictions = predictions.filter(
            (p) => p.match_id === match.id
          );
          const playersMap: { [playerId: string]: PlayerRow } = {};

          players.forEach((player) => {
            playersMap[player.id] = player;
          });

          return {
            match: match as unknown as MatchRow,
            predictions: matchPredictions,
            players: playersMap,
          };
        }
      );

      setUserPredictions(userPredictionsGrouped);
    } catch (e: any) {
      console.error("Error fetching user predictions:", e);
      setError("Error cargando predicciones del usuario");
    } finally {
      setDialogLoading(false);
    }
  };

  const openPredictionsDialog = async (user: ProfileRow) => {
    setSelectedUser(user);
    await fetchUserPredictions(user.id);
  };

  const closePredictionsDialog = () => {
    setSelectedUser(null);
    setUserPredictions([]);
  };

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <FaTrophy className="text-yellow-500 text-xl" />;
      case 1:
        return <FaMedal className="text-gray-400 text-xl" />;
      case 2:
        return <FaMedal className="text-amber-600 text-xl" />;
      default:
        return (
          <span className="text-gray-400 text-lg font-bold">{index + 1}</span>
        );
    }
  };

  if (loading) {
    return <Loader />;
  }

  return (
    <div className="mx-auto max-w-4xl container p-4 sm:pt-6 pb-28">
      {/* Header */}
      <div className="text-center space-y-2 flex flex-col items-center mb-6">
        <div className="flex items-center gap-3">
          <FaCrown className="text-yellow-400 text-3xl" />
          <h1 className="text-3xl font-bold text-yellow-400">
            Tabla de Posiciones
          </h1>
          <FaCrown className="text-yellow-400 text-3xl" />
        </div>
        <p className="text-gray-400 text-sm">
          Clasificación de usuarios por puntos obtenidos
        </p>
      </div>

      {/* Pollos Pepe Promotional Banner */}
      <div className="mb-6 w-full max-w-4xl rounded-xl p-4 bg-gradient-to-r from-orange-600/20 via-yellow-500/20 to-orange-600/20 border border-orange-500/50 shadow-[0_0_20px_rgba(249,115,22,0.3)]">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-2xl">🍗</span>
            <h3 className="text-orange-400 font-bold text-lg">
              ¡PREMIO ESPECIAL!
            </h3>
            <span className="text-2xl">🍗</span>
          </div>
          <p className="text-white font-semibold text-base mb-1">
            Usuario con más puntos el
          </p>
          <p className="text-yellow-400 font-bold text-xl mb-1">
            Domingo 14 de Septiembre 2025 - 15:00
          </p>
          <p className="text-white font-semibold text-base mb-3">
            gana un combo de{" "}
            <span className="text-orange-400 font-bold">Pollos Pepe</span> 🍗
          </p>
          <CountdownTimer />
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Leaderboard */}
      <div className="w-full max-w-4xl bg-primary border border-gray-600 rounded-lg shadow-md shadow-black overflow-hidden">
        <div className="bg-yellow-500/10 border-b border-gray-600 px-4 py-3">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <FaTrophy className="text-yellow-400" />
            Clasificación General
          </h2>
        </div>

        {profiles.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            No hay usuarios con puntos registrados
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {profiles.map((profile, index) => (
              <div
                key={profile.id}
                className={`p-4 flex items-center justify-between hover:bg-black/20 transition-colors ${
                  index < 3 ? "bg-yellow-500/5" : ""
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-12">
                    {getRankIcon(index)}
                  </div>
                  <div>
                    <h3 className="text-white font-medium text-lg">
                      {profile.username}
                    </h3>
                    <p className="text-gray-400 text-sm">
                      {profile.points} punto{profile.points !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span
                      className={`text-2xl font-bold ${
                        index === 0
                          ? "text-yellow-400"
                          : index === 1
                          ? "text-gray-300"
                          : index === 2
                          ? "text-amber-600"
                          : "text-white"
                      }`}
                    >
                      {profile.points}
                    </span>
                    <p className="text-gray-400 text-xs">puntos</p>
                  </div>
                  <button
                    onClick={() => openPredictionsDialog(profile)}
                    className="px-3 py-2 bg-yellow-500/20 border border-yellow-500/50 text-yellow-400 rounded-md hover:bg-yellow-500/30 transition-colors flex items-center gap-2 text-sm"
                  >
                    <FaEye className="text-xs" />
                    Ver predicciones
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Back to Dashboard */}
      <div className="text-center mt-6">
        <NavLink
          to="/dashboard"
          className="inline-block text-sm text-gray-300 hover:text-yellow-400"
        >
          Volver a Partidos
        </NavLink>
      </div>

      {/* Predictions Dialog */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center max-h-lg p-4 z-50">
          <div className="bg-primary border bg-card border-gray-600 rounded-lg max-w-4xl w-full max-h-lg overflow-hidden">
            {/* Dialog Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-600">
              <h2 className="text-white text-xl font-semibold">
                Predicciones de {selectedUser.username}
              </h2>
              <button
                onClick={closePredictionsDialog}
                className="text-gray-400 hover:text-white p-1"
              >
                <FaTimes />
              </button>
            </div>

            {/* Dialog Content */}
            <div className="p-4 overflow-y-auto max-h-[calc(90vh-8rem)]">
              {dialogLoading ? (
                <div className="flex text-gray-400 justify-center py-8">
                  Cargando...
                </div>
              ) : userPredictions.length === 0 && !dialogLoading ? (
                <div className="text-center py-8 text-gray-400">
                  Este usuario no ha hecho predicciones aún
                </div>
              ) : (
                <div className="space-y-4">
                  {userPredictions.map((userPred) => {
                    const match = userPred.match;
                    const predictions = userPred.predictions;
                    const scorePrediction = predictions.find(
                      (p) => p.type === 1
                    );
                    const scorerPredictions = predictions.filter(
                      (p) => p.type === 2
                    );
                    const kingPrediction = predictions.find(
                      (p) => p.type === 3
                    );

                    const dateLabel = (() => {
                      const d = new Date(match.datetime);
                      const day = d.getDate();
                      const month = d.toLocaleString("es-ES", {
                        month: "long",
                      });
                      const hours = d.getHours().toString().padStart(2, "0");
                      const minutes = d
                        .getMinutes()
                        .toString()
                        .padStart(2, "0");
                      return `${day} ${
                        month.charAt(0).toUpperCase() + month.slice(1)
                      } ${hours}:${minutes}`;
                    })();

                    return (
                      <div
                        key={match.id}
                        className="border border-gray-700 rounded-lg p-4 bg-black/20"
                      >
                        {/* Match Info */}
                        <div className="mb-4">
                          <p className="text-white text-center text-sm font-semibold mb-2">
                            {match.competition_id?.name ?? "Sin competencia"}
                          </p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <img
                                src={match.team_home_id.badge}
                                className="size-6"
                              />
                              <span className="text-gray-200 text-sm">
                                {match.team_home_id.name}
                              </span>
                            </div>
                            <div className="text-center">
                              {match.finished &&
                              match.home_goals !== null &&
                              match.visit_goals !== null ? (
                                <span className="text-white font-semibold">
                                  {match.home_goals} - {match.visit_goals}
                                </span>
                              ) : (
                                <span className="text-gray-400 text-xs">
                                  {dateLabel}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-200 text-sm">
                                {match.team_visit_id.name}
                              </span>
                              <img
                                src={match.team_visit_id.badge}
                                className="size-6"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Score Prediction */}
                          {scorePrediction && (
                            <div className="border border-gray-700 rounded-md p-3">
                              <h4 className="text-white font-medium mb-2 flex items-center gap-1">
                                <MdOutlineScoreboard className="text-yellow-400" />
                                Marcador
                              </h4>
                              <div className="text-center">
                                <span className="text-yellow-400 font-semibold">
                                  {scorePrediction.home_goals} -{" "}
                                  {scorePrediction.visit_goals}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Scorers */}
                          {scorerPredictions.length > 0 && (
                            <div className="border border-gray-700 rounded-md p-3">
                              <h4 className="text-white font-medium mb-2 flex items-center gap-1">
                                <PiSoccerBallFill className="text-yellow-400" />
                                Goleadores
                              </h4>
                              <div className="space-y-1">
                                {scorerPredictions.map((pred, idx) => {
                                  const player =
                                    userPred.players[pred.player_id!];
                                  return (
                                    <div
                                      key={idx}
                                      className="flex items-center gap-2 text-sm"
                                    >
                                      <img
                                        src={
                                          player?.photo ??
                                          "https://mafisa-group-assets.nyc3.cdn.digitaloceanspaces.com/kingdelpartido/assets/player-fallback-dark.png"
                                        }
                                        className="size-4 rounded-full object-cover"
                                      />
                                      <span className="text-gray-200">
                                        {player?.name ?? "Jugador"}
                                      </span>
                                      {pred.multiplier && (
                                        <StarIcon className="size-3 text-yellow-400" />
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* King */}
                          {kingPrediction && (
                            <div className="border border-gray-700 rounded-md p-3">
                              <h4 className="text-white font-medium mb-2 flex items-center gap-1">
                                <FaCrown className="text-yellow-400" />
                                King
                              </h4>
                              <div className="flex items-center gap-2 text-sm">
                                <img
                                  src={
                                    userPred.players[kingPrediction.player_id!]
                                      ?.photo ??
                                    "https://mafisa-group-assets.nyc3.cdn.digitaloceanspaces.com/kingdelpartido/assets/player-fallback-dark.png"
                                  }
                                  className="size-4 rounded-full object-cover"
                                />
                                <span className="text-gray-200">
                                  {userPred.players[kingPrediction.player_id!]
                                    ?.name ?? "Jugador"}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer branding */}
      <div className="flex justify-center mt-6">
        <div className="flex flex-col items-center">
          <span className="text-gray-400 text-sm">Powered by</span>
          <a
            href="https://lobsterlabs.net"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              src="https://mafisa-group-assets.nyc3.cdn.digitaloceanspaces.com/kingdelpartido/assets/lobster_logo_white.png"
              alt="lobster logo"
              className="h-4 w-auto"
            />
          </a>
        </div>
      </div>
    </div>
  );
}

export default Leaderboard;
