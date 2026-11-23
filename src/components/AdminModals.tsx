import React, { useEffect, useState } from 'react';
import { KeyRound, Trophy, X } from 'lucide-react';
import { useVynorix } from '../context/VynorixContext';
import { MAP_NAMES, TOURNAMENT_STATUSES } from '../lib/constants';
import {
  fetchRoomSecret,
  publishTournamentResults,
  saveRoomCredentials,
  saveTournament,
} from '../services/vynorixService';
import type { MapName, Registration, Tournament, TournamentStatus } from '../types/vynorix';

interface TournamentFormModalProps {
  open: boolean;
  editing: Tournament | null;
  onClose: () => void;
}

export function TournamentFormModal({ open, editing, onClose }: TournamentFormModalProps) {
  const { settings, showToast } = useVynorix();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [matchDate, setMatchDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [regCloseTime, setRegCloseTime] = useState('');
  const [roomReleaseTime, setRoomReleaseTime] = useState('');
  const [format, setFormat] = useState('Solo');
  const [map, setMap] = useState<MapName>('Bermuda');
  const [maxSlots, setMaxSlots] = useState(48);
  const [entryFee, setEntryFee] = useState(settings.defaultEntryFee);
  const [perKillReward, setPerKillReward] = useState(settings.perKillReward);
  const [prizePool, setPrizePool] = useState(500);
  const [booyahPrize, setBooyahPrize] = useState(150);
  const [status, setStatus] = useState<TournamentStatus>('Registration Open');
  const [announcement, setAnnouncement] = useState('');
  const [rulesText, setRulesText] = useState(settings.defaultRules.join('\n'));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (editing) {
      setTitle(editing.title);
      setDescription(editing.description || '');
      setMatchDate(editing.matchDate);
      setStartTime(editing.startTime);
      setRegCloseTime(editing.regCloseTime);
      setRoomReleaseTime(editing.roomReleaseTime);
      setFormat(editing.format);
      setMap(editing.map);
      setMaxSlots(editing.maxSlots);
      setEntryFee(editing.entryFee);
      setPerKillReward(editing.perKillReward);
      setPrizePool(editing.prizePool);
      setBooyahPrize(editing.booyahPrize || 0);
      setStatus(editing.status);
      setAnnouncement(editing.announcement || '');
      setRulesText((editing.rules || settings.defaultRules).join('\n'));
    } else {
      const today = new Date().toISOString().slice(0, 10);
      const release = new Date(Date.now() + 2 * 3600 * 1000).toISOString().slice(0, 16);
      setTitle('');
      setDescription('');
      setMatchDate(today);
      setStartTime('20:00 IST');
      setRegCloseTime('19:30 IST');
      setRoomReleaseTime(release);
      setFormat('Solo');
      setMap('Bermuda');
      setMaxSlots(48);
      setEntryFee(settings.defaultEntryFee);
      setPerKillReward(settings.perKillReward);
      setPrizePool(500);
      setBooyahPrize(150);
      setStatus('Registration Open');
      setAnnouncement('');
      setRulesText(settings.defaultRules.join('\n'));
    }
  }, [editing, open, settings]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const rules = rulesText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, 30);

    if (rules.length === 0) {
      showToast('error', 'Include at least 1 tournament rule.');
      return;
    }

    setBusy(true);
    try {
      await saveTournament(
        {
          title: title.trim(),
          description: description.trim(),
          matchDate: matchDate.trim(),
          startTime: startTime.trim(),
          regCloseTime: regCloseTime.trim(),
          roomReleaseTime: roomReleaseTime.trim(),
          format: format.trim(),
          map,
          maxSlots: Number(maxSlots),
          entryFee: Number(entryFee),
          perKillReward: Number(perKillReward),
          prizePool: Number(prizePool),
          booyahPrize: Number(booyahPrize),
          rules,
          status,
          announcement: announcement.trim(),
        },
        editing || undefined
      );
      showToast('success', editing ? 'Tournament updated.' : 'Tournament created.');
      onClose();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to save tournament.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-2xl bg-zinc-900 border border-white/10 rounded-t-3xl sm:rounded-2xl max-h-[92dvh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08]">
          <h2 className="font-display text-lg font-bold text-white">
            {editing ? 'Edit Tournament' : 'Create New Solo Tournament'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-zinc-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-zinc-300 mb-1">Tournament Title</label>
              <input
                type="text"
                required
                minLength={3}
                maxLength={100}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Vynorix Solo Clash #14"
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Match Date</label>
              <input
                type="date"
                required
                value={matchDate}
                onChange={(e) => setMatchDate(e.target.value)}
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Start Time</label>
              <input
                type="text"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                placeholder="20:00 IST"
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Registration Closes</label>
              <input
                type="text"
                required
                value={regCloseTime}
                onChange={(e) => setRegCloseTime(e.target.value)}
                placeholder="19:30 IST"
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Room Release Timestamp (ISO / Local)
              </label>
              <input
                type="datetime-local"
                required
                value={roomReleaseTime.slice(0, 16)}
                onChange={(e) => setRoomReleaseTime(e.target.value)}
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Map</label>
              <select
                value={map}
                onChange={(e) => setMap(e.target.value as MapName)}
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white"
              >
                {MAP_NAMES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TournamentStatus)}
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white"
              >
                {TOURNAMENT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Max Slots</label>
              <input
                type="number"
                required
                min={2}
                max={100}
                value={maxSlots}
                onChange={(e) => setMaxSlots(Number(e.target.value))}
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-zinc-950 border border-white/10 text-sm font-mono-tabular text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Format</label>
              <input
                type="text"
                required
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Entry Fee (₹)</label>
              <input
                type="number"
                required
                min={0}
                value={entryFee}
                onChange={(e) => setEntryFee(Number(e.target.value))}
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-zinc-950 border border-white/10 text-sm font-mono-tabular text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Per-Kill Reward (₹)</label>
              <input
                type="number"
                required
                min={0}
                value={perKillReward}
                onChange={(e) => setPerKillReward(Number(e.target.value))}
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-zinc-950 border border-white/10 text-sm font-mono-tabular text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Prize Pool (₹)</label>
              <input
                type="number"
                required
                min={0}
                value={prizePool}
                onChange={(e) => setPrizePool(Number(e.target.value))}
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-zinc-950 border border-white/10 text-sm font-mono-tabular text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Booyah #1 Bonus (₹)</label>
              <input
                type="number"
                min={0}
                value={booyahPrize}
                onChange={(e) => setBooyahPrize(Number(e.target.value))}
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-zinc-950 border border-white/10 text-sm font-mono-tabular text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Tournament Highlight / Announcement (Optional)
            </label>
            <input
              type="text"
              maxLength={500}
              value={announcement}
              onChange={(e) => setAnnouncement(e.target.value)}
              placeholder="e.g. Join lobby 10 mins early. No character skills allowed."
              className="w-full min-h-[44px] px-3.5 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Match Rules (One per line)
            </label>
            <textarea
              rows={6}
              value={rulesText}
              onChange={(e) => setRulesText(e.target.value)}
              className="w-full p-3.5 rounded-xl bg-zinc-950 border border-white/10 text-xs text-white"
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full min-h-[48px] rounded-xl bg-orange-500 hover:bg-orange-600 text-zinc-950 font-semibold text-sm"
          >
            {busy ? 'Saving...' : editing ? 'Save Changes' : 'Create Tournament'}
          </button>
        </form>
      </div>
    </div>
  );
}

interface RoomCredentialsModalProps {
  tournament: Tournament | null;
  onClose: () => void;
}

export function RoomCredentialsModal({ tournament, onClose }: RoomCredentialsModalProps) {
  const { showToast } = useVynorix();
  const [roomId, setRoomId] = useState('');
  const [roomPassword, setRoomPassword] = useState('');
  const [releaseIso, setReleaseIso] = useState('');
  const [releaseImmediately, setReleaseImmediately] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!tournament) return;
    setReleaseIso(tournament.roomReleaseTime.slice(0, 16));
    fetchRoomSecret(tournament.id).then((sec) => {
      if (sec) {
        setRoomId(sec.roomId);
        setRoomPassword(sec.roomPassword);
      } else {
        setRoomId('');
        setRoomPassword('');
      }
    });
  }, [tournament]);

  if (!tournament) return null;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!tournament) return;
    setBusy(true);
    try {
      await saveRoomCredentials({
        tournament,
        roomId,
        roomPassword,
        matchDate: tournament.matchDate,
        matchTime: tournament.startTime,
        mapName: tournament.map,
        mode: tournament.format,
        maxPlayers: tournament.maxSlots,
        releaseDateTimeIso: releaseIso || new Date().toISOString(),
        releaseImmediately,
      });
      showToast(
        'success',
        releaseImmediately
          ? 'Room details saved & released to approved players!'
          : 'Room details saved privately until scheduled release.'
      );
      onClose();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to save room details.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-zinc-900 border border-white/10 rounded-t-3xl sm:rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-orange-400" />
            <h2 className="font-display text-lg font-bold text-white">Custom Room Credentials</h2>
          </div>
          <button type="button" onClick={onClose} className="min-h-[40px] px-2 text-zinc-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-zinc-400">
          {tournament.title} · {tournament.map} · {tournament.maxSlots} Slots
        </p>

        <form onSubmit={handleSave} className="space-y-3.5">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">Free Fire Room ID</label>
            <input
              type="text"
              required
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="e.g. 148294021"
              className="w-full min-h-[44px] px-3.5 rounded-xl bg-zinc-950 border border-white/10 text-sm font-mono-tabular text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">Room Password</label>
            <input
              type="text"
              required
              value={roomPassword}
              onChange={(e) => setRoomPassword(e.target.value)}
              placeholder="e.g. VYN77"
              className="w-full min-h-[44px] px-3.5 rounded-xl bg-zinc-950 border border-white/10 text-sm font-mono-tabular text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">Release Date & Time</label>
            <input
              type="datetime-local"
              value={releaseIso}
              onChange={(e) => setReleaseIso(e.target.value)}
              className="w-full min-h-[44px] px-3.5 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white"
            />
          </div>
          <label className="flex items-center gap-2.5 min-h-[40px] cursor-pointer">
            <input
              type="checkbox"
              checked={releaseImmediately}
              onChange={(e) => setReleaseImmediately(e.target.checked)}
              className="w-4 h-4 accent-orange-500"
            />
            <span className="text-xs text-zinc-200">
              Release immediately & notify all verified players
            </span>
          </label>
          <button
            type="submit"
            disabled={busy}
            className="w-full min-h-[46px] rounded-xl bg-orange-500 hover:bg-orange-600 text-zinc-950 font-semibold text-sm"
          >
            {busy ? 'Saving...' : 'Save Room Credentials'}
          </button>
        </form>
      </div>
    </div>
  );
}

interface PublishResultsModalProps {
  tournament: Tournament | null;
  approvedRegistrations: Registration[];
  onClose: () => void;
}

export function PublishResultsModal({
  tournament,
  approvedRegistrations,
  onClose,
}: PublishResultsModalProps) {
  const { showToast } = useVynorix();
  const [rows, setRows] = useState<
    Record<string, { rank: number; kills: number; placementPrize: number; include: boolean }>
  >({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const initial: Record<
      string,
      { rank: number; kills: number; placementPrize: number; include: boolean }
    > = {};
    approvedRegistrations.forEach((reg, idx) => {
      initial[reg.userId] = {
        rank: idx + 1,
        kills: 0,
        placementPrize: idx === 0 ? tournament?.booyahPrize || 0 : 0,
        include: true,
      };
    });
    setRows(initial);
  }, [approvedRegistrations, tournament]);

  if (!tournament) return null;

  async function handlePublish(e: React.FormEvent) {
    e.preventDefault();
    if (!tournament) return;
    const entries = approvedRegistrations
      .filter((r) => rows[r.userId]?.include)
      .map((r) => ({
        userId: r.userId,
        playerCode: r.playerCode,
        ign: r.ign,
        ffUid: r.ffUid,
        rank: Number(rows[r.userId]?.rank || 1),
        kills: Number(rows[r.userId]?.kills || 0),
        placementPrize: Number(rows[r.userId]?.placementPrize || 0),
      }));

    if (entries.length === 0) {
      showToast('error', 'Select at least one player to publish results.');
      return;
    }

    setBusy(true);
    try {
      await publishTournamentResults({ tournament, entries });
      showToast('success', 'Final results published to Leaderboard & players notified.');
      onClose();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to publish results.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-2xl bg-zinc-900 border border-white/10 rounded-t-3xl sm:rounded-2xl max-h-[90dvh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-orange-400" />
            <h2 className="font-display text-lg font-bold text-white">
              Publish Final Results — {tournament.title}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="min-h-[40px] px-2 text-zinc-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handlePublish} className="p-6 overflow-y-auto space-y-4">
          {approvedRegistrations.length === 0 ? (
            <p className="text-xs text-zinc-400 py-6 text-center">
              No approved players found in this tournament yet.
            </p>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-zinc-400">
                Enter Rank, Kills, and any Booyah/Placement Bonus (₹). Placement prizes credit player wallets automatically; per-kill rewards are verified via Kill Claims.
              </p>
              {approvedRegistrations.map((reg) => {
                const r = rows[reg.userId] || {
                  rank: 1,
                  kills: 0,
                  placementPrize: 0,
                  include: true,
                };
                return (
                  <div
                    key={reg.id}
                    className="p-3.5 rounded-xl bg-zinc-950 border border-white/[0.08] grid grid-cols-2 sm:grid-cols-5 gap-3 items-center"
                  >
                    <label className="col-span-2 flex items-center gap-2 text-xs text-white font-semibold">
                      <input
                        type="checkbox"
                        checked={r.include}
                        onChange={(e) =>
                          setRows((prev) => ({
                            ...prev,
                            [reg.userId]: { ...r, include: e.target.checked },
                          }))
                        }
                        className="w-4 h-4 accent-orange-500"
                      />
                      <span>
                        {reg.ign} ({reg.ffUid})
                      </span>
                    </label>
                    <div>
                      <span className="block text-[10px] text-zinc-400">Rank</span>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={r.rank}
                        onChange={(e) =>
                          setRows((prev) => ({
                            ...prev,
                            [reg.userId]: { ...r, rank: Number(e.target.value) },
                          }))
                        }
                        className="w-full min-h-[38px] px-2.5 rounded-lg bg-zinc-900 border border-white/10 text-xs font-mono-tabular text-white"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] text-zinc-400">Kills</span>
                      <input
                        type="number"
                        min={0}
                        max={99}
                        value={r.kills}
                        onChange={(e) =>
                          setRows((prev) => ({
                            ...prev,
                            [reg.userId]: { ...r, kills: Number(e.target.value) },
                          }))
                        }
                        className="w-full min-h-[38px] px-2.5 rounded-lg bg-zinc-900 border border-white/10 text-xs font-mono-tabular text-white"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] text-zinc-400">Placement ₹</span>
                      <input
                        type="number"
                        min={0}
                        value={r.placementPrize}
                        onChange={(e) =>
                          setRows((prev) => ({
                            ...prev,
                            [reg.userId]: { ...r, placementPrize: Number(e.target.value) },
                          }))
                        }
                        className="w-full min-h-[38px] px-2.5 rounded-lg bg-zinc-900 border border-white/10 text-xs font-mono-tabular text-white"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <button
            type="submit"
            disabled={busy || approvedRegistrations.length === 0}
            className="w-full min-h-[48px] rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-zinc-950 font-semibold text-sm"
          >
            {busy ? 'Publishing...' : 'Publish Final Results'}
          </button>
        </form>
      </div>
    </div>
  );
}
