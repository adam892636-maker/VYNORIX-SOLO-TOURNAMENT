import { useEffect, useMemo, useState } from 'react';
import { Check, Clock, Copy, Eye, EyeOff, KeyRound, Lock, RefreshCw, Shield } from 'lucide-react';
import { useVynorix } from '../context/VynorixContext';
import { fetchRoomSecret } from '../services/vynorixService';
import type { RoomSecret, Tournament } from '../types/vynorix';
import { StatusLabel } from './StatusLabel';

function useCountdown(targetIso: string) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const targetMs = new Date(targetIso).getTime();
  if (Number.isNaN(targetMs)) {
    return { valid: false, expired: false, label: targetIso };
  }
  const diff = targetMs - now;
  if (diff <= 0) {
    return { valid: true, expired: true, label: '00h 00m 00s (Release Time Reached)' };
  }
  const totalSec = Math.floor(diff / 1000);
  const days = Math.floor(totalSec / 86400);
  const hrs = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  const label = days > 0 ? `${days}d ${pad(hrs)}h ${pad(mins)}m ${pad(secs)}s` : `${pad(hrs)}h ${pad(mins)}m ${pad(secs)}s`;
  return { valid: true, expired: false, label };
}

function RoomTournamentCard({ tournament }: { tournament: Tournament }) {
  const { myRegistrations, isAdmin, showToast } = useVynorix();
  const [secret, setSecret] = useState<RoomSecret | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [copiedField, setCopiedField] = useState<'id' | 'pass' | null>(null);

  const myReg = useMemo(
    () => myRegistrations.find((r) => r.tournamentId === tournament.id),
    [myRegistrations, tournament.id]
  );

  const isApproved = Boolean(myReg?.paymentStatus === 'Approved' && myReg?.slotConfirmed);
  const countdown = useCountdown(tournament.roomReleaseTime);
  const isReleasedStatus =
    tournament.status === 'Room Details Released' ||
    tournament.status === 'Live' ||
    tournament.status === 'Completed';

  const canAttemptFetch = isAdmin || (isApproved && (isReleasedStatus || countdown.expired));

  async function loadSecret() {
    if (!canAttemptFetch) return;
    setLoading(true);
    const res = await fetchRoomSecret(tournament.id);
    setSecret(res);
    setLoading(false);
  }

  useEffect(() => {
    void loadSecret();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournament.id, canAttemptFetch]);

  async function copyValue(val: string, field: 'id' | 'pass') {
    try {
      await navigator.clipboard.writeText(val);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1800);
    } catch {
      showToast('error', 'Failed to copy to clipboard.');
    }
  }

  return (
    <article className="rounded-2xl border border-white/[0.08] bg-zinc-900 p-6 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1">
            <span>{tournament.map}</span>
            <span aria-hidden="true">·</span>
            <span>{tournament.format}</span>
            <span aria-hidden="true">·</span>
            <span>Max {tournament.maxSlots} Players</span>
          </div>
          <h3 className="font-display text-xl font-bold text-white">{tournament.title}</h3>
        </div>
        <StatusLabel status={tournament.status} />
      </div>

      {/* Match Schedule + Countdown */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-zinc-950 border border-white/[0.06]">
        <div>
          <p className="text-[11px] text-zinc-400">Match Date & Time</p>
          <p className="font-mono-tabular text-sm font-semibold text-white mt-0.5">
            {tournament.matchDate} · {tournament.startTime}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-zinc-400">Your Entry Status</p>
          <div className="mt-0.5">
            {isAdmin ? (
              <span className="text-xs font-semibold text-orange-400">Admin Access</span>
            ) : myReg ? (
              <StatusLabel status={myReg.paymentStatus} />
            ) : (
              <span className="text-xs text-zinc-400">Not Registered</span>
            )}
          </div>
        </div>
        <div>
          <p className="text-[11px] text-zinc-400 flex items-center gap-1">
            <Clock className="w-3 h-3 text-orange-400" />
            <span>Room Release Countdown</span>
          </p>
          <p className="font-mono-tabular text-sm font-bold text-orange-400 mt-0.5">
            {isReleasedStatus ? 'Released Now' : countdown.label}
          </p>
        </div>
      </div>

      {/* Protected Room Credentials Box */}
      {secret ? (
        <div className="p-5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-300 text-sm font-semibold">
              <KeyRound className="w-4 h-4" />
              <span>Verified Custom Room Credentials</span>
            </div>
            <span className="text-xs text-zinc-300 font-mono-tabular">
              {secret.mapName} · {secret.mode}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-zinc-950 border border-white/10 flex items-center justify-between gap-2">
              <div>
                <p className="text-[11px] text-zinc-400">Room ID</p>
                <p className="font-mono-tabular text-base font-bold text-white">{secret.roomId}</p>
              </div>
              <button
                type="button"
                onClick={() => copyValue(secret.roomId, 'id')}
                className="min-h-[40px] px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white flex items-center gap-1.5"
              >
                {copiedField === 'id' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedField === 'id' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-950 border border-white/10 flex items-center justify-between gap-2">
              <div>
                <p className="text-[11px] text-zinc-400">Room Password</p>
                <p className="font-mono-tabular text-base font-bold text-white">
                  {showPass ? secret.roomPassword : '••••••••'}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                  className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => copyValue(secret.roomPassword, 'pass')}
                  className="min-h-[40px] px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white flex items-center gap-1.5"
                >
                  {copiedField === 'pass' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedField === 'pass' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-5 rounded-xl bg-zinc-950 border border-white/[0.08] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Lock className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-white">Room ID & Password Protected</p>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {!isApproved && !isAdmin
                  ? 'Credentials are strictly hidden from unapproved players. Register and wait for Admin UPI payment verification to unlock access.'
                  : !isReleasedStatus && !countdown.expired
                  ? 'Your slot is confirmed! Credentials will automatically unlock here when the release countdown finishes.'
                  : 'Admin has not entered the custom room credentials yet. Tap refresh once notified.'}
              </p>
            </div>
          </div>

          {canAttemptFetch && (
            <button
              type="button"
              disabled={loading}
              onClick={loadSecret}
              className="min-h-[44px] px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white flex items-center gap-2 shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Check Room</span>
            </button>
          )}
        </div>
      )}

      {/* Rules Reminder */}
      <details className="rounded-xl bg-zinc-950 border border-white/[0.06] p-4">
        <summary className="text-xs font-semibold text-zinc-200 cursor-pointer flex items-center gap-2">
          <Shield className="w-4 h-4 text-orange-400" />
          <span>View Match Rules ({tournament.rules?.length || 10})</span>
        </summary>
        <ul className="mt-3 space-y-1 text-xs text-zinc-400">
          {(tournament.rules || []).map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      </details>
    </article>
  );
}

export function CustomRoomView({ onOpenAuth }: { onOpenAuth: () => void }) {
  const { firebaseUser, tournaments, myRegistrations } = useVynorix();

  const relevantTournaments = useMemo(() => {
    const myIds = new Set(myRegistrations.map((r) => r.tournamentId));
    return tournaments.filter(
      (t) =>
        myIds.has(t.id) ||
        t.status === 'Room Details Released' ||
        t.status === 'Live' ||
        t.status === 'Registration Open' ||
        t.status === 'Registration Closed'
    );
  }, [tournaments, myRegistrations]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
            Free Fire Custom Room Access
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Room ID and Password are encrypted behind Firestore verification and unlock only for approved players at release time.
          </p>
        </div>
        {!firebaseUser && (
          <button
            type="button"
            onClick={onOpenAuth}
            className="min-h-[44px] px-5 rounded-xl bg-orange-500 hover:bg-orange-600 text-zinc-950 font-semibold text-xs whitespace-nowrap shrink-0"
          >
            Sign In to Unlock Rooms
          </button>
        )}
      </div>

      {relevantTournaments.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-zinc-900 p-10 text-center space-y-2">
          <Lock className="w-8 h-8 text-zinc-600 mx-auto" />
          <p className="text-sm font-semibold text-white">No active custom rooms right now</p>
          <p className="text-xs text-zinc-400">
            Join an open tournament from the Arena tab to get your custom room slot.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {relevantTournaments.map((t) => (
            <RoomTournamentCard key={t.id} tournament={t} />
          ))}
        </div>
      )}
    </div>
  );
}
