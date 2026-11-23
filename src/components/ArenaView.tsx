import { useMemo, useState } from 'react';
import { Calendar, ChevronRight, Clock, Crosshair, Megaphone, Shield, Trophy, Users } from 'lucide-react';
import { useVynorix } from '../context/VynorixContext';
import { ASSETS, formatINR, getMapImage } from '../lib/constants';
import type { AppTab, Registration, Tournament } from '../types/vynorix';
import { StatusLabel } from './StatusLabel';

interface ArenaViewProps {
  onOpenAuth: () => void;
  onJoinTournament: (t: Tournament) => void;
  onNavigateTab: (tab: AppTab) => void;
}

type FilterKey = 'all' | 'open' | 'live' | 'upcoming' | 'completed';

export function ArenaView({ onOpenAuth, onJoinTournament, onNavigateTab }: ArenaViewProps) {
  const {
    firebaseUser,
    profile,
    isVerifiedUser,
    settings,
    tournaments,
    announcements,
    results,
    myRegistrations,
  } = useVynorix();

  const [filter, setFilter] = useState<FilterKey>('all');
  const [rulesModalTournament, setRulesModalTournament] = useState<Tournament | null>(null);

  const regByTournament = useMemo(() => {
    const map = new Map<string, Registration>();
    myRegistrations.forEach((r) => map.set(r.tournamentId, r));
    return map;
  }, [myRegistrations]);

  const filteredTournaments = useMemo(() => {
    return tournaments.filter((t) => {
      if (filter === 'all') return true;
      if (filter === 'open') return t.status === 'Registration Open';
      if (filter === 'live') return t.status === 'Live' || t.status === 'Room Details Released';
      if (filter === 'upcoming') return t.status === 'Upcoming' || t.status === 'Registration Closed';
      if (filter === 'completed') return t.status === 'Completed' || t.status === 'Cancelled';
      return true;
    });
  }, [tournaments, filter]);

  const liveCount = useMemo(
    () => tournaments.filter((t) => t.status === 'Live' || t.status === 'Room Details Released').length,
    [tournaments]
  );

  function handleTournamentAction(t: Tournament) {
    if (!firebaseUser || !isVerifiedUser || !profile) {
      onOpenAuth();
      return;
    }
    const existing = regByTournament.get(t.id);
    if (existing && existing.paymentStatus === 'Approved') {
      onNavigateTab('room');
      return;
    }
    if (existing && existing.paymentStatus === 'Pending') {
      onNavigateTab('hub');
      return;
    }
    onJoinTournament(t);
  }

  return (
    <div className="space-y-10">
      {/* Maintenance Banner if enabled */}
      {settings.maintenanceMode && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 flex items-center justify-between gap-4">
          <span>Platform maintenance notice: New tournament entries may be paused temporarily by the organizer.</span>
        </div>
      )}

      {/* Hero Split Banner */}
      <section className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-zinc-900">
        <div className="grid lg:grid-cols-12 items-stretch">
          <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-medium text-orange-400">
                <span>Vynorix Solo Tournament</span>
                <span aria-hidden="true">·</span>
                <span>Free Fire Custom Rooms</span>
              </div>
              <h1 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-white leading-[1.08] [text-wrap:balance]">
                Drop Solo. Verify Kills. Claim Real UPI Rewards.
              </h1>
              <p className="text-sm sm:text-base text-zinc-400 max-w-xl leading-relaxed">
                Compete in verified Free Fire Solo lobbies starting at {formatINR(settings.defaultEntryFee)} entry. Earn {formatINR(settings.perKillReward)} for every verified kill with rule-protected room releases.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {!profile ? (
                <button
                  type="button"
                  onClick={onOpenAuth}
                  className="min-h-[48px] px-6 rounded-xl bg-orange-500 hover:bg-orange-600 text-zinc-950 font-semibold text-sm flex items-center gap-2 whitespace-nowrap shrink-0 transition-colors"
                >
                  <span>Register Player Profile</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onNavigateTab('room')}
                  className="min-h-[48px] px-6 rounded-xl bg-orange-500 hover:bg-orange-600 text-zinc-950 font-semibold text-sm flex items-center gap-2 whitespace-nowrap shrink-0 transition-colors"
                >
                  <span>Open Custom Room</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => onNavigateTab('leaderboard')}
                className="min-h-[48px] px-5 rounded-xl bg-zinc-950 border border-white/10 hover:border-white/20 text-zinc-200 font-semibold text-sm whitespace-nowrap shrink-0 transition-colors"
              >
                View Leaderboard
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 relative min-h-[210px] lg:min-h-full">
            <img
              src={ASSETS.heroBanner}
              alt="Vynorix Free Fire Solo Arena"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-zinc-900 via-zinc-900/40 to-transparent" />
          </div>
        </div>

        {/* 4-column economy strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 border-t border-white/[0.08] bg-zinc-950/70">
          <div className="p-4 sm:px-6 border-r border-b lg:border-b-0 border-white/[0.08]">
            <p className="text-xs text-zinc-400">Default Entry Fee</p>
            <p className="font-mono-tabular text-xl font-bold text-white mt-0.5">
              {formatINR(settings.defaultEntryFee)}
            </p>
          </div>
          <div className="p-4 sm:px-6 lg:border-r border-b lg:border-b-0 border-white/[0.08]">
            <p className="text-xs text-zinc-400">Verified Per-Kill Reward</p>
            <p className="font-mono-tabular text-xl font-bold text-orange-400 mt-0.5">
              {formatINR(settings.perKillReward)}
            </p>
          </div>
          <div className="p-4 sm:px-6 border-r border-white/[0.08]">
            <p className="text-xs text-zinc-400">Min UPI Withdrawal</p>
            <p className="font-mono-tabular text-xl font-bold text-white mt-0.5">
              {formatINR(settings.minWithdrawal)}
            </p>
          </div>
          <div className="p-4 sm:px-6">
            <p className="text-xs text-zinc-400">Active / Live Matches</p>
            <p className="font-mono-tabular text-xl font-bold text-emerald-400 mt-0.5">
              {liveCount} Live · {tournaments.length} Total
            </p>
          </div>
        </div>
      </section>

      {/* Tournaments Section */}
      <section className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-white">
              Solo Tournaments
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Slots confirm only after Admin verifies your UPI payment screenshot and UTR.
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-900 border border-white/[0.08] overflow-x-auto">
            {(
              [
                ['all', 'All'],
                ['open', 'Open'],
                ['live', 'Live'],
                ['upcoming', 'Upcoming'],
                ['completed', 'Completed'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`min-h-[38px] px-3.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                  filter === key
                    ? 'bg-orange-500 text-zinc-950'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {filteredTournaments.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.08] bg-zinc-900/60 p-10 text-center space-y-2">
            <Trophy className="w-8 h-8 text-zinc-600 mx-auto" />
            <p className="text-sm font-medium text-zinc-200">No tournaments in this category yet</p>
            <p className="text-xs text-zinc-400">
              Check back soon or switch filters to view upcoming and completed matches.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredTournaments.map((t) => {
              const myReg = regByTournament.get(t.id);
              const slotsRemaining = Math.max(0, t.maxSlots - t.filledSlots);
              const isFull = slotsRemaining === 0;
              const canJoin = t.status === 'Registration Open' && !isFull;

              return (
                <article
                  key={t.id}
                  className="rounded-2xl border border-white/[0.08] bg-zinc-900 overflow-hidden flex flex-col justify-between"
                >
                  <div>
                    <div className="relative h-40">
                      <img
                        src={getMapImage(t.map)}
                        alt={`${t.map} tactical map`}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/40 to-transparent" />
                      <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between gap-2">
                        <StatusLabel status={t.status} />
                        <span className="font-mono-tabular text-xs font-semibold text-zinc-200">
                          {t.map} · {t.format}
                        </span>
                      </div>
                    </div>

                    <div className="p-5 space-y-4">
                      <div>
                        <h3 className="font-display text-lg font-bold text-white leading-snug">
                          {t.title}
                        </h3>
                        {t.announcement && (
                          <p className="text-xs text-orange-300 mt-1 line-clamp-2">
                            {t.announcement}
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-3 py-3 border-y border-white/[0.06] text-left">
                        <div>
                          <p className="text-[11px] text-zinc-400">Entry Fee</p>
                          <p className="font-mono-tabular text-sm font-bold text-white">
                            {formatINR(t.entryFee)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] text-zinc-400">Per Kill</p>
                          <p className="font-mono-tabular text-sm font-bold text-orange-400">
                            {formatINR(t.perKillReward)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] text-zinc-400">Prize Pool</p>
                          <p className="font-mono-tabular text-sm font-bold text-emerald-400">
                            {formatINR(t.prizePool)}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-xs text-zinc-400">
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                            <span>{t.matchDate}</span>
                          </span>
                          <span className="inline-flex items-center gap-1.5 font-mono-tabular text-zinc-200">
                            <Clock className="w-3.5 h-3.5 text-zinc-500" />
                            <span>{t.startTime}</span>
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-zinc-500" />
                            <span>Confirmed Slots</span>
                          </span>
                          <span className="font-mono-tabular text-zinc-200">
                            {t.filledSlots} / {t.maxSlots} ({slotsRemaining} left)
                          </span>
                        </div>
                      </div>

                      {/* Slot Progress */}
                      <div className="h-1.5 w-full rounded-full bg-zinc-950 overflow-hidden">
                        <div
                          className="h-full bg-orange-500 transition-transform"
                          style={{
                            width: `${Math.min(100, Math.round((t.filledSlots / Math.max(1, t.maxSlots)) * 100))}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="px-5 pb-5 flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setRulesModalTournament(t)}
                      aria-label={`View rules for ${t.title}`}
                      className="min-h-[44px] px-3.5 rounded-xl bg-zinc-950 border border-white/10 hover:border-white/20 text-xs font-medium text-zinc-300 flex items-center gap-1.5 shrink-0 transition-colors"
                    >
                      <Shield className="w-3.5 h-3.5 text-orange-400" />
                      <span>Rules</span>
                    </button>

                    {myReg?.paymentStatus === 'Approved' ? (
                      <button
                        type="button"
                        onClick={() => onNavigateTab('room')}
                        className="flex-1 min-h-[44px] px-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 hover:bg-emerald-500/25 text-emerald-300 text-xs font-semibold whitespace-nowrap transition-colors"
                      >
                        Slot Confirmed · View Room
                      </button>
                    ) : myReg?.paymentStatus === 'Pending' ? (
                      <button
                        type="button"
                        onClick={() => onNavigateTab('hub')}
                        className="flex-1 min-h-[44px] px-4 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold whitespace-nowrap"
                      >
                        Payment Pending Verification
                      </button>
                    ) : myReg?.paymentStatus === 'Rejected' && canJoin ? (
                      <button
                        type="button"
                        onClick={() => handleTournamentAction(t)}
                        className="flex-1 min-h-[44px] px-4 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-semibold whitespace-nowrap transition-colors"
                      >
                        Rejected · Resubmit Payment
                      </button>
                    ) : canJoin ? (
                      <button
                        type="button"
                        onClick={() => handleTournamentAction(t)}
                        className="flex-1 min-h-[44px] px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-zinc-950 text-xs font-semibold whitespace-nowrap transition-colors"
                      >
                        Join Match · {formatINR(t.entryFee)}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          t.resultsPublished ? onNavigateTab('leaderboard') : setRulesModalTournament(t)
                        }
                        className="flex-1 min-h-[44px] px-4 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-semibold whitespace-nowrap"
                      >
                        {isFull && t.status === 'Registration Open'
                          ? 'Slots Full'
                          : t.resultsPublished
                          ? 'View Match Results'
                          : t.status}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Announcements & Latest Results 2-Column Split */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-white/[0.08] bg-zinc-900 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Megaphone className="w-5 h-5 text-orange-400" />
              <h2 className="font-display text-lg font-bold text-white">
                Tournament Announcements
              </h2>
            </div>
            <span className="text-xs text-zinc-400 font-mono-tabular">
              {announcements.length} updates
            </span>
          </div>

          {announcements.length === 0 ? (
            <p className="text-xs text-zinc-400 py-6 text-center">
              No announcements published yet.
            </p>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {announcements.slice(0, 5).map((ann) => (
                <div key={ann.id} className="py-3.5 first:pt-0 last:pb-0 space-y-1">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-white">{ann.title}</h3>
                    <span className="text-[11px] text-orange-400 font-medium whitespace-nowrap">
                      {ann.type.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">{ann.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-zinc-900 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Crosshair className="w-5 h-5 text-orange-400" />
              <h2 className="font-display text-lg font-bold text-white">
                Latest Verified Results
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('leaderboard')}
              className="text-xs font-semibold text-orange-400 hover:text-orange-300"
            >
              All Standings
            </button>
          </div>

          {results.length === 0 ? (
            <p className="text-xs text-zinc-400 py-6 text-center">
              Match standings will appear here after Admin verifies and publishes final results.
            </p>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {results.slice(0, 5).map((r) => (
                <div key={r.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      #{r.rank} · {r.ign}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {r.tournamentTitle} · UID {r.ffUid}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono-tabular text-sm font-bold text-emerald-400">
                      {formatINR(r.totalWon)}
                    </p>
                    <p className="font-mono-tabular text-[11px] text-zinc-400">
                      {r.kills} kills
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Rules Inspection Modal */}
      {rulesModalTournament && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full sm:max-w-lg bg-zinc-900 border border-white/10 rounded-t-3xl sm:rounded-2xl p-6 space-y-4 max-h-[88dvh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-lg font-bold text-white">
                  {rulesModalTournament.title} — Match Rules
                </h3>
                <p className="text-xs text-zinc-400">
                  {rulesModalTournament.map} · {rulesModalTournament.format} · Reg closes {rulesModalTournament.regCloseTime}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRulesModalTournament(null)}
                className="min-h-[44px] px-3 rounded-xl text-xs text-zinc-300 hover:bg-white/5"
              >
                Close
              </button>
            </div>
            <ul className="space-y-2 text-sm text-zinc-300 bg-zinc-950 border border-white/[0.08] rounded-xl p-4">
              {(rulesModalTournament.rules || []).map((rule, idx) => (
                <li key={idx} className="leading-relaxed">
                  {rule}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
