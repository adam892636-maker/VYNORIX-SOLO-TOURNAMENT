import React, { useState } from 'react';
import { AlertCircle, Check, Copy, Lock, ShieldAlert, Upload, X } from 'lucide-react';
import { useVynorix } from '../context/VynorixContext';
import { formatINR } from '../lib/constants';
import { compressAndUploadImage } from '../lib/imageUtils';
import { submitTournamentPayment } from '../services/vynorixService';
import { BLUEPRINT_LIMITS, type Registration, type Tournament } from '../types/vynorix';
import { UpiQrCode } from './UpiQrCode';

interface JoinTournamentModalProps {
  tournament: Tournament | null;
  existingRegistration?: Registration;
  onClose: () => void;
}

export function JoinTournamentModal({
  tournament,
  existingRegistration,
  onClose,
}: JoinTournamentModalProps) {
  const { profile, settings, showToast } = useVynorix();
  const [utrNumber, setUtrNumber] = useState('');
  const [screenshotData, setScreenshotData] = useState('');
  const [rulesAccepted, setRulesAccepted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!tournament || !profile) return null;

  const upiId = settings.upiId || 'sumit892636@fam';

  async function handleCopyUpi() {
    try {
      await navigator.clipboard.writeText(upiId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('error', 'Could not copy UPI ID. Please copy it manually.');
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profile || !tournament) return;
    setBusy(true);
    setErrorMsg('');
    try {
      const url = await compressAndUploadImage(
        file,
        `payment_proofs/${tournament.id}_${profile.uid}_${Date.now()}.jpg`
      );
      setScreenshotData(url);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to process screenshot.');
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!tournament || !profile) return;

    const cleanUtr = utrNumber.trim().toUpperCase();
    if (!BLUEPRINT_LIMITS.utr.pattern.test(cleanUtr)) {
      setErrorMsg('Enter a valid 6–40 character UTR / Transaction Reference ID (letters, numbers, -, _).');
      return;
    }
    if (!screenshotData) {
      setErrorMsg('Please upload your UPI payment screenshot.');
      return;
    }
    if (!rulesAccepted) {
      setErrorMsg('You must confirm and accept all tournament rules before submitting.');
      return;
    }

    setBusy(true);
    setErrorMsg('');
    try {
      await submitTournamentPayment({
        tournament,
        profile,
        utrNumber: cleanUtr,
        screenshotData,
      });
      showToast(
        'success',
        'Payment submitted for Admin verification. Your slot will confirm once verified.'
      );
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not submit payment.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-xl bg-zinc-900 border border-white/10 rounded-t-3xl sm:rounded-2xl max-h-[92dvh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08]">
          <div>
            <h2 className="font-display text-lg font-bold text-white">
              {existingRegistration?.paymentStatus === 'Rejected'
                ? 'Resubmit UPI Payment'
                : 'Tournament Entry & UPI Payment'}
            </h2>
            <p className="text-xs text-zinc-400">
              {tournament.title} · {tournament.map} · {formatINR(tournament.entryFee)} Entry
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close payment modal"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-zinc-400 hover:text-white hover:bg-white/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
          {existingRegistration?.paymentStatus === 'Rejected' && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-200 space-y-1">
              <p className="font-semibold text-red-400">Previous Submission Rejected</p>
              <p>{existingRegistration.rejectionReason || 'Payment could not be verified. Please check your UTR and resubmit.'}</p>
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-2.5 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Step 1: Pay via UPI */}
          <div className="rounded-xl bg-zinc-950 border border-white/[0.08] p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-orange-400">
                Step 1 · Pay Exactly {formatINR(tournament.entryFee)} via UPI
              </span>
              <span className="font-mono-tabular text-xs text-zinc-400">
                Player: {profile.ign} ({profile.ffUid})
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-5">
              <UpiQrCode
                upiId={upiId}
                amount={tournament.entryFee}
                customQrUrl={settings.upiQrUrl}
                tournamentTitle={tournament.title}
              />
              <div className="flex-1 w-full space-y-3">
                <div>
                  <p className="text-xs text-zinc-400 mb-1">Official Vynorix UPI ID</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 min-h-[44px] px-3 rounded-xl bg-zinc-900 border border-white/10 flex items-center text-sm font-mono-tabular text-white">
                      {upiId}
                    </code>
                    <button
                      type="button"
                      onClick={handleCopyUpi}
                      className="min-h-[44px] px-3.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-zinc-950 font-semibold text-xs flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      <span>{copied ? 'Copied' : 'Copy UPI'}</span>
                    </button>
                  </div>
                </div>

                <ol className="text-xs text-zinc-400 space-y-1 list-decimal list-inside leading-relaxed">
                  <li>Open GPay, PhonePe, Paytm, or FamPay and scan the QR or pay to <strong className="text-zinc-200">{upiId}</strong>.</li>
                  <li>Send exact entry fee of <strong className="text-zinc-200">{formatINR(tournament.entryFee)}</strong>.</li>
                  <li>Copy the 12-digit UTR / Reference number and take a payment screenshot.</li>
                </ol>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-zinc-400 pt-2 border-t border-white/[0.06]">
              <Lock className="w-3.5 h-3.5 text-orange-400 shrink-0" />
              <span>Security Notice: Never enter or share your UPI PIN or OTP anywhere on this site.</span>
            </div>
          </div>

          {/* Step 2: Submit UTR & Screenshot */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Step 2 · UPI Transaction UTR / Reference Number
              </label>
              <input
                type="text"
                required
                minLength={6}
                maxLength={40}
                value={utrNumber}
                onChange={(e) => setUtrNumber(e.target.value.toUpperCase())}
                placeholder="e.g. 432891045612"
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-zinc-950 border border-white/10 text-sm font-mono-tabular text-white placeholder:text-zinc-500 focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Upload Payment Screenshot
              </label>
              <label className="min-h-[56px] p-3 rounded-xl bg-zinc-950 border border-dashed border-white/15 hover:border-orange-500/50 flex items-center justify-center gap-2.5 text-xs text-zinc-300 cursor-pointer transition-colors">
                <Upload className="w-4 h-4 text-orange-400 shrink-0" />
                <span>
                  {screenshotData ? 'Screenshot Attached — Tap to Change' : 'Select Payment Screenshot (JPG / PNG)'}
                </span>
                <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              </label>
              {screenshotData && (
                <div className="mt-2 rounded-xl overflow-hidden border border-white/10 bg-zinc-950 max-h-48 flex justify-center">
                  <img
                    src={screenshotData}
                    alt="Uploaded UPI payment screenshot preview"
                    className="max-h-48 object-contain"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Rules Confirmation */}
          <div className="rounded-xl bg-zinc-950 border border-white/[0.08] p-4 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
              <ShieldAlert className="w-4 h-4 text-orange-400" />
              <span>Match Fair-Play Rules</span>
            </div>
            <ul className="text-xs text-zinc-400 space-y-1 max-h-32 overflow-y-auto pr-1">
              {(tournament.rules || []).map((rule, i) => (
                <li key={i}>{rule}</li>
              ))}
            </ul>
            <label className="flex items-center gap-2.5 pt-2 border-t border-white/[0.06] cursor-pointer min-h-[40px]">
              <input
                type="checkbox"
                checked={rulesAccepted}
                onChange={(e) => setRulesAccepted(e.target.checked)}
                className="w-4 h-4 accent-orange-500 rounded"
              />
              <span className="text-xs text-zinc-200">
                I have read all rules and submitted a genuine UPI payment.
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full min-h-[48px] rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-zinc-950 font-semibold text-sm transition-colors"
          >
            {busy ? 'Submitting Proof...' : 'Submit Payment for Admin Verification'}
          </button>
        </form>
      </div>
    </div>
  );
}
