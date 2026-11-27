import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Loader2, RotateCcw, Send, AlertCircle } from 'lucide-react';
import type { ChatMessage } from '../types';

interface MagicChatbotProps {
  activeTechniqueName: string;
}

const STARTER_PROMPTS = [
  'Double Lift yaparken iki kartın kenardan ayrılmasını nasıl önlerim?',
  'Pinky Break açısını seyirciye nasıl tamamen gizlerim?',
  'Günde 10 dakikalık kas hafızası antrenmanı planı hazırla.',
];

export function MagicChatbot({ activeTechniqueName }: MagicChatbotProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: `Merhaba! Ben yakın çekim kart sihirbazlığı mentorun. Şu an "${activeTechniqueName}" üzerinde çalışıyorsun; parmak tutuşu, açı gizleme veya tempo hakkında istediğin her şeyi sorabilirsin.`,
    },
  ]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage(textToSend: string) {
    const trimmed = textToSend.trim();
    if (!trimmed || streaming) return;

    setError(null);
    const userMsg: ChatMessage = { id: `u_${Date.now()}`, role: 'user', text: trimmed };
    const assistantId = `m_${Date.now() + 1}`;
    const historySnapshot = messages.map(({ role, text }) => ({ role, text }));

    setMessages((prev) => [...prev, userMsg, { id: assistantId, role: 'model', text: '' }]);
    setInput('');
    setStreaming(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          history: historySnapshot,
          message: trimmed,
          activeTechnique: activeTechniqueName,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Sohbet yanıtı alınamadı.');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Akış okunamadı.');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;
          const payload = JSON.parse(jsonStr) as { text?: string; error?: string };
          if (payload.error) {
            throw new Error(payload.error);
          }
          if (payload.text) {
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, text: m.text + payload.text } : m))
            );
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sohbet hatası oluştu.');
      setMessages((prev) => prev.filter((m) => m.id !== assistantId || m.text.length > 0));
    } finally {
      setStreaming(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void sendMessage(input);
  }

  function handleResetChat() {
    if (streaming) return;
    setError(null);
    setMessages([
      {
        id: `welcome_${Date.now()}`,
        role: 'model',
        text: `Yeni sohbet başlatıldı. "${activeTechniqueName}" tekniği veya başka bir kart hareketi hakkında ne sormak istersin?`,
      },
    ]);
  }

  return (
    <section
      aria-labelledby="chatbot-heading"
      className="rounded-2xl bg-[#0D382B]/90 border border-white/[0.08] flex flex-col h-[540px] sm:h-[580px] overflow-hidden"
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between gap-3">
        <div>
          <h2 id="chatbot-heading" className="text-base sm:text-lg font-semibold text-white">
            Kart Sihirbazlığı Mentoru
          </h2>
          <p className="text-xs text-emerald-100/75">
            Odak: {activeTechniqueName} <span aria-hidden="true">·</span> Çok turlu Gemini sohbeti
          </p>
        </div>
        <button
          type="button"
          onClick={handleResetChat}
          disabled={streaming}
          className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-xl text-emerald-100/75 hover:text-white hover:bg-white/[0.06] disabled:opacity-40 cursor-pointer"
          aria-label="Sohbeti sıfırla"
          title="Yeni sohbet"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable Message Thread */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  isUser
                    ? 'bg-fuchsia-400 text-zinc-950 font-medium'
                    : 'bg-[#07231A] border border-white/[0.08] text-zinc-100'
                }`}
              >
                {msg.text || (
                  <span className="inline-flex items-center gap-2 text-emerald-100/75">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Yanıt yazılıyor...</span>
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {messages.length === 1 && (
          <div className="pt-2 space-y-2">
            <p className="text-xs text-emerald-100/60">Hızlı Başlangıç Soruları:</p>
            <div className="flex flex-col gap-2">
              {STARTER_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => void sendMessage(prompt)}
                  className="text-left min-h-[40px] px-3.5 py-2 rounded-xl bg-[#07231A] hover:bg-[#124938] border border-white/[0.08] text-xs text-zinc-300 transition-colors cursor-pointer"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={scrollEndRef} />
      </div>

      {error && (
        <div role="alert" className="mx-4 mb-2 rounded-xl bg-red-500/10 border border-red-500/25 px-3.5 py-2 text-xs text-red-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Input Composer */}
      <form
        onSubmit={handleSubmit}
        className="p-3.5 border-t border-white/[0.08] bg-[#07231A] flex items-center gap-2"
      >
        <label htmlFor="chat-input" className="sr-only">
          Sihirbazlık koçuna soru sor
        </label>
        <input
          id="chat-input"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Tutuş, açı veya rutin hakkında soru sor..."
          disabled={streaming}
          className="flex-1 min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0D382B]/90 border border-white/[0.08] text-sm text-white placeholder:text-emerald-100/60 focus:outline-none focus:border-fuchsia-400/70"
        />
        <button
          type="submit"
          disabled={streaming || !input.trim()}
          className="min-h-[44px] min-w-[44px] px-4 py-2 rounded-xl bg-fuchsia-400 hover:bg-fuchsia-300 disabled:opacity-45 text-zinc-950 font-semibold text-xs inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
        >
          {streaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          <span className="hidden sm:inline">Gönder</span>
        </button>
      </form>
    </section>
  );
}
