import React, { useEffect, useMemo, useState } from 'react';
import {
  Ban,
  CheckCircle2,
  Eye,
  KeyRound,
  Megaphone,
  Pencil,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Trash2,
  Trophy,
  Upload,
  Users,
  Wallet,
  X,
  XCircle,
} from 'lucide-react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { useVynorix } from '../context/VynorixContext';
import { formatINR } from '../lib/constants';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { compressAndUploadImage } from '../lib/imageUtils';
import {
  approveKillClaim,
  approvePaymentRegistration,
  deleteTournament,
  ensureInitialPlatformSettings,
  processWithdrawalRequest,
  publishAnnouncement,
  rejectKillClaim,
  rejectPaymentRegistration,
  savePlatformSettings,
  togglePlayerBan,
  updateSupportTicket,
} from '../services/vynorixService';
import type {
  AuditLog,
  KillClaim,
  Registration,
  SupportTicket,
  TicketStatus,
  Tournament,
  UserPrivate,
  WalletTransaction,
  Withdrawal,
} from '../types/vynorix';
import { PublishResultsModal, RoomCredentialsModal, TournamentFormModal } from './AdminModals';
import { StatusLabel } from './StatusLabel';

type AdminSection =
  | 'overview'
  | 'tournaments'
  | 'payments'
  | 'wallet'
  | 'players'
  | 'announcements'
  | 'settings';

export function AdminDashboardView() {
  const { isAdmin, settings, tournaments, showToast } = useVynorix();

  const [section, setSection] = useState<AdminSection>('overview');
  const [allUsers, setAllUsers] = useState<UserPrivate[]>([]);
  const [allRegistrations, setAllRegistrations] = useState<Registration[]>([]);
  const [allKillClaims, setAllKillClaims] = useState<KillClaim[]>([]);
  const [allWithdrawals, setAllWithdrawals] = useState<Withdrawal[]>([]);
  const [allTransactions, setAllTransactions] = useState<WalletTransaction[]>([]);
  const [allTickets, setAllTickets] = useState<SupportTicket[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Modals & action inputs
  const [trnModalOpen, setTrnModalOpen] = useState(false);
  const [editingTrn, setEditingTrn] = useState<Tournament | null>(null);
  const [roomTrn, setRoomTrn] = useState<Tournament | null>(null);
  const [resultsTrn, setResultsTrn] = useState<Tournament | null>(null);
  const [previewImg, setPreviewImg] = useState<string | null>(null);

  const [playerSearch, setPlayerSearch] = useState('');
  const [killVerifyInputs, setKillVerifyInputs] = useState<Record<string, number>>({});
  const [payoutUtrs, setPayoutUtrs] = useState<Record<string, string>>({});
  const [rejectNotes, setRejectNotes] = useState<Record<string, string>>({});
  const [ticketReplies, setTicketReplies] = useState<Record<string, string>>({});

  // Announcement form
  const [annTitle, setAnnTitle] = useState('');
  const [annMessage, setAnnMessage] = useState('');
  const [annType, setAnnType] = useState<'general' | 'tournament' | 'room_release' | 'result'>('general');
  const [annTournamentId, setAnnTournamentId] = useState('');
  const [annBroadcast, setAnnBroadcast] = useState(true);

  // Settings form
  const [cfgEntryFee, setCfgEntryFee] = useState(settings.defaultEntryFee);
  const [cfgKillReward, setCfgKillReward] = useState(settings.perKillReward);
  const [cfgMinWithdrawal, setCfgMinWithdrawal] = useState(settings.minWithdrawal);
  const [cfgUpiId, setCfgUpiId] = useState(settings.upiId);
  const [cfgQrUrl, setCfgQrUrl] = useState(settings.upiQrUrl || '');
  const [cfgRulesText, setCfgRulesText] = useState(settings.defaultRules.join('\n'));
  const [cfgMaintenance, setCfgMaintenance] = useState(settings.maintenanceMode);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    setCfgEntryFee(settings.defaultEntryFee);
    setCfgKillReward(settings.perKillReward);
    setCfgMinWithdrawal(settings.minWithdrawal);
    setCfgUpiId(settings.upiId);
    setCfgQrUrl(settings.upiQrUrl || '');
    setCfgRulesText(settings.defaultRules.join('\n'));
    setCfgMaintenance(settings.maintenanceMode);
  }, [settings]);

  // Attach Admin-only listeners ONLY if verified Admin
  useEffect(() => {
    if (!isAdmin) return;
    void ensureInitialPlatformSettings();

    const unsubUsers = onSnapshot(
      collection(db, 'users'),
      (snap) => setAllUsers(snap.docs.map((d) => d.data() as UserPrivate)),
      (err) => handleFirestoreError(err, OperationType.LIST, 'users')
    );
    const unsubRegs = onSnapshot(
      query(collection(db, 'registrations'), orderBy('createdAt', 'desc')),
      (snap) => setAllRegistrations(snap.docs.map((d) => d.data() as Registration)),
      (err) => handleFirestoreError(err, OperationType.LIST, 'registrations')
    );
    const unsubClaims = onSnapshot(
      query(collection(db, 'kill_claims'), orderBy('createdAt', 'desc')),
      (snap) => setAllKillClaims(snap.docs.map((d) => d.data() as KillClaim)),
      (err) => handleFirestoreError(err, OperationType.LIST, 'kill_claims')
    );
    const unsubWdr = onSnapshot(
      query(collection(db, 'withdrawals'), orderBy('createdAt', 'desc')),
      (snap) => setAllWithdrawals(snap.docs.map((d) => d.data() as Withdrawal)),
      (err) => handleFirestoreError(err, OperationType.LIST, 'withdrawals')
    );
    const unsubTx = onSnapshot(
      query(collection(db, 'wallet_transactions'), orderBy('createdAt', 'desc')),
      (snap) => setAllTransactions(snap.docs.map((d) => d.data() as WalletTransaction)),
      (err) => handleFirestoreError(err, OperationType.LIST, 'wallet_transactions')
    );
    const unsubTickets = onSnapshot(
      query(collection(db, 'support_tickets'), orderBy('createdAt', 'desc')),
      (snap) => setAllTickets(snap.docs.map((d) => d.data() as SupportTicket)),
      (err) => handleFirestoreError(err, OperationType.LIST, 'support_tickets')
    );
    const unsubLogs = onSnapshot(
      query(collection(db, 'audit_logs'), orderBy('createdAt', 'desc')),
      (snap) => setAuditLogs(snap.docs.map((d) => d.data() as AuditLog)),
      (err) => handleFirestoreError(err, OperationType.LIST, 'audit_logs')
    );

    return () => {
      unsubUsers();
      unsubRegs();
      unsubClaims();
      unsubWdr();
      unsubTx();
      unsubTickets();
      unsubLogs();
    };
  }, [isAdmin]);

  const metrics = useMemo(() => {
    const activeTournaments = tournaments.filter(
      (t) => t.status !== 'Completed' && t.status !== 'Cancelled'
    ).length;
    const verifiedCollection = allRegistrations
      .filter((r) => r.paymentStatus === 'Approved')
      .reduce((s, r) => s + r.entryFee, 0);
    const pendingPayments = allRegistrations.filter((r) => r.paymentStatus === 'Pending').length;
    const totalKillRewards = allKillClaims
      .filter((c) => c.status === 'Approved')
      .reduce((s, c) => s + c.totalReward, 0);
    const pendingWithdrawals = allWithdrawals.filter(
      (w) => w.status === 'Pending' || w.status === 'Approved'
    ).length;

    return {
      totalPlayers: allUsers.length,
      totalTournaments: tournaments.length,
      activeTournaments,
      totalRegistrations: allRegistrations.length,
      verifiedCollection,
      pendingPayments,
      totalKillRewards,
      pendingWithdrawals,
    };
  }, [allUsers, tournaments, allRegistrations, allKillClaims, allWithdrawals]);

  const filteredUsers = useMemo(() => {
    const q = playerSearch.trim().toLowerCase();
    return allUsers.filter(
      (u) =>
        !q ||
        u.ign.toLowerCase().includes(q) ||
        u.ffUid.includes(q) ||
        u.playerCode.toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q)
    );
  }, [allUsers, playerSearch]);

  if (!isAdmin) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-zinc-900 p-10 text-center space-y-2">
        <ShieldCheck className="w-10 h-10 text-red-400 mx-auto" />
        <h1 className="font-display text-xl font-bold text-white">Restricted Owner Console</h1>
        <p className="text-xs text-zinc-400">
          Only verified Admin accounts can view and operate the Vynorix Admin Dashboard.
        </p>
      </div>
    );
  }

  async function handleQrUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await compressAndUploadImage(file, `platform/upi_qr_${Date.now()}.jpg`, 640);
      setCfgQrUrl(url);
      showToast('info', 'QR image prepared. Click Save Settings to apply.');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to upload QR.');
    }
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    const rules = cfgRulesText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, 30);
    if (rules.length === 0) {
      showToast('error', 'At least 1 default rule is required.');
      return;
    }
    setSavingSettings(true);
    try {
      await savePlatformSettings({
        defaultEntryFee: Number(cfgEntryFee),
        perKillReward: Number(cfgKillReward),
        minWithdrawal: Number(cfgMinWithdrawal),
        upiId: cfgUpiId.trim(),
        upiQrUrl: cfgQrUrl,
        defaultRules: rules,
        maintenanceMode: cfgMaintenance,
      });
      showToast('success', 'Platform settings updated.');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to update settings.');
    } finally {
      setSavingSettings(false);
    }
  }

  async function handlePublishAnnouncement(e: React.FormEvent) {
    e.preventDefault();
    try {
      await publishAnnouncement({
        title: annTitle,
        message: annMessage,
        type: annType,
        tournamentId: annTournamentId || undefined,
        broadcastToAllPlayers: annBroadcast,
      });
      setAnnTitle('');
      setAnnMessage('');
      showToast('success', 'Announcement published.');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to publish announcement.');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
            Vynorix Owner Admin Console
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Atomic financial operations, tournament room control, payment verification, and audit logs.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingTrn(null);
            setTrnModalOpen(true);
          }}
          className="min-h-[44px] px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-zinc-950 font-semibold text-xs flex items-center gap-2 whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Create Tournament</span>
        </button>
      </div>

      {/* Admin Navigation Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-900 border border-white/[0.08] overflow-x-auto">
        {(
          [
            ['overview', 'Overview'],
            ['tournaments', `Tournaments (${tournaments.length})`],
            ['payments', `Payments (${metrics.pendingPayments})`],
            ['wallet', `Kills & Payouts (${metrics.pendingWithdrawals})`],
            ['players', `Players & Reports (${allUsers.length})`],
            ['announcements', 'Announcements'],
            ['settings', 'Settings'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setSection(key)}
            className={`min-h-[40px] px-3.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
              section === key ? 'bg-orange-500 text-zinc-950' : 'text-zinc-400 hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* A. OVERVIEW */}
      {section === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-white/[0.08] bg-zinc-900 p-5">
              <p className="text-xs text-zinc-400">Total Players</p>
              <p className="font-mono-tabular text-2xl font-bold text-white mt-1">
                {metrics.totalPlayers}
              </p>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-zinc-900 p-5">
              <p className="text-xs text-zinc-400">Tournaments (Active / Total)</p>
              <p className="font-mono-tabular text-2xl font-bold text-orange-400 mt-1">
                {metrics.activeTournaments} / {metrics.totalTournaments}
              </p>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-zinc-900 p-5">
              <p className="text-xs text-zinc-400">Verified Entry Collection</p>
              <p className="font-mono-tabular text-2xl font-bold text-emerald-400 mt-1">
                {formatINR(metrics.verifiedCollection)}
              </p>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-zinc-900 p-5">
              <p className="text-xs text-zinc-400">Total Registrations</p>
              <p className="font-mono-tabular text-2xl font-bold text-white mt-1">
                {metrics.totalRegistrations}
              </p>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-zinc-900 p-5">
              <p className="text-xs text-zinc-400">Pending Payments</p>
              <p className="font-mono-tabular text-2xl font-bold text-amber-400 mt-1">
                {metrics.pendingPayments}
              </p>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-zinc-900 p-5">
              <p className="text-xs text-zinc-400">Verified Kill Rewards Paid</p>
              <p className="font-mono-tabular text-2xl font-bold text-white mt-1">
                {formatINR(metrics.totalKillRewards)}
              </p>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-zinc-900 p-5">
              <p className="text-xs text-zinc-400">Pending Withdrawals</p>
              <p className="font-mono-tabular text-2xl font-bold text-amber-400 mt-1">
                {metrics.pendingWithdrawals}
              </p>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-zinc-900 p-5">
              <p className="text-xs text-zinc-400">Audit Events Logged</p>
              <p className="font-mono-tabular text-2xl font-bold text-white mt-1">
                {auditLogs.length}
              </p>
            </div>
          </div>

          {/* Audit Log */}
          <section className="rounded-2xl border border-white/[0.08] bg-zinc-900 p-6 space-y-3">
            <h2 className="font-display text-lg font-bold text-white">Financial Audit Log</h2>
            {auditLogs.length === 0 ? (
              <p className="text-xs text-zinc-400 py-4">No financial audit events yet.</p>
            ) : (
              <div className="divide-y divide-white/[0.06] max-h-80 overflow-y-auto">
                {auditLogs.slice(0, 20).map((log) => (
                  <div key={log.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="font-mono-tabular font-semibold text-orange-400">
                        {log.action}
                      </span>
                      <span className="text-zinc-400 ml-2">{log.details}</span>
                    </div>
                    <span className="font-mono-tabular text-white shrink-0">
                      {formatINR(log.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* B. TOURNAMENT CONTROL */}
      {section === 'tournaments' && (
        <section className="space-y-4">
          {tournaments.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.08] bg-zinc-900 p-10 text-center space-y-3">
              <p className="text-sm font-medium text-white">No tournaments created yet</p>
              <button
                type="button"
                onClick={() => {
                  setEditingTrn(null);
                  setTrnModalOpen(true);
                }}
                className="min-h-[44px] px-5 rounded-xl bg-orange-500 text-zinc-950 font-semibold text-xs"
              >
                Create First Solo Tournament
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {tournaments.map((t) => (
                <div
                  key={t.id}
                  className="rounded-2xl border border-white/[0.08] bg-zinc-900 p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-display text-lg font-bold text-white">{t.title}</h3>
                      <StatusLabel status={t.status} />
                    </div>
                    <p className="text-xs font-mono-tabular text-zinc-400">
                      {t.map} · {t.matchDate} {t.startTime} · Slots {t.filledSlots}/{t.maxSlots} · Entry {formatINR(t.entryFee)} · {formatINR(t.perKillReward)}/kill
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setRoomTrn(t)}
                      className="min-h-[40px] px-3.5 rounded-xl bg-zinc-950 border border-white/10 hover:border-orange-500/40 text-xs font-semibold text-orange-400 flex items-center gap-1.5"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Room ID / Pass</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setResultsTrn(t)}
                      className="min-h-[40px] px-3.5 rounded-xl bg-zinc-950 border border-white/10 hover:border-emerald-500/40 text-xs font-semibold text-emerald-400 flex items-center gap-1.5"
                    >
                      <Trophy className="w-3.5 h-3.5" />
                      <span>Publish Results</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTrn(t);
                        setTrnModalOpen(true);
                      }}
                      className="min-h-[40px] px-3.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white flex items-center gap-1.5"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteTournament(t.id)}
                      aria-label={`Delete ${t.title}`}
                      className="min-h-[40px] px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* D. PAYMENT MANAGEMENT */}
      {section === 'payments' && (
        <section className="space-y-4">
          {allRegistrations.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.08] bg-zinc-900 p-10 text-center text-xs text-zinc-400">
              No player registrations submitted yet.
            </div>
          ) : (
            <div className="space-y-3">
              {allRegistrations.map((reg) => (
                <div
                  key={reg.id}
                  className="rounded-2xl border border-white/[0.08] bg-zinc-900 p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-semibold text-white">{reg.ign}</span>
                      <span className="font-mono-tabular text-xs text-zinc-400">
                        UID {reg.ffUid} · {reg.playerCode}
                      </span>
                      <StatusLabel status={reg.paymentStatus} />
                    </div>
                    <p className="text-xs text-zinc-300">
                      {reg.tournamentTitle} · Fee <strong className="font-mono-tabular">{formatINR(reg.entryFee)}</strong> · UTR:{' '}
                      <code className="font-mono-tabular text-orange-400">{reg.utrNumber}</code>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPreviewImg(reg.screenshotData)}
                      className="min-h-[40px] px-3.5 rounded-xl bg-zinc-950 border border-white/10 text-xs font-semibold text-zinc-200 flex items-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5 text-orange-400" />
                      <span>Screenshot</span>
                    </button>

                    {reg.paymentStatus === 'Pending' && (
                      <>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await approvePaymentRegistration(reg);
                              showToast('success', `Approved ${reg.ign} slot.`);
                            } catch (err) {
                              showToast('error', err instanceof Error ? err.message : 'Approval failed.');
                            }
                          }}
                          className="min-h-[40px] px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-zinc-950 text-xs font-semibold flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>
                        <input
                          type="text"
                          value={rejectNotes[reg.id] || ''}
                          onChange={(e) =>
                            setRejectNotes((p) => ({ ...p, [reg.id]: e.target.value }))
                          }
                          placeholder="Reject reason..."
                          className="min-h-[40px] px-3 rounded-xl bg-zinc-950 border border-white/10 text-xs text-white w-40"
                        />
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await rejectPaymentRegistration(
                                reg,
                                rejectNotes[reg.id] || 'Payment not received'
                              );
                              showToast('info', 'Payment rejected.');
                            } catch (err) {
                              showToast('error', err instanceof Error ? err.message : 'Rejection failed.');
                            }
                          }}
                          className="min-h-[40px] px-3.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-400 text-xs font-semibold flex items-center gap-1.5"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* E. WALLET MANAGEMENT (KILL CLAIMS + WITHDRAWALS + LEDGER) */}
      {section === 'wallet' && (
        <div className="space-y-6">
          {/* Kill Verification Queue */}
          <section className="rounded-2xl border border-white/[0.08] bg-zinc-900 p-6 space-y-4">
            <h2 className="font-display text-lg font-bold text-white">
              Kill Verification Queue ({allKillClaims.filter((c) => c.status === 'Pending').length} Pending)
            </h2>
            {allKillClaims.length === 0 ? (
              <p className="text-xs text-zinc-400">No kill claims submitted yet.</p>
            ) : (
              <div className="space-y-3">
                {allKillClaims.map((claim) => {
                  const verifyCount =
                    killVerifyInputs[claim.id] !== undefined
                      ? killVerifyInputs[claim.id]
                      : claim.claimedKills;
                  return (
                    <div
                      key={claim.id}
                      className="p-4 rounded-xl bg-zinc-950 border border-white/[0.08] flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="text-sm font-semibold text-white">{claim.ign}</span>
                          <span className="font-mono-tabular text-xs text-zinc-400">
                            UID {claim.ffUid}
                          </span>
                          <StatusLabel status={claim.status} />
                        </div>
                        <p className="text-xs text-zinc-300">
                          {claim.tournamentTitle} · Claimed{' '}
                          <strong className="font-mono-tabular text-orange-400">
                            {claim.claimedKills} kills
                          </strong>{' '}
                          ({formatINR(claim.perKillReward)}/kill)
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setPreviewImg(claim.screenshotData)}
                          className="min-h-[40px] px-3 rounded-xl bg-zinc-900 border border-white/10 text-xs font-semibold text-zinc-200 flex items-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5 text-orange-400" />
                          <span>Proof</span>
                        </button>

                        {claim.status === 'Pending' && (
                          <>
                            <input
                              type="number"
                              min={0}
                              max={99}
                              value={verifyCount}
                              onChange={(e) =>
                                setKillVerifyInputs((p) => ({
                                  ...p,
                                  [claim.id]: Number(e.target.value),
                                }))
                              }
                              aria-label="Verified kill count"
                              className="w-20 min-h-[40px] px-2.5 rounded-xl bg-zinc-900 border border-white/10 text-xs font-mono-tabular text-white"
                            />
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await approveKillClaim(claim, verifyCount);
                                  showToast(
                                    'success',
                                    `Credited ${formatINR(verifyCount * claim.perKillReward)} to ${claim.ign}.`
                                  );
                                } catch (err) {
                                  showToast('error', err instanceof Error ? err.message : 'Approval failed.');
                                }
                              }}
                              className="min-h-[40px] px-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-zinc-950 text-xs font-semibold"
                            >
                              Credit {formatINR(verifyCount * claim.perKillReward)}
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await rejectKillClaim(
                                    claim,
                                    rejectNotes[claim.id] || 'Screenshot mismatch'
                                  );
                                  showToast('info', 'Kill claim rejected.');
                                } catch (err) {
                                  showToast('error', err instanceof Error ? err.message : 'Rejection failed.');
                                }
                              }}
                              className="min-h-[40px] px-3 rounded-xl bg-red-500/15 text-red-400 text-xs font-semibold"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Withdrawal Processing Queue */}
          <section className="rounded-2xl border border-white/[0.08] bg-zinc-900 p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-orange-400" />
              <h2 className="font-display text-lg font-bold text-white">
                Withdrawal Requests & Manual UPI Payouts
              </h2>
            </div>

            {allWithdrawals.length === 0 ? (
              <p className="text-xs text-zinc-400">No withdrawal requests submitted yet.</p>
            ) : (
              <div className="space-y-3">
                {allWithdrawals.map((w) => (
                  <div
                    key={w.id}
                    className="p-4 rounded-xl bg-zinc-950 border border-white/[0.08] flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-semibold text-white">{w.ign}</span>
                        <span className="font-mono-tabular text-sm font-bold text-orange-400">
                          {formatINR(w.amount)}
                        </span>
                        <StatusLabel status={w.status} />
                      </div>
                      <p className="text-xs font-mono-tabular text-zinc-300">
                        Pay to UPI: {w.upiId} {w.payoutUtr ? `· Paid UTR: ${w.payoutUtr}` : ''}
                      </p>
                    </div>

                    {w.status !== 'Paid' && w.status !== 'Rejected' && (
                      <div className="flex flex-wrap items-center gap-2">
                        {w.status === 'Pending' && (
                          <button
                            type="button"
                            onClick={() =>
                              processWithdrawalRequest({ withdrawal: w, action: 'Approve' })
                            }
                            className="min-h-[40px] px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white"
                          >
                            Approve
                          </button>
                        )}
                        <input
                          type="text"
                          value={payoutUtrs[w.id] || ''}
                          onChange={(e) =>
                            setPayoutUtrs((p) => ({ ...p, [w.id]: e.target.value }))
                          }
                          placeholder="Enter Payout UTR..."
                          className="min-h-[40px] px-3 rounded-xl bg-zinc-900 border border-white/10 text-xs font-mono-tabular text-white w-44"
                        />
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await processWithdrawalRequest({
                                withdrawal: w,
                                action: 'Pay',
                                payoutUtr: payoutUtrs[w.id],
                              });
                              showToast('success', 'Withdrawal marked Paid & wallet debited.');
                            } catch (err) {
                              showToast('error', err instanceof Error ? err.message : 'Payout failed.');
                            }
                          }}
                          className="min-h-[40px] px-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-zinc-950 text-xs font-semibold"
                        >
                          Mark Paid
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await processWithdrawalRequest({
                                withdrawal: w,
                                action: 'Reject',
                                rejectionReason: 'Invalid UPI ID or verification issue',
                              });
                              showToast('info', 'Withdrawal rejected.');
                            } catch (err) {
                              showToast('error', err instanceof Error ? err.message : 'Reject failed.');
                            }
                          }}
                          className="min-h-[40px] px-3 rounded-xl bg-red-500/15 text-red-400 text-xs font-semibold"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* All Wallet Ledger */}
          <section className="rounded-2xl border border-white/[0.08] bg-zinc-900 p-6 space-y-3">
            <h2 className="font-display text-lg font-bold text-white">Platform Wallet Transactions</h2>
            <div className="divide-y divide-white/[0.06] max-h-72 overflow-y-auto">
              {allTransactions.slice(0, 25).map((tx) => (
                <div key={tx.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-mono-tabular text-zinc-400">{tx.txCode}</span>
                    <span className="text-white ml-2">{tx.description}</span>
                  </div>
                  <span
                    className={`font-mono-tabular font-bold ${
                      tx.direction === 'credit' ? 'text-emerald-400' : 'text-orange-400'
                    }`}
                  >
                    {tx.direction === 'credit' ? '+' : '-'}
                    {formatINR(tx.amount)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* C. PLAYER MANAGEMENT & REPORTS */}
      {section === 'players' && (
        <div className="space-y-6">
          <section className="rounded-2xl border border-white/[0.08] bg-zinc-900 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-orange-400" />
                <h2 className="font-display text-lg font-bold text-white">Player Directory</h2>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  value={playerSearch}
                  onChange={(e) => setPlayerSearch(e.target.value)}
                  placeholder="Search IGN, UID, Email..."
                  className="w-full min-h-[40px] pl-9 pr-3 rounded-xl bg-zinc-950 border border-white/10 text-xs text-white"
                />
              </div>
            </div>

            <div className="divide-y divide-white/[0.06]">
              {filteredUsers.map((u) => (
                <div
                  key={u.uid}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="text-sm font-semibold text-white">{u.ign}</span>
                      <span className="font-mono-tabular text-xs text-zinc-400">
                        {u.playerCode} · FF {u.ffUid}
                      </span>
                      {u.isBanned && <StatusLabel status="Banned" />}
                    </div>
                    <p className="text-xs text-zinc-400">
                      {u.email || u.phone || 'Verified'} · Wallet {formatINR(u.walletBalance)} · Earned {formatINR(u.totalEarnings)}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => togglePlayerBan(u, !u.isBanned)}
                    className={`min-h-[38px] px-3.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 ${
                      u.isBanned
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : 'bg-red-500/15 text-red-400'
                    }`}
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>{u.isBanned ? 'Unban Player' : 'Suspend Account'}</span>
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-white/[0.08] bg-zinc-900 p-6 space-y-4">
            <h2 className="font-display text-lg font-bold text-white">
              Support Tickets & Cheater Reports ({allTickets.length})
            </h2>
            {allTickets.length === 0 ? (
              <p className="text-xs text-zinc-400">No support tickets or reports.</p>
            ) : (
              <div className="space-y-3">
                {allTickets.map((t) => (
                  <div
                    key={t.id}
                    className="p-4 rounded-xl bg-zinc-950 border border-white/[0.08] space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {t.subject} — <span className="text-orange-400">{t.ign}</span>
                        </p>
                        <p className="text-xs text-zinc-400 mt-0.5">{t.description}</p>
                      </div>
                      <StatusLabel status={t.status} />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {t.evidenceData && (
                        <button
                          type="button"
                          onClick={() => setPreviewImg(t.evidenceData!)}
                          className="min-h-[38px] px-3 rounded-lg bg-zinc-900 border border-white/10 text-xs text-zinc-200"
                        >
                          View Evidence
                        </button>
                      )}
                      <input
                        type="text"
                        value={ticketReplies[t.id] ?? t.adminReply ?? ''}
                        onChange={(e) =>
                          setTicketReplies((p) => ({ ...p, [t.id]: e.target.value }))
                        }
                        placeholder="Write admin reply..."
                        className="flex-1 min-w-[200px] min-h-[38px] px-3 rounded-lg bg-zinc-900 border border-white/10 text-xs text-white"
                      />
                      {(['In Review', 'Resolved'] as TicketStatus[]).map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={async () => {
                            await updateSupportTicket({
                              ticket: t,
                              status: st,
                              adminReply: ticketReplies[t.id] || `Marked ${st} by Admin.`,
                            });
                            showToast('success', `Ticket updated to ${st}.`);
                          }}
                          className="min-h-[38px] px-3 rounded-lg bg-orange-500 text-zinc-950 text-xs font-semibold"
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* F. ANNOUNCEMENTS */}
      {section === 'announcements' && (
        <form
          onSubmit={handlePublishAnnouncement}
          className="rounded-2xl border border-white/[0.08] bg-zinc-900 p-6 space-y-4 max-w-2xl"
        >
          <div className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-orange-400" />
            <h2 className="font-display text-lg font-bold text-white">Broadcast Announcement</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select
              value={annType}
              onChange={(e) => setAnnType(e.target.value as typeof annType)}
              className="min-h-[44px] px-3 rounded-xl bg-zinc-950 border border-white/10 text-xs text-white"
            >
              <option value="general">General Announcement</option>
              <option value="tournament">Tournament Update</option>
              <option value="room_release">Room Release Alert</option>
              <option value="result">Result Announcement</option>
            </select>

            <select
              value={annTournamentId}
              onChange={(e) => setAnnTournamentId(e.target.value)}
              className="min-h-[44px] px-3 rounded-xl bg-zinc-950 border border-white/10 text-xs text-white"
            >
              <option value="">All Tournaments</option>
              {tournaments.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>

          <input
            type="text"
            required
            value={annTitle}
            onChange={(e) => setAnnTitle(e.target.value)}
            placeholder="Announcement Title"
            className="w-full min-h-[44px] px-3.5 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white"
          />

          <textarea
            required
            rows={4}
            value={annMessage}
            onChange={(e) => setAnnMessage(e.target.value)}
            placeholder="Message for players..."
            className="w-full p-3.5 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white"
          />

          <label className="flex items-center gap-2.5 text-xs text-zinc-200 cursor-pointer">
            <input
              type="checkbox"
              checked={annBroadcast}
              onChange={(e) => setAnnBroadcast(e.target.checked)}
              className="w-4 h-4 accent-orange-500"
            />
            <span>Also send personal notification alert to all registered players</span>
          </label>

          <button
            type="submit"
            className="min-h-[46px] px-6 rounded-xl bg-orange-500 hover:bg-orange-600 text-zinc-950 font-semibold text-sm"
          >
            Publish Announcement
          </button>
        </form>
      )}

      {/* G. SETTINGS */}
      {section === 'settings' && (
        <form
          onSubmit={handleSaveSettings}
          className="rounded-2xl border border-white/[0.08] bg-zinc-900 p-6 space-y-5 max-w-2xl"
        >
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-orange-400" />
            <h2 className="font-display text-lg font-bold text-white">Platform Economy & UPI Settings</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Default Entry Fee (₹)</label>
              <input
                type="number"
                required
                min={0}
                value={cfgEntryFee}
                onChange={(e) => setCfgEntryFee(Number(e.target.value))}
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-zinc-950 border border-white/10 text-sm font-mono-tabular text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Per-Kill Reward (₹)</label>
              <input
                type="number"
                required
                min={0}
                value={cfgKillReward}
                onChange={(e) => setCfgKillReward(Number(e.target.value))}
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-zinc-950 border border-white/10 text-sm font-mono-tabular text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Min Withdrawal (₹)</label>
              <input
                type="number"
                required
                min={1}
                value={cfgMinWithdrawal}
                onChange={(e) => setCfgMinWithdrawal(Number(e.target.value))}
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-zinc-950 border border-white/10 text-sm font-mono-tabular text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">Official UPI ID</label>
            <input
              type="text"
              required
              value={cfgUpiId}
              onChange={(e) => setCfgUpiId(e.target.value)}
              className="w-full min-h-[44px] px-3.5 rounded-xl bg-zinc-950 border border-white/10 text-sm font-mono-tabular text-white"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-medium text-zinc-300">
              Custom UPI QR Image (Optional — auto-generates scannable QR from UPI ID if blank)
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <label className="min-h-[44px] px-4 rounded-xl bg-zinc-950 border border-dashed border-white/15 hover:border-orange-500/50 inline-flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                <Upload className="w-4 h-4 text-orange-400" />
                <span>Upload UPI QR Image</span>
                <input type="file" accept="image/*" onChange={handleQrUpload} className="hidden" />
              </label>
              {cfgQrUrl && (
                <button
                  type="button"
                  onClick={() => setCfgQrUrl('')}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  Reset to Auto QR
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Default Tournament Rules (One per line)
            </label>
            <textarea
              rows={7}
              value={cfgRulesText}
              onChange={(e) => setCfgRulesText(e.target.value)}
              className="w-full p-3.5 rounded-xl bg-zinc-950 border border-white/10 text-xs text-white"
            />
          </div>

          <label className="flex items-center gap-2.5 text-xs text-zinc-200 cursor-pointer">
            <input
              type="checkbox"
              checked={cfgMaintenance}
              onChange={(e) => setCfgMaintenance(e.target.checked)}
              className="w-4 h-4 accent-orange-500"
            />
            <span>Enable App Maintenance Mode Banner</span>
          </label>

          <button
            type="submit"
            disabled={savingSettings}
            className="min-h-[46px] px-6 rounded-xl bg-orange-500 hover:bg-orange-600 text-zinc-950 font-semibold text-sm"
          >
            {savingSettings ? 'Saving...' : 'Save Platform Settings'}
          </button>
        </form>
      )}

      {/* Modals */}
      <TournamentFormModal
        open={trnModalOpen}
        editing={editingTrn}
        onClose={() => {
          setTrnModalOpen(false);
          setEditingTrn(null);
        }}
      />
      <RoomCredentialsModal tournament={roomTrn} onClose={() => setRoomTrn(null)} />
      <PublishResultsModal
        tournament={resultsTrn}
        approvedRegistrations={
          resultsTrn
            ? allRegistrations.filter(
                (r) => r.tournamentId === resultsTrn.id && r.paymentStatus === 'Approved'
              )
            : []
        }
        onClose={() => setResultsTrn(null)}
      />

      {previewImg && (
        <div
          onClick={() => setPreviewImg(null)}
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
        >
          <div className="relative max-w-2xl w-full bg-zinc-900 rounded-2xl p-3 border border-white/10">
            <button
              type="button"
              onClick={() => setPreviewImg(null)}
              className="absolute top-3 right-3 min-h-[40px] min-w-[40px] rounded-xl bg-zinc-950/90 text-white flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={previewImg}
              alt="Submitted verification proof"
              className="w-full max-h-[80dvh] object-contain rounded-xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
