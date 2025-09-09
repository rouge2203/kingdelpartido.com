import { useEffect, useMemo, useState } from "react";
import { useParams, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import logo from "../assets/monkey_with_phone.png";
import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from "@headlessui/react";
import { ChevronUpDownIcon } from "@heroicons/react/16/solid";
import { CheckIcon, StarIcon } from "@heroicons/react/20/solid";
import Loader from "../components/Loader";
import { FaCrown } from "react-icons/fa";
import { PiSoccerBallFill } from "react-icons/pi";
import { MdOutlineScoreboard } from "react-icons/md";

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

type MatchRow = {
  id: string;
  datetime: string;
  stadium?: string | null;
  finished?: boolean | null;
  team_home_id: { id: string; name: string; badge: string };
  team_visit_id: { id: string; name: string; badge: string };
  competition_id?: { id: string; name: string } | null;
};

type PlayerRow = {
  id: string;
  name: string;
  photo?: string | null;
  team_id: { id: string };
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

const Predicciones = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [match, setMatch] = useState<MatchRow | null>(null);
  const [homePlayers, setHomePlayers] = useState<PlayerRow[]>([]);
  const [visitPlayers, setVisitPlayers] = useState<PlayerRow[]>([]);

  // Predictions state
  const [homeGoals, setHomeGoals] = useState<number | null>(null);
  const [visitGoals, setVisitGoals] = useState<number | null>(null);
  const [homeScorers, setHomeScorers] = useState<(string | null)[]>([]); // player_id[] sized to homeGoals
  const [visitScorers, setVisitScorers] = useState<(string | null)[]>([]);
  const [kingPlayerId, setKingPlayerId] = useState<string | null>(null);
  const [multiplierPid, setMultiplierPid] = useState<string | null>(null);
  const [existing, setExisting] = useState<PredictionRow[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Derived
  // Keep scorers arrays sized to goals
  useEffect(() => {
    const hg = homeGoals ?? 0;
    setHomeScorers((prev) => {
      const next = prev.slice(0, hg);
      while (next.length < hg) next.push(null);
      return next;
    });
  }, [homeGoals]);
  useEffect(() => {
    const vg = visitGoals ?? 0;
    setVisitScorers((prev) => {
      const next = prev.slice(0, vg);
      while (next.length < vg) next.push(null);
      return next;
    });
  }, [visitGoals]);

  useEffect(() => {
    const fetchAll = async () => {
      if (!id) return;
      setLoading(true);
      try {
        // Fetch match
        const { data: m, error: mErr } = await supabase
          .from("matches")
          .select(
            `id, datetime, stadium, finished,
             team_home_id (id, name, badge),
             team_visit_id (id, name, badge),
             competition_id (id, name)`
          )
          .eq("id", id)
          .maybeSingle();

        if (mErr) throw mErr;
        if (!m) throw new Error("Match not found");
        const matchData = m as unknown as MatchRow;
        setMatch(matchData);

        // Fetch players by team (no match_id in players). Alphabetical order.
        const homeId = matchData.team_home_id.id;
        const visitId = matchData.team_visit_id.id;
        const { data: players, error: pErr } = await supabase
          .from("players")
          .select("id, name, photo, team_id (id)")
          .in("team_id", [homeId, visitId])
          .order("name", { ascending: true });
        if (pErr) throw pErr;

        const allPlayers = (players ?? []) as any[];
        const home: PlayerRow[] = allPlayers.filter(
          (row) => row.team_id?.id === matchData.team_home_id.id
        );
        const visit: PlayerRow[] = allPlayers.filter(
          (row) => row.team_id?.id === matchData.team_visit_id.id
        );
        setHomePlayers(home);
        setVisitPlayers(visit);

        // Fetch existing predictions for this user+match
        if (user?.id) {
          const { data: preds, error: pErr } = await supabase
            .from("predictions")
            .select(
              "id, user_id, match_id, type, home_goals, visit_goals, player_id, multiplier"
            )
            .eq("match_id", id)
            .eq("user_id", user.id);
          if (pErr) throw pErr;
          setExisting(preds as PredictionRow[]);

          // Populate state if exists
          if (preds && preds.length > 0) {
            // Load score prediction (type 1)
            const score = preds.find((r) => r.type === 1);
            let homeGoalsValue = 0;
            let visitGoalsValue = 0;
            if (score) {
              console.log("score --> ", score);
              homeGoalsValue = score.home_goals ?? 0;
              visitGoalsValue = score.visit_goals ?? 0;
              setHomeGoals(homeGoalsValue);
              setVisitGoals(visitGoalsValue);
            }

            // Load scorer predictions (type 2)
            const scorers = preds.filter((r) => r.type === 2 && r.player_id);
            const homeIds: string[] = [];
            const visitIds: string[] = [];

            scorers.forEach((scorer) => {
              const playerId = scorer.player_id!;
              // Check if player belongs to home team
              if (home.some((h) => h.id === playerId)) {
                homeIds.push(playerId);
              }
              // Check if player belongs to visit team
              else if (visit.some((v) => v.id === playerId)) {
                visitIds.push(playerId);
              }
            });

            // Size arrays to goals, pad with nulls
            setHomeScorers(() => {
              const arr: (string | null)[] = [...homeIds];
              while (arr.length < homeGoalsValue) arr.push(null);
              return arr.slice(0, homeGoalsValue);
            });
            setVisitScorers(() => {
              const arr: (string | null)[] = [...visitIds];
              while (arr.length < visitGoalsValue) arr.push(null);
              return arr.slice(0, visitGoalsValue);
            });

            // Load king prediction (type 3)
            const king = preds.find((r) => r.type === 3 && r.player_id);
            setKingPlayerId(king?.player_id ?? null);

            // Load multiplier if any (type 2 with multiplier=true)
            const mul = (preds as any[]).find(
              (r) => r.type === 2 && r.multiplier === true
            );
            setMultiplierPid(mul?.player_id ?? null);
          }
        }
      } catch (e: any) {
        console.error("Error loading predicciones:", e.message ?? e);
        setError("Error cargando datos");
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [id, user?.id]);

  const canEdit = existing ? existing.length === 0 : true;
  const isSubmitted = !canEdit;
  const playersById = useMemo(() => {
    const map: Record<string, PlayerRow> = {};
    [...homePlayers, ...visitPlayers].forEach((p) => (map[p.id] = p));
    return map;
  }, [homePlayers, visitPlayers]);

  const handleSave = async () => {
    setError(null);
    setSuccess(null);
    if (!user?.id || !id) return;
    if (!canEdit) {
      setError("Ya registraste tus predicciones para este partido");
      return;
    }
    // Validate scorers limits
    if (
      homeScorers.filter(Boolean).length > (homeGoals ?? 0) ||
      visitScorers.filter(Boolean).length > (visitGoals ?? 0)
    ) {
      setError("No puedes seleccionar más goleadores que goles pronosticados");
      return;
    }
    setSaving(true);
    try {
      const rows: any[] = [];
      if (homeGoals === null || visitGoals === null) {
        throw new Error("Debe ingresar marcador para ambos equipos");
      }
      rows.push({
        user_id: user.id,
        match_id: id,
        type: 1,
        home_goals: homeGoals,
        visit_goals: visitGoals,
      });
      homeScorers.forEach((pid) => {
        if (pid)
          rows.push({
            user_id: user.id,
            match_id: id,
            type: 2,
            player_id: pid,
            multiplier: multiplierPid === pid,
          });
      });
      visitScorers.forEach((pid) => {
        if (pid)
          rows.push({
            user_id: user.id,
            match_id: id,
            type: 2,
            player_id: pid,
            multiplier: multiplierPid === pid,
          });
      });
      if (kingPlayerId) {
        rows.push({
          user_id: user.id,
          match_id: id,
          type: 3,
          player_id: kingPlayerId,
        });
      }

      // Double-check no existing prediction before insert
      const { data: exists, error: checkErr } = await supabase
        .from("predictions")
        .select("id")
        .eq("match_id", id)
        .eq("user_id", user.id);
      if (checkErr) throw checkErr;
      if (exists && exists.length > 0) {
        setError("Ya registraste tus predicciones para este partido");
        return;
      }

      const { error: insErr } = await supabase.from("predictions").insert(rows);
      if (insErr) throw insErr;
      setSuccess("Predicciones guardadas");
      setExisting(rows as any);
    } catch (e: any) {
      console.error("Error saving predictions:", e.message ?? e);
      setError("Ocurrió un error al guardar");
    } finally {
      setSaving(false);
    }
  };

  if (!match) {
    return (
      <div className="container max-w-2xl mx-auto p-4">
        {loading ? (
          <Loader />
        ) : (
          <div className="text-gray-300">Partido no encontrado</div>
        )}
      </div>
    );
  }

  const dateLabel = (() => {
    const d = new Date(match.datetime);
    const day = d.getDate();
    const month = d.toLocaleString("es-ES", { month: "long" });
    const hours = d.getHours().toString().padStart(2, "0");
    const minutes = d.getMinutes().toString().padStart(2, "0");
    return `${day} ${
      month.charAt(0).toUpperCase() + month.slice(1)
    } ${hours}:${minutes}`;
  })();

  const showHomeScorers = homePlayers.length > 0 && (homeGoals ?? 0) > 0;
  const showVisitScorers = visitPlayers.length > 0 && (visitGoals ?? 0) > 0;
  const anyTeamHasPlayers = homePlayers.length > 0 || visitPlayers.length > 0;

  const allRequirementsMet = canEdit
    ? homeGoals !== null &&
      visitGoals !== null &&
      (showHomeScorers ? homeScorers.every((v) => !!v) : true) &&
      (showVisitScorers ? visitScorers.every((v) => !!v) : true) &&
      (anyTeamHasPlayers ? !!kingPlayerId : true)
    : true;

  return (
    <div className="mx-auto max-w-2xl container p-4 sm:pt-6 pb-28">
      {/* Header logo */}
      <div className="text-center space-y-2 flex flex-col items-center">
        <img src={logo} alt="King del Partido logo" className="size-44" />
        <h1 className="text-2xl font-bold text-yellow-400">Predicciones</h1>
      </div>

      {/* Pollos Pepe Promotional Banner */}
      <div className="mt-4 w-full max-w-2xl rounded-xl p-4 bg-gradient-to-r from-orange-600/20 via-yellow-500/20 to-orange-600/20 border border-orange-500/50 shadow-[0_0_20px_rgba(249,115,22,0.3)]">
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

      {/* Match info */}
      <div className="mt-4 flex flex-col space-y-3 bg-card w-full max-w-2xl border items-center border-gray-600 bg-primary p-4 rounded-lg shadow-md shadow-black">
        <p className="text-white w-full text-center text-base font-semibold">
          {match?.competition_id?.name ?? "Sin competencia"}
        </p>
        {match.stadium && (
          <p className="text-gray-400 -mt-2 text-xs w-full text-center font-semibold">
            {match.stadium}
          </p>
        )}
        <div className="flex flex-row items-center justify-between w-full">
          <div className="flex flex-col items-center space-y-1 w-1/3">
            <img
              className="size-10 aspect-square"
              src={match.team_home_id.badge}
            />
            <p className="text-white text-base font-medium">
              {match.team_home_id.name}
            </p>
          </div>
          <p className="text-gray-400 w-1/3 text-center text-sm">{dateLabel}</p>
          <div className="flex flex-col items-center space-y-1 w-1/3">
            <img
              className="size-10 aspect-square"
              src={match.team_visit_id.badge}
            />
            <p className="text-white text-base font-medium">
              {match.team_visit_id.name}
            </p>
          </div>
        </div>
      </div>

      {/* Rules */}
      <div className="mt-4 w-full max-w-2xl rounded-xl p-4 sm:p-5 bg-gradient-to-b from-zinc-900/70 to-zinc-900/40 border border-yellow-600/30 shadow-[0_0_0_1px_rgba(234,179,8,0.15)]">
        <div className="flex items-center gap-2">
          <div className="h-6 w-1 rounded bg-yellow-500" />
          <h2 className="text-yellow-400 font-semibold text-lg">
            Reglas de la quiniela
          </h2>
        </div>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-lg border border-gray-700 bg-black/20 p-3">
            <div className="text-sm text-gray-300 flex items-start gap-2">
              <CheckIcon className="size-4 text-yellow-400 shrink-0 mt-0.5" />
              Predicciones hasta 10 minutos antes de iniciar el partido.
            </div>
            <div className="text-sm text-gray-300 flex items-start gap-2 mt-2">
              <CheckIcon className="size-4 text-yellow-400 shrink-0 mt-0.5" />
              Solo puedes predecir una vez, al confirmar no podrás editar.
            </div>
          </div>
          <div className="rounded-lg border border-gray-700 bg-black/20 p-3">
            <div className="text-sm text-gray-300 flex items-start gap-2">
              <CheckIcon className="size-4 text-yellow-400 shrink-0 mt-0.5" />1
              punto por acertar ganador.
            </div>
            <div className="text-sm text-gray-300 flex items-start gap-2 mt-2">
              <CheckIcon className="size-4 text-yellow-400 shrink-0 mt-0.5" />3
              puntos por acertar marcador exacto.
            </div>
            <div className="text-sm text-gray-300 flex items-start gap-2 mt-2">
              <CheckIcon className="size-4 text-yellow-400 shrink-0 mt-0.5" />1
              punto por cada goleador que aciertes.
            </div>
            <div className="text-sm text-gray-300 flex items-start gap-2 mt-2">
              <CheckIcon className="size-4 text-yellow-400 shrink-0 mt-0.5" />1
              punto por acertar el King del Partido.
            </div>
            <div className="text-sm text-gray-300 flex items-start gap-2 mt-2">
              <StarIcon className="size-4 text-yellow-400 shrink-0 mt-0.5" />
              Marca un goleador con multiplicador 2x para duplicar puntos si
              aciertas (solo uno por partido).
            </div>
          </div>
        </div>
      </div>

      {/* Prediction form or summary */}
      <div className="mt-4 space-y-4 w-full max-w-2xl">
        {isSubmitted && (
          <div className="space-y-4">
            {/* Summary: score */}
            <div className="rounded-lg border border-gray-700 bg-primary p-4">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <span className="text-yellow-400 text-lg mr-0">
                  <MdOutlineScoreboard />
                </span>
                Tu marcador
              </h3>
              <p className="text-xs text-gray-400 mb-2">
                3 pts por marcador exacto, 1 pt por acertar ganador.
              </p>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 w-1/2">
                  <img src={match.team_home_id.badge} className="size-6" />
                  <span className="text-gray-200 text-sm truncate">
                    {match.team_home_id.name}
                  </span>
                </div>
                <span className="text-yellow-400 text-lg font-semibold">
                  {existing?.find((p) => p.type === 1)?.home_goals}
                </span>
                <span className="text-gray-400">-</span>
                <span className="text-yellow-400 text-lg font-semibold">
                  {existing?.find((p) => p.type === 1)?.visit_goals}
                </span>
                <div className="flex items-center gap-2 w-1/2 justify-end">
                  <span className="text-gray-200 text-sm truncate text-right">
                    {match.team_visit_id.name}
                  </span>
                  <img src={match.team_visit_id.badge} className="size-6" />
                </div>
              </div>
            </div>

            {/* Summary: scorers */}
            {(homeScorers.filter(Boolean).length > 0 ||
              visitScorers.filter(Boolean).length > 0) && (
              <div className="rounded-lg border border-gray-700 bg-primary p-4">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <span className="text-yellow-400 text-lg mr-0">
                    <PiSoccerBallFill />
                  </span>
                  Tus goleadores
                </h3>
                <p className="text-xs text-gray-400 mb-2 flex items-center gap-1">
                  <StarIcon className="size-4 text-yellow-400" /> 1 punto por
                  cada goleador acertado. Si marcaste 2x, ese goleador duplica
                  sus puntos.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {homeScorers.filter(Boolean).length > 0 && (
                    <div>
                      <h4 className="text-gray-300 text-sm mb-2">
                        {match.team_home_id.name}
                      </h4>
                      <div className="space-y-2">
                        {homeScorers.filter(Boolean).map((pid, i) => {
                          const p = playersById[pid as string];
                          return (
                            <div
                              key={`hs-${pid}-${i}`}
                              className="flex items-center gap-3 rounded-md border border-gray-700 px-2 py-1.5"
                            >
                              <img
                                src={
                                  p?.photo ??
                                  "https://mafisa-group-assets.nyc3.cdn.digitaloceanspaces.com/kingdelpartido/assets/player-fallback-dark.png"
                                }
                                className="size-6 rounded-full object-cover"
                              />
                              <span className="text-gray-200 text-sm">
                                {p?.name ?? "Jugador"}
                              </span>
                              {multiplierPid === pid && (
                                <span className="ml-auto inline-flex items-center gap-1 text-yellow-400 text-xs font-semibold">
                                  <StarIcon className="size-4" />
                                  2x
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {visitScorers.filter(Boolean).length > 0 && (
                    <div>
                      <h4 className="text-gray-300 text-sm mb-2">
                        {match.team_visit_id.name}
                      </h4>
                      <div className="space-y-2">
                        {visitScorers.filter(Boolean).map((pid, i) => {
                          const p = playersById[pid as string];
                          return (
                            <div
                              key={`vs-${pid}-${i}`}
                              className="flex items-center gap-3 rounded-md border border-gray-700 px-2 py-1.5"
                            >
                              <img
                                src={
                                  p?.photo ??
                                  "https://mafisa-group-assets.nyc3.cdn.digitaloceanspaces.com/kingdelpartido/assets/player-fallback-dark.png"
                                }
                                className="size-6 rounded-full object-cover"
                              />
                              <span className="text-gray-200 text-sm">
                                {p?.name ?? "Jugador"}
                              </span>
                              {multiplierPid === pid && (
                                <span className="ml-auto inline-flex items-center gap-1 text-yellow-400 text-xs font-semibold">
                                  <StarIcon className="size-4" />
                                  2x
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Summary: king */}
            <div className="rounded-lg border border-gray-700 bg-primary p-4">
              <h3 className="text-white text-lg font-semibold flex items-center gap-2">
                <span className="text-yellow-400 text-lg mr-0">
                  <FaCrown />
                </span>
                Tu King del Partido
              </h3>
              <p className="text-xs text-gray-400 mb-2">
                1 punto si aciertas el jugador votado como mejor del partido.
              </p>
              {kingPlayerId ? (
                <div className="flex items-center gap-3 rounded-md border border-gray-700 px-2 py-1.5 w-full max-w-sm">
                  <img
                    src={
                      playersById[kingPlayerId]?.photo ??
                      "https://mafisa-group-assets.nyc3.cdn.digitaloceanspaces.com/kingdelpartido/assets/player-fallback-dark.png"
                    }
                    className="size-8 rounded-full object-cover"
                  />
                  <span className="text-gray-200 text-sm">
                    {playersById[kingPlayerId]?.name ?? "Jugador"}
                  </span>
                </div>
              ) : (
                <span className="text-gray-400 text-sm">No seleccionado</span>
              )}
            </div>
          </div>
        )}
        {/* Score */}
        {canEdit && (
          <div className="border border-yellow-700/40 rounded-lg p-4 bg-primary shadow-[0_0_0_1px_rgba(234,179,8,0.15)]">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <span className="text-yellow-400 text-lg mr-0">
                <MdOutlineScoreboard />
              </span>
              Marcador
            </h3>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 w-1/2">
                <img src={match.team_home_id.badge} className="size-6" />
                <span className="text-gray-200 text-sm truncate">
                  {match.team_home_id.name}
                </span>
              </div>
              <input
                type="number"
                min={0}
                max={8}
                disabled={!canEdit}
                value={homeGoals ?? ""}
                placeholder="0"
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === "") {
                    setHomeGoals(null);
                    return;
                  }
                  const n = Number(raw);
                  const clamped = Math.max(0, Math.min(8, isNaN(n) ? 0 : n));
                  setHomeGoals(clamped);
                }}
                className="w-24 py-4 text-xl items-center justify-center flex text-center rounded-md bg-black/20 border border-gray-700 text-white"
              />
              <span className="text-gray-400">-</span>
              <input
                type="number"
                min={0}
                max={8}
                disabled={!canEdit}
                value={visitGoals ?? ""}
                placeholder="0"
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === "") {
                    setVisitGoals(null);
                    return;
                  }
                  const n = Number(raw);
                  const clamped = Math.max(0, Math.min(8, isNaN(n) ? 0 : n));
                  setVisitGoals(clamped);
                }}
                className="w-24 text-xl  py-4 items-center justify-center flex text-center rounded-md bg-black/20 border border-gray-700 text-white"
              />
              <div className="flex items-center gap-2 w-1/2 justify-end">
                <span className="text-gray-200 text-sm truncate text-right">
                  {match.team_visit_id.name}
                </span>
                <img src={match.team_visit_id.badge} className="size-6" />
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-400 space-y-1">
              <p>3 pts por marcador exacto, 1 pt por acertar ganador.</p>
            </div>
          </div>
        )}

        {/* Scorers */}
        {canEdit && (showHomeScorers || showVisitScorers) && (
          <div className="border border-yellow-700/40 rounded-lg p-4 bg-primary shadow-[0_0_0_1px_rgba(234,179,8,0.15)]">
            <h3 className="text-white font-semibold mb-1 flex items-center gap-2">
              <span className="text-yellow-400 text-lg mr-0">
                <PiSoccerBallFill />
              </span>
              Goleadores
            </h3>
            <p className="text-xs text-gray-400 mb-3 flex items-center gap-1">
              <StarIcon className="size-4 text-yellow-400" /> Marca un goleador
              con multiplicador 2x (opcional, solo uno)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {showHomeScorers && (
                <div>
                  <h4 className="text-gray-300 text-sm mb-2">
                    {match.team_home_id.name}
                  </h4>
                  <div className="space-y-2">
                    {homeScorers.map((value, idx) => (
                      <Listbox
                        key={idx}
                        value={value}
                        onChange={(v) => {
                          if (!canEdit) return;
                          setHomeScorers((prev) => {
                            const next = [...prev];
                            next[idx] = v;
                            return next;
                          });
                        }}
                        disabled={!canEdit}
                      >
                        <div className="relative">
                          <ListboxButton className="grid w-full cursor-default grid-cols-1 rounded-md bg-black/20 py-1.5 pr-10 pl-3 text-left text-white outline outline-1 -outline-offset-1 outline-white/10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-yellow-500 sm:text-sm/6">
                            <span className="col-start-1 row-start-1 flex items-center gap-3 pr-6">
                              <img
                                alt=""
                                src={
                                  value
                                    ? homePlayers.find((p) => p.id === value)
                                        ?.photo ??
                                      "https://mafisa-group-assets.nyc3.cdn.digitaloceanspaces.com/kingdelpartido/assets/player-fallback-dark.png"
                                    : "https://mafisa-group-assets.nyc3.cdn.digitaloceanspaces.com/kingdelpartido/assets/player-fallback-dark.png"
                                }
                                className="size-5 shrink-0  rounded-full bg-gray-700 outline -outline-offset-1 outline-white/10"
                              />
                              <span className="block truncate">
                                {value
                                  ? homePlayers.find((p) => p.id === value)
                                      ?.name
                                  : "Seleccionar goleador"}
                              </span>
                            </span>
                            <ChevronUpDownIcon
                              aria-hidden="true"
                              className="col-start-1 row-start-1 size-5 self-center justify-self-end text-gray-400 sm:size-4"
                            />
                          </ListboxButton>
                          {/* Multiplier toggle star */}
                          <button
                            type="button"
                            className={`absolute top-1.5 right-2 p-1 rounded ${
                              multiplierPid && multiplierPid === value
                                ? "text-yellow-400"
                                : "text-gray-500 hover:text-yellow-400"
                            }`}
                            title="Marcar 2x"
                            onClick={() => {
                              if (!value) return;
                              setMultiplierPid((prev) =>
                                prev === value ? null : value
                              );
                            }}
                          >
                            <StarIcon className="size-4" />
                          </button>
                          <ListboxOptions
                            transition
                            className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md bg-primary py-1 text-base outline outline-1 -outline-offset-1 outline-white/10 data-[leave]:transition data-[leave]:duration-100 data-[leave]:ease-in data-[closed]:data-[leave]:opacity-0 sm:text-sm"
                          >
                            {homePlayers.map((p) => (
                              <ListboxOption
                                key={p.id}
                                value={p.id}
                                className="group relative bg-card cursor-default py-2 pr-9 pl-3 text-white select-none data-[focus]:bg-yellow-600/20 data-[focus]:outline-none"
                              >
                                <div className="flex items-center">
                                  <img
                                    alt=""
                                    src={
                                      p.photo ??
                                      "https://mafisa-group-assets.nyc3.cdn.digitaloceanspaces.com/kingdelpartido/assets/player-fallback-dark.png"
                                    }
                                    className="size-5 shrink-0 rounded-full outline -outline-offset-1 outline-white/10"
                                  />
                                  <span className="ml-3 block truncate font-normal group-data-[selected]:font-semibold">
                                    {p.name}
                                  </span>
                                </div>
                                <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-yellow-400 group-not-data-[selected]:hidden group-data-[focus]:text-white">
                                  <CheckIcon
                                    aria-hidden="true"
                                    className="size-5"
                                  />
                                </span>
                              </ListboxOption>
                            ))}
                          </ListboxOptions>
                        </div>
                      </Listbox>
                    ))}
                  </div>
                </div>
              )}

              {showVisitScorers && (
                <div>
                  <h4 className="text-gray-300 text-sm mb-2">
                    {match.team_visit_id.name}
                  </h4>
                  <div className="space-y-2">
                    {visitScorers.map((value, idx) => (
                      <Listbox
                        key={idx}
                        value={value}
                        onChange={(v) => {
                          if (!canEdit) return;
                          setVisitScorers((prev) => {
                            const next = [...prev];
                            next[idx] = v;
                            return next;
                          });
                        }}
                        disabled={!canEdit}
                      >
                        <div className="relative">
                          <ListboxButton className="grid w-full cursor-default grid-cols-1 rounded-md bg-black/20 py-1.5 pr-10 pl-3 text-left text-white outline outline-1 -outline-offset-1 outline-white/10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-yellow-500 sm:text-sm/6">
                            <span className="col-start-1 row-start-1 flex items-center gap-3 pr-6">
                              <img
                                alt=""
                                src={
                                  value
                                    ? visitPlayers.find((p) => p.id === value)
                                        ?.photo ??
                                      "https://mafisa-group-assets.nyc3.cdn.digitaloceanspaces.com/kingdelpartido/assets/player-fallback-dark.png"
                                    : "https://mafisa-group-assets.nyc3.cdn.digitaloceanspaces.com/kingdelpartido/assets/player-fallback-dark.png"
                                }
                                className="size-5 shrink-0 rounded-full bg-gray-700 outline -outline-offset-1 outline-white/10"
                              />
                              <span className="block truncate">
                                {value
                                  ? visitPlayers.find((p) => p.id === value)
                                      ?.name
                                  : "Seleccionar goleador"}
                              </span>
                            </span>
                            <ChevronUpDownIcon
                              aria-hidden="true"
                              className="col-start-1 row-start-1 size-5 self-center justify-self-end text-gray-400 sm:size-4"
                            />
                          </ListboxButton>
                          {/* Multiplier toggle star */}
                          <button
                            type="button"
                            className={`absolute top-1.5 right-2 p-1 rounded ${
                              multiplierPid && multiplierPid === value
                                ? "text-yellow-400"
                                : "text-gray-500 hover:text-yellow-400"
                            }`}
                            title="Marcar 2x"
                            onClick={() => {
                              if (!value) return;
                              setMultiplierPid((prev) =>
                                prev === value ? null : value
                              );
                            }}
                          >
                            <StarIcon className="size-4" />
                          </button>
                          <ListboxOptions
                            transition
                            className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md bg-primary py-1 text-base outline outline-1 -outline-offset-1 outline-white/10 data-[leave]:transition data-[leave]:duration-100 data-[leave]:ease-in data-[closed]:data-[leave]:opacity-0 sm:text-sm"
                          >
                            {visitPlayers.map((p) => (
                              <ListboxOption
                                key={p.id}
                                value={p.id}
                                className="group bg-card relative cursor-default py-2 pr-9 pl-3 text-white select-none data-[focus]:bg-yellow-700 "
                              >
                                <div className="flex items-center">
                                  <img
                                    alt=""
                                    src={
                                      p.photo ??
                                      "https://mafisa-group-assets.nyc3.cdn.digitaloceanspaces.com/kingdelpartido/assets/player-fallback-dark.png"
                                    }
                                    className="size-5 shrink-0 rounded-full outline -outline-offset-1 outline-white/10"
                                  />
                                  <span className="ml-3 block truncate font-normal group-data-[selected]:font-semibold">
                                    {p.name}
                                  </span>
                                </div>
                                <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-yellow-400 group-not-data-[selected]:hidden group-data-[focus]:text-white">
                                  <CheckIcon
                                    aria-hidden="true"
                                    className="size-5"
                                  />
                                </span>
                              </ListboxOption>
                            ))}
                          </ListboxOptions>
                        </div>
                      </Listbox>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* King del Partido */}
        {canEdit && anyTeamHasPlayers && (
          <div className="border border-yellow-700/40 rounded-lg p-4 bg-primary shadow-[0_0_0_1px_rgba(234,179,8,0.15)]">
            <h3 className="text-white font-semibold mb-1 flex items-center gap-2">
              <span className="text-yellow-400 text-lg mr-0">
                <FaCrown />
              </span>
              King del Partido
            </h3>
            <p className="text-xs text-gray-400 mb-3">
              1 punto si aciertas el jugador votado como mejor del partido.
            </p>
            <Listbox
              value={kingPlayerId}
              onChange={(v) => canEdit && setKingPlayerId(v)}
              disabled={!canEdit}
            >
              <div className="relative">
                <ListboxButton className="grid w-full cursor-default grid-cols-1 rounded-md bg-black/20 py-1.5 pr-2 pl-3 text-left text-white outline outline-1 -outline-offset-1 outline-white/10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-yellow-500 sm:text-sm/6">
                  <span className="col-start-1 row-start-1 flex items-center gap-3 pr-6">
                    <img
                      alt=""
                      src={
                        kingPlayerId
                          ? [...homePlayers, ...visitPlayers].find(
                              (p) => p.id === kingPlayerId
                            )?.photo ??
                            "https://mafisa-group-assets.nyc3.cdn.digitaloceanspaces.com/kingdelpartido/assets/player-fallback-dark.png"
                          : "https://mafisa-group-assets.nyc3.cdn.digitaloceanspaces.com/kingdelpartido/assets/player-fallback-dark.png"
                      }
                      className="size-5 shrink-0 rounded-full  bg-gray-700 outline -outline-offset-1 outline-white/10"
                    />
                    <span className="block truncate">
                      {kingPlayerId
                        ? [...homePlayers, ...visitPlayers].find(
                            (p) => p.id === kingPlayerId
                          )?.name
                        : "Seleccionar jugador"}
                    </span>
                  </span>
                  <ChevronUpDownIcon
                    aria-hidden="true"
                    className="col-start-1 row-start-1 size-5 self-center justify-self-end text-gray-400 sm:size-4"
                  />
                </ListboxButton>
                <ListboxOptions
                  transition
                  className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md bg-primary py-1 text-base outline outline-1 -outline-offset-1 outline-white/10 data-[leave]:transition data-[leave]:duration-100 data-[leave]:ease-in data-[closed]:data-[leave]:opacity-0 sm:text-sm"
                >
                  {[...homePlayers, ...visitPlayers].map((p) => (
                    <ListboxOption
                      key={p.id}
                      value={p.id}
                      className="group bg-card relative cursor-default py-2 pr-9 pl-3 text-white select-none data-[focus]:bg-yellow-700 "
                    >
                      <div className="flex items-center">
                        <img
                          alt=""
                          src={
                            p.photo ??
                            "https://mafisa-group-assets.nyc3.cdn.digitaloceanspaces.com/kingdelpartido/assets/player-fallback-dark.png"
                          }
                          className="size-5 shrink-0 rounded-full outline -outline-offset-1 outline-white/10"
                        />
                        <span className="ml-3 block truncate font-normal group-data-[selected]:font-semibold">
                          {p.name}
                        </span>
                      </div>
                      <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-yellow-400 group-not-data-[selected]:hidden group-data-[focus]:text-white">
                        <CheckIcon aria-hidden="true" className="size-5" />
                      </span>
                    </ListboxOption>
                  ))}
                </ListboxOptions>
              </div>
            </Listbox>
          </div>
        )}

        {/* Actions / messages */}
        {error && <div className="text-red-400 text-sm">{error}</div>}
        {success && <div className="text-green-400 text-sm">{success}</div>}
        {canEdit ? (
          <button
            onClick={handleSave}
            disabled={saving || !allRequirementsMet}
            className="w-full rounded-md bg-yellow-500/90 text-black font-semibold px-3 py-2 hover:bg-yellow-500 disabled:opacity-60"
          >
            {saving ? "Guardando..." : "Confirmar predicciones"}
          </button>
        ) : (
          <div className="text-center text-sm text-gray-300">
            Ya registraste tus predicciones para este partido.
          </div>
        )}

        <div className="text-center">
          <NavLink
            to="/dashboard"
            className="inline-block mt-2 text-sm text-gray-300 hover:text-yellow-400"
          >
            Volver a Partidos
          </NavLink>
        </div>
      </div>

      {/* Footer branding */}
      <div className="flex justify-between items-center mt-6">
        <div className="flex flex-col self-center">
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
    </div>
  );
};

export default Predicciones;
