import { useCallback, useEffect, useMemo, useState } from 'react';
import { Award, BookOpen, ChevronDown, ChevronUp, Flame, HelpCircle, MessageSquare, Video, X } from 'lucide-react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { DIFFICULTY_LABELS, MECHANICS_GRIP_PRIMER, PRESET_TECHNIQUES } from './data/techniques';
import { evaluateUnlockedBadges } from './data/achievements';
import type {
  AchievementDef,
  CoLearningNudge,
  FriendEdge,
  LearnerProfile,
  Technique,
  UserProgress,
} from './types';
import { CasinoTableBackdrop } from './components/CasinoTableBackdrop';
import { CheshireMark } from './components/CheshireMark';
import { GripDiagram } from './components/GripDiagram';
import { PhotoCoachPanel } from './components/PhotoCoachPanel';
import { LiveDrillArena } from './components/LiveDrillArena';
import { TechniqueAskBar } from './components/TechniqueAskBar';
import { AchievementsAndFriends } from './components/AchievementsAndFriends';
import { MagicChatbot } from './components/MagicChatbot';
import { LiveVoiceCoach } from './components/LiveVoiceCoach';
import { auth, googleProvider } from './lib/firebase';
import {
  addFriendByCode,
  dismissNudge,
  ensureUserProfiles,
  removeFriend,
  sendCoLearningNudge,
  subscribeFriendProfile,
  subscribeFriendsList,
  subscribeIncomingNudges,
  syncLearnerProgress,
} from './services/learnerService';

const PROGRESS_STORAGE_KEY = 'el_sihri_progress_v2';

type AppMode = 'learn' | 'drill' | 'social' | 'ai';

function getTodayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function getDefaultProgress(): UserProgress {
  return {
    xp: 0,
    streakDays: 0,
    completedReps: 0,
    photoChecks: 0,
    successfulPhotoChecks: 0,
    lastPracticeDate: '',
    practicedTechniques: [],
    unlockedBadgeIds: [],
  };
}

function loadInitialProgress(): UserProgress {
  if (typeof window === 'undefined') return getDefaultProgress();
  try {
    const raw = window.localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (!raw) return getDefaultProgress();
    const parsed = JSON.parse(raw) as Partial<UserProgress>;
    return {
      xp: Number(parsed.xp) || 0,
      streakDays: Number(parsed.streakDays) || 0,
      completedReps: Number(parsed.completedReps) || 0,
      photoChecks: Number(parsed.photoChecks) || 0,
      successfulPhotoChecks: Number(parsed.successfulPhotoChecks) || 0,
      lastPracticeDate: typeof parsed.lastPracticeDate === 'string' ? parsed.lastPracticeDate : '',
      practicedTechniques: Array.isArray(parsed.practicedTechniques) ? parsed.practicedTechniques : [],
      unlockedBadgeIds: Array.isArray(parsed.unlockedBadgeIds) ? parsed.unlockedBadgeIds : [],
    };
  } catch {
    return getDefaultProgress();
  }
}

function computeNextStreak(prev: UserProgress): number {
  const today = getTodayIso();
  if (prev.lastPracticeDate === today) {
    return Math.max(1, prev.streakDays);
  }
  if (!prev.lastPracticeDate) return 1;

  const prevTime = new Date(prev.lastPracticeDate).getTime();
  const todayTime = new Date(today).getTime();
  const diffDays = Math.round((todayTime - prevTime) / (1000 * 60 * 60 * 24));
  return diffDays === 1 ? prev.streakDays + 1 : 1;
}

export default function App() {
  const [mode, setMode] = useState<AppMode>('learn');
  const [aiTab, setAiTab] = useState<'chat' | 'voice'>('chat');
  const [techniques, setTechniques] = useState<Technique[]>(PRESET_TECHNIQUES);
  const [activeTechniqueId, setActiveTechniqueId] = useState<string>(PRESET_TECHNIQUES[0].id);
  const [activeStepNumber, setActiveStepNumber] = useState<number>(1);
  const [showGripPrimer, setShowGripPrimer] = useState<boolean>(true);
  const [progress, setProgress] = useState<UserProgress>(loadInitialProgress);
  const [unlockedToast, setUnlockedToast] = useState<AchievementDef | null>(null);

  // Firebase Auth & Social Co-learning state
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [myProfile, setMyProfile] = useState<LearnerProfile | null>(null);
  const [friends, setFriends] = useState<FriendEdge[]>([]);
  const [friendProfiles, setFriendProfiles] = useState<Record<string, LearnerProfile>>({});
  const [nudges, setNudges] = useState<CoLearningNudge[]>([]);

  const activeTechnique = useMemo(
    () => techniques.find((t) => t.id === activeTechniqueId) ?? techniques[0],
    [techniques, activeTechniqueId]
  );

  // Persist locally
  useEffect(() => {
    try {
      window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
    } catch {
      // Ignore quota errors
    }
  }, [progress]);

  // Evaluate badges whenever progress or friend count changes
  useEffect(() => {
    const { nextBadgeIds, newlyUnlocked } = evaluateUnlockedBadges(progress, friends.length);
    if (newlyUnlocked.length > 0) {
      setProgress((prev) => ({
        ...prev,
        unlockedBadgeIds: nextBadgeIds,
      }));
      setUnlockedToast(newlyUnlocked[0]);
    }
  }, [progress, friends.length]);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      if (!nextUser) {
        setMyProfile(null);
        setFriends([]);
        setFriendProfiles({});
        setNudges([]);
        setAuthLoading(false);
        return;
      }

      try {
        const profile = await ensureUserProfiles(nextUser, progress, activeTechnique);
        setMyProfile(profile);
        setProgress((prev) => {
          const mergedBadges = Array.from(
            new Set([...prev.unlockedBadgeIds, ...(profile.unlockedBadgeIds || [])])
          ).slice(0, 20);
          const mergedTechs = Array.from(
            new Set([...prev.practicedTechniques, ...(profile.practicedTechniques || [])])
          ).slice(0, 30);
          return {
            ...prev,
            xp: Math.max(prev.xp, profile.xp || 0),
            streakDays: Math.max(prev.streakDays, profile.streakDays || 0),
            completedReps: Math.max(prev.completedReps, profile.completedReps || 0),
            photoChecks: Math.max(prev.photoChecks, profile.photoChecks || 0),
            lastPracticeDate: profile.lastPracticeDate || prev.lastPracticeDate,
            unlockedBadgeIds: mergedBadges,
            practicedTechniques: mergedTechs,
          };
        });
      } finally {
        setAuthLoading(false);
      }
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Subscribe to friends list and incoming nudges when authenticated
  useEffect(() => {
    if (!user) return;
    const unsubFriends = subscribeFriendsList(user.uid, (list) => {
      setFriends(list);
    });
    const unsubNudges = subscribeIncomingNudges(user.uid, (list) => {
      setNudges(list);
    });
    return () => {
      unsubFriends();
      unsubNudges();
    };
  }, [user]);

  // Subscribe to each friend's live learner profile
  useEffect(() => {
    if (!user || friends.length === 0) {
      setFriendProfiles({});
      return;
    }
    const unsubs = friends.map((edge) =>
      subscribeFriendProfile(edge.friendUid, (profile) => {
        if (!profile) return;
        setFriendProfiles((prev) => ({
          ...prev,
          [edge.friendUid]: profile,
        }));
      })
    );
    return () => {
      unsubs.forEach((u) => u());
    };
  }, [user, friends]);

  // Sync progress & active technique to Firestore whenever they update while signed in
  useEffect(() => {
    if (!user || !myProfile) return;
    const timer = window.setTimeout(() => {
      void syncLearnerProgress(
        user.uid,
        myProfile.displayName,
        progress,
        activeTechnique
      );
    }, 600);
    return () => window.clearTimeout(timer);
  }, [user, myProfile, progress, activeTechnique]);

  const recordPractice = useCallback(
    (delta: {
      xp?: number;
      completedReps?: number;
      photoChecks?: number;
      successfulPhotoChecks?: number;
    }) => {
      setProgress((prev) => {
        const practicedSet = new Set(prev.practicedTechniques);
        practicedSet.add(activeTechnique.name);
        return {
          ...prev,
          xp: prev.xp + (delta.xp ?? 0),
          completedReps: prev.completedReps + (delta.completedReps ?? 0),
          photoChecks: prev.photoChecks + (delta.photoChecks ?? 0),
          successfulPhotoChecks:
            prev.successfulPhotoChecks + (delta.successfulPhotoChecks ?? 0),
          streakDays: computeNextStreak(prev),
          lastPracticeDate: getTodayIso(),
          practicedTechniques: Array.from(practicedSet).slice(0, 30),
        };
      });
    },
    [activeTechnique.name]
  );

  function handleSelectTechnique(id: string) {
    setActiveTechniqueId(id);
    setActiveStepNumber(1);
  }

  function handleTechniqueLearned(newTech: Technique) {
    setTechniques((prev) => [newTech, ...prev]);
    setActiveTechniqueId(newTech.id);
    setActiveStepNumber(1);
  }

  async function handleSignIn() {
    await signInWithPopup(auth, googleProvider);
  }

  async function handleSignOut() {
    await signOut(auth);
  }

  async function handleAddFriend(code: string): Promise<string> {
    if (!user) throw new Error('Önce giriş yapmalısınız.');
    const added = await addFriendByCode(user.uid, code);
    return added.displayName;
  }

  async function handleRemoveFriend(friendUid: string) {
    if (!user) return;
    await removeFriend(user.uid, friendUid);
  }

  async function handleSendNudge(friendUid: string, techName: string) {
    if (!user || !myProfile) return;
    await sendCoLearningNudge(
      user.uid,
      myProfile.displayName,
      friendUid,
      techName,
      `Hadi birlikte "${techName}" çalışalım!`
    );
  }

  async function handleDismissNudge(nudgeId: string) {
    if (!user) return;
    await dismissNudge(user.uid, nudgeId);
  }

  async function handlePracticeTogether(techName: string) {
    const existing = techniques.find(
      (t) => t.name.toLowerCase() === techName.toLowerCase()
    );
    if (existing) {
      setActiveTechniqueId(existing.id);
      setActiveStepNumber(1);
      setMode('learn');
      return;
    }

    const res = await fetch('/api/teach-technique', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ techniqueQuery: techName }),
    });
    if (res.ok) {
      const data = await res.json();
      const customTech: Technique = {
        id: `custom-${Date.now()}`,
        name: data.name || techName,
        title: data.title || `${techName} Nasıl Yapılır?`,
        summary: data.summary || '',
        difficulty: data.difficulty || 'Orta',
        steps: Array.isArray(data.steps) ? data.steps.slice(0, 5) : [],
        isCustom: true,
      };
      setTechniques((prev) => [customTech, ...prev]);
      setActiveTechniqueId(customTech.id);
      setActiveStepNumber(1);
    }
    setMode('learn');
  }

  const stepSuits = ['♠', '♥', '♦', '♣', '★'];

  return (
    <div className="relative min-h-screen bg-[#08291F] text-[#F4FDF9] pb-24 md:pb-12">
      <CasinoTableBackdrop />

      {/* Subtle Cheshire Cat & Casino Gold Rail Accent */}
      <div
        className="relative z-10 h-[2px] w-full bg-gradient-to-r from-fuchsia-400/75 via-amber-200/70 to-teal-300/75"
        aria-hidden="true"
      />

      {/* Top Bar (Strict 3-zone contract) */}
      <header className="relative z-10 border-b border-emerald-200/[0.14] bg-[#07231A]/85 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-8">
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setMode('learn');
            }}
            className="font-display text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0"
          >
            El Sihri
          </a>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <button
              type="button"
              onClick={() => setMode('learn')}
              className={`min-h-[40px] px-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                mode === 'learn'
                  ? 'text-white border-b-2 border-fuchsia-400'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Teknik &amp; Fotoğraf
            </button>
            <button
              type="button"
              onClick={() => setMode('drill')}
              className={`min-h-[40px] px-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                mode === 'drill'
                  ? 'text-white border-b-2 border-fuchsia-400'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Canlı Antrenman
            </button>
            <button
              type="button"
              onClick={() => setMode('social')}
              className={`min-h-[40px] px-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                mode === 'social'
                  ? 'text-white border-b-2 border-fuchsia-400'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Başarılar &amp; Arkadaşlar
            </button>
            <button
              type="button"
              onClick={() => setMode('ai')}
              className={`min-h-[40px] px-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                mode === 'ai'
                  ? 'text-white border-b-2 border-fuchsia-400'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              AI Sohbet &amp; Ses
            </button>
          </nav>

          <div className="flex items-center gap-4 shrink-0">
            <div className="hidden sm:flex items-center gap-2 text-xs text-emerald-100/75 font-mono-num whitespace-nowrap">
              <span className="inline-flex items-center gap-1 text-fuchsia-300 font-semibold">
                <Flame className="w-3.5 h-3.5" />
                {progress.streakDays} Gün
              </span>
              <span aria-hidden="true">·</span>
              <span>{progress.xp} XP</span>
            </div>

            <button
              type="button"
              onClick={() => setMode(mode === 'drill' ? 'learn' : 'drill')}
              className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#124938] hover:bg-[#175945] text-xs font-semibold text-fuchsia-300 border border-emerald-200/[0.15] inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer"
            >
              <Video className="w-3.5 h-3.5 shrink-0" />
              <span>{mode === 'drill' ? 'Rehbere Dön' : 'Canlı Kamera Koçu'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Achievement Unlocked Banner */}
      {unlockedToast && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4">
          <div className="rounded-xl bg-emerald-500/12 border border-emerald-500/30 px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Award className="w-5 h-5 text-emerald-400 shrink-0" />
              <p className="text-sm text-white truncate">
                Yeni Rozet Kazanıldı: <span className="font-semibold text-emerald-300">{unlockedToast.title}</span>
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setMode('social');
                  setUnlockedToast(null);
                }}
                className="min-h-[36px] px-3 py-1 rounded-lg bg-emerald-500 text-zinc-950 text-xs font-semibold cursor-pointer"
              >
                Başarıları Gör
              </button>
              <button
                type="button"
                onClick={() => setUnlockedToast(null)}
                aria-label="Bildirimi kapat"
                className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-lg text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main id="top" className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 space-y-6">
        {(mode === 'learn' || mode === 'drill') && (
          <TechniqueAskBar
            techniques={techniques}
            activeId={activeTechnique.id}
            onSelect={handleSelectTechnique}
            onTechniqueLearned={handleTechniqueLearned}
          />
        )}

        {mode === 'learn' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: 5-Step Technique Breakdown + Mechanic's Grip Primer + Interactive Visual */}
            <section
              aria-labelledby="technique-guide-heading"
              className="lg:col-span-7 space-y-5"
            >
              <div className="rounded-2xl bg-[#0D382B]/90 border border-emerald-200/[0.15] p-5 sm:p-6 space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-emerald-100/75">
                      <span>Seviye: {DIFFICULTY_LABELS[activeTechnique.difficulty]}</span>
                      <span aria-hidden="true">·</span>
                      <span>5 Adımda Teknik</span>
                      {activeTechnique.isCustom && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-fuchsia-300">AI Öğretmeni</span>
                        </>
                      )}
                    </div>
                    <h1
                      id="technique-guide-heading"
                      className="text-2xl sm:text-3xl font-bold text-white tracking-tight"
                    >
                      {activeTechnique.title}
                    </h1>
                    <p className="text-sm text-zinc-300 leading-relaxed max-w-2xl">
                      {activeTechnique.summary}
                    </p>
                  </div>
                  <CheshireMark className="w-12 h-8 shrink-0 mt-1 hidden sm:block" />
                </div>

                {/* Beginner Primer: What is Mechanic's Grip? (shown for zero-background beginners) */}
                {activeTechnique.id !== 'mechanics-grip' && (
                  <div className="rounded-xl bg-[#07231A] border border-amber-200/20 p-4 space-y-2.5">
                    <button
                      type="button"
                      onClick={() => setShowGripPrimer((v) => !v)}
                      className="w-full flex items-center justify-between gap-3 text-left cursor-pointer"
                    >
                      <span className="inline-flex items-center gap-2 text-xs font-semibold text-amber-200">
                        <HelpCircle className="w-4 h-4 shrink-0" />
                        <span>0&apos;dan Başlayanlar İçin: {MECHANICS_GRIP_PRIMER.title}</span>
                      </span>
                      {showGripPrimer ? (
                        <ChevronUp className="w-4 h-4 text-emerald-100/75 shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-emerald-100/75 shrink-0" />
                      )}
                    </button>

                    {showGripPrimer && (
                      <div className="space-y-2.5 pt-1">
                        <p className="text-xs text-emerald-50/90 leading-relaxed">
                          {MECHANICS_GRIP_PRIMER.summary}
                        </p>
                        <ul className="space-y-1 text-xs text-emerald-100/75 list-disc pl-4">
                          {MECHANICS_GRIP_PRIMER.points.map((point) => (
                            <li key={point}>{point}</li>
                          ))}
                        </ul>
                        <button
                          type="button"
                          onClick={() => handleSelectTechnique('mechanics-grip')}
                          className="min-h-[36px] px-3 py-1.5 rounded-lg bg-[#124938] hover:bg-[#175945] text-xs font-semibold text-amber-200 border border-amber-200/25 inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>Mekanik Tutuş Dersini Aç (Kolay)</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* 5 Concise Numbered Steps Styled as Playing Card Index Tabs */}
                <ol className="divide-y divide-white/[0.08] border-t border-white/[0.08]">
                  {activeTechnique.steps.map((step, idx) => {
                    const isSelected = activeStepNumber === step.number;
                    const suit = stepSuits[idx % stepSuits.length];
                    return (
                      <li key={step.number}>
                        <button
                          type="button"
                          onClick={() => setActiveStepNumber(step.number)}
                          className={`w-full text-left py-3.5 px-2.5 -mx-2 rounded-xl transition-colors flex items-start gap-3.5 cursor-pointer ${
                            isSelected ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'
                          }`}
                        >
                          <span
                            className={`font-mono-num text-xs font-semibold w-8 h-10 rounded-lg flex flex-col items-center justify-center shrink-0 mt-0.5 transition-colors leading-none gap-0.5 ${
                              isSelected
                                ? 'bg-fuchsia-400 text-zinc-950'
                                : 'bg-[#07231A] text-amber-200 border border-amber-200/25'
                            }`}
                          >
                            <span>{step.number}</span>
                            <span className="text-[10px]" aria-hidden="true">{suit}</span>
                          </span>
                          <div className="space-y-1 min-w-0">
                            <h2 className="text-sm sm:text-base font-semibold text-white">
                              {step.title}
                            </h2>
                            <p className="text-sm text-emerald-100/80 leading-relaxed">
                              {step.detail}
                            </p>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ol>

                {/* Quick Transition to Duolingo-style Live Drill */}
                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-white/[0.08]">
                  <p className="text-xs text-emerald-100/75">
                    Adımları okuduktan sonra canlı kamerada aşamalı tekrar yapabilirsin.
                  </p>
                  <button
                    type="button"
                    onClick={() => setMode('drill')}
                    className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#124938] hover:bg-[#175945] text-fuchsia-300 font-semibold text-xs border border-emerald-200/[0.15] inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 transition-colors cursor-pointer"
                  >
                    <Video className="w-4 h-4 shrink-0" />
                    <span>Canlı Kamera Antrenmanına Geç</span>
                  </button>
                </div>
              </div>

              <GripDiagram
                activeStep={activeStepNumber}
                techniqueName={activeTechnique.name}
              />
            </section>

            {/* Right Column: Fotoğraf Çek / Yükle & 5-Heading Gemini Analysis */}
            <div className="lg:col-span-5">
              <PhotoCoachPanel
                techniqueName={activeTechnique.name}
                onPhotoAnalyzed={(isSuccess) =>
                  recordPractice({
                    xp: 15,
                    photoChecks: 1,
                    successfulPhotoChecks: isSuccess ? 1 : 0,
                  })
                }
              />
            </div>
          </div>
        )}

        {mode === 'drill' && (
          <LiveDrillArena
            technique={activeTechnique}
            onStagePassed={(earnedXp) => recordPractice({ xp: earnedXp })}
            onRepCompleted={(bonusXp) => recordPractice({ xp: bonusXp, completedReps: 1 })}
          />
        )}

        {mode === 'social' && (
          <AchievementsAndFriends
            user={user}
            authLoading={authLoading}
            myProfile={myProfile}
            progress={progress}
            friends={friends}
            friendProfiles={friendProfiles}
            nudges={nudges}
            activeTechniqueName={activeTechnique.name}
            onSignIn={handleSignIn}
            onSignOut={handleSignOut}
            onAddFriend={handleAddFriend}
            onRemoveFriend={handleRemoveFriend}
            onPracticeTogether={handlePracticeTogether}
            onSendNudge={handleSendNudge}
            onDismissNudge={handleDismissNudge}
          />
        )}

        {mode === 'ai' && (
          <div className="space-y-4">
            {/* Mobile segmented toggle between Chat & Voice */}
            <div className="lg:hidden flex items-center gap-1 p-1 bg-[#0D382B]/90 border border-emerald-200/[0.15] rounded-xl">
              <button
                type="button"
                onClick={() => setAiTab('chat')}
                className={`flex-1 min-h-[40px] px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  aiTab === 'chat' ? 'bg-fuchsia-400 text-zinc-950' : 'text-zinc-200'
                }`}
              >
                Yazılı Mentor Sohbeti
              </button>
              <button
                type="button"
                onClick={() => setAiTab('voice')}
                className={`flex-1 min-h-[40px] px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  aiTab === 'voice' ? 'bg-fuchsia-400 text-zinc-950' : 'text-zinc-200'
                }`}
              >
                Canlı Sesli Koç (Live)
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className={`lg:col-span-7 ${aiTab === 'chat' ? 'block' : 'hidden lg:block'}`}>
                <MagicChatbot activeTechniqueName={activeTechnique.name} />
              </div>
              <div className={`lg:col-span-5 ${aiTab === 'voice' ? 'block' : 'hidden lg:block'}`}>
                <LiveVoiceCoach activeTechniqueName={activeTechnique.name} />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Mobile Fixed Bottom Thumb Navigation (<15% viewport cap: h-14 = 56px) */}
      <nav
        aria-label="Mobil alt gezinme"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-14 bg-[#07231A]/95 backdrop-blur-md border-t border-emerald-200/[0.15] grid grid-cols-4"
      >
        <button
          type="button"
          onClick={() => {
            setMode('learn');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium cursor-pointer ${
            mode === 'learn' ? 'text-fuchsia-300' : 'text-zinc-400'
          }`}
        >
          <BookOpen className="w-5 h-5" />
          <span>Anlatım</span>
        </button>

        <button
          type="button"
          onClick={() => setMode('drill')}
          className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium cursor-pointer ${
            mode === 'drill' ? 'text-fuchsia-300' : 'text-zinc-400'
          }`}
        >
          <Video className="w-5 h-5" />
          <span>Canlı Koç</span>
        </button>

        <button
          type="button"
          onClick={() => setMode('social')}
          className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium cursor-pointer ${
            mode === 'social' ? 'text-fuchsia-300' : 'text-zinc-400'
          }`}
        >
          <Award className="w-5 h-5" />
          <span>Başarılar</span>
        </button>

        <button
          type="button"
          onClick={() => setMode('ai')}
          className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium cursor-pointer ${
            mode === 'ai' ? 'text-fuchsia-300' : 'text-zinc-400'
          }`}
        >
          <MessageSquare className="w-5 h-5" />
          <span>Sohbet &amp; Ses</span>
        </button>
      </nav>
    </div>
  );
}
