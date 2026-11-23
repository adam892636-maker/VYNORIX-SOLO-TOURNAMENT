import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Mail, ShieldCheck, Upload, UserCheck, X } from 'lucide-react';
import { useVynorix } from '../context/VynorixContext';
import { ASSETS } from '../lib/constants';
import { compressAndUploadImage } from '../lib/imageUtils';
import { createPlayerProfile } from '../services/vynorixService';
import { BLUEPRINT_LIMITS } from '../types/vynorix';

interface AuthGateModalProps {
  open: boolean;
  onClose: () => void;
}

export function AuthGateModal({ open, onClose }: AuthGateModalProps) {
  const {
    firebaseUser,
    profile,
    isVerifiedUser,
    signInWithGoogle,
    signInWithEmail,
    registerWithEmail,
    resendVerification,
    logout,
    showToast,
  } = useVynorix();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [ign, setIgn] = useState('');
  const [ffUid, setFfUid] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!open) return null;

  const needsVerification = Boolean(firebaseUser && !isVerifiedUser);
  const needsOnboarding = Boolean(firebaseUser && isVerifiedUser && !profile);

  async function handleGoogle() {
    setBusy(true);
    setErrorMsg('');
    try {
      await signInWithGoogle();
      showToast('success', 'Signed in with Google.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Google sign-in failed.');
    } finally {
      setBusy(false);
    }
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrorMsg('');
    try {
      if (mode === 'login') {
        await signInWithEmail(email, password);
        showToast('success', 'Signed in successfully.');
      } else {
        await registerWithEmail(email, password);
        showToast('info', 'Account created. Please check your inbox to verify your email.');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Authentication failed.';
      if (msg.includes('operation-not-allowed')) {
        setErrorMsg(
          'Email/Password login is not enabled in Firebase Console yet. Please use Google Sign-In or enable Email/Password under Authentication > Sign-in method.'
        );
      } else {
        setErrorMsg(msg);
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !firebaseUser) return;
    setBusy(true);
    setErrorMsg('');
    try {
      const url = await compressAndUploadImage(
        file,
        `avatars/${firebaseUser.uid}_${Date.now()}.jpg`,
        400
      );
      setAvatarUrl(url);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to process avatar.');
    } finally {
      setBusy(false);
    }
  }

  async function handleOnboardingSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firebaseUser) return;
    const cleanIgn = ign.trim();
    const cleanUid = ffUid.trim();

    if (cleanIgn.length < BLUEPRINT_LIMITS.ign.min || cleanIgn.length > BLUEPRINT_LIMITS.ign.max) {
      setErrorMsg('In-Game Name must be 2 to 40 characters.');
      return;
    }
    if (!BLUEPRINT_LIMITS.ffUid.pattern.test(cleanUid)) {
      setErrorMsg('Free Fire UID must be 5 to 20 numeric digits.');
      return;
    }

    setBusy(true);
    setErrorMsg('');
    try {
      await createPlayerProfile({
        uid: firebaseUser.uid,
        email: firebaseUser.email || undefined,
        phone: phone.trim() || undefined,
        ign: cleanIgn,
        ffUid: cleanUid,
        avatarUrl: avatarUrl || firebaseUser.photoURL || undefined,
      });
      showToast('success', 'Vynorix Player ID created! Welcome to the Arena.');
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to create player profile.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-zinc-900 border border-white/10 rounded-t-3xl sm:rounded-2xl p-6 max-h-[92dvh] overflow-y-auto space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={ASSETS.logo}
              alt="Vynorix"
              className="w-9 h-9 rounded-lg object-cover border border-orange-500/30"
            />
            <div>
              <h2 className="font-display text-lg font-bold tracking-tight text-white">
                {needsOnboarding
                  ? 'Complete Player Profile'
                  : needsVerification
                  ? 'Verify Your Email'
                  : 'Vynorix Player Access'}
              </h2>
              <p className="text-xs text-zinc-400">Free Fire Solo Custom Room Platform</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-zinc-400 hover:text-white hover:bg-white/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-2.5 text-xs text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {needsVerification ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-2">
              <div className="flex items-center gap-2 text-amber-300 font-medium text-sm">
                <Mail className="w-4 h-4" />
                <span>Verification Required</span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                We sent a verification link to <strong className="text-white">{firebaseUser?.email}</strong>. Click the link in your inbox, then refresh or sign back in.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await resendVerification();
                    showToast('success', 'Verification email resent.');
                  } catch (err) {
                    setErrorMsg(err instanceof Error ? err.message : 'Failed to resend.');
                  } finally {
                    setBusy(false);
                  }
                }}
                className="min-h-[44px] rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold transition-colors"
              >
                Resend Email
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="min-h-[44px] rounded-xl bg-orange-500 hover:bg-orange-600 text-zinc-950 text-xs font-semibold transition-colors"
              >
                I Verified — Continue
              </button>
            </div>
            <button
              type="button"
              onClick={() => logout()}
              className="w-full min-h-[40px] text-xs text-zinc-400 hover:text-white"
            >
              Switch Account
            </button>
          </div>
        ) : needsOnboarding ? (
          <form onSubmit={handleOnboardingSubmit} className="space-y-4">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2.5 text-xs text-emerald-300">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Authenticated as {firebaseUser?.email || firebaseUser?.phoneNumber}. Set your Free Fire details to generate your Player ID.</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Free Fire In-Game Name (IGN)
              </label>
              <input
                type="text"
                required
                minLength={2}
                maxLength={40}
                value={ign}
                onChange={(e) => setIgn(e.target.value)}
                placeholder="e.g. VYN_STRIKER"
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Free Fire UID (Numbers Only)
              </label>
              <input
                type="text"
                required
                inputMode="numeric"
                pattern="[0-9]{5,20}"
                value={ffUid}
                onChange={(e) => setFfUid(e.target.value.replace(/\D/g, ''))}
                placeholder="e.g. 2481920451"
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-zinc-950 border border-white/10 text-sm font-mono-tabular text-white placeholder:text-zinc-500 focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                WhatsApp / Contact Number (Optional)
              </label>
              <input
                type="tel"
                maxLength={20}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98XXXXXXXX"
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Profile Photo (Optional)
              </label>
              <label className="min-h-[44px] px-4 rounded-xl bg-zinc-950 border border-dashed border-white/15 hover:border-orange-500/50 flex items-center justify-center gap-2 text-xs text-zinc-300 cursor-pointer transition-colors">
                <Upload className="w-4 h-4 text-orange-400" />
                <span>{avatarUrl ? 'Avatar Uploaded (Tap to Replace)' : 'Upload Avatar Image'}</span>
                <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
              </label>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full min-h-[48px] rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-zinc-950 font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <UserCheck className="w-4 h-4" />
              <span>{busy ? 'Creating Profile...' : 'Create Player Profile'}</span>
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <button
              type="button"
              disabled={busy}
              onClick={handleGoogle}
              className="w-full min-h-[48px] rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-zinc-950 font-semibold text-sm flex items-center justify-center gap-2.5 transition-colors"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Continue with Google</span>
            </button>

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-xs text-zinc-500">or use email</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-zinc-950 border border-white/10">
              <button
                type="button"
                onClick={() => setMode('login')}
                className={`min-h-[40px] rounded-lg text-xs font-semibold transition-colors ${
                  mode === 'login' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setMode('register')}
                className={`min-h-[40px] rounded-lg text-xs font-semibold transition-colors ${
                  mode === 'register' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Create Account
              </button>
            </div>

            <form onSubmit={handleEmailSubmit} className="space-y-3">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-orange-500"
              />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password (min 6 characters)"
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-orange-500"
              />
              <button
                type="submit"
                disabled={busy}
                className="w-full min-h-[44px] rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white font-semibold text-sm transition-colors"
              >
                {busy ? 'Please wait...' : mode === 'login' ? 'Sign In with Email' : 'Register Account'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
