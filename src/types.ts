export interface TechniqueStep {
  number: number;
  title: string;
  detail: string;
  visualCue: string;
}

export interface Technique {
  id: string;
  name: string;
  title: string;
  summary: string;
  difficulty: 'Başlangıç' | 'Orta' | 'İleri';
  steps: TechniqueStep[];
  isCustom?: boolean;
}

export interface PhotoFeedback {
  durum: 'Başarılı' | 'Hatalı';
  tespitEdilenHata: string;
  nasilDuzeltilir: string;
  parmakPozisyonu: string;
  kartHizasi: string;
}

export interface StageCoachResult {
  passed: boolean;
  statusLabel: string;
  feedback: string;
  tip: string;
}

export interface UserProgress {
  xp: number;
  streakDays: number;
  completedReps: number;
  photoChecks: number;
  successfulPhotoChecks: number;
  lastPracticeDate: string;
  practicedTechniques: string[];
  unlockedBadgeIds: string[];
}

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  requirementLabel: string;
  checkProgress: (progress: UserProgress, friendsCount: number) => {
    unlocked: boolean;
    current: number;
    target: number;
  };
}

export interface LearnerProfile {
  uid: string;
  displayName: string;
  friendCode: string;
  currentTechnique: string;
  currentTechniqueTitle: string;
  xp: number;
  streakDays: number;
  completedReps: number;
  photoChecks: number;
  lastPracticeDate: string;
  unlockedBadgeIds: string[];
  practicedTechniques: string[];
}

export interface FriendEdge {
  ownerId: string;
  friendUid: string;
  displayName: string;
  friendCode: string;
}

export interface CoLearningNudge {
  id: string;
  fromUid: string;
  toUid: string;
  fromName: string;
  techniqueName: string;
  message: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
}
