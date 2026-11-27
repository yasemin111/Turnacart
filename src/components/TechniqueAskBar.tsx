import { useMemo, useState, type FormEvent } from 'react';
import { Loader2, Plus, AlertCircle, ArrowUpDown } from 'lucide-react';
import { DIFFICULTY_LABELS, DIFFICULTY_ORDER } from '../data/techniques';
import type { Technique } from '../types';

interface TechniqueAskBarProps {
  techniques: Technique[];
  activeId: string;
  onSelect: (id: string) => void;
  onTechniqueLearned: (tech: Technique) => void;
}

type DifficultyFilter = 'all' | Technique['difficulty'];

const FILTER_OPTIONS: { value: DifficultyFilter; label: string }[] = [
  { value: 'all', label: 'Tümü' },
  { value: 'Başlangıç', label: 'Kolay' },
  { value: 'Orta', label: 'Orta' },
  { value: 'İleri', label: 'Uzman' },
];

export function TechniqueAskBar({
  techniques,
  activeId,
  onSelect,
  onTechniqueLearned,
}: TechniqueAskBarProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>('all');
  const [sortByDifficulty, setSortByDifficulty] = useState<boolean>(true);

  const visibleTechniques = useMemo(() => {
    const filtered =
      difficultyFilter === 'all'
        ? techniques
        : techniques.filter((t) => t.difficulty === difficultyFilter);

    if (!sortByDifficulty) return filtered;

    return [...filtered].sort((a, b) => {
      const diffDelta = DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty];
      if (diffDelta !== 0) return diffDelta;
      return 0;
    });
  }, [techniques, difficultyFilter, sortByDifficulty]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/teach-technique', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ techniqueQuery: trimmed }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Teknik oluşturulamadı.');
      }

      const newTechnique: Technique = {
        id: `custom-${Date.now()}`,
        name: data.name || trimmed,
        title: data.title || `${trimmed} Nasıl Yapılır?`,
        summary: data.summary || '',
        difficulty: data.difficulty || 'Orta',
        steps: Array.isArray(data.steps) ? data.steps.slice(0, 5) : [],
        isCustom: true,
      };

      onTechniqueLearned(newTechnique);
      setDifficultyFilter('all');
      setQuery('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bağlantı hatası.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* Difficulty Filter Tabs & Path Sorting */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div
          className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#0D382B]/90 border border-emerald-200/[0.15]"
          role="group"
          aria-label="Zorluk seviyesine göre filtrele"
        >
          {FILTER_OPTIONS.map((opt) => {
            const isSelected = difficultyFilter === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setDifficultyFilter(opt.value)}
                className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-fuchsia-400 text-zinc-950 font-semibold'
                    : 'text-zinc-300 hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setSortByDifficulty((s) => !s)}
          className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-medium border inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
            sortByDifficulty
              ? 'bg-[#124938] border-teal-400/35 text-teal-300'
              : 'bg-[#0D382B]/90 border-emerald-200/[0.15] text-zinc-300 hover:text-white'
          }`}
          aria-pressed={sortByDifficulty}
        >
          <ArrowUpDown className="w-3.5 h-3.5 shrink-0" />
          <span>{sortByDifficulty ? 'Sıra: Kolaydan Uzmana' : 'Sıra: Varsayılan'}</span>
        </button>
      </div>

      {/* Technique Selector Strip */}
      <div
        className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar"
        role="tablist"
        aria-label="Kart sihirbazlığı teknikleri"
      >
        {visibleTechniques.length === 0 ? (
          <p className="text-xs text-emerald-100/75 py-2">
            Bu zorluk seviyesinde teknik bulunamadı.
          </p>
        ) : (
          visibleTechniques.map((tech) => {
            const isActive = tech.id === activeId;
            return (
              <button
                key={tech.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onSelect(tech.id)}
                className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-fuchsia-400 text-zinc-950 font-semibold'
                    : 'bg-[#0D382B]/90 text-zinc-200 border border-emerald-200/[0.15] hover:text-white hover:bg-[#124938]'
                }`}
              >
                <span>{tech.name}</span>
                <span aria-hidden="true" className={isActive ? 'text-zinc-800' : 'text-emerald-200/65'}>
                  ·
                </span>
                <span className={isActive ? 'text-zinc-900' : 'text-emerald-100/75'}>
                  {DIFFICULTY_LABELS[tech.difficulty]}
                </span>
              </button>
            );
          })
        )}
      </div>

      {/* Ask AI to Teach Any Technique */}
      <form onSubmit={(e) => void handleSubmit(e)} className="flex items-center gap-2">
        <label htmlFor="technique-query" className="sr-only">
          Öğrenmek istediğiniz kart tekniği
        </label>
        <input
          id="technique-query"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Başka teknik sor (ör. Riffle Force, Erdnase Change)..."
          disabled={loading}
          className="flex-1 min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0D382B]/90 border border-emerald-200/[0.15] text-sm text-white placeholder:text-emerald-200/65 focus:outline-none focus:border-fuchsia-400/70"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="min-h-[44px] px-4 py-2 rounded-xl bg-[#124938] hover:bg-[#175945] disabled:opacity-45 text-zinc-100 border border-emerald-200/[0.15] text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-fuchsia-300" />
              <span>Hazırlanıyor</span>
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 text-fuchsia-300" />
              <span>AI Öğretsin</span>
            </>
          )}
        </button>
      </form>

      {error && (
        <div role="alert" className="flex items-center gap-2 text-xs text-red-400">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
