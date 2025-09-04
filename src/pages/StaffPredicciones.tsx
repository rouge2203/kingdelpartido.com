import React, { useEffect, useMemo, useState } from "react";
import { useParams, NavLink } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import Loader from "../components/Loader";

type MatchRow = {
  id: string;
  datetime: string;
  stadium?: string | null;
  team_home_id: { id: string; name: string; badge: string };
  team_visit_id: { id: string; name: string; badge: string };
  competition_id?: { id: string; name: string } | null;
};

type PlayerRow = { id: string; name: string; photo?: string | null; team_id: { id: string } };

export default function StaffPredicciones() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [match, setMatch] = useState<MatchRow | null>(null);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [scoreTop, setScoreTop] = useState<{ key: string; count: number }[]>([]);
  const [scorerTop, setScorerTop] = useState<{ player_id: string; count: number }[]>([]);
  const [kingTop, setKingTop] = useState<{ player_id: string; count: number }[]>([]);
  const [totals, setTotals] = useState({ score: 0, scorer: 0, king: 0 });

  const playersById = useMemo(() => {
    const map: Record<string, PlayerRow> = {};
    players.forEach((p) => (map[p.id] = p));
    return map;
  }, [players]);

  useEffect(() => {
    const run = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const { data: m, error: mErr } = await supabase
          .from("matches")
          .select(
            `id, datetime, stadium, team_home_id (id, name, badge), team_visit_id (id, name, badge), competition_id (id, name)`
          )
          .eq("id", id)
          .maybeSingle();
        if (mErr) throw mErr;
        if (!m) throw new Error("Match not found");
        const matchData = m as unknown as MatchRow;
        setMatch(matchData);

        // Load players for both teams
        const { data: ply, error: pErr } = await supabase
          .from("players")
          .select("id, name, photo, team_id (id)")
          .in("team_id", [matchData.team_home_id.id, matchData.team_visit_id.id])
          .order("name", { ascending: true });
        if (pErr) throw pErr;
        setPlayers((ply ?? []) as any);

        // Load predictions and aggregate
        const { data: preds, error: prErr } = await supabase
          .from("predictions")
          .select("type, home_goals, visit_goals, player_id")
          .eq("match_id", id);
        if (prErr) throw prErr;
        const rows = (preds ?? []) as any[];

        const scoreMap = new Map<string, number>();
        const scorerMap = new Map<string, number>();
        const kingMap = new Map<string, number>();
        let scoreTotal = 0,
          scorerTotal = 0,
          kingTotal = 0;

        for (const r of rows) {
          if (r.type === 1) {
            const key = `${r.home_goals ?? 0}-${r.visit_goals ?? 0}`;
            scoreMap.set(key, (scoreMap.get(key) ?? 0) + 1);
            scoreTotal += 1;
          } else if (r.type === 2 && r.player_id) {
            const pid = r.player_id as string;
            scorerMap.set(pid, (scorerMap.get(pid) ?? 0) + 1);
            scorerTotal += 1;
          } else if (r.type === 3 && r.player_id) {
            const pid = r.player_id as string;
            kingMap.set(pid, (kingMap.get(pid) ?? 0) + 1);
            kingTotal += 1;
          }
        }

        const topScores = Array.from(scoreMap.entries())
          .map(([key, count]) => ({ key, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);
        const topScorers = Array.from(scorerMap.entries())
          .map(([player_id, count]) => ({ player_id, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);
        const topKings = Array.from(kingMap.entries())
          .map(([player_id, count]) => ({ player_id, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        setScoreTop(topScores);
        setScorerTop(topScorers);
        setKingTop(topKings);
        setTotals({ score: scoreTotal, scorer: scorerTotal, king: kingTotal });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [id]);

  if (!match || loading) {
    return <Loader />;
  }

  const StatList = ({
    title,
    items,
    total,
    renderItem,
  }: {
    title: string;
    items: { key?: string; player_id?: string; count: number }[];
    total: number;
    renderItem: (item: { key?: string; player_id?: string; count: number }) => React.ReactElement;
  }) => (
    <div className="rounded-lg border border-yellow-700/40 bg-primary p-4 shadow-[0_0_0_1px_rgba(234,179,8,0.15)]">
      <h3 className="text-white font-semibold mb-3">{title}</h3>
      {items.length === 0 || total === 0 ? (
        <div className="text-sm text-gray-400">Sin datos suficientes.</div>
      ) : (
        <ul className="space-y-2">
          {items.map((it, idx) => {
            const pct = Math.round((it.count / Math.max(1, total)) * 100);
            return (
              <li key={(it.key ?? it.player_id ?? idx).toString()} className="flex items-center gap-3">
                <span className="w-6 text-gray-400">{idx + 1}.</span>
                <div className="flex-1">
                  {renderItem(it)}
                  <div className="mt-1 h-1.5 rounded bg-gray-700">
                    <div className="h-1.5 rounded bg-yellow-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <span className="text-yellow-400 text-sm font-semibold min-w-10 text-right">{pct}%</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );

  return (
    <div className="container max-w-3xl mx-auto p-4 sm:pt-6">
      <div className="text-center mb-4">
        <h1 className="text-2xl font-bold text-yellow-400">Estadísticas de Predicciones</h1>
        <p className="text-sm text-gray-400">{match.competition_id?.name ?? ""}</p>
      </div>

      <div className="mt-4 flex flex-col space-y-3 bg-card w-full border items-center border-gray-600 bg-primary p-4 rounded-lg shadow-md shadow-black">
        <p className="text-white w-full text-center text-base font-semibold">{match.stadium ?? ""}</p>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <img src={match.team_home_id.badge} className="size-8" />
            <span className="text-white font-medium">{match.team_home_id.name}</span>
          </div>
          <span className="text-gray-400">vs</span>
          <div className="flex items-center gap-2">
            <span className="text-white font-medium">{match.team_visit_id.name}</span>
            <img src={match.team_visit_id.badge} className="size-8" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <StatList
          title="Top 5 Marcadores Pronosticados"
          items={scoreTop}
          total={totals.score}
          renderItem={(it) => (
            <div className="flex items-center justify-between">
              <span className="text-gray-200">Marcador {it.key}</span>
              <span className="text-gray-400 text-xs">{it.count} votos</span>
            </div>
          )}
        />
        <StatList
          title="Top 5 Goleadores Pronosticados"
          items={scorerTop}
          total={totals.scorer}
          renderItem={(it) => {
            const p = playersById[it.player_id as string];
            return (
              <div className="flex items-center gap-3">
                <img src={p?.photo ?? "https://mafisa-group-assets.nyc3.cdn.digitaloceanspaces.com/kingdelpartido/assets/player-fallback-dark.png"} className="size-6 rounded-full object-cover" />
                <span className="text-gray-200">{p?.name ?? "Jugador"}</span>
                <span className="ml-auto text-gray-400 text-xs">{it.count} votos</span>
              </div>
            );
          }}
        />
        <StatList
          title="Top 5 King del Partido"
          items={kingTop}
          total={totals.king}
          renderItem={(it) => {
            const p = playersById[it.player_id as string];
            return (
              <div className="flex items-center gap-3">
                <img src={p?.photo ?? "https://mafisa-group-assets.nyc3.cdn.digitaloceanspaces.com/kingdelpartido/assets/player-fallback-dark.png"} className="size-6 rounded-full object-cover" />
                <span className="text-gray-200">{p?.name ?? "Jugador"}</span>
                <span className="ml-auto text-gray-400 text-xs">{it.count} votos</span>
              </div>
            );
          }}
        />
      </div>

      <div className="text-center mt-6">
        <NavLink to="/dashboard" className="text-sm text-gray-300 hover:text-yellow-400">
          Volver a Partidos
        </NavLink>
      </div>
    </div>
  );
}
