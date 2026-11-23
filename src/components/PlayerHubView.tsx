import React, { useState } from 'react';
import {
  Bell,
  Check,
  Copy,
  HelpCircle,
  LogOut,
  Save,
  ShieldAlert,
  Ticket,
  Trophy,
  Upload,
  User,
} from 'lucide-react';
import { useVynorix } from '../context/VynorixContext';
import { formatINR } from '../lib/constants';
import { compressAndUploadImage } from '../lib/imageUtils';
import {
  markAllNotificationsRead,
  markNotificationRead,
  submitSupportTicket,
  updatePlayerProfile,
} from '../services/vynorixService';
import { BLUEPRINT_LIMITS, type AppTab, type TicketCategory, type Tournament } from '../types/vynorix';
import { StatusLabel } from './StatusLabel';

interface PlayerHubViewProps {
  onOpenAuth: () => void;
  onNavigateTab: (tab: AppTab) => void;
  onResubmitRegistration: (t: Tournament) => void;
}

type HubSection = 'profile' | 'registrations' | 'notifications' | 'support';

export function PlayerHubView({
  onOpenAuth,
  onNavigateTab,
  onResubmitRegistration,
}: PlayerHubViewProps) {
  const {
    firebaseUser,
    profile,
    isVerifiedUser,
    isAdmin,
    tournaments,
    myRegistrations,
    myNotifications,
    myTickets,
    results,
    unreadNotificationCount,
    logout,
    showToast,
  } = useVynorix();

  const [section, setSection] = useState<HubSection>('profile');
  const [ign, setIgn] = useState(profile?.ign || '');
  const [ffUid, setFfUid] = useState(profile?.ffUid || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatarUrl || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Support ticket state
  const [ticketCat, setTicketCat] = useState<TicketCategory>('payment_dispute');
  const [ticketTournamentId, setTicketTournamentId] = useState('');
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketDesc, setTicketDesc] = useState('');
  const [ticketEvidence, setTicketEvidence] = useState('');
  const [ticketBusy, setTicketBusy] = useState(false);

  if (!firebaseUser || !isVerifiedUser || !profile) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-zinc-900 p-10 text-center space-y-4">
        <User className="w-10 h-10 text-orange-400 mx-auto" />
        <div className="space-y-1">
          <h1 className="font-display text-2xl font-bold text-white">Player Hub</h1>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto">
            Manage your Free Fire UID profile, view registrations, read match notifications, and submit dispute tickets.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenAuth}
          className="min-h-[48px] px-6 rounded-xl bg-orange-500 hover:bg-orange-600 text-zinc-950 font-semibold text-sm"
        >
          Sign In to Player Hub
        </button>
      </div>
    );
  }

  const myResults = results.filter((r) => r.userId === profile.uid);

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    const cleanIgn = (ign || profile.ign).trim();
    const cleanUid = (ffUid || profile.ffUid).trim();
    if (cleanIgn.length < 2 || cleanIgn.length > 40) {
      showToast('error', 'In-Game Name must be 2 to 40 characters.');
      return;
    }
    if (!BLUEPRINT_LIMITS.ffUid.pattern.test(cleanUid)) {
      showToast('error', 'Free Fire UID must be 5 to 20 digits.');
      return;
    }
    setSavingProfile(true);
    try {
      await updatePlayerProfile(profile.uid, {
        ign: cleanIgn,
        ffUid: cleanUid,
        phone: phone || profile.phone || '',
        avatarUrl: avatarUrl || profile.avatarUrl || '',
      });
      showToast('success', 'Player profile updated.');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    try {
      const url = await compressAndUploadImage(file, `avatars/${profile.uid}_${Date.now()}.jpg`, 400);
      setAvatarUrl(url);
      await updatePlayerProfile(profile.uid, {
        ign: ign || profile.ign,
        ffUid: ffUid || profile.ffUid,
        avatarUrl: url,
      });
      showToast('success', 'Profile photo updated.');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Upload failed.');
    }
  }

  async function handleTicketEvidence(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    try {
      const url = await compressAndUploadImage(file, `disputes/${profile.uid}_${Date.now()}.jpg`);
      setTicketEvidence(url);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to attach image.');
    }
  }

  async function handleTicketSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setTicketBusy(true);
    try {
      await submitSupportTicket({
        profile,
        category: ticketCat,
        tournamentId: ticketTournamentId || undefined,
        subject: ticketSubject,
        description: ticketDesc,
        evidenceData: ticketEvidence || undefined,
      });
      setTicketSubject('');
      setTicketDesc('');
      setTicketEvidence('');
      showToast('success', 'Support ticket submitted. Admin will review and reply here.');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to submit ticket.');
    } finally {
      setTicketBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Player Header Card */}
      <section className="rounded-2xl border border-white/[0.08] bg-zinc-900 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt={profile.ign}
              className="w-16 h-16 rounded-2xl object-cover border border-orange-500/40 shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-zinc-800 border border-orange-500/30 flex items-center justify-center font-display text-xl font-bold text-orange-400 shrink-0">
              {profile.ign.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="font-display text-xl sm:text-2xl font-bold text-white">{profile.ign}</h1>
              {profile.isBanned && <StatusLabel status="Banned" />}
            </div>
            <div className="flex items-center gap-2 text-xs font-mono-tabular text-zinc-400 mt-1 flex-wrap">
              <span>{profile.playerCode}</span>
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(profile.playerCode);
                  setCopiedCode(true);
                  setTimeout(() => setCopiedCode(false), 1800);
                }}
                aria-label="Copy player code"
                className="text-orange-400 hover:text-orange-300 inline-flex items-center gap-1"
              >
                {copiedCode ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              </button>
              <span aria-hidden="true">·</span>
              <span>FF UID: {profile.ffUid}</span>
              <span aria-hidden="true">·</span>
              <span className="text-emerald-400 font-semibold">
                Wallet: {formatINR(profile.walletBalance)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {isAdmin && (
            <button
              type="button"
              onClick={() => onNavigateTab('admin')}
              className="min-h-[44px] px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-zinc-950 font-semibold text-xs whitespace-nowrap"
            >
              Open Admin Panel
            </button>
          )}
          <button
            type="button"
            onClick={() => logout()}
            className="min-h-[44px] px-4 rounded-xl bg-zinc-950 border border-white/10 hover:border-red-500/40 text-zinc-300 hover:text-red-300 text-xs font-semibold flex items-center gap-2 whitespace-nowrap"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </section>

      {profile.isBanned && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/25 flex items-center gap-3 text-xs text-red-200">
          <ShieldAlert className="w-5 h-5 text-red-400 shrink-0" />
          <span>Your account is currently suspended from entering matches or requesting payouts. Contact support below to appeal.</span>
        </div>
      )}

      {/* Hub Section Switcher */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-900 border border-white/[0.08] overflow-x-auto">
        {(
          [
            ['profile', 'Profile & Settings', User],
            ['registrations', 'My Matches & Results', Trophy],
            [
              'notifications',
              unreadNotificationCount > 0
                ? `Notifications (${unreadNotificationCount})`
                : 'Notifications',
              Bell,
            ],
            ['support', 'Support & Disputes', HelpCircle],
          ] as const
        ).map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            onClick={() => setSection(key)}
            className={`min-h-[42px] px-4 rounded-lg text-xs font-semibold flex items-center gap-2 whitespace-nowrap shrink-0 transition-colors ${
              section === key ? 'bg-orange-500 text-zinc-950' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Section 1: Profile & Settings */}
      {section === 'profile' && (
        <form
          onSubmit={handleProfileSave}
          className="rounded-2xl border border-white/[0.08] bg-zinc-900 p-6 space-y-5 max-w-2xl"
        >
          <h2 className="font-display text-lg font-bold text-white">Account Settings</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Free Fire In-Game Name
              </label>
              <input
                type="text"
                required
                minLength={2}
                maxLength={40}
                value={ign || profile.ign}
                onChange={(e) => setIgn(e.target.value)}
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white focus:outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Free Fire UID
              </label>
              <input
                type="text"
                required
                inputMode="numeric"
                value={ffUid || profile.ffUid}
                onChange={(e) => setFfUid(e.target.value.replace(/\D/g, ''))}
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-zinc-950 border border-white/10 text-sm font-mono-tabular text-white focus:outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Contact Phone
              </label>
              <input
                type="tel"
                value={phone || profile.phone || ''}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 ..."
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white focus:outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Registered Email
              </label>
              <input
                type="text"
                readOnly
                value={profile.email || 'Phone Verified'}
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-zinc-950/60 border border-white/10 text-sm text-zinc-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">Profile Photo</label>
            <label className="min-h-[44px] px-4 rounded-xl bg-zinc-950 border border-dashed border-white/15 hover:border-orange-500/50 inline-flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
              <Upload className="w-4 h-4 text-orange-400" />
              <span>Upload New Avatar</span>
              <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
            </label>
          </div>

          <button
            type="submit"
            disabled={savingProfile}
            className="min-h-[46px] px-6 rounded-xl bg-orange-500 hover:bg-orange-600 text-zinc-950 font-semibold text-sm inline-flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>{savingProfile ? 'Saving...' : 'Save Profile Changes'}</span>
          </button>
        </form>
      )}

      {/* Section 2: Registrations & Results */}
      {section === 'registrations' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="rounded-2xl border border-white/[0.08] bg-zinc-900 p-6 space-y-4">
            <h2 className="font-display text-lg font-bold text-white">My Registrations</h2>
            {myRegistrations.length === 0 ? (
              <p className="text-xs text-zinc-400 py-6 text-center">
                You have not joined any tournaments yet.
              </p>
            ) : (
              <div className="divide-y divide-white/[0.06]">
                {myRegistrations.map((reg) => {
                  const trn = tournaments.find((t) => t.id === reg.tournamentId);
                  return (
                    <div key={reg.id} className="py-3.5 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{reg.tournamentTitle}</p>
                          <p className="text-xs font-mono-tabular text-zinc-400">
                            UTR: {reg.utrNumber} · {formatINR(reg.entryFee)}
                          </p>
                        </div>
                        <StatusLabel status={reg.paymentStatus} />
                      </div>
                      {reg.paymentStatus === 'Rejected' && (
                        <div className="flex items-center justify-between gap-2 text-xs text-red-300 bg-red-500/10 p-2.5 rounded-lg">
                          <span>{reg.rejectionReason || 'Payment rejected'}</span>
                          {trn && (
                            <button
                              type="button"
                              onClick={() => onResubmitRegistration(trn)}
                              className="px-3 py-1 rounded bg-red-500 text-white font-semibold shrink-0"
                            >
                              Resubmit
                            </button>
                          )}
                        </div>
                      )}
                      {reg.paymentStatus === 'Approved' && (
                        <button
                          type="button"
                          onClick={() => onNavigateTab('room')}
                          className="text-xs font-semibold text-emerald-400 hover:text-emerald-300"
                        >
                          Open Custom Room Details →
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-white/[0.08] bg-zinc-900 p-6 space-y-4">
            <h2 className="font-display text-lg font-bold text-white">My Match Results</h2>
            {myResults.length === 0 ? (
              <p className="text-xs text-zinc-400 py-6 text-center">
                Your verified tournament finishes will appear here once published.
              </p>
            ) : (
              <div className="divide-y divide-white/[0.06]">
                {myResults.map((r) => (
                  <div key={r.id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">{r.tournamentTitle}</p>
                      <p className="text-xs text-zinc-400">
                        Rank #{r.rank} · {r.kills} verified kills
                      </p>
                    </div>
                    <span className="font-mono-tabular text-sm font-bold text-emerald-400">
                      {formatINR(r.totalWon)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* Section 3: Notifications */}
      {section === 'notifications' && (
        <section className="rounded-2xl border border-white/[0.08] bg-zinc-900 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-white">Notifications</h2>
            {unreadNotificationCount > 0 && (
              <button
                type="button"
                onClick={() =>
                  markAllNotificationsRead(
                    myNotifications.filter((n) => !n.isRead).map((n) => n.id)
                  )
                }
                className="text-xs font-semibold text-orange-400 hover:text-orange-300"
              >
                Mark All Read
              </button>
            )}
          </div>

          {myNotifications.length === 0 ? (
            <p className="text-xs text-zinc-400 py-8 text-center">
              No notifications yet. Payment, room release, kill reward, and payout alerts appear here.
            </p>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {myNotifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => !n.isRead && markNotificationRead(n.id)}
                  className={`py-3.5 px-3 rounded-xl flex items-start justify-between gap-4 cursor-pointer transition-colors ${
                    n.isRead ? 'opacity-70' : 'bg-orange-500/[0.05]'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">{n.title}</span>
                      {!n.isRead && (
                        <span className="text-[10px] font-semibold text-orange-400">Unread</span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed">{n.message}</p>
                  </div>
                  <span className="text-[11px] text-zinc-500 whitespace-nowrap">
                    {n.category.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Section 4: Support & Disputes */}
      {section === 'support' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <form
            onSubmit={handleTicketSubmit}
            className="rounded-2xl border border-white/[0.08] bg-zinc-900 p-6 space-y-4"
          >
            <div className="flex items-center gap-2.5">
              <Ticket className="w-5 h-5 text-orange-400" />
              <h2 className="font-display text-lg font-bold text-white">
                Submit Dispute or Support Ticket
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">Category</label>
                <select
                  value={ticketCat}
                  onChange={(e) => setTicketCat(e.target.value as TicketCategory)}
                  className="w-full min-h-[44px] px-3 rounded-xl bg-zinc-950 border border-white/10 text-xs text-white"
                >
                  <option value="payment_dispute">Payment / UTR Dispute</option>
                  <option value="kill_dispute">Kill Verification Dispute</option>
                  <option value="cheater_report">Report Hacker / Teaming</option>
                  <option value="withdrawal_issue">Withdrawal / Payout Issue</option>
                  <option value="account_support">Account Support</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Tournament (Optional)
                </label>
                <select
                  value={ticketTournamentId}
                  onChange={(e) => setTicketTournamentId(e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-xl bg-zinc-950 border border-white/10 text-xs text-white"
                >
                  <option value="">General / Not Applicable</option>
                  {tournaments.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <input
              type="text"
              required
              minLength={3}
              maxLength={120}
              value={ticketSubject}
              onChange={(e) => setTicketSubject(e.target.value)}
              placeholder="Subject (e.g., UTR 432891045612 pending over 30 mins)"
              className="w-full min-h-[44px] px-3.5 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white placeholder:text-zinc-500"
            />

            <textarea
              required
              minLength={5}
              maxLength={1000}
              rows={4}
              value={ticketDesc}
              onChange={(e) => setTicketDesc(e.target.value)}
              placeholder="Describe your issue or report clearly (include suspect UID if reporting teaming/hacks)..."
              className="w-full p-3.5 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white placeholder:text-zinc-500"
            />

            <label className="min-h-[44px] px-4 rounded-xl bg-zinc-950 border border-dashed border-white/15 hover:border-orange-500/50 flex items-center justify-center gap-2 text-xs text-zinc-300 cursor-pointer">
              <Upload className="w-4 h-4 text-orange-400" />
              <span>{ticketEvidence ? 'Evidence Screenshot Attached' : 'Attach Evidence Screenshot (Optional)'}</span>
              <input type="file" accept="image/*" onChange={handleTicketEvidence} className="hidden" />
            </label>

            <button
              type="submit"
              disabled={ticketBusy}
              className="w-full min-h-[46px] rounded-xl bg-orange-500 hover:bg-orange-600 text-zinc-950 font-semibold text-sm"
            >
              {ticketBusy ? 'Submitting...' : 'Submit Ticket'}
            </button>
          </form>

          <section className="rounded-2xl border border-white/[0.08] bg-zinc-900 p-6 space-y-4">
            <h2 className="font-display text-lg font-bold text-white">My Support Tickets</h2>
            {myTickets.length === 0 ? (
              <p className="text-xs text-zinc-400 py-8 text-center">No tickets submitted yet.</p>
            ) : (
              <div className="divide-y divide-white/[0.06]">
                {myTickets.map((t) => (
                  <div key={t.id} className="py-3.5 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-white">{t.subject}</p>
                      <StatusLabel status={t.status} />
                    </div>
                    <p className="text-xs text-zinc-400">{t.description}</p>
                    {t.adminReply && (
                      <div className="p-2.5 rounded-lg bg-zinc-950 border border-orange-500/20 text-xs text-orange-200">
                        <strong>Admin Reply:</strong> {t.adminReply}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
