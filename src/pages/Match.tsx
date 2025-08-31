import { useParams, useNavigate, NavLink } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { GiWhistle } from "react-icons/gi";
import {
  FaCrown,
  FaChevronLeft,
  FaChevronRight,
  FaCheck,
  FaXmark,
} from "react-icons/fa6";
import { FaRunning, FaExchangeAlt, FaUserTie } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import monkeyPointing from "../assets/monkey_pointing.png";
import monkeyPointingRightSm from "../assets/monkey_pointing_right_sm.png";
import Loader from "../components/Loader";

function Match() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [partido, setPartido] = useState<any>(null);
  const [playersHome, setPlayersHome] = useState<any[]>([]);
  const [playersVisit, setPlayersVisit] = useState<any[]>([]);
  const [playersDt, setPlayersDt] = useState<any[]>([]);
  const [currentHomeIndex, setCurrentHomeIndex] = useState(0);
  const [currentVisitIndex, setCurrentVisitIndex] = useState(0);
  const [currentDtIndex, setCurrentDtIndex] = useState(0);
  const [activeTeam, setActiveTeam] = useState<"home" | "visit" | "dt">("home");
  const [ratings, setRatings] = useState<{ [playerId: string]: number }>({});
  const [selectedKing, setSelectedKing] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasAlreadyRated, setHasAlreadyRated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [averageRatings, setAverageRatings] = useState<{
    [playerId: string]: number;
  }>({});
  const [userRatings, setUserRatings] = useState<
    Array<{ match_players_id: string; rating: number; king: boolean }>
  >([]);
  const [mpIdToPlayerId, setMpIdToPlayerId] = useState<Record<string, string>>(
    {}
  );
  const [playerById, setPlayerById] = useState<Record<string, any>>({});
  const [peopleKing, setPeopleKing] = useState<{
    playerId: string | null;
    percentage: number;
    votes: number;
    totalVotes: number;
  }>({ playerId: null, percentage: 0, votes: 0, totalVotes: 0 });
  const { user } = useAuth();

  // Check if current user already rated players for this match
  const checkExistingRatings = async () => {
    if (!user || !id) return false;
    try {
      // Find all match_player ids for this match
      const { data: matchPlayers, error: mpError } = await supabase
        .from("match_players")
        .select("id")
        .eq("match_id", id);

      if (mpError) {
        console.error(
          "Error fetching match players for rating check:",
          mpError
        );
        return false;
      }

      const matchPlayerIds = (matchPlayers ?? []).map((mp: any) => mp.id);
      if (matchPlayerIds.length === 0) return false;

      // Check if there is at least one rating by this user for any player in the match
      const { data: existing, error: ratingsError } = await supabase
        .from("ratings")
        .select("id")
        .eq("user_id", user.id)
        .in("match_players_id", matchPlayerIds)
        .limit(1);

      if (ratingsError) {
        console.error("Error checking existing ratings:", ratingsError);
        return false;
      }

      const alreadyRated = !!(existing && existing.length > 0);
      setHasAlreadyRated(alreadyRated);
      return alreadyRated;
    } catch (e) {
      console.error("Unexpected error checking existing ratings:", e);
      return false;
    }
  };

  useEffect(() => {
    // Prevent double rating by checking if user already rated this match
    checkExistingRatings();

    const fetchData = async () => {
      setLoading(true);

      // First fetch the match data
      const { data: matchData, error: matchError } = await supabase
        .from("matches")
        .select(
          `
            *,
            team_home_id (id, name, badge),
            team_visit_id (id, name, badge),
            king_id (id, name, photo)
        `
        )
        .eq("id", id)
        .single();

      if (matchError) {
        console.error("Error fetching partido:", matchError);
        setLoading(false);
        return;
      }

      setPartido(matchData);
      console.log("partido --> ", matchData);

      // Now fetch the players data using the match data
      const { data: playersData, error: playersError } = await supabase
        .from("match_players")
        .select(
          `
            *,
            player_id (id, name, photo, dt, team_id (id, name))
        `
        )
        .eq("match_id", id);

      if (playersError) {
        console.error("Error fetching players:", playersError);
      } else if (playersData) {
        console.log("jugadores del partido --> ", playersData);

        // Filter players by team using the match data we just fetched
        const homeTeamPlayers = playersData.filter(
          (player: any) =>
            player.player_id.team_id.id === matchData.team_home_id.id
        );
        const visitTeamPlayers = playersData.filter(
          (player: any) =>
            player.player_id.team_id.id === matchData.team_visit_id.id
        );

        console.log("home team players --> ", homeTeamPlayers);
        console.log("visit team players --> ", visitTeamPlayers);

        // Filter players with dt == true
        const dtPlayers = playersData.filter(
          (player: any) => player.dt === true
        );
        console.log("dt players --> ", dtPlayers);

        setPlayersHome(homeTeamPlayers);
        setPlayersVisit(visitTeamPlayers);
        setPlayersDt(dtPlayers);

        // Index helpers
        const _mpIdToPlayerId: Record<string, string> = {};
        const _playerById: Record<string, any> = {};
        for (const p of playersData as any[]) {
          if (p?.id && p?.player_id?.id) {
            _mpIdToPlayerId[p.id] = p.player_id.id;
            _playerById[p.player_id.id] = p.player_id;
          }
        }
        setMpIdToPlayerId(_mpIdToPlayerId);
        setPlayerById(_playerById);

        // Fetch average ratings for all players in this match in one go
        try {
          const matchPlayerIds = playersData.map((p: any) => p.id);
          if (matchPlayerIds.length > 0) {
            const { data: ratingsRows, error: ratingsFetchError } =
              await supabase
                .from("ratings")
                .select("match_players_id, rating")
                .in("match_players_id", matchPlayerIds);

            if (ratingsFetchError) {
              console.error(
                "Error fetching ratings for averages:",
                ratingsFetchError
              );
            } else if (ratingsRows) {
              // Compute average per match_players_id
              const sumCountByMatchPlayer: Record<
                string,
                { sum: number; count: number }
              > = {};
              for (const row of ratingsRows as any[]) {
                const key = row.match_players_id;
                if (!key) continue;
                if (!sumCountByMatchPlayer[key])
                  sumCountByMatchPlayer[key] = { sum: 0, count: 0 };
                sumCountByMatchPlayer[key].sum += Number(row.rating) || 0;
                sumCountByMatchPlayer[key].count += 1;
              }

              // Map match_players_id -> player_id, then to averages by player_id
              const matchPlayerIdToPlayerId: Record<string, string> = {};
              for (const p of playersData as any[]) {
                if (p?.id && p?.player_id?.id) {
                  matchPlayerIdToPlayerId[p.id] = p.player_id.id;
                }
              }

              const avgByPlayerId: { [playerId: string]: number } = {};
              for (const [mpId, agg] of Object.entries(sumCountByMatchPlayer)) {
                const playerId = matchPlayerIdToPlayerId[mpId];
                if (!playerId) continue;
                avgByPlayerId[playerId] =
                  agg.count > 0 ? agg.sum / agg.count : 0;
              }

              setAverageRatings(avgByPlayerId);
            }
          }
        } catch (e) {
          console.error("Unexpected error computing averages:", e);
        }

        // If logged-in, fetch user's existing ratings and overall king popularity
        try {
          const matchPlayerIds = playersData.map((p: any) => p.id);
          if (user && matchPlayerIds.length > 0) {
            const { data: myRows, error: myErr } = await supabase
              .from("ratings")
              .select("match_players_id, rating, king")
              .eq("user_id", user.id)
              .in("match_players_id", matchPlayerIds);

            if (myErr) {
              console.error("Error fetching user's ratings:", myErr);
            } else if (myRows) {
              setUserRatings(myRows as any);
              const already = (myRows as any[]).length > 0;
              setHasAlreadyRated(already);
              // If we want to reflect user's king selection
              const myKingRow = (myRows as any[]).find((r) => r.king);
              if (myKingRow) {
                const pid = _mpIdToPlayerId[myKingRow.match_players_id];
                if (pid) setSelectedKing(pid);
              }
            }

            // Overall king popularity
            const { data: kingRows, error: kingErr } = await supabase
              .from("ratings")
              .select("match_players_id")
              .eq("king", true)
              .in("match_players_id", matchPlayerIds);

            if (kingErr) {
              console.error("Error fetching king votes:", kingErr);
            } else if (kingRows) {
              const countsByPlayer: Record<string, number> = {};
              for (const row of kingRows as any[]) {
                const pid = _mpIdToPlayerId[row.match_players_id];
                if (!pid) continue;
                countsByPlayer[pid] = (countsByPlayer[pid] || 0) + 1;
              }
              const totalVotes = (kingRows as any[]).length;
              let leader: { playerId: string | null; votes: number } = {
                playerId: null,
                votes: 0,
              };
              for (const [pid, votes] of Object.entries(countsByPlayer)) {
                if (votes > leader.votes) leader = { playerId: pid, votes };
              }
              const percentage =
                totalVotes > 0 && leader.playerId
                  ? Math.round((leader.votes / totalVotes) * 100)
                  : 0;
              setPeopleKing({
                playerId: leader.playerId,
                percentage,
                votes: leader.votes,
                totalVotes,
              });
            }
          }
        } catch (e) {
          console.error("Unexpected error loading user ratings/king stats:", e);
        }
      }

      setLoading(false);
    };
    fetchData();
  }, [id, user]);

  if (loading) {
    return <Loader />;
  }

  if (!partido) {
    return (
      <div className="container max-w-2xl mx-auto p-4 sm:pt-10 justify-center items-center">
        <p className="text-red-400 text-center">Partido no encontrado</p>
        <button
          onClick={() => navigate("/dashboard")}
          className="mt-4 text-white px-4 py-2 rounded-md border border-gray-600 hover:cursor-pointer"
        >
          Volver al Dashboard
        </button>
      </div>
    );
  }

  const getCurrentPlayer = () => {
    switch (activeTeam) {
      case "home":
        return playersHome[currentHomeIndex];
      case "visit":
        return playersVisit[currentVisitIndex];
      case "dt":
        return playersDt[currentDtIndex];
      default:
        return null;
    }
  };

  const getCurrentTeam = () => {
    const currentPlayer = getCurrentPlayer();
    if (!currentPlayer) return null;

    if (activeTeam === "dt") {
      return currentPlayer.player_id.team_id.id === partido.team_home_id.id
        ? partido.team_home_id
        : partido.team_visit_id;
    }

    return activeTeam === "home" ? partido.team_home_id : partido.team_visit_id;
  };

  const handlePreviousPlayer = () => {
    switch (activeTeam) {
      case "home":
        if (currentHomeIndex > 0) {
          setCurrentHomeIndex(currentHomeIndex - 1);
        }
        break;
      case "visit":
        if (currentVisitIndex > 0) {
          setCurrentVisitIndex(currentVisitIndex - 1);
        }
        break;
      case "dt":
        if (currentDtIndex > 0) {
          setCurrentDtIndex(currentDtIndex - 1);
        }
        break;
    }
  };

  const handleNextPlayer = () => {
    switch (activeTeam) {
      case "home":
        if (currentHomeIndex < playersHome.length - 1) {
          setCurrentHomeIndex(currentHomeIndex + 1);
        }
        break;
      case "visit":
        if (currentVisitIndex < playersVisit.length - 1) {
          setCurrentVisitIndex(currentVisitIndex + 1);
        }
        break;
      case "dt":
        if (currentDtIndex < playersDt.length - 1) {
          setCurrentDtIndex(currentDtIndex + 1);
        }
        break;
    }
  };

  const handleRatingSelect = (rating: number) => {
    const currentPlayer = getCurrentPlayer();
    if (currentPlayer) {
      setRatings((prev) => ({
        ...prev,
        [currentPlayer.player_id.id]: rating,
      }));
    }
  };

  const getCurrentPlayerCount = () => {
    switch (activeTeam) {
      case "home":
        return playersHome.length;
      case "visit":
        return playersVisit.length;
      case "dt":
        return playersDt.length;
      default:
        return 0;
    }
  };

  const getCurrentIndex = () => {
    switch (activeTeam) {
      case "home":
        return currentHomeIndex;
      case "visit":
        return currentVisitIndex;
      case "dt":
        return currentDtIndex;
      default:
        return 0;
    }
  };

  const isFirstPlayer = getCurrentIndex() === 0;
  const isLastPlayer = getCurrentIndex() === getCurrentPlayerCount() - 1;

  const currentPlayer = getCurrentPlayer();
  const currentTeam = getCurrentTeam();
  const currentRating = currentPlayer
    ? ratings[currentPlayer.player_id.id]
    : null;
  const currentAverage = currentPlayer
    ? averageRatings[currentPlayer.player_id.id]
    : undefined;
  const isCurrentPlayerDT = !!(
    currentPlayer &&
    (currentPlayer.player_id?.dt === true || currentPlayer.dt === true)
  );
  // Derive user's selected king from their stored ratings
  const userKingPlayerId: string | null = (() => {
    const kingRow = userRatings.find((r) => r.king);
    if (!kingRow) return null;
    const pid = mpIdToPlayerId[kingRow.match_players_id];
    return pid || null;
  })();

  const handleKingSelection = (playerId: string) => {
    setSelectedKing(selectedKing === playerId ? null : playerId);
  };

  const handleSaveRatings = async () => {
    if (!user) {
      console.error("No user found; cannot save ratings");
      return;
    }
    if (hasAlreadyRated) {
      console.warn("User has already rated this match");
      return;
    }

    try {
      setSaving(true);

      // Build lookups from player_id -> match_player_id and DT flag
      const allMatchPlayers = [...playersHome, ...playersVisit, ...playersDt];
      const playerToMatchPlayerId: Record<string, string> = {};
      const playerIsDt: Record<string, boolean> = {};
      for (const mp of allMatchPlayers) {
        // mp.id is match_players.id and mp.player_id.id is players.id
        if (mp?.player_id?.id && mp?.id) {
          playerToMatchPlayerId[mp.player_id.id] = mp.id;
          playerIsDt[mp.player_id.id] = !!(
            mp.player_id?.dt === true || mp.dt === true
          );
        }
      }

      // Determine which match_player gets the king=true flag (default false for all)
      const selectedMatchPlayerId =
        selectedKing && !playerIsDt[selectedKing]
          ? playerToMatchPlayerId[selectedKing]
          : null;

      // Prepare rows to insert into ratings table (king false by default)
      const rows = Object.entries(ratings)
        .map(([playerId, rating]) => {
          const matchPlayerId = playerToMatchPlayerId[playerId];
          if (!matchPlayerId) return null; // skip if mapping missing
          const isSelectedKingRow = selectedMatchPlayerId === matchPlayerId;
          return {
            rating,
            user_id: user.id,
            king: !!isSelectedKingRow, // only selected king row gets true
            match_players_id: matchPlayerId,
          } as const;
        })
        .filter(Boolean) as Array<{
        rating: number;
        user_id: string;
        king: boolean;
        match_players_id: string;
      }>;

      if (rows.length === 0) {
        console.warn("No rows to insert");
        setSaving(false);
        return;
      }

      const { error } = await supabase.from("ratings").insert(rows);
      if (error) {
        console.error("Error inserting ratings:", error);
        setSaving(false);
        return;
      }

      // Optionally, navigate back or show success state
      console.log("Ratings uploaded successfully");
      setHasAlreadyRated(true);
      setSaving(false);
      //reload the page
      window.location.reload();
    } catch (e) {
      console.error("Unexpected error saving ratings:", e);
      setSaving(false);
    }
  };

  const getTotalPlayers = () =>
    playersHome.length + playersVisit.length + playersDt.length;
  const getTotalRatedPlayers = () => Object.keys(ratings).length;
  const allPlayersRated = getTotalRatedPlayers() === getTotalPlayers();
  const canSave = allPlayersRated && selectedKing !== null;

  return (
    <div className="container max-w-2xl mx-auto p-4 sm:pt-10 justify-center items-center">
      <h1 className="text-2xl sm:text-4xl w-full flex sm:justify-center items-center gap-2 font-bold text-yellow-400 mb-6">
        <FaCrown className="text-yellow-400 text-2xl sm:text-4xl inline" /> King
        del Partido
      </h1>

      {/* Match Information - Same as Dashboard */}
      <div className="space-y-4 w-full bg-card flex flex-col items-center mb-6">
        <div className="flex flex-col space-y-3 w-full max-w-2xl border items-center bg-card border-gray-600 bg-primary p-4 rounded-lg shadow-md shadow-black">
          <p className="text-white w-full text-center text-base font-semibold">
            Primera División
          </p>
          {partido.stadium && (
            <p className="text-gray-400 -mt-2 text-xs w-full text-center font-semibold">
              {partido.stadium}
            </p>
          )}
          <div className="flex flex-row items-center justify-between w-full ">
            <div className="flex flex-col items-center space-y-1 w-1/3">
              <img
                className="size-10 aspect-square"
                src={partido.team_home_id.badge}
                alt={`${partido.team_home_id.name} badge`}
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
                alt={`${partido.team_visit_id.name} badge`}
              />
              <p className="text-white text-base font-medium">
                {partido.team_visit_id.name}
              </p>
            </div>
          </div>

          {!partido.ratable && !partido.finished && (
            <div className="flex flex-col items-center">
              <p className="text-sm text-center flex text-gray-200 font-medium">
                Podrás calificar a los jugadores hasta
              </p>
              <p className="text-sm text-center flex text-gray-200 font-medium">
                10 minutos antes pitazo final.
                <span className="inline align-text-bottom ml-1">
                  <GiWhistle className="text-yellow-500 size-5 inline" />
                </span>
              </p>
            </div>
          )}

          {partido.finished && partido.king_id && (
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

          {hasAlreadyRated && !partido.finished && (
            <div className="w-full max-w-2xl border border-gray-600 bg-primary p-4 rounded-lg shadow-md shadow-black">
              <div className="flex items-center justify-between mb-4">
                <p className="text-base text-left text-yellow-500 flex items-center gap-1.5 font-medium">
                  <FaCheck className="inline" />
                  Ya calificaste este partido
                </p>
              </div>

              {/* Kings comparison */}
              <div className="flex flex-col gap-4 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FaCrown className="text-yellow-500" />
                    <span className="text-white text-sm sm:text-base">
                      Tu King del Partido
                    </span>
                  </div>
                  {userKingPlayerId && playerById[userKingPlayerId] ? (
                    <div className="flex items-center gap-2">
                      <img
                        className="size-8 aspect-square rounded-full object-cover"
                        src={playerById[userKingPlayerId].photo}
                        alt={`${playerById[userKingPlayerId].name} photo`}
                      />
                      <span className="text-white text-sm sm:text-base font-medium">
                        {playerById[userKingPlayerId].name}
                      </span>
                    </div>
                  ) : (
                    <span className="text-gray-400 text-sm">—</span>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FaCrown className="text-yellow-500" />
                    <span className="text-white text-sm sm:text-base">
                      King más votado ({peopleKing.percentage}%)
                    </span>
                  </div>
                  {peopleKing.playerId && playerById[peopleKing.playerId] ? (
                    <div className="flex items-center gap-2">
                      <img
                        className="size-8 aspect-square rounded-full object-cover"
                        src={playerById[peopleKing.playerId].photo}
                        alt={`${playerById[peopleKing.playerId].name} photo`}
                      />
                      <span className="text-white text-sm sm:text-base font-medium">
                        {playerById[peopleKing.playerId].name}
                      </span>
                      <span className="text-gray-300 text-sm sm:text-base">
                        {peopleKing.percentage}%
                      </span>
                    </div>
                  ) : (
                    <span className="text-gray-400 text-sm">Sin votos aún</span>
                  )}
                </div>
              </div>

              {/* User ratings list */}
              <div className="mt-2 bg-card">
                <p className="text-white text-sm font-medium mb-2">
                  Tus calificaciones
                </p>
                <div className="divide-y divide-gray-700">
                  {userRatings.map((r) => {
                    const pid = mpIdToPlayerId[r.match_players_id];
                    const p = pid ? playerById[pid] : null;
                    const avg = pid ? averageRatings[pid] : undefined;
                    return (
                      <div
                        key={r.match_players_id}
                        className="py-2 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          {p?.photo ? (
                            <img
                              className="size-8 aspect-square rounded-full object-cover"
                              src={p.photo}
                              alt={`${p?.name || "Jugador"} photo`}
                            />
                          ) : (
                            <div className="size-8 aspect-square rounded-full bg-gray-700" />
                          )}
                          <div className="flex flex-col">
                            <span className="text-white text-sm">
                              {p?.name || "Jugador"}
                            </span>
                            {typeof avg === "number" && !Number.isNaN(avg) && (
                              <span className="text-gray-400 text-xs">
                                Promedio: {avg.toFixed(1)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-green-400 text-sm sm:text-base font-semibold">
                          {r.rating}
                        </div>
                      </div>
                    );
                  })}
                  {userRatings.length === 0 && (
                    <div className="py-2 text-gray-400 text-sm">
                      No se encontraron calificaciones.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Rules Section */}
      {partido.ratable &&
        !partido.finished &&
        getTotalPlayers() > 0 &&
        !hasAlreadyRated && (
          <div className="w-full max-w-2xl border bg-card border-gray-600 bg-primary p-4 rounded-lg shadow-md shadow-black mb-6">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              {/* Text first (mobile top) */}
              {/* Desktop image (left side) */}
              <div className="hidden sm:flex w-full sm:w-1/2 justify-center order-1">
                <img
                  src={monkeyPointing}
                  alt="Reglas del juego"
                  className="max-h-40 object-contain"
                />
              </div>
              <div className="w-full sm:w-1/2 order-2">
                <h3 className="text-white text-lg font-semibold mb-2 flex items-center gap-2">
                  <img
                    src={monkeyPointingRightSm}
                    alt=""
                    className="size-14 object-contain sm:hidden"
                  />
                  Reglas del juego
                </h3>
                <ul className="list-disc list-inside text-gray-300 text-sm space-y-1">
                  <li>
                    Una puntuación de{" "}
                    <span className="text-yellow-500 font-bold">6</span> es el
                    equivalente a un{" "}
                    <span className="text-yellow-500 font-bold">regular</span>.
                  </li>
                  <li>
                    Debes elegir un solo{" "}
                    <span className="text-yellow-500 font-bold">
                      King del Partido
                    </span>
                    .
                  </li>
                  <li>
                    Debes calificar a todos los jugadores antes de subir tus
                    calificaciones.
                  </li>
                  <li>
                    El promedio es la media de las calificaciones de todos los
                    usuarios a un jugador.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

      {/* Player Rating Section */}
      {partido.ratable &&
        !partido.finished &&
        getTotalPlayers() > 0 &&
        !hasAlreadyRated && (
          <div className="w-full bg-card max-w-2xl border border-gray-600 bg-primary p-6 rounded-lg shadow-md shadow-black">
            <h2 className="text-white text-xl font-semibold mb-4 text-center">
              Califica a los jugadores
            </h2>

            <div className="text-center mb-6 -mt-2">
              <p className="text-yellow-400 text-sm font-medium">
                Elige tu king del partido
              </p>
            </div>

            {/* Team Tabs */}
            <div className="flex justify-center mb-6">
              <div className="flex bg-gray-800 rounded-lg p-1">
                <button
                  onClick={() => setActiveTeam("home")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    activeTeam === "home"
                      ? "bg-yellow-500 text-black"
                      : "text-gray-300 hover:text-white"
                  }`}
                >
                  {partido.team_home_id.name}
                </button>
                <button
                  onClick={() => setActiveTeam("visit")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    activeTeam === "visit"
                      ? "bg-yellow-500 text-black"
                      : "text-gray-300 hover:text-white"
                  }`}
                >
                  {partido.team_visit_id.name}
                </button>
                {playersDt.length > 0 && (
                  <button
                    onClick={() => setActiveTeam("dt")}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                      activeTeam === "dt"
                        ? "bg-yellow-500 text-black"
                        : "text-gray-300 hover:text-white"
                    }`}
                  >
                    DT ({playersDt.length})
                  </button>
                )}
              </div>
            </div>

            {getCurrentPlayerCount() > 0 && (
              <>
                {/* Player Stepper */}
                <div className="flex items-center justify-between mb-6">
                  <button
                    onClick={handlePreviousPlayer}
                    disabled={isFirstPlayer}
                    className={`p-2 rounded-full border ${
                      isFirstPlayer
                        ? "border-gray-600 text-gray-600 cursor-not-allowed"
                        : "border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-black"
                    }`}
                  >
                    <FaChevronLeft />
                  </button>

                  <div className="text-center">
                    <p className="text-gray-400 text-sm">
                      Jugador {getCurrentIndex() + 1} de{" "}
                      {getCurrentPlayerCount()}
                    </p>
                    <p className="text-yellow-500 text-xs font-medium mt-1">
                      {activeTeam === "home"
                        ? partido.team_home_id.name
                        : activeTeam === "visit"
                        ? partido.team_visit_id.name
                        : "DT"}
                    </p>
                  </div>

                  <button
                    onClick={handleNextPlayer}
                    disabled={isLastPlayer}
                    className={`p-2 rounded-full border ${
                      isLastPlayer
                        ? "border-gray-600 text-gray-600 cursor-not-allowed"
                        : "border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-black"
                    }`}
                  >
                    <FaChevronRight />
                  </button>
                </div>

                {/* Current Player Info */}
                {currentPlayer && (
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-4">
                      <img
                        className="size-16 aspect-square rounded-full object-cover"
                        src={currentPlayer.player_id.photo}
                        alt={`${currentPlayer.player_id.name} photo`}
                      />
                      <div>
                        <h3 className="text-white text-xl font-semibold">
                          {currentPlayer.player_id.name}
                        </h3>
                        <p
                          className={`text-sm font-medium flex items-center gap-1 ${
                            currentPlayer.substitute
                              ? "text-orange-400"
                              : currentPlayer.player_id.dt === true
                              ? "text-blue-400"
                              : "text-green-400"
                          }`}
                        >
                          {currentPlayer.substitute && !currentPlayer.dt ? (
                            <FaExchangeAlt className="inline" />
                          ) : currentPlayer.player_id.dt === true ? (
                            <FaUserTie className="inline" />
                          ) : (
                            <FaRunning className="inline" />
                          )}
                          {currentPlayer.substitute && !currentPlayer.dt
                            ? "Cambio"
                            : currentPlayer.player_id.dt === true
                            ? "Entrenador"
                            : "Titular"}
                        </p>
                      </div>
                    </div>

                    {/* Team Badge and Name */}
                    {currentTeam && (
                      <div className="flex flex-col items-center space-y-1">
                        <img
                          className="size-8 aspect-square"
                          src={currentTeam.badge}
                          alt={`${currentTeam.name} badge`}
                        />
                        <p className="text-white text-xs font-medium text-center">
                          {currentTeam.name}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Rating Buttons */}
                <div className="grid grid-cols-5 gap-3 mb-6">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => (
                    <button
                      key={rating}
                      onClick={() => handleRatingSelect(rating)}
                      className={`p-3 rounded-lg font-semibold text-lg border transition-all ${
                        currentRating === rating
                          ? "bg-yellow-500 text-black border-yellow-500 shadow-lg shadow-yellow-500/50"
                          : "bg-transparent text-white border-gray-600 hover:border-yellow-500 hover:text-yellow-500"
                      }`}
                    >
                      {rating}
                    </button>
                  ))}
                </div>

                {/* King Selection */}

                <div className="flex flex-col sm:flex-row w-full justify-between items-start mb-4">
                  <button
                    onClick={() => {
                      if (!isCurrentPlayerDT) {
                        handleKingSelection(currentPlayer.player_id.id);
                      }
                    }}
                    disabled={isCurrentPlayerDT}
                    className={`flex items-center border border-gray-600 text-sm sm:text-lg justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all  ${
                      isCurrentPlayerDT
                        ? "text-gray-400 cursor-not-allowed border border-gray-600"
                        : "text-white hover:cursor-pointer"
                    } ${
                      !isCurrentPlayerDT &&
                      selectedKing === currentPlayer.player_id.id
                        ? " text-yellow-500"
                        : ""
                    }`}
                  >
                    <FaCrown className="text-sm sm:text-lg" />
                    {isCurrentPlayerDT
                      ? "No disponible para DT"
                      : selectedKing === currentPlayer.player_id.id
                      ? "Mi King del Partido"
                      : "Elegir como King del Partido"}
                  </button>
                  {/* <p className="text-green-400 text-sm font-medium mt-2">
                    ✓ Calificado con {currentRating}
                  </p> */}
                  {currentRating != null &&
                    typeof currentAverage === "number" &&
                    !Number.isNaN(currentAverage) && (
                      <p className="text-green-400 text-sm sm:text-2xl font-medium mt-2">
                        Promedio: {currentAverage.toFixed(1)}
                      </p>
                    )}
                </div>

                {selectedKing && playerById[selectedKing] && (
                  <div className="w-full mb-4 p-2 border border-gray-600 rounded-md flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-300 mt-1 text-sm">
                        Tu King:
                      </span>
                      <img
                        className="size-6 aspect-square  inline rounded-full object-cover"
                        src={playerById[selectedKing].photo}
                        alt={`${playerById[selectedKing].name} photo`}
                      />
                      <span className="text-white  mt-1  text-sm font-medium">
                        {playerById[selectedKing].name}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedKing(null)}
                      className="text-gray-400 hover:text-red-400 p-1"
                      aria-label="Quitar King del Partido"
                      title="Quitar King del Partido"
                    >
                      <FaXmark />
                    </button>
                  </div>
                )}
              </>
            )}

            {getCurrentPlayerCount() === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-400">
                  No hay jugadores para calificar en esta categoría
                </p>
              </div>
            )}

            {/* Save All Ratings Button */}
            <div className="mt-6 pt-6 border-t border-gray-600">
              <button
                onClick={handleSaveRatings}
                disabled={!canSave || saving}
                className={`w-full py-3 rounded-lg font-semibold transition-all ${
                  canSave && !saving
                    ? "bg-green-500 text-white hover:bg-green-400"
                    : "bg-gray-600 text-gray-400 cursor-not-allowed"
                }`}
              >
                {saving ? "Guardando..." : "Subir calificaciones"}
              </button>

              {!canSave && (
                <div className="mt-3 text-center">
                  <div className="flex items-center justify-center gap-4 text-sm">
                    <div
                      className={`flex items-center gap-1 ${
                        allPlayersRated ? "text-green-400" : "text-gray-400"
                      }`}
                    >
                      <span>{allPlayersRated ? "✓" : "○"}</span>
                      <span>
                        Todos calificados ({getTotalRatedPlayers()}/
                        {getTotalPlayers()})
                      </span>
                    </div>
                    <div
                      className={`flex items-center gap-1 ${
                        selectedKing ? "text-green-400" : "text-gray-400"
                      }`}
                    >
                      <span>{selectedKing ? "✓" : "○"}</span>
                      <span>King elegido</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

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
        <NavLink
          to="/dashboard"
          className=" text-white px-4 py-2 rounded-md border border-gray-600 hover:cursor-pointer"
        >
          Volver al Inicio
        </NavLink>
      </div>
    </div>
  );
}

export default Match;
