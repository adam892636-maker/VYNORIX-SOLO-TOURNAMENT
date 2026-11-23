import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import { collection, doc, getDoc, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { DEFAULT_SETTINGS, OWNER_EMAIL } from '../lib/constants';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../lib/firebase';
import type {
  Announcement,
  AppNotification,
  KillClaim,
  PlatformSettings,
  PlayerPublic,
  Registration,
  SupportTicket,
  Tournament,
  TournamentResult,
  UserPrivate,
  WalletTransaction,
  Withdrawal,
} from '../types/vynorix';

interface ToastMessage {
  id: number;
  type: 'success' | 'error' | 'info';
  text: string;
}

interface VynorixContextValue {
  authReady: boolean;
  firebaseUser: User | null;
  profile: UserPrivate | null;
  profileLoading: boolean;
  isAdmin: boolean;
  isVerifiedUser: boolean;
  settings: PlatformSettings;
  tournaments: Tournament[];
  announcements: Announcement[];
  results: TournamentResult[];
  leaderboardPlayers: PlayerPublic[];
  myRegistrations: Registration[];
  myKillClaims: KillClaim[];
  myTransactions: WalletTransaction[];
  myWithdrawals: Withdrawal[];
  myNotifications: AppNotification[];
  myTickets: SupportTicket[];
  unreadNotificationCount: number;
  toast: ToastMessage | null;
  showToast: (type: ToastMessage['type'], text: string) => void;
  clearToast: () => void;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string) => Promise<void>;
  resendVerification: () => Promise<void>;
  logout: () => Promise<void>;
}

const VynorixContext = createContext<VynorixContextValue | null>(null);

export function VynorixProvider({ children }: { children: React.ReactNode }) {
  const [authReady, setAuthReady] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserPrivate | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [isAdminDoc, setIsAdminDoc] = useState(false);

  const [settings, setSettings] = useState<PlatformSettings>({
    ...DEFAULT_SETTINGS,
    updatedAt: null as unknown as PlatformSettings['updatedAt'],
  });

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [results, setResults] = useState<TournamentResult[]>([]);
  const [leaderboardPlayers, setLeaderboardPlayers] = useState<PlayerPublic[]>([]);

  const [myRegistrations, setMyRegistrations] = useState<Registration[]>([]);
  const [myKillClaims, setMyKillClaims] = useState<KillClaim[]>([]);
  const [myTransactions, setMyTransactions] = useState<WalletTransaction[]>([]);
  const [myWithdrawals, setMyWithdrawals] = useState<Withdrawal[]>([]);
  const [myNotifications, setMyNotifications] = useState<AppNotification[]>([]);
  const [myTickets, setMyTickets] = useState<SupportTicket[]>([]);

  const [toast, setToast] = useState<ToastMessage | null>(null);

  const showToast = useCallback((type: ToastMessage['type'], text: string) => {
    setToast({ id: Date.now(), type, text });
  }, []);

  const clearToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4800);
    return () => clearTimeout(timer);
  }, [toast]);

  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setFirebaseUser(u);
      setAuthReady(true);
      if (u && u.emailVerified) {
        try {
          const adminSnap = await getDoc(doc(db, 'admins', u.uid));
          setIsAdminDoc(adminSnap.exists());
        } catch {
          setIsAdminDoc(false);
        }
      } else {
        setIsAdminDoc(false);
      }
    });
    return unsub;
  }, []);

  const isVerifiedUser = Boolean(
    firebaseUser && (firebaseUser.emailVerified || firebaseUser.phoneNumber)
  );

  const isAdmin = Boolean(
    firebaseUser &&
      firebaseUser.emailVerified &&
      (firebaseUser.email === OWNER_EMAIL || isAdminDoc)
  );

  // Public real-time listeners
  useEffect(() => {
    const unsubSettings = onSnapshot(
      doc(db, 'settings', 'platform'),
      (snap) => {
        if (snap.exists()) {
          setSettings(snap.data() as PlatformSettings);
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, 'settings/platform')
    );

    const unsubTournaments = onSnapshot(
      query(collection(db, 'tournaments'), orderBy('createdAt', 'desc')),
      (snap) => setTournaments(snap.docs.map((d) => d.data() as Tournament)),
      (err) => handleFirestoreError(err, OperationType.LIST, 'tournaments')
    );

    const unsubAnnouncements = onSnapshot(
      query(collection(db, 'announcements'), orderBy('createdAt', 'desc')),
      (snap) => setAnnouncements(snap.docs.map((d) => d.data() as Announcement)),
      (err) => handleFirestoreError(err, OperationType.LIST, 'announcements')
    );

    const unsubResults = onSnapshot(
      query(collection(db, 'tournament_results'), orderBy('createdAt', 'desc')),
      (snap) => setResults(snap.docs.map((d) => d.data() as TournamentResult)),
      (err) => handleFirestoreError(err, OperationType.LIST, 'tournament_results')
    );

    const unsubLeaderboard = onSnapshot(
      query(collection(db, 'players_public'), orderBy('totalKills', 'desc')),
      (snap) => setLeaderboardPlayers(snap.docs.map((d) => d.data() as PlayerPublic)),
      (err) => handleFirestoreError(err, OperationType.LIST, 'players_public')
    );

    return () => {
      unsubSettings();
      unsubTournaments();
      unsubAnnouncements();
      unsubResults();
      unsubLeaderboard();
    };
  }, []);

  // Authenticated player listeners
  useEffect(() => {
    if (!firebaseUser) {
      setProfile(null);
      setMyRegistrations([]);
      setMyKillClaims([]);
      setMyTransactions([]);
      setMyWithdrawals([]);
      setMyNotifications([]);
      setMyTickets([]);
      return;
    }

    setProfileLoading(true);
    const uid = firebaseUser.uid;

    const unsubProfile = onSnapshot(
      doc(db, 'users', uid),
      (snap) => {
        setProfile(snap.exists() ? (snap.data() as UserPrivate) : null);
        setProfileLoading(false);
      },
      (err) => {
        setProfileLoading(false);
        handleFirestoreError(err, OperationType.GET, `users/${uid}`);
      }
    );

    const unsubRegs = onSnapshot(
      query(collection(db, 'registrations'), where('userId', '==', uid)),
      (snap) => {
        const list = snap.docs.map((d) => d.data() as Registration);
        list.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
        setMyRegistrations(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'registrations')
    );

    const unsubClaims = onSnapshot(
      query(collection(db, 'kill_claims'), where('userId', '==', uid)),
      (snap) => {
        const list = snap.docs.map((d) => d.data() as KillClaim);
        list.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
        setMyKillClaims(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'kill_claims')
    );

    const unsubTx = onSnapshot(
      query(collection(db, 'wallet_transactions'), where('userId', '==', uid)),
      (snap) => {
        const list = snap.docs.map((d) => d.data() as WalletTransaction);
        list.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
        setMyTransactions(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'wallet_transactions')
    );

    const unsubWdr = onSnapshot(
      query(collection(db, 'withdrawals'), where('userId', '==', uid)),
      (snap) => {
        const list = snap.docs.map((d) => d.data() as Withdrawal);
        list.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
        setMyWithdrawals(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'withdrawals')
    );

    const unsubNotifs = onSnapshot(
      query(collection(db, 'notifications'), where('userId', '==', uid)),
      (snap) => {
        const list = snap.docs.map((d) => d.data() as AppNotification);
        list.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
        setMyNotifications(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'notifications')
    );

    const unsubTickets = onSnapshot(
      query(collection(db, 'support_tickets'), where('userId', '==', uid)),
      (snap) => {
        const list = snap.docs.map((d) => d.data() as SupportTicket);
        list.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
        setMyTickets(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'support_tickets')
    );

    return () => {
      unsubProfile();
      unsubRegs();
      unsubClaims();
      unsubTx();
      unsubWdr();
      unsubNotifs();
      unsubTickets();
    };
  }, [firebaseUser]);

  const signInWithGoogle = useCallback(async () => {
    await signInWithPopup(auth, googleProvider);
  }, []);

  const signInWithEmail = useCallback(async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email.trim(), pass);
  }, []);

  const registerWithEmail = useCallback(async (email: string, pass: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
    await sendEmailVerification(cred.user);
  }, []);

  const resendVerification = useCallback(async () => {
    if (!auth.currentUser) return;
    await sendEmailVerification(auth.currentUser);
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
  }, []);

  const unreadNotificationCount = useMemo(
    () => myNotifications.filter((n) => !n.isRead).length,
    [myNotifications]
  );

  const value: VynorixContextValue = {
    authReady,
    firebaseUser,
    profile,
    profileLoading,
    isAdmin,
    isVerifiedUser,
    settings,
    tournaments,
    announcements,
    results,
    leaderboardPlayers,
    myRegistrations,
    myKillClaims,
    myTransactions,
    myWithdrawals,
    myNotifications,
    myTickets,
    unreadNotificationCount,
    toast,
    showToast,
    clearToast,
    signInWithGoogle,
    signInWithEmail,
    registerWithEmail,
    resendVerification,
    logout,
  };

  return <VynorixContext.Provider value={value}>{children}</VynorixContext.Provider>;
}

export function useVynorix() {
  const ctx = useContext(VynorixContext);
  if (!ctx) throw new Error('useVynorix must be used within VynorixProvider');
  return ctx;
}
