import { useState, type FormEvent } from 'react';
import {
  Award,
  Check,
  CheckCircle2,
  Copy,
  Flame,
  Loader2,
  LogIn,
  LogOut,
  Send,
  Trash2,
  UserPlus,
  Users,
  Video,
  AlertCircle,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import { ACHIEVEMENTS } from '../data/achievements';
import type { CoLearningNudge, FriendEdge, LearnerProfile, UserProgress } from '../types';

interface AchievementsAndFriendsProps {
  user: User | null;
  authLoading: boolean;
  myProfile: LearnerProfile | null;
  progress: UserProgress;
  friends: FriendEdge[];
  friendProfiles: Record<string, LearnerProfile>;
  nudges: CoLearningNudge[];
  activeTechniqueName: string;
  onSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onAddFriend: (code: string) => Promise<string>;
  onRemoveFriend: (friendUid: string) => Promise<void>;
  onPracticeTogether: (techniqueName: string) => Promise<void>;
  onSendNudge: (friendUid: string, techniqueName: string) => Promise<void>;
  onDismissNudge: (nudgeId: string) => Promise<void>;
}

export function AchievementsAndFriends({
  user,
  authLoading,
  myProfile,
  progress,
  friends,
  friendProfiles,
  nudges,
  activeTechniqueName,
  onSignIn,
  onSignOut,
  onAddFriend,
  onRemoveFriend,
  onPracticeTogether,
  onSendNudge,
  onDismissNudge,
}: AchievementsAndFriendsProps) {
  const [friendCodeInput, setFriendCodeInput] = useState('');
  const [addingFriend, setAddingFriend] = useState(false);
  const [friendError, setFriendError] = useState<string | null>(null);
  const [friendSuccess, setFriendSuccess] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [nudgeSentMap, setNudgeSentMap] = useState<Record<string, boolean>>({});
  const [loadingTechniqueFor, setLoadingTechniqueFor] = useState<string | null>(null);

  const unlockedCount = ACHIEVEMENTS.filter((a) =>
    a.checkProgress(progress, friends.length).unlocked
  ).length;

  async function handleCopyCode() {
    if (!myProfile?.friendCode) return;
    try {
      await navigator.clipboard.writeText(myProfile.friendCode);
      setCopiedCode(true);
      window.setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // Clipboard fallback ignored
    }
  }

  async function handleAddFriendSubmit(e: FormEvent) {
    e.preventDefault();
    if (!friendCodeInput.trim() || addingFriend) return;
    setAddingFriend(true);
    setFriendError(null);
    setFriendSuccess(null);

    try {
      const addedName = await onAddFriend(friendCodeInput);
      setFriendSuccess(`${addedName} arkadaş listene eklendi.`);
      setFriendCodeInput('');
    } catch (err) {
      setFriendError(err instanceof Error ? err.message : 'Arkadaş eklenemedi.');
    } finally {
      setAddingFriend(false);
    }
  }

  async function handlePracticeFriendTechnique(techName: string, keyId: string) {
    setLoadingTechniqueFor(keyId);
    try {
      await onPracticeTogether(techName);
    } finally {
      setLoadingTechniqueFor(null);
    }
  }

  async function handleSendCheer(friendUid: string) {
    try {
      await onSendNudge(friendUid, activeTechniqueName);
      setNudgeSentMap((prev) => ({ ...prev, [friendUid]: true }));
      window.setTimeout(() => {
        setNudgeSentMap((prev) => ({ ...prev, [friendUid]: false }));
      }, 2500);
    } catch {
      // Error surfaced via parent/ErrorBoundary
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left Column: Başarılar (Achievements) */}
      <section
        aria-labelledby="achievements-heading"
        className="lg:col-span-6 rounded-2xl bg-[#0D382B]/90 border border-white/[0.08] p-5 sm:p-6 space-y-5"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="achievements-heading" className="text-xl font-semibold text-white">
              Başarılar ve Rozetler
            </h2>
            <p className="mt-1 text-sm text-emerald-100/75">
              Düzenli pratikle kas hafızanı geliştir ve yeni rozetlerin kilidini aç.
            </p>
          </div>
          <span className="font-mono-num text-xs font-semibold text-fuchsia-300 whitespace-nowrap shrink-0">
            {unlockedCount} / {ACHIEVEMENTS.length} Açık
          </span>
        </div>

        {/* Streak Highlight Strip */}
        <div className="rounded-xl bg-[#07231A] border border-white/[0.07] p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-fuchsia-400/15 border border-fuchsia-400/25 flex items-center justify-center text-fuchsia-300 shrink-0">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                Güncel Seri: <span className="font-mono-num text-fuchsia-300">{progress.streakDays} gün</span>
              </p>
              <p className="text-xs text-emerald-100/75">
                7 gün üst üste pratik yaparak Sihirbaz Çırağı rozetini kazan.
              </p>
            </div>
          </div>
          <span className="font-mono-num text-xs text-zinc-300 shrink-0">
            {Math.min(progress.streakDays, 7)}/7
          </span>
        </div>

        {/* Badge Grid */}
        <div className="divide-y divide-white/[0.07] border-t border-white/[0.07]">
          {ACHIEVEMENTS.map((badge) => {
            const status = badge.checkProgress(progress, friends.length);
            const pct = Math.round((status.current / status.target) * 100);
            return (
              <div key={badge.id} className="py-4 flex items-start gap-3.5">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                    status.unlocked
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                      : 'bg-[#124938] border-white/[0.08] text-emerald-100/60'
                  }`}
                >
                  {status.unlocked ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <Award className="w-5 h-5" />
                  )}
                </div>

                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <h3
                      className={`text-sm font-semibold ${
                        status.unlocked ? 'text-white' : 'text-zinc-300'
                      }`}
                    >
                      {badge.title}
                    </h3>
                    <span
                      className={`text-xs font-mono-num whitespace-nowrap shrink-0 ${
                        status.unlocked ? 'text-emerald-400 font-semibold' : 'text-emerald-100/60'
                      }`}
                    >
                      {status.unlocked ? 'Kazanıldı' : `${status.current}/${status.target}`}
                    </span>
                  </div>
                  <p className="text-xs text-emerald-100/75 leading-relaxed">{badge.description}</p>
                  <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        status.unlocked ? 'bg-emerald-500' : 'bg-fuchsia-400/75'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Right Column: Arkadaşlar & Birlikte Öğrenme */}
      <section
        aria-labelledby="friends-heading"
        className="lg:col-span-6 rounded-2xl bg-[#0D382B]/90 border border-white/[0.08] p-5 sm:p-6 space-y-5"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="friends-heading" className="text-xl font-semibold text-white">
              Arkadaşlar ve Birlikte Öğrenme
            </h2>
            <p className="mt-1 text-sm text-emerald-100/75">
              Arkadaşlarını ekle, hangi teknikleri çalıştıklarını gör ve aynı hareketi birlikte çalış.
            </p>
          </div>
          {user && (
            <button
              type="button"
              onClick={() => void onSignOut()}
              className="min-h-[40px] px-3 py-2 rounded-xl text-xs font-medium text-emerald-100/75 hover:text-white hover:bg-white/[0.06] inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
              title="Çıkış Yap"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Çıkış</span>
            </button>
          )}
        </div>

        {authLoading ? (
          <div className="py-10 flex items-center justify-center gap-2 text-sm text-emerald-100/75">
            <Loader2 className="w-4 h-4 animate-spin text-fuchsia-300" />
            <span>Hesap durumu kontrol ediliyor...</span>
          </div>
        ) : !user ? (
          <div className="rounded-xl bg-[#07231A] border border-white/[0.07] p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-xl bg-fuchsia-400/15 border border-fuchsia-400/25 flex items-center justify-center text-fuchsia-300 mx-auto">
              <Users className="w-6 h-6" />
            </div>
            <div className="space-y-1.5 max-w-sm mx-auto">
              <h3 className="text-base font-semibold text-white">
                Arkadaşlarınla Birlikte Pratik Yap
              </h3>
              <p className="text-xs text-emerald-100/75 leading-relaxed">
                Google hesabınla giriş yaptığında sana özel bir arkadaş kodu oluşturulur. Başarıların cihazlar arasında eşitlenir ve arkadaşlarının öğrendiği teknikleri anlık görebilirsin.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void onSignIn()}
              className="min-h-[48px] px-5 py-3 rounded-xl bg-fuchsia-400 hover:bg-fuchsia-300 text-zinc-950 font-semibold text-sm inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>Google ile Giriş Yap</span>
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {/* User's Shareable Friend Code */}
            <div className="rounded-xl bg-[#07231A] border border-white/[0.07] p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-xs text-emerald-100/75">Senin Arkadaş Kodun</span>
                <p className="font-mono-num text-base font-bold text-fuchsia-300 tracking-wide mt-0.5">
                  {myProfile?.friendCode ?? 'Oluşturuluyor...'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleCopyCode()}
                disabled={!myProfile?.friendCode}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-[#124938] hover:bg-[#175945] text-xs font-medium text-zinc-100 border border-white/[0.08] inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Kopyalandı</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Kodu Kopyala</span>
                  </>
                )}
              </button>
            </div>

            {/* Add Friend Form */}
            <form onSubmit={(e) => void handleAddFriendSubmit(e)} className="space-y-2">
              <label htmlFor="friend-code-input" className="block text-xs font-medium text-emerald-100/75">
                Arkadaş Kodu ile Ekle
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="friend-code-input"
                  type="text"
                  value={friendCodeInput}
                  onChange={(e) => setFriendCodeInput(e.target.value.toUpperCase())}
                  placeholder="Örn. SIHIR-7K2M"
                  disabled={addingFriend}
                  className="flex-1 min-h-[44px] px-3.5 py-2 rounded-xl bg-[#07231A] border border-white/[0.08] text-sm font-mono-num text-white placeholder:text-emerald-100/60 focus:outline-none focus:border-fuchsia-400/70"
                />
                <button
                  type="submit"
                  disabled={addingFriend || !friendCodeInput.trim()}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-fuchsia-400 hover:bg-fuchsia-300 disabled:opacity-45 text-zinc-950 text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {addingFriend ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <UserPlus className="w-4 h-4" />
                  )}
                  <span>Ekle</span>
                </button>
              </div>
              {friendError && (
                <p role="alert" className="text-xs text-red-400 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{friendError}</span>
                </p>
              )}
              {friendSuccess && (
                <p className="text-xs text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>{friendSuccess}</span>
                </p>
              )}
            </form>

            {/* Incoming Co-learning Nudges */}
            {nudges.length > 0 && (
              <div className="space-y-2 pt-1">
                <h3 className="text-xs font-semibold text-fuchsia-300">Gelen Çalışma Davetleri</h3>
                <div className="space-y-2">
                  {nudges.map((nudge) => (
                    <div
                      key={nudge.id}
                      className="rounded-xl bg-fuchsia-400/10 border border-fuchsia-400/25 p-3.5 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {nudge.fromName} <span className="text-emerald-100/75 font-normal">·</span> {nudge.techniqueName}
                        </p>
                        <p className="text-xs text-zinc-300 mt-0.5">{nudge.message}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => void handlePracticeFriendTechnique(nudge.techniqueName, nudge.id)}
                          className="min-h-[38px] px-3 py-1.5 rounded-lg bg-fuchsia-400 hover:bg-fuchsia-300 text-zinc-950 text-xs font-semibold whitespace-nowrap cursor-pointer"
                        >
                          Birlikte Çalış
                        </button>
                        <button
                          type="button"
                          onClick={() => void onDismissNudge(nudge.id)}
                          aria-label="Daveti kapat"
                          className="min-h-[38px] min-w-[38px] inline-flex items-center justify-center rounded-lg text-emerald-100/75 hover:text-white hover:bg-white/[0.06] cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Friends Learning Feed */}
            <div className="space-y-2 border-t border-white/[0.08] pt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-emerald-100/75">
                  Arkadaşların Neler Öğreniyor?
                </h3>
                <span className="font-mono-num text-xs text-emerald-100/60">{friends.length} arkadaş</span>
              </div>

              {friends.length === 0 ? (
                <p className="text-sm text-emerald-100/60 py-4 text-center">
                  Henüz ekli arkadaşın yok. Yukarıdaki kodunu arkadaşınla paylaş veya onun kodunu ekle.
                </p>
              ) : (
                <div className="divide-y divide-white/[0.07]">
                  {friends.map((edge) => {
                    const live = friendProfiles[edge.friendUid];
                    const name = live?.displayName || edge.displayName;
                    const tech = live?.currentTechnique || 'Double Lift';
                    const streak = live?.streakDays ?? 0;
                    const xp = live?.xp ?? 0;
                    const badges = live?.unlockedBadgeIds ?? [];
                    const hasApprentice = badges.includes('sihirbaz-ciragi');
                    const isBusy = loadingTechniqueFor === edge.friendUid;

                    return (
                      <div key={edge.friendUid} className="py-4 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{name}</p>
                            <p className="text-xs text-emerald-100/75 mt-0.5">
                              Şu an çalışıyor: <span className="text-teal-300 font-medium">{tech}</span>
                            </p>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-emerald-100/60 font-mono-num mt-1">
                              <span>{streak} gün seri</span>
                              <span aria-hidden="true">·</span>
                              <span>{xp} XP</span>
                              <span aria-hidden="true">·</span>
                              <span>{badges.length} rozet</span>
                              {hasApprentice && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span className="text-emerald-400 font-sans font-medium">Sihirbaz Çırağı</span>
                                </>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => void onRemoveFriend(edge.friendUid)}
                            aria-label={`${name} kişisini kaldır`}
                            className="min-h-[38px] min-w-[38px] inline-flex items-center justify-center rounded-lg text-emerald-100/60 hover:text-red-400 hover:bg-white/[0.04] shrink-0 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => void handlePracticeFriendTechnique(tech, edge.friendUid)}
                            className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#124938] hover:bg-[#175945] text-xs font-semibold text-fuchsia-300 border border-white/[0.08] inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                          >
                            {isBusy ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Video className="w-3.5 h-3.5" />
                            )}
                            <span>Aynı Tekniği Çalış</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => void handleSendCheer(edge.friendUid)}
                            className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#07231A] hover:bg-[#124938] text-xs font-medium text-zinc-200 border border-white/[0.08] inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                          >
                            {nudgeSentMap[edge.friendUid] ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-emerald-400">Davet Gönderildi</span>
                              </>
                            ) : (
                              <>
                                <Send className="w-3.5 h-3.5" />
                                <span>Birlikte Çalış Daveti</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
