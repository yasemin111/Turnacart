import type { AchievementDef, UserProgress } from '../types';

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'ilk-adim',
    title: 'İlk Adım',
    description: 'İlk el fotoğrafı analizini veya canlı antrenman aşamasını tamamladın.',
    requirementLabel: '1 pratik eylemi',
    checkProgress: (p) => {
      const done = p.xp > 0 || p.photoChecks > 0 ? 1 : 0;
      return { unlocked: done >= 1, current: done, target: 1 };
    },
  },
  {
    id: 'keskin-goz',
    title: 'Keskin Göz',
    description: 'Fotoğraf analizinde parmak ve kart hizasından Başarılı sonucu aldın.',
    requirementLabel: '1 başarılı analiz',
    checkProgress: (p) => {
      const count = Math.min(1, p.successfulPhotoChecks);
      return { unlocked: p.successfulPhotoChecks >= 1, current: count, target: 1 };
    },
  },
  {
    id: 'sihirbaz-ciragi',
    title: 'Sihirbaz Çırağı',
    description: '7 gün üst üste pratik yaparak disiplinli bir sihirbazlık rutini kurdun.',
    requirementLabel: '7 gün üst üste seri',
    checkProgress: (p) => {
      const current = Math.min(7, p.streakDays);
      return { unlocked: p.streakDays >= 7, current, target: 7 };
    },
  },
  {
    id: 'kas-ustasi',
    title: 'Kas Hafızası Ustası',
    description: 'Canlı kamera koçunda 5 tam tekrarı hatasız tamamladın.',
    requirementLabel: '5 tam tekrar',
    checkProgress: (p) => {
      const current = Math.min(5, p.completedReps);
      return { unlocked: p.completedReps >= 5, current, target: 5 };
    },
  },
  {
    id: 'teknik-kasifi',
    title: 'Teknik Kaşifi',
    description: 'En az 3 farklı kart tekniği üzerinde pratik yaptın.',
    requirementLabel: '3 farklı teknik',
    checkProgress: (p) => {
      const count = p.practicedTechniques.length;
      return { unlocked: count >= 3, current: Math.min(3, count), target: 3 };
    },
  },
  {
    id: 'kolektif-sihir',
    title: 'Birlikte Öğrenme',
    description: 'İlk arkadaşını ekledin ve birlikte pratik yapmaya başladın.',
    requirementLabel: '1 arkadaş ekle',
    checkProgress: (_p, friendsCount) => {
      return { unlocked: friendsCount >= 1, current: Math.min(1, friendsCount), target: 1 };
    },
  },
];

export function evaluateUnlockedBadges(
  progress: UserProgress,
  friendsCount: number
): { nextBadgeIds: string[]; newlyUnlocked: AchievementDef[] } {
  const currentSet = new Set(progress.unlockedBadgeIds);
  const newlyUnlocked: AchievementDef[] = [];

  for (const badge of ACHIEVEMENTS) {
    const res = badge.checkProgress(progress, friendsCount);
    if (res.unlocked && !currentSet.has(badge.id)) {
      currentSet.add(badge.id);
      newlyUnlocked.push(badge);
    }
  }

  return {
    nextBadgeIds: Array.from(currentSet).slice(0, 20),
    newlyUnlocked,
  };
}
