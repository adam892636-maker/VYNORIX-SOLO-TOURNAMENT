import { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Flame,
  KeyRound,
  Shield,
  Trophy,
  User,
  Wallet,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { AdminDashboardView } from './components/AdminDashboardView';
import { ArenaView } from './components/ArenaView';
import { AuthGateModal } from './components/AuthGateModal';
import { CustomRoomView } from './components/CustomRoomView';
import { ErrorBoundary } from './components/ErrorBoundary';
import { JoinTournamentModal } from './components/JoinTournamentModal';
import { LeaderboardView } from './components/LeaderboardView';
import { PlayerHubView } from './components/PlayerHubView';
import { WalletView } from './components/WalletView';
import { useVynorix, VynorixProvider } from './context/VynorixContext';
import { ASSETS, formatINR } from './lib/constants';
import type { AppTab, Tournament } from './types/vynorix';

function AppShell() {
  const {
    authReady,
    firebaseUser,
    profile,
    profileLoading,
    isAdmin,
    isVerifiedUser,
    myRegistrations,
    unreadNotificationCount,
    toast,
    clearToast,
  } = useVynorix();

  const [activeTab, setActiveTab] = useState<AppTab>('arena');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [joiningTournament, setJoiningTournament] = useState<Tournament | null>(null);

  // Prompt Free Fire profile completion automatically if authenticated but no profile doc yet
  useEffect(() => {
    if (authReady && firebaseUser && isVerifiedUser && !profileLoading && !profile) {
      setAuthModalOpen(true);
    }
  }, [authReady, firebaseUser, isVerifiedUser, profileLoading, profile]);

  // Redirect away from admin tab if not verified admin
  useEffect(() => {
    if (activeTab === 'admin' && !isAdmin) {
      setActiveTab('arena');
    }
  }, [activeTab, isAdmin]);

  const navItems: Array<{ id: AppTab; label: string; mobileLabel: string; icon: typeof Flame }> = [
    { id: 'arena', label: 'Arena', mobileLabel: 'Arena', icon: Flame },
    { id: 'room', label: 'Custom Room', mobileLabel: 'Room', icon: KeyRound },
    { id: 'leaderboard', label: 'Leaderboard', mobileLabel: 'Ranks', icon: Trophy },
    { id: 'wallet', label: 'Wallet', mobileLabel: 'Wallet', icon: Wallet },
    { id: 'hub', label: 'Player Hub', mobileLabel: 'Hub', icon: User },
  ];

  const existingJoinReg = joiningTournament
    ? myRegistrations.find((r) => r.tournamentId === joiningTournament.id)
    : undefined;

  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Top Navigation Bar — 3-Zone Contract */}
      <header className="sticky top-0 z-30 h-14 sm:h-16 bg-zinc-950/90 backdrop-blur-md border-b border-white/[0.08]">
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-8">
          {/* Zone 1: Brand Wordmark */}
          <button
            type="button"
            onClick={() => setActiveTab('arena')}
            className="flex items-center gap-2.5 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 rounded-lg"
          >
            <img
              src={ASSETS.logo}
              alt="Vynorix Logo"
              className="w-8 h-8 rounded-lg object-cover border border-orange-500/40"
            />
            <span className="font-display text-lg font-bold tracking-tight text-white">
              Vynorix
            </span>
          </button>

          {/* Zone 2: Concise Single-Line Nav Links (Desktop) */}
          <nav className="hidden lg:flex items-center gap-6">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`text-sm font-medium whitespace-nowrap shrink-0 transition-colors py-1 border-b-2 ${
                  activeTab === item.id
                    ? 'text-orange-400 border-orange-500'
                    : 'text-zinc-400 hover:text-white border-transparent'
                }`}
              >
                {item.label}
                {item.id === 'hub' && unreadNotificationCount > 0 ? ` (${unreadNotificationCount})` : ''}
              </button>
            ))}
            {isAdmin && (
              <button
                type="button"
                onClick={() => setActiveTab('admin')}
                className={`text-sm font-medium whitespace-nowrap shrink-0 transition-colors py-1 border-b-2 flex items-center gap-1.5 ${
                  activeTab === 'admin'
                    ? 'text-orange-400 border-orange-500'
                    : 'text-zinc-300 hover:text-white border-transparent'
                }`}
              >
                <Shield className="w-3.5 h-3.5 text-orange-400" />
                <span>Admin</span>
              </button>
            )}
          </nav>

          {/* Zone 3: Single Primary Action */}
          <div className="flex items-center gap-2 shrink-0">
            {profile ? (
              <button
                type="button"
                onClick={() => setActiveTab('wallet')}
                className="min-h-[40px] px-3.5 rounded-xl bg-zinc-900 border border-white/10 hover:border-orange-500/50 text-xs font-semibold text-white flex items-center gap-2 whitespace-nowrap shrink-0 transition-colors"
              >
                <span className="truncate max-w-[110px]">{profile.ign}</span>
                <span aria-hidden="true" className="text-zinc-600">·</span>
                <span className="font-mono-tabular text-orange-400">
                  {formatINR(profile.walletBalance)}
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setAuthModalOpen(true)}
                className="min-h-[40px] px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-zinc-950 font-semibold text-xs whitespace-nowrap shrink-0 transition-colors"
              >
                {firebaseUser ? 'Finish Setup' : 'Sign In'}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Toast Banner */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.18 }}
            className="fixed top-16 sm:top-20 right-4 left-4 sm:left-auto sm:max-w-md z-50"
          >
            <div
              className={`p-3.5 rounded-xl border backdrop-blur-md flex items-start justify-between gap-3 text-xs shadow-lg ${
                toast.type === 'success'
                  ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200'
                  : toast.type === 'error'
                  ? 'bg-red-950/90 border-red-500/40 text-red-200'
                  : 'bg-zinc-900/95 border-orange-500/40 text-zinc-100'
              }`}
            >
              <div className="flex items-start gap-2.5">
                {toast.type === 'error' ? (
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                )}
                <span className="leading-relaxed">{toast.text}</span>
              </div>
              <button
                type="button"
                onClick={clearToast}
                aria-label="Dismiss notification"
                className="text-zinc-400 hover:text-white shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-24 lg:pb-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.16 }}
          >
            {activeTab === 'arena' && (
              <ArenaView
                onOpenAuth={() => setAuthModalOpen(true)}
                onJoinTournament={(t) => setJoiningTournament(t)}
                onNavigateTab={setActiveTab}
              />
            )}
            {activeTab === 'room' && (
              <CustomRoomView onOpenAuth={() => setAuthModalOpen(true)} />
            )}
            {activeTab === 'leaderboard' && <LeaderboardView />}
            {activeTab === 'wallet' && (
              <WalletView onOpenAuth={() => setAuthModalOpen(true)} />
            )}
            {activeTab === 'hub' && (
              <PlayerHubView
                onOpenAuth={() => setAuthModalOpen(true)}
                onNavigateTab={setActiveTab}
                onResubmitRegistration={(t) => setJoiningTournament(t)}
              />
            )}
            {activeTab === 'admin' && isAdmin && <AdminDashboardView />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Desktop Footer */}
      <footer className="hidden lg:block border-t border-white/[0.06] bg-zinc-950 py-6">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between text-xs text-zinc-500">
          <span>Vynorix Solo Tournament · Free Fire Custom Room Platform</span>
          <span>Verified UPI Payments · Atomic Wallet Ledger</span>
        </div>
      </footer>

      {/* Mobile Fixed Bottom Navigation Bar (<= 15% sticky cap combined with top bar) */}
      <nav
        aria-label="Mobile Navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-zinc-950/95 backdrop-blur-md border-t border-white/[0.08] pb-safe"
      >
        <div className="grid grid-cols-5 h-16 items-center">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`min-h-[44px] flex flex-col items-center justify-center gap-1 transition-colors ${
                  active ? 'text-orange-400' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="text-[10px] font-medium leading-none whitespace-nowrap">
                  {item.mobileLabel}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Modals */}
      <AuthGateModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      <JoinTournamentModal
        tournament={joiningTournament}
        existingRegistration={existingJoinReg}
        onClose={() => setJoiningTournament(null)}
      />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <VynorixProvider>
        <AppShell />
      </VynorixProvider>
    </ErrorBoundary>
  );
}
