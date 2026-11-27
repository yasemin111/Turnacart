import { useRef, useState } from 'react';
import { Camera, Upload, CheckCircle2, AlertTriangle, RotateCcw, Loader2 } from 'lucide-react';
import type { PhotoFeedback } from '../types';
import { resizeImageToBase64 } from '../utils/image';

interface PhotoCoachPanelProps {
  techniqueName: string;
  onPhotoAnalyzed: (isSuccess: boolean) => void;
}

export function PhotoCoachPanel({ techniqueName, onPhotoAnalyzed }: PhotoCoachPanelProps) {
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<PhotoFeedback | null>(null);

  async function handleFileSelected(file: File | undefined) {
    if (!file) return;
    setError(null);
    setFeedback(null);
    setLoading(true);

    try {
      const { base64, mimeType, previewUrl: resizedPreview } = await resizeImageToBase64(file, 1024, 0.85);
      setPreviewUrl(resizedPreview);

      const response = await fetch('/api/analyze-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64,
          mimeType,
          techniqueName,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Fotoğraf analiz edilemedi.');
      }

      const result = data as PhotoFeedback;
      setFeedback(result);
      onPhotoAnalyzed(result.durum === 'Başarılı');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Beklenmeyen bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setPreviewUrl(null);
    setFeedback(null);
    setError(null);
    if (uploadInputRef.current) uploadInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  }

  const isSuccess = feedback?.durum === 'Başarılı';

  return (
    <section
      aria-labelledby="photo-coach-heading"
      className="rounded-2xl bg-[#0D382B]/90 border border-emerald-200/[0.15] p-5 sm:p-6 flex flex-col gap-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="photo-coach-heading" className="text-lg sm:text-xl font-semibold text-white">
            El ve Kart Analizi
          </h2>
          <p className="mt-1 text-sm text-emerald-100/75">
            {techniqueName} uygularken elini fotoğrafla; AI parmak konumunu ve iki kartın hizasını kontrol etsin.
          </p>
        </div>
        {previewUrl && (
          <button
            type="button"
            onClick={handleReset}
            className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl text-emerald-100/75 hover:text-white hover:bg-white/[0.06] transition-colors shrink-0"
            aria-label="Fotoğrafı temizle"
            title="Yeni fotoğraf"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Hidden inputs for gallery upload and direct mobile camera capture */}
      <input
        ref={uploadInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          void handleFileSelected(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          void handleFileSelected(e.target.files?.[0]);
          e.target.value = '';
        }}
      />

      {/* Primary Action Area */}
      {!previewUrl ? (
        <div className="rounded-xl border border-dashed border-white/[0.14] bg-[#07231A] p-6 flex flex-col items-center text-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-fuchsia-400/10 border border-fuchsia-400/25 flex items-center justify-center text-fuchsia-300">
            <Camera className="w-6 h-6" />
          </div>
          <div className="space-y-1 max-w-xs">
            <p className="text-sm font-medium text-zinc-200">
              Kartların kenarı ve parmak uçların net görünsün
            </p>
            <p className="text-xs text-emerald-100/65">
              Yandan veya 45° üst açıdan çekilen fotoğraflar en doğru sonucu verir.
            </p>
          </div>
          <div className="w-full flex flex-col sm:flex-row gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => uploadInputRef.current?.click()}
              className="flex-1 min-h-[48px] px-5 py-3 rounded-xl bg-fuchsia-400 hover:bg-fuchsia-300 active:scale-[0.99] text-zinc-950 font-semibold text-sm inline-flex items-center justify-center gap-2 transition-all whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Upload className="w-4 h-4 shrink-0" />
              <span>Fotoğraf Çek / Yükle</span>
            </button>
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="sm:w-auto min-h-[48px] px-4 py-3 rounded-xl bg-[#124938] hover:bg-[#175945] text-zinc-200 font-medium text-sm border border-emerald-200/[0.15] inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Camera className="w-4 h-4 shrink-0" />
              <span>Kamerayı Aç</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative rounded-xl overflow-hidden bg-[#07231A] border border-emerald-200/[0.15] aspect-[4/3]">
            <img
              src={previewUrl}
              alt={`${techniqueName} için yüklenen el ve kart fotoğrafı`}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            {loading && (
              <div className="absolute inset-0 bg-[#061F17]/85 backdrop-blur-sm flex flex-col items-center justify-center gap-3 p-4 text-center">
                <Loader2 className="w-7 h-7 text-fuchsia-300 animate-spin" />
                <div>
                  <p className="text-sm font-semibold text-white">Parmaklar ve kart hizası inceleniyor</p>
                  <p className="text-xs text-emerald-100/75 mt-0.5">Yapay zeka koçunuz formu değerlendiriyor...</p>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => uploadInputRef.current?.click()}
            disabled={loading}
            className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-[#124938] hover:bg-[#175945] disabled:opacity-50 text-zinc-100 font-medium text-sm border border-emerald-200/[0.15] inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap cursor-pointer"
          >
            <Camera className="w-4 h-4 shrink-0" />
            <span>Başka Fotoğraf Çek / Yükle</span>
          </button>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div
          role="alert"
          className="rounded-xl bg-red-500/10 border border-red-500/25 p-4 flex items-start gap-3"
        >
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="text-sm text-red-200">{error}</div>
        </div>
      )}

      {/* 5-Heading Structured Gemini Feedback */}
      {feedback && !loading && (
        <div className="divide-y divide-white/[0.08] border-t border-emerald-200/[0.15] pt-1">
          {/* 1) Durum */}
          <div className="py-3.5 flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-emerald-100/75">1) Durum</span>
            <span
              className={`inline-flex items-center gap-1.5 text-sm font-semibold ${
                isSuccess ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {isSuccess ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0" />
              )}
              <span>{feedback.durum}</span>
            </span>
          </div>

          {/* 2) Tespit Edilen Hata */}
          <div className="py-3.5 space-y-1">
            <h3 className="text-xs font-semibold text-emerald-100/75">2) Tespit Edilen Hata</h3>
            <p className="text-sm text-zinc-100 leading-relaxed">{feedback.tespitEdilenHata}</p>
          </div>

          {/* 3) Nasıl Düzeltilir? */}
          <div className="py-3.5 space-y-1">
            <h3 className="text-xs font-semibold text-fuchsia-300">3) Nasıl Düzeltilir?</h3>
            <p className="text-sm text-zinc-100 leading-relaxed">{feedback.nasilDuzeltilir}</p>
          </div>

          {/* 4) Parmak Pozisyonları */}
          <div className="py-3.5 space-y-1">
            <h3 className="text-xs font-semibold text-emerald-100/75">4) Parmak Pozisyonu</h3>
            <p className="text-sm text-zinc-200 leading-relaxed">{feedback.parmakPozisyonu}</p>
          </div>

          {/* 5) İki Kartın Hizası */}
          <div className="pt-3.5 space-y-1">
            <h3 className="text-xs font-semibold text-emerald-100/75">5) İki Kartın Hizası</h3>
            <p className="text-sm text-zinc-200 leading-relaxed">{feedback.kartHizasi}</p>
          </div>
        </div>
      )}
    </section>
  );
}
