import { useMemo, useState } from 'react';
import { Award, Crosshair, Search, Trophy, X } from 'lucide-react';
import { useVynorix } from '../context/VynorixContext';
import { formatINR } from '../lib/constants';
import type { PlayerPublic } from '../types/vynorix';

export function LeaderboardView() {
  const { leaderboardPlayers, results, tournaments } = useVynorix();
  const [search, setSearch] = useState('');
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>('all');
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerPublic | null>(null);

  const filteredPlayers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leaderboardPlayers
      .filter((p) => !p.isBanned)
      .filter(
        (p) =>
          !q ||
          p.ign.toLowerCase().includes(q) ||
          p.ffUid.toLowerCase().includes(q) ||
          p.playerCode.toLowerCase().includes(q)
      );
  }, [leaderboardPlayers, search]);

  const filteredResults = useMemo(() => {
    if (selectedTournamentId === 'all') return results;
    return results.filter((r) => r.tournamentId === selectedTournamentId);
  }, [results, selectedTournamentId]);

  const selectedPlayerHistory = useMemo(() => {
    if (!selectedPlayer) return [];
    return results.filter((r) => r.userId === selectedPlayer.uid);
  }, [results, selectedPlayer]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
            Vynorix Leaderboard
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Official rankings based exclusively on Admin-verified kills and published match results.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search IGN, FF UID, or VYN ID..."
            className="w-full min-h-[44px] pl-10 pr-4 rounded-xl bg-zinc-900 border border-white/10 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-orange-500"
          />
        </div>
      </div>

      {/* Overall Player Standings */}
      <section className="rounded-2xl border border-white/[0.08] bg-zinc-900 overflow-hidden">
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Trophy className="w-5 h-5 text-orange-400" />
            <h2 className="font-display text-lg font-bold text-white">
              Overall Season Standings
            </h2>
          </div>
          <span className="text-xs text-zinc-400 font-mono-tabular">
            {filteredPlayers.length} players
          </span>
        </div>

        {filteredPlayers.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <Award className="w-8 h-8 text-zinc-600 mx-auto" />
            <p className="text-sm font-medium text-zinc-200">No players found</p>
            <p className="text-xs text-zinc-400">
              Registered players will appear here once profiles are created.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/[0.06] text-[11px] text-zinc-400">
                  <th className="py-3 px-4 font-medium">Rank</th>
                  <th className="py-3 px-4 font-medium">Player</th>
                  <th className="py-3 px-4 font-medium">Free Fire UID</th>
                  <th className="py-3 px-4 font-medium text-right">Matches</th>
                  <th className="py-3 px-4 font-medium text-right">Verified Kills</th>
                  <th className="py-3 px-4 font-medium text-right">Total Earnings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06] text-sm">
                {filteredPlayers.map((player, index) => (
                  <tr
                    key={player.uid}
                    onClick={() => setSelectedPlayer(player)}
                    className="hover:bg-white/[0.03] cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 px-4 font-mono-tabular font-bold text-orange-400">
                      #{index + 1}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        {player.avatarUrl ? (
                          <img
                            src={player.avatarUrl}
                            alt={player.ign}
                            className="w-8 h-8 rounded-lg object-cover border border-white/10 shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-xs font-bold text-orange-400 shrink-0">
                            {player.ign.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-white leading-tight">{player.ign}</p>
                          <p className="text-[11px] font-mono-tabular text-zinc-400">
                            {player.playerCode}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono-tabular text-xs text-zinc-300">
                      {player.ffUid}
                    </td>
                    <td className="py-3.5 px-4 font-mono-tabular text-right text-zinc-300">
                      {player.matchesPlayed} ({player.booyahs}W)
                    </td>
                    <td className="py-3.5 px-4 font-mono-tabular text-right font-semibold text-white">
                      {player.totalKills}
                    </td>
                    <td className="py-3.5 px-4 font-mono-tabular text-right font-bold text-emerald-400">
                      {formatINR(player.totalEarnings)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Published Match Results */}
      <section className="rounded-2xl border border-white/[0.08] bg-zinc-900 overflow-hidden">
        <div className="px-6 py-4 border-b border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Crosshair className="w-5 h-5 text-orange-400" />
            <h2 className="font-display text-lg font-bold text-white">
              Published Tournament Results
            </h2>
          </div>

          <select
            aria-label="Filter results by tournament"
            value={selectedTournamentId}
            onChange={(e) => setSelectedTournamentId(e.target.value)}
            className="min-h-[40px] px-3 rounded-xl bg-zinc-950 border border-white/10 text-xs text-white focus:outline-none focus:border-orange-500"
          >
            <option value="all">All Tournaments</option>
            {tournaments
              .filter((t) => t.resultsPublished)
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
          </select>
        </div>

        {filteredResults.length === 0 ? (
          <div className="p-10 text-center text-xs text-zinc-400">
            No tournament results published yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/[0.06] text-[11px] text-zinc-400">
                  <th className="py-3 px-4 font-medium">Match</th>
                  <th className="py-3 px-4 font-medium">Rank</th>
                  <th className="py-3 px-4 font-medium">Player</th>
                  <th className="py-3 px-4 font-medium text-right">Kills</th>
                  <th className="py-3 px-4 font-medium text-right">Kill Reward</th>
                  <th className="py-3 px-4 font-medium text-right">Placement</th>
                  <th className="py-3 px-4 font-medium text-right">Total Won</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06] text-xs sm:text-sm">
                {filteredResults.map((r) => (
                  <tr key={r.id} className="hover:bg-white/[0.02]">
                    <td className="py-3 px-4 text-zinc-300 font-medium">{r.tournamentTitle}</td>
                    <td className="py-3 px-4 font-mono-tabular font-bold text-orange-400">
                      #{r.rank}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-white">{r.ign}</p>
                      <p className="text-[11px] font-mono-tabular text-zinc-400">UID {r.ffUid}</p>
                    </td>
                    <td className="py-3 px-4 font-mono-tabular text-right text-white">{r.kills}</td>
                    <td className="py-3 px-4 font-mono-tabular text-right text-zinc-300">
                      {formatINR(r.killReward)}
                    </td>
                    <td className="py-3 px-4 font-mono-tabular text-right text-zinc-300">
                      {formatINR(r.placementPrize)}
                    </td>
                    <td className="py-3 px-4 font-mono-tabular text-right font-bold text-emerald-400">
                      {formatINR(r.totalWon)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Player Match History Modal */}
      {selectedPlayer && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full sm:max-w-lg bg-zinc-900 border border-white/10 rounded-t-3xl sm:rounded-2xl p-6 space-y-5 max-h-[85dvh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-lg font-bold text-white">
                  {selectedPlayer.ign} — Match History
                </h3>
                <p className="text-xs font-mono-tabular text-zinc-400">
                  {selectedPlayer.playerCode} · FF UID: {selectedPlayer.ffUid}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPlayer(null)}
                aria-label="Close player history"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-zinc-400 hover:text-white hover:bg-white/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-zinc-950 border border-white/[0.06]">
              <div>
                <p className="text-[11px] text-zinc-400">Verified Kills</p>
                <p className="font-mono-tabular text-lg font-bold text-white">
                  {selectedPlayer.totalKills}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-zinc-400">Matches / Wins</p>
                <p className="font-mono-tabular text-lg font-bold text-orange-400">
                  {selectedPlayer.matchesPlayed} / {selectedPlayer.booyahs}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-zinc-400">Earnings</p>
                <p className="font-mono-tabular text-lg font-bold text-emerald-400">
                  {formatINR(selectedPlayer.totalEarnings)}
                </p>
              </div>
            </div>

            {selectedPlayerHistory.length === 0 ? (
              <p className="text-xs text-zinc-400 text-center py-6">
                No published match results recorded for this player yet.
              </p>
            ) : (
              <div className="divide-y divide-white/[0.06]">
                {selectedPlayerHistory.map((h) => (
                  <div key={h.id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">{h.tournamentTitle}</p>
                      <p className="text-xs text-zinc-400">
                        Rank #{h.rank} · {h.kills} verified kills
                      </p>
                    </div>
                    <span className="font-mono-tabular text-sm font-bold text-emerald-400">
                      {formatINR(h.totalWon)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
