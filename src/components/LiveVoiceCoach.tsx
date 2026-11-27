import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Loader2, Mic, MicOff, PhoneOff, Volume2, AlertCircle } from 'lucide-react';
import { captureVideoFrame } from '../utils/image';

interface LiveVoiceCoachProps {
  activeTechniqueName: string;
}

interface TranscriptEntry {
  id: string;
  speaker: 'user' | 'coach';
  text: string;
}

function float32ToPcmBase64(float32: Float32Array): string {
  const buffer = new ArrayBuffer(float32.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < float32.length; i++) {
    const clamped = Math.max(-1, Math.min(1, float32[i]));
    view.setInt16(i * 2, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
  }
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function pcmBase64ToFloat32(base64: string): Float32Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const sampleCount = Math.floor(bytes.byteLength / 2);
  const view = new DataView(bytes.buffer);
  const float32 = new Float32Array(sampleCount);
  for (let i = 0; i < sampleCount; i++) {
    float32[i] = view.getInt16(i * 2, true) / 32768;
  }
  return float32;
}

export function LiveVoiceCoach({ activeTechniqueName }: LiveVoiceCoachProps) {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected'>('idle');
  const [muted, setMuted] = useState(false);
  const [shareCamera, setShareCamera] = useState(false);
  const [coachSpeaking, setCoachSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const inputCtxRef = useRef<AudioContext | null>(null);
  const outputCtxRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const mutedRef = useRef(false);
  const nextStartTimeRef = useRef(0);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const camStreamRef = useRef<MediaStream | null>(null);
  const videoIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  const stopPlaybackQueue = useCallback(() => {
    for (const src of activeSourcesRef.current) {
      try {
        src.stop();
      } catch {
        // Ignore already stopped sources
      }
    }
    activeSourcesRef.current = [];
    if (outputCtxRef.current) {
      nextStartTimeRef.current = outputCtxRef.current.currentTime;
    } else {
      nextStartTimeRef.current = 0;
    }
    setCoachSpeaking(false);
  }, []);

  const playOutputAudioChunk = useCallback((base64Pcm: string) => {
    const outCtx = outputCtxRef.current;
    if (!outCtx) return;

    if (outCtx.state === 'suspended') {
      void outCtx.resume();
    }

    const samples = pcmBase64ToFloat32(base64Pcm);
    if (samples.length === 0) return;

    const audioBuffer = outCtx.createBuffer(1, samples.length, 24000);
    audioBuffer.getChannelData(0).set(samples);

    const source = outCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(outCtx.destination);

    const now = outCtx.currentTime;
    const startAt = Math.max(now, nextStartTimeRef.current);
    source.start(startAt);
    nextStartTimeRef.current = startAt + audioBuffer.duration;

    activeSourcesRef.current.push(source);
    setCoachSpeaking(true);

    source.onended = () => {
      activeSourcesRef.current = activeSourcesRef.current.filter((s) => s !== source);
      if (activeSourcesRef.current.length === 0) {
        setCoachSpeaking(false);
      }
    };
  }, []);

  const stopSession = useCallback(() => {
    if (videoIntervalRef.current) {
      window.clearInterval(videoIntervalRef.current);
      videoIntervalRef.current = null;
    }
    if (camStreamRef.current) {
      camStreamRef.current.getTracks().forEach((t) => t.stop());
      camStreamRef.current = null;
    }
    setShareCamera(false);

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current.onaudioprocess = null;
      processorRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    if (inputCtxRef.current) {
      void inputCtxRef.current.close();
      inputCtxRef.current = null;
    }
    stopPlaybackQueue();
    if (outputCtxRef.current) {
      void outputCtxRef.current.close();
      outputCtxRef.current = null;
    }
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {
        // Ignore
      }
      wsRef.current = null;
    }
    setStatus('idle');
  }, [stopPlaybackQueue]);

  useEffect(() => {
    return () => {
      stopSession();
    };
  }, [stopSession]);

  // Optional 1 FPS camera streaming alongside voice
  useEffect(() => {
    if (!shareCamera || status !== 'connected') {
      if (videoIntervalRef.current) {
        window.clearInterval(videoIntervalRef.current);
        videoIntervalRef.current = null;
      }
      if (camStreamRef.current) {
        camStreamRef.current.getTracks().forEach((t) => t.stop());
        camStreamRef.current = null;
      }
      return;
    }

    let cancelled = false;
    async function startCam() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        camStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        videoIntervalRef.current = window.setInterval(() => {
          if (!videoRef.current || wsRef.current?.readyState !== WebSocket.OPEN) return;
          const frame = captureVideoFrame(videoRef.current, 640, 0.72);
          if (frame) {
            wsRef.current.send(JSON.stringify({ video: frame.base64 }));
          }
        }, 1000);
      } catch {
        setShareCamera(false);
        setError('Sesli koç için kamera başlatılamadı.');
      }
    }

    void startCam();

    return () => {
      cancelled = true;
    };
  }, [shareCamera, status]);

  function appendTranscript(speaker: 'user' | 'coach', chunk: string) {
    const clean = chunk;
    if (!clean) return;
    setTranscripts((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.speaker === speaker) {
        return [...prev.slice(0, -1), { ...last, text: last.text + clean }];
      }
      return [...prev, { id: `t_${Date.now()}_${Math.random()}`, speaker, text: clean }];
    });
  }

  async function startSession() {
    if (status !== 'idle') return;
    setError(null);
    setStatus('connecting');
    setTranscripts([]);

    try {
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      micStreamRef.current = micStream;

      const inputCtx = new AudioContext({ sampleRate: 16000 });
      const outputCtx = new AudioContext({ sampleRate: 24000 });
      inputCtxRef.current = inputCtx;
      outputCtxRef.current = outputCtx;
      nextStartTimeRef.current = outputCtx.currentTime;

      const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const wsUrl = `${proto}://${window.location.host}/api/live-voice?technique=${encodeURIComponent(
        activeTechniqueName
      )}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as {
            ready?: boolean;
            audio?: string;
            interrupted?: boolean;
            inputTranscript?: string;
            outputTranscript?: string;
            error?: string;
          };

          if (msg.ready) {
            setStatus('connected');
          }
          if (msg.error) {
            setError(msg.error);
            stopSession();
            return;
          }
          if (msg.interrupted) {
            stopPlaybackQueue();
          }
          if (msg.audio) {
            playOutputAudioChunk(msg.audio);
          }
          if (msg.inputTranscript) {
            appendTranscript('user', msg.inputTranscript);
          }
          if (msg.outputTranscript) {
            appendTranscript('coach', msg.outputTranscript);
          }
        } catch {
          // Ignore parse issues
        }
      };

      ws.onerror = () => {
        setError('Canlı ses bağlantısı kurulamadı.');
        stopSession();
      };

      ws.onclose = () => {
        stopSession();
      };

      const source = inputCtx.createMediaStreamSource(micStream);
      const processor = inputCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      source.connect(processor);
      processor.connect(inputCtx.destination);

      processor.onaudioprocess = (e) => {
        if (mutedRef.current || wsRef.current?.readyState !== WebSocket.OPEN) return;
        const pcmBase64 = float32ToPcmBase64(e.inputBuffer.getChannelData(0));
        wsRef.current.send(JSON.stringify({ audio: pcmBase64 }));
      };
    } catch {
      setError('Mikrofon izni verilmedi veya cihaz mikrofonu başlatılamadı.');
      stopSession();
    }
  }

  return (
    <section
      aria-labelledby="voice-coach-heading"
      className="rounded-2xl bg-[#0D382B]/90 border border-white/[0.08] p-5 sm:p-6 flex flex-col gap-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="voice-coach-heading" className="text-base sm:text-lg font-semibold text-white">
            Canlı Sesli Koçluk (Eller Serbest)
          </h2>
          <p className="text-xs text-emerald-100/75 mt-0.5">
            Desteyi elinde tutarken konuş; Gemini Live gerçek zamanlı sesli geri bildirim versin.
          </p>
        </div>
        <span className="font-mono-num text-xs text-emerald-100/75">
          {status === 'connected'
            ? coachSpeaking
              ? 'Koç Konuşuyor'
              : 'Dinleniyor'
            : status === 'connecting'
              ? 'Bağlanıyor'
              : 'Hazır'}
        </span>
      </div>

      {/* Optional Camera Preview when shared */}
      {shareCamera && (
        <div className="rounded-xl overflow-hidden bg-[#061F17] border border-white/[0.08] aspect-video max-h-56">
          <video ref={videoRef} playsInline muted autoPlay className="w-full h-full object-cover" />
        </div>
      )}

      {/* Voice Controls */}
      <div className="rounded-xl bg-[#07231A] border border-white/[0.07] p-5 flex flex-col items-center text-center gap-4">
        <div
          className={`w-16 h-16 rounded-2xl border flex items-center justify-center transition-colors ${
            status === 'connected'
              ? coachSpeaking
                ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-400'
                : 'bg-fuchsia-400/15 border-fuchsia-400/35 text-fuchsia-300'
              : 'bg-[#124938] border-white/[0.08] text-emerald-100/75'
          }`}
        >
          {status === 'connecting' ? (
            <Loader2 className="w-7 h-7 animate-spin text-fuchsia-300" />
          ) : coachSpeaking ? (
            <Volume2 className="w-7 h-7" />
          ) : (
            <Mic className="w-7 h-7" />
          )}
        </div>

        <div className="space-y-1 max-w-sm">
          <p className="text-sm font-medium text-white">
            {status === 'idle'
              ? `${activeTechniqueName} için sesli oturum başlat`
              : status === 'connecting'
                ? 'Canlı ses bağlantısı kuruluyor...'
                : 'Bağlantı açık — istediğin zaman konuşabilirsin'}
          </p>
          <p className="text-xs text-emerald-100/75">
            Örn: “Serçe parmağım kartı kaçırıyor, ne kadar bastırmalıyım?”
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2.5 w-full">
          {status === 'idle' ? (
            <button
              type="button"
              onClick={() => void startSession()}
              className="min-h-[48px] px-6 py-3 rounded-xl bg-fuchsia-400 hover:bg-fuchsia-300 text-zinc-950 font-semibold text-sm inline-flex items-center gap-2 cursor-pointer"
            >
              <Mic className="w-4 h-4" />
              <span>Sesli Konuşmayı Başlat</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setMuted((m) => !m)}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-[#124938] hover:bg-[#175945] text-xs font-medium text-zinc-100 border border-white/[0.08] inline-flex items-center gap-1.5 cursor-pointer"
              >
                {muted ? <MicOff className="w-4 h-4 text-red-400" /> : <Mic className="w-4 h-4 text-fuchsia-300" />}
                <span>{muted ? 'Mikrofon Kapalı' : 'Mikrofon Açık'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShareCamera((c) => !c)}
                disabled={status !== 'connected'}
                className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-medium border inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-45 ${
                  shareCamera
                    ? 'bg-fuchsia-400/15 border-fuchsia-400/35 text-fuchsia-200'
                    : 'bg-[#124938] border-white/[0.08] text-zinc-200 hover:bg-[#175945]'
                }`}
              >
                <Camera className="w-4 h-4" />
                <span>{shareCamera ? 'Kamerayı Kapat' : 'Kamerayı da Göster'}</span>
              </button>

              <button
                type="button"
                onClick={stopSession}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-xs font-semibold text-red-300 border border-red-500/30 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <PhoneOff className="w-4 h-4" />
                <span>Bitir</span>
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-xl bg-red-500/10 border border-red-500/25 p-3.5 text-xs text-red-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Live Transcription History */}
      {transcripts.length > 0 && (
        <div className="border-t border-white/[0.08] pt-4 space-y-2.5 max-h-56 overflow-y-auto">
          <h3 className="text-xs font-semibold text-emerald-100/75">Canlı Konuşma Dökümü</h3>
          {transcripts.map((entry) => (
            <div key={entry.id} className="text-sm leading-relaxed">
              <span
                className={`font-semibold mr-2 ${
                  entry.speaker === 'user' ? 'text-fuchsia-300' : 'text-emerald-400'
                }`}
              >
                {entry.speaker === 'user' ? 'Sen:' : 'Koç:'}
              </span>
              <span className="text-zinc-200">{entry.text}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
