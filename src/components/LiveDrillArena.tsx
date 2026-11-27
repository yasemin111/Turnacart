import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Camera,
  CheckCircle2,
  ChevronRight,
  FlipHorizontal2,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  Trophy,
  Volume2,
  VolumeX,
  AlertCircle,
} from 'lucide-react';
import type { StageCoachResult, Technique } from '../types';
import { captureVideoFrame } from '../utils/image';
import { playSuccessChime, speakTurkish, stopSpeaking } from '../utils/feedbackAudio';

interface LiveDrillArenaProps {
  technique: Technique;
  onRepCompleted: (earnedXp: number) => void;
  onStagePassed: (earnedXp: number) => void;
}

export function LiveDrillArena({
  technique,
  onRepCompleted,
  onStagePassed,
}: LiveDrillArenaProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const inFlightRef = useRef(false);
  const advanceTimeoutRef = useRef<number | null>(null);

  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const [currentStageIdx, setCurrentStageIdx] = useState(0);
  const [passedStages, setPassedStages] = useState<boolean[]>(() =>
    technique.steps.map(() => false)
  );
  const [repCompleted, setRepCompleted] = useState(false);
  const [sessionXp, setSessionXp] = useState(0);

  const [autoCoach, setAutoCoach] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [coachResult, setCoachResult] = useState<StageCoachResult | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const steps = technique.steps;
  const activeStep = steps[currentStageIdx] ?? steps[0];

  // Reset stages when technique changes
  useEffect(() => {
    setCurrentStageIdx(0);
    setPassedStages(technique.steps.map(() => false));
    setRepCompleted(false);
    setCoachResult(null);
    setApiError(null);
    if (advanceTimeoutRef.current) {
      window.clearTimeout(advanceTimeoutRef.current);
      advanceTimeoutRef.current = null;
    }
  }, [technique]);

  // Manage live camera stream
  const startCamera = useCallback(async (mode: 'environment' | 'user') => {
    setCameraError(null);
    setCameraReady(false);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Tarayıcınız canlı kamera erişimini desteklemiyor.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraReady(true);
    } catch {
      setCameraError(
        'Kamera erişimi reddedildi veya kamera bulunamadı. Lütfen tarayıcı izinlerinden kameraya izin verip tekrar deneyin.'
      );
    }
  }, []);

  useEffect(() => {
    void startCamera(facingMode);
    return () => {
      stopSpeaking();
      if (advanceTimeoutRef.current) {
        window.clearTimeout(advanceTimeoutRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [facingMode, startCamera]);

  const evaluateFrame = useCallback(async () => {
    if (!videoRef.current || !cameraReady || inFlightRef.current || repCompleted || !activeStep) {
      return;
    }

    const frame = captureVideoFrame(videoRef.current, 768, 0.78);
    if (!frame) return;

    inFlightRef.current = true;
    setEvaluating(true);
    setApiError(null);

    try {
      const res = await fetch('/api/coach-stage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: frame.base64,
          mimeType: frame.mimeType,
          techniqueName: technique.name,
          stageNumber: activeStep.number,
          stageTitle: activeStep.title,
          stageCue: activeStep.visualCue,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Canlı değerlendirme başarısız.');
      }

      const result = data as StageCoachResult;
      setCoachResult(result);

      if (result.passed) {
        const isLastStage = currentStageIdx >= steps.length - 1;
        playSuccessChime(isLastStage);
        speakTurkish(
          isLastStage
            ? `Harika! ${technique.name} tekrarını tamamladın.`
            : `${result.feedback}`,
          voiceEnabled
        );

        setPassedStages((prev) => {
          const next = [...prev];
          next[currentStageIdx] = true;
          return next;
        });

        const stageXp = 20;
        setSessionXp((x) => x + stageXp + (isLastStage ? 50 : 0));
        onStagePassed(stageXp);

        if (advanceTimeoutRef.current) {
          window.clearTimeout(advanceTimeoutRef.current);
        }

        advanceTimeoutRef.current = window.setTimeout(() => {
          if (isLastStage) {
            setRepCompleted(true);
            onRepCompleted(50);
          } else {
            setCurrentStageIdx((idx) => Math.min(idx + 1, steps.length - 1));
            setCoachResult(null);
          }
        }, 1400);
      } else {
        speakTurkish(result.feedback, voiceEnabled);
      }
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Bağlantı hatası.');
    } finally {
      inFlightRef.current = false;
      setEvaluating(false);
    }
  }, [
    activeStep,
    cameraReady,
    currentStageIdx,
    onRepCompleted,
    onStagePassed,
    repCompleted,
    steps.length,
    technique.name,
    voiceEnabled,
  ]);

  // Automatic Duolingo-style live loop every 3.8s
  useEffect(() => {
    if (!autoCoach || !cameraReady || repCompleted) return;

    const timer = window.setInterval(() => {
      void evaluateFrame();
    }, 3800);

    return () => window.clearInterval(timer);
  }, [autoCoach, cameraReady, evaluateFrame, repCompleted]);

  function handleRestartDrill() {
    if (advanceTimeoutRef.current) {
      window.clearTimeout(advanceTimeoutRef.current);
      advanceTimeoutRef.current = null;
    }
    setCurrentStageIdx(0);
    setPassedStages(steps.map(() => false));
    setRepCompleted(false);
    setCoachResult(null);
    setApiError(null);
  }

  function handleJumpStage(idx: number) {
    if (advanceTimeoutRef.current) {
      window.clearTimeout(advanceTimeoutRef.current);
      advanceTimeoutRef.current = null;
    }
    setRepCompleted(false);
    setCurrentStageIdx(idx);
    setCoachResult(null);
    setApiError(null);
  }

  const completedCount = passedStages.filter(Boolean).length;

  return (
    <div className="space-y-5">
      {/* Duolingo-style Stage Progress Strip */}
      <div className="rounded-2xl bg-[#0D382B]/90 border border-white/[0.08] p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3.5">
          <div>
            <h2 className="text-lg font-semibold text-white">
              {technique.name} <span className="text-emerald-100/60 font-normal">·</span> Kas Hafızası Antrenmanı
            </h2>
            <p className="text-xs text-emerald-100/75 mt-0.5">
              Her aşamayı kameraya göstererek sırayla geç; kas hafızan pekişsin.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono-num">
            <span className="text-zinc-300">
              Aşama {Math.min(currentStageIdx + 1, steps.length)}/{steps.length}
            </span>
            <span className="text-zinc-600" aria-hidden="true">·</span>
            <span className="text-fuchsia-300 font-semibold">+{sessionXp} XP</span>
          </div>
        </div>

        {/* 5 Segmented Progress Bars */}
        <div className="grid grid-cols-5 gap-2" role="tablist" aria-label="Antrenman aşamaları">
          {steps.map((step, idx) => {
            const passed = passedStages[idx];
            const isCurrent = idx === currentStageIdx && !repCompleted;
            return (
              <button
                key={step.number}
                type="button"
                role="tab"
                aria-selected={isCurrent}
                onClick={() => handleJumpStage(idx)}
                className="group flex flex-col gap-1.5 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400 rounded-lg py-1"
              >
                <div
                  className={`h-2.5 w-full rounded-full transition-colors ${
                    passed
                      ? 'bg-emerald-500'
                      : isCurrent
                        ? 'bg-fuchsia-400'
                        : 'bg-white/[0.08] group-hover:bg-white/[0.16]'
                  }`}
                />
                <span
                  className={`text-[11px] font-medium truncate ${
                    passed
                      ? 'text-emerald-400'
                      : isCurrent
                        ? 'text-fuchsia-200'
                        : 'text-emerald-100/60'
                  }`}
                >
                  {step.number}. {step.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main 2-Column Live Stage & Coach Deck */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left/Top: Live Camera Feed */}
        <div className="lg:col-span-7 rounded-2xl bg-[#0D382B]/90 border border-white/[0.08] overflow-hidden flex flex-col">
          <div className="relative aspect-[4/3] sm:aspect-video bg-[#061F17] w-full flex-1">
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className={`w-full h-full object-cover ${
                facingMode === 'user' ? 'scale-x-[-1]' : ''
              }`}
            />

            {/* Subtle Hand & Deck Framing Reticle */}
            {cameraReady && !repCompleted && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
                <div
                  className={`w-full max-w-[280px] aspect-[4/3] rounded-2xl border transition-colors duration-200 ${
                    coachResult?.passed
                      ? 'border-emerald-400/80 shadow-[0_0_0_1px_rgba(16,185,129,0.3)]'
                      : 'border-white/25'
                  }`}
                >
                  <div className="w-full h-full flex items-end justify-center pb-2.5">
                    <span className="text-[11px] font-medium text-white/80 bg-black/55 px-2.5 py-1 rounded-md backdrop-blur-sm">
                      Elini ve desteyi bu çerçevede tut
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Top Camera Overlay Controls */}
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
              <div className="inline-flex items-center gap-2 bg-black/65 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
                <span className="text-xs font-medium text-zinc-200">
                  {evaluating
                    ? 'Kontrol ediliyor...'
                    : autoCoach && cameraReady && !repCompleted
                      ? 'Canlı Koç Açık'
                      : cameraReady
                        ? 'Kamera Hazır'
                        : 'Kamera Başlatılıyor'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const next = !voiceEnabled;
                    setVoiceEnabled(next);
                    if (!next) stopSpeaking();
                  }}
                  className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-lg bg-black/65 hover:bg-black/80 text-zinc-200 border border-white/10 backdrop-blur-md transition-colors cursor-pointer"
                  aria-label={voiceEnabled ? 'Sesli koçu kapat' : 'Sesli koçu aç'}
                  title={voiceEnabled ? 'Sesli koç açık' : 'Sesli koç kapalı'}
                >
                  {voiceEnabled ? <Volume2 className="w-4 h-4 text-fuchsia-300" /> : <VolumeX className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => setFacingMode((m) => (m === 'environment' ? 'user' : 'environment'))}
                  className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-lg bg-black/65 hover:bg-black/80 text-zinc-200 border border-white/10 backdrop-blur-md transition-colors cursor-pointer"
                  aria-label="Kamerayı çevir"
                  title="Ön/Arka kamera değiştir"
                >
                  <FlipHorizontal2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Camera Error Overlay */}
            {cameraError && (
              <div className="absolute inset-0 bg-[#061F17]/95 flex flex-col items-center justify-center text-center p-6 gap-4">
                <Camera className="w-9 h-9 text-emerald-100/75" />
                <p className="text-sm text-zinc-200 max-w-sm leading-relaxed">{cameraError}</p>
                <button
                  type="button"
                  onClick={() => void startCamera(facingMode)}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl bg-fuchsia-400 hover:bg-fuchsia-300 text-zinc-950 font-semibold text-sm transition-colors cursor-pointer"
                >
                  Kamerayı Tekrar Dene
                </button>
              </div>
            )}

            {/* Full Repetition Complete Celebration Overlay */}
            {repCompleted && (
              <div className="absolute inset-0 bg-[#061F17]/88 backdrop-blur-md flex flex-col items-center justify-center text-center p-6 gap-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Trophy className="w-7 h-7" />
                </div>
                <div className="space-y-1 max-w-sm">
                  <h3 className="text-xl font-bold text-white">1 Tam Tekrar Tamamlandı</h3>
                  <p className="text-sm text-zinc-300">
                    {technique.name} tekniğinin tüm {steps.length} aşamasını başarıyla geçtin.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRestartDrill}
                  className="min-h-[48px] px-6 py-3 rounded-xl bg-fuchsia-400 hover:bg-fuchsia-300 text-zinc-950 font-semibold text-sm inline-flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Yeni Tekrar Başlat</span>
                </button>
              </div>
            )}
          </div>

          {/* Bottom Camera Action Bar */}
          <div className="p-3.5 bg-[#0D382B]/90 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-2.5">
            <button
              type="button"
              onClick={() => setAutoCoach((a) => !a)}
              disabled={!cameraReady || repCompleted}
              className={`min-h-[44px] px-4 py-2 rounded-xl text-sm font-medium border inline-flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50 ${
                autoCoach
                  ? 'bg-[#124938] border-fuchsia-400/40 text-fuchsia-200'
                  : 'bg-[#124938] border-white/[0.08] text-zinc-300'
              }`}
            >
              {autoCoach ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{autoCoach ? 'Otomatik Koç: Açık' : 'Otomatik Koç: Duraklatıldı'}</span>
            </button>

            <button
              type="button"
              onClick={() => void evaluateFrame()}
              disabled={!cameraReady || evaluating || repCompleted}
              className="flex-1 sm:flex-initial min-h-[44px] px-5 py-2 rounded-xl bg-fuchsia-400 hover:bg-fuchsia-300 disabled:opacity-50 text-zinc-950 font-semibold text-sm inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap cursor-pointer"
            >
              {evaluating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Kontrol Ediliyor</span>
                </>
              ) : (
                <>
                  <span>Şimdi Kontrol Et</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right/Bottom: Active Stage Coaching Card */}
        <div className="lg:col-span-5 rounded-2xl bg-[#0D382B]/90 border border-white/[0.08] p-5 flex flex-col justify-between gap-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-fuchsia-300 font-mono-num">
                Aşama {activeStep.number} / {steps.length}
              </span>
              <span className="text-xs text-emerald-100/60 font-mono-num">
                Tamamlanan: {completedCount}/{steps.length}
              </span>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-white">{activeStep.title}</h3>
              <p className="mt-2 text-sm text-zinc-300 leading-relaxed">{activeStep.detail}</p>
            </div>

            <div className="rounded-xl bg-[#07231A] border border-white/[0.07] p-3.5 space-y-1">
              <span className="text-xs font-medium text-emerald-100/75">Kamerada Hedef Duruş</span>
              <p className="text-sm text-zinc-100 leading-relaxed">{activeStep.visualCue}</p>
            </div>

            {/* Real-time Gemini Stage Feedback */}
            {apiError && (
              <div
                role="alert"
                className="rounded-xl bg-red-500/10 border border-red-500/25 p-3.5 flex items-start gap-2.5 text-sm text-red-200"
              >
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{apiError}</span>
              </div>
            )}

            {coachResult && (
              <div
                className={`rounded-xl border p-4 space-y-1.5 transition-colors ${
                  coachResult.passed
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : 'bg-fuchsia-400/10 border-fuchsia-400/25'
                }`}
              >
                <div className="flex items-center gap-2">
                  {coachResult.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-fuchsia-300 shrink-0" />
                  )}
                  <span
                    className={`text-xs font-semibold ${
                      coachResult.passed ? 'text-emerald-300' : 'text-fuchsia-200'
                    }`}
                  >
                    {coachResult.statusLabel}
                  </span>
                </div>
                <p className="text-sm font-medium text-white leading-snug">{coachResult.feedback}</p>
                <p className="text-xs text-zinc-300">{coachResult.tip}</p>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => handleJumpStage(Math.max(0, currentStageIdx - 1))}
              disabled={currentStageIdx === 0}
              className="min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/[0.06] disabled:opacity-35 transition-colors cursor-pointer"
            >
              Önceki Aşama
            </button>
            <button
              type="button"
              onClick={() => {
                if (currentStageIdx < steps.length - 1) {
                  handleJumpStage(currentStageIdx + 1);
                } else {
                  handleRestartDrill();
                }
              }}
              className="min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              {currentStageIdx < steps.length - 1 ? 'Sonraki Aşamaya Geç' : 'Başa Dön'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
