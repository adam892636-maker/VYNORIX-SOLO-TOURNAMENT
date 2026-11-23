import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Crosshair,
  IndianRupee,
  ShieldCheck,
  Upload,
  Wallet,
} from 'lucide-react';
import { useVynorix } from '../context/VynorixContext';
import { formatINR } from '../lib/constants';
import { compressAndUploadImage } from '../lib/imageUtils';
import { requestWithdrawal, submitKillClaim } from '../services/vynorixService';
import { StatusLabel } from './StatusLabel';

export function WalletView({ onOpenAuth }: { onOpenAuth: () => void }) {
  const {
    firebaseUser,
    profile,
    isVerifiedUser,
    settings,
    tournaments,
    myRegistrations,
    myKillClaims,
    myTransactions,
    myWithdrawals,
    showToast,
  } = useVynorix();

  // Kill claim state
  const [selectedTournamentId, setSelectedTournamentId] = useState('');
  const [claimedKills, setClaimedKills] = useState('');
  const [claimNotes, setClaimNotes] = useState('');
  const [claimScreenshot, setClaimScreenshot] = useState('');
  const [claimBusy, setClaimBusy] = useState(false);

  // Withdrawal state
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [upiId, setUpiId] = useState('');
  const [withdrawBusy, setWithdrawBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const approvedTournaments = useMemo(() => {
    const approvedIds = new Set(
      myRegistrations.filter((r) => r.paymentStatus === 'Approved').map((r) => r.tournamentId)
    );
    return tournaments.filter((t) => approvedIds.has(t.id));
  }, [myRegistrations, tournaments]);

  const pendingWithdrawalTotal = useMemo(
    () =>
      myWithdrawals
        .filter((w) => w.status === 'Pending' || w.status === 'Approved')
        .reduce((sum, w) => sum + w.amount, 0),
    [myWithdrawals]
  );

  const hasActiveWithdrawal = pendingWithdrawalTotal > 0;

  if (!firebaseUser || !isVerifiedUser || !profile) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-zinc-900 p-10 text-center space-y-4">
        <Wallet className="w-10 h-10 text-orange-400 mx-auto" />
        <div className="space-y-1">
          <h1 className="font-display text-2xl font-bold text-white">Player Wallet & Kill Claims</h1>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto">
            Sign in with your Vynorix account to view your verified wallet ledger, submit match kill screenshots, and request UPI withdrawals.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenAuth}
          className="min-h-[48px] px-6 rounded-xl bg-orange-500 hover:bg-orange-600 text-zinc-950 font-semibold text-sm transition-colors"
        >
          Sign In to Access Wallet
        </button>
      </div>
    );
  }

  const selectedTournament = approvedTournaments.find((t) => t.id === selectedTournamentId);
  const previewKills = Math.max(0, Math.min(99, Number(claimedKills || 0)));
  const previewPotential = previewKills * (selectedTournament?.perKillReward ?? settings.perKillReward);

  async function handleKillScreenshot(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    setClaimBusy(true);
    setErrorMsg('');
    try {
      const url = await compressAndUploadImage(
        file,
        `kill_proofs/${selectedTournamentId || 'match'}_${profile.uid}_${Date.now()}.jpg`
      );
      setClaimScreenshot(url);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to upload screenshot.');
    } finally {
      setClaimBusy(false);
    }
  }

  async function handleKillClaimSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile || !selectedTournament) {
      setErrorMsg('Please select an approved tournament.');
      return;
    }
    if (!claimScreenshot) {
      setErrorMsg('Please upload your match result screenshot showing your kills.');
      return;
    }

    setClaimBusy(true);
    setErrorMsg('');
    try {
      await submitKillClaim({
        tournament: selectedTournament,
        profile,
        claimedKills: previewKills,
        screenshotData: claimScreenshot,
        notes: claimNotes,
      });
      setClaimedKills('');
      setClaimNotes('');
      setClaimScreenshot('');
      showToast(
        'success',
        'Kill proof submitted! Rewards credit only after Admin verifies your screenshot.'
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to submit kill claim.');
    } finally {
      setClaimBusy(false);
    }
  }

  async function handleWithdrawalSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    const amt = Math.floor(Number(withdrawAmount));
    if (!amt || Number.isNaN(amt)) {
      setErrorMsg('Enter a valid withdrawal amount.');
      return;
    }

    setWithdrawBusy(true);
    setErrorMsg('');
    try {
      await requestWithdrawal({
        profile,
        amount: amt,
        upiId,
        minWithdrawal: settings.minWithdrawal,
      });
      setWithdrawAmount('');
      showToast(
        'success',
        `Withdrawal request for ${formatINR(amt)} submitted. Admin will process manual UPI payout.`
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Withdrawal request failed.');
    } finally {
      setWithdrawBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
          Secure Player Wallet
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 mt-1">
          Ledger-backed balance. Only Admin-verified kills ({formatINR(settings.perKillReward)}/kill) and prizes credit your wallet. Minimum withdrawal: {formatINR(settings.minWithdrawal)}.
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-2.5 text-xs text-red-300">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Wallet KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="col-span-2 lg:col-span-1 rounded-2xl border border-orange-500/30 bg-zinc-900 p-5">
          <p className="text-xs text-zinc-400">Available Balance</p>
          <p className="font-mono-tabular text-3xl font-bold text-orange-400 mt-1">
            {formatINR(profile.walletBalance)}
          </p>
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-zinc-900 p-5">
          <p className="text-xs text-zinc-400">Total Earnings</p>
          <p className="font-mono-tabular text-2xl font-bold text-white mt-1">
            {formatINR(profile.totalEarnings)}
          </p>
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-zinc-900 p-5">
          <p className="text-xs text-zinc-400">Total Kill Rewards</p>
          <p className="font-mono-tabular text-2xl font-bold text-emerald-400 mt-1">
            {formatINR(profile.totalKillRewards)}
          </p>
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-zinc-900 p-5">
          <p className="text-xs text-zinc-400">Total Withdrawals</p>
          <p className="font-mono-tabular text-2xl font-bold text-white mt-1">
            {formatINR(profile.totalWithdrawals)}
          </p>
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-zinc-900 p-5">
          <p className="text-xs text-zinc-400">Pending Withdrawals</p>
          <p className="font-mono-tabular text-2xl font-bold text-amber-400 mt-1">
            {formatINR(pendingWithdrawalTotal)}
          </p>
        </div>
      </div>

      {/* Kill Claim + Withdrawal 2-Column Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Kill Verification Form */}
        <section className="rounded-2xl border border-white/[0.08] bg-zinc-900 p-6 space-y-4">
          <div className="flex items-center gap-2.5">
            <Crosshair className="w-5 h-5 text-orange-400" />
            <div>
              <h2 className="font-display text-lg font-bold text-white">
                Submit Kill Verification Proof
              </h2>
              <p className="text-xs text-zinc-400">
                Unverified claims never auto-credit. Admin verifies screenshot first.
              </p>
            </div>
          </div>

          {approvedTournaments.length === 0 ? (
            <div className="p-5 rounded-xl bg-zinc-950 border border-white/[0.06] text-xs text-zinc-400">
              You need at least one Admin-approved tournament registration before submitting match kill proofs.
            </div>
          ) : (
            <form onSubmit={handleKillClaimSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Select Approved Tournament
                </label>
                <select
                  required
                  value={selectedTournamentId}
                  onChange={(e) => setSelectedTournamentId(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white focus:outline-none focus:border-orange-500"
                >
                  <option value="">Choose match...</option>
                  {approvedTournaments.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title} ({formatINR(t.perKillReward)}/kill)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Free Fire UID
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={profile.ffUid}
                    className="w-full min-h-[44px] px-3.5 rounded-xl bg-zinc-950/60 border border-white/10 text-sm font-mono-tabular text-zinc-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Kills Achieved
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    max={99}
                    value={claimedKills}
                    onChange={(e) => setClaimedKills(e.target.value)}
                    placeholder="e.g. 5"
                    className="w-full min-h-[44px] px-3.5 rounded-xl bg-zinc-950 border border-white/10 text-sm font-mono-tabular text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950 border border-white/[0.06] flex items-center justify-between text-xs">
                <span className="text-zinc-400">Pending Verification Estimate</span>
                <span className="font-mono-tabular font-bold text-orange-400">
                  {previewKills} kills × {formatINR(selectedTournament?.perKillReward ?? settings.perKillReward)} = {formatINR(previewPotential)}
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Match Result Screenshot
                </label>
                <label className="min-h-[52px] p-3 rounded-xl bg-zinc-950 border border-dashed border-white/15 hover:border-orange-500/50 flex items-center justify-center gap-2 text-xs text-zinc-300 cursor-pointer">
                  <Upload className="w-4 h-4 text-orange-400" />
                  <span>{claimScreenshot ? 'Match Proof Uploaded (Tap to Replace)' : 'Upload Match Kill Screenshot'}</span>
                  <input type="file" accept="image/*" onChange={handleKillScreenshot} className="hidden" />
                </label>
              </div>

              <input
                type="text"
                maxLength={300}
                value={claimNotes}
                onChange={(e) => setClaimNotes(e.target.value)}
                placeholder="Optional match notes (e.g., placement rank)"
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-zinc-950 border border-white/10 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-orange-500"
              />

              <button
                type="submit"
                disabled={claimBusy}
                className="w-full min-h-[46px] rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-zinc-950 font-semibold text-sm transition-colors"
              >
                {claimBusy ? 'Submitting...' : 'Submit Kill Claim for Review'}
              </button>
            </form>
          )}
        </section>

        {/* Withdrawal Request Form */}
        <section className="rounded-2xl border border-white/[0.08] bg-zinc-900 p-6 space-y-4">
          <div className="flex items-center gap-2.5">
            <IndianRupee className="w-5 h-5 text-orange-400" />
            <div>
              <h2 className="font-display text-lg font-bold text-white">
                Request UPI Withdrawal
              </h2>
              <p className="text-xs text-zinc-400">
                Minimum withdrawal: {formatINR(settings.minWithdrawal)}. Paid manually to your UPI ID.
              </p>
            </div>
          </div>

          {hasActiveWithdrawal ? (
            <div className="p-5 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1.5 text-xs text-amber-200">
              <p className="font-semibold text-amber-300">Active Withdrawal Pending</p>
              <p>
                You currently have a pending withdrawal of {formatINR(pendingWithdrawalTotal)}. Duplicate requests are locked until Admin completes payout.
              </p>
            </div>
          ) : (
            <form onSubmit={handleWithdrawalSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Your Receiving UPI ID
                </label>
                <input
                  type="text"
                  required
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="e.g. yourname@oksbi or 9876543210@ybl"
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-zinc-950 border border-white/10 text-sm font-mono-tabular text-white placeholder:text-zinc-500 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Withdrawal Amount (Min {formatINR(settings.minWithdrawal)})
                </label>
                <input
                  type="number"
                  required
                  min={settings.minWithdrawal}
                  max={Math.max(settings.minWithdrawal, profile.walletBalance)}
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder={`Available: ${formatINR(profile.walletBalance)}`}
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-zinc-950 border border-white/10 text-sm font-mono-tabular text-white placeholder:text-zinc-500 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-zinc-950 border border-white/[0.06] flex items-center gap-2 text-xs text-zinc-400">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Admin transfers funds via UPI and records the payout UTR before marking Paid.</span>
              </div>

              <button
                type="submit"
                disabled={withdrawBusy || profile.walletBalance < settings.minWithdrawal}
                className="w-full min-h-[46px] rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-zinc-950 font-semibold text-sm transition-colors"
              >
                {withdrawBusy
                  ? 'Submitting...'
                  : profile.walletBalance < settings.minWithdrawal
                  ? `Need ${formatINR(settings.minWithdrawal)} Minimum Balance`
                  : 'Submit Withdrawal Request'}
              </button>
            </form>
          )}
        </section>
      </div>

      {/* Ledger & History Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="rounded-2xl border border-white/[0.08] bg-zinc-900 p-6 space-y-4">
          <h2 className="font-display text-lg font-bold text-white">Wallet Transaction Ledger</h2>
          {myTransactions.length === 0 ? (
            <p className="text-xs text-zinc-400 py-6 text-center">
              No wallet transactions recorded yet.
            </p>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {myTransactions.map((tx) => (
                <div key={tx.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    {tx.direction === 'credit' ? (
                      <ArrowDownLeft className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
                    )}
                    <div>
                      <p className="text-xs font-semibold text-white">{tx.description}</p>
                      <p className="text-[11px] font-mono-tabular text-zinc-400">
                        {tx.txCode} · Bal: {formatINR(tx.balanceAfter)}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`font-mono-tabular text-sm font-bold whitespace-nowrap ${
                      tx.direction === 'credit' ? 'text-emerald-400' : 'text-orange-400'
                    }`}
                  >
                    {tx.direction === 'credit' ? '+' : '-'}
                    {formatINR(tx.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-white/[0.08] bg-zinc-900 p-6 space-y-4">
          <h2 className="font-display text-lg font-bold text-white">
            Withdrawals & Kill Claim Status
          </h2>

          {myWithdrawals.length === 0 && myKillClaims.length === 0 ? (
            <p className="text-xs text-zinc-400 py-6 text-center">
              No withdrawal requests or kill claims submitted yet.
            </p>
          ) : (
            <div className="space-y-5">
              {myWithdrawals.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-zinc-300">Withdrawal History</p>
                  <div className="divide-y divide-white/[0.06]">
                    {myWithdrawals.map((w) => (
                      <div key={w.id} className="py-2.5 flex items-center justify-between gap-3">
                        <div>
                          <p className="font-mono-tabular text-xs font-semibold text-white">
                            {formatINR(w.amount)} · {w.upiId}
                          </p>
                          {w.payoutUtr && (
                            <p className="text-[11px] font-mono-tabular text-emerald-400">
                              Payout UTR: {w.payoutUtr}
                            </p>
                          )}
                          {w.rejectionReason && (
                            <p className="text-[11px] text-red-400">{w.rejectionReason}</p>
                          )}
                        </div>
                        <StatusLabel status={w.status} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {myKillClaims.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-zinc-300">Kill Claims</p>
                  <div className="divide-y divide-white/[0.06]">
                    {myKillClaims.map((c) => (
                      <div key={c.id} className="py-2.5 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold text-white">{c.tournamentTitle}</p>
                          <p className="text-[11px] font-mono-tabular text-zinc-400">
                            Claimed {c.claimedKills} · Verified {c.verifiedKills} ({formatINR(c.totalReward)})
                          </p>
                          {c.rejectionReason && (
                            <p className="text-[11px] text-red-400">{c.rejectionReason}</p>
                          )}
                        </div>
                        <StatusLabel status={c.status} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
