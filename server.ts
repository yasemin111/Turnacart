import 'dotenv/config';
import http from 'node:http';
import express, { type Request, type Response } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { WebSocketServer, type WebSocket } from 'ws';
import {
  GoogleGenAI,
  Type,
  ThinkingLevel,
  Modality,
  type LiveServerMessage,
} from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY tanımlı değil. Lütfen Settings > Secrets bölümünden API anahtarını kontrol edin.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function parseBase64Image(rawData: string, mimeType: string): { data: string; mimeType: string } | null {
  if (!rawData || typeof rawData !== 'string') return null;
  const cleaned = rawData.includes(',') ? rawData.split(',')[1] : rawData;
  if (!cleaned || cleaned.length > 10 * 1024 * 1024) return null;
  const safeMime = ALLOWED_MIME_TYPES.has(mimeType) ? mimeType : 'image/jpeg';
  return { data: cleaned, mimeType: safeMime };
}

function extractGeminiError(err: unknown): { status: number; message: string } {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes('API_KEY_INVALID') || msg.includes('PERMISSION_DENIED') || msg.includes('403')) {
    return {
      status: 403,
      message: 'API anahtarı geçersiz veya yetkisiz. Lütfen Settings > Secrets panelinden anahtarınızı kontrol edin.',
    };
  }
  if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('429')) {
    return {
      status: 429,
      message: 'İstek kotası doldu. Kısa bir süre bekleyip tekrar deneyin.',
    };
  }
  if (msg.includes('GEMINI_API_KEY')) {
    return { status: 500, message: msg };
  }
  return {
    status: 500,
    message: 'Analiz sırasında beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.',
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '12mb' }));

  // 1) Fotoğraf Analizi: Parmak pozisyonları ve iki kart hizası kontrolü + 5 başlıkta geri bildirim
  app.post('/api/analyze-photo', async (req: Request, res: Response) => {
    try {
      const { imageBase64, mimeType, techniqueName } = req.body as {
        imageBase64?: string;
        mimeType?: string;
        techniqueName?: string;
      };

      const parsed = parseBase64Image(imageBase64 ?? '', mimeType ?? 'image/jpeg');
      if (!parsed) {
        res.status(400).json({ error: 'Geçerli bir el/kart fotoğrafı gönderilmedi.' });
        return;
      }

      const targetTechnique = (techniqueName ?? 'Double Lift').trim().slice(0, 80);
      const ai = getGeminiClient();

      const prompt = `Sen dünya standartlarında bir yakın çekim (close-up) kart sihirbazlığı koçusun.
Kullanıcı sana "${targetTechnique}" tekniğini uygularken çektiği el ve iskambil destesi fotoğrafını gönderdi.

Fotoğrafı dikkatlice incele:
- Parmak pozisyonlarını (başparmak, işaret parmağı, orta/yüzük parmağı tutuşu, serçe parmak kırığı / pinky break gizliliği, bilek ve avuç açısı) analiz et.
- İki kartın hizasını (çift kartın tek bir kart gibi tam hizalı olup olmadığı, kenarlardan taşma/flash veya kalınlık farkı görünüp görünmediği, deste eğimi) kontrol et.
- Eğer fotoğrafta el veya iskambil kartı görünmüyorsa ya da çok karanlık/bulanıksa, bunu dürüstçe "Hatalı" olarak işaretle ve sebebini belirt.

Yanıtını mutlaka Türkçe, kısa, net, pratik ve doğrudan uygulanabilir şekilde şu 5 başlık alanına göre JSON formatında ver.`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: {
          parts: [
            { inlineData: { mimeType: parsed.mimeType, data: parsed.data } },
            { text: prompt },
          ],
        },
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              durum: {
                type: Type.STRING,
                enum: ['Başarılı', 'Hatalı'],
                description: 'Tekniğin genel başarım durumu: Başarılı veya Hatalı.',
              },
              tespitEdilenHata: {
                type: Type.STRING,
                description: 'Tespit edilen temel hata veya başarılıysa temiz görünen nokta (1-2 kısa cümle).',
              },
              nasilDuzeltilir: {
                type: Type.STRING,
                description: 'Hatayı düzeltmek veya formu mükemmelleştirmek için uygulanacak net fiziksel adım (1-2 kısa cümle).',
              },
              parmakPozisyonu: {
                type: Type.STRING,
                description: 'Başparmak, işaret ve serçe parmak konumlarının değerlendirmesi (1-2 kısa cümle).',
              },
              kartHizasi: {
                type: Type.STRING,
                description: 'İki kartın birbirine hizası, kenar taşması (flash) ve deste açısı kontrolü (1-2 kısa cümle).',
              },
            },
            required: [
              'durum',
              'tespitEdilenHata',
              'nasilDuzeltilir',
              'parmakPozisyonu',
              'kartHizasi',
            ],
          },
        },
      });

      const rawText = (response.text ?? '{}').trim();
      const result = JSON.parse(rawText);
      res.json(result);
    } catch (err) {
      const mapped = extractGeminiError(err);
      res.status(mapped.status).json({ error: mapped.message });
    }
  });

  // 2) Canlı Kamera Kas Hafızası Koçluğu: Aşama bazlı anlık kare değerlendirmesi
  app.post('/api/coach-stage', async (req: Request, res: Response) => {
    try {
      const { imageBase64, mimeType, techniqueName, stageNumber, stageTitle, stageCue } = req.body as {
        imageBase64?: string;
        mimeType?: string;
        techniqueName?: string;
        stageNumber?: number;
        stageTitle?: string;
        stageCue?: string;
      };

      const parsed = parseBase64Image(imageBase64 ?? '', mimeType ?? 'image/jpeg');
      if (!parsed) {
        res.status(400).json({ error: 'Kamera karesi okunamadı.' });
        return;
      }

      const ai = getGeminiClient();

      const prompt = `Sen Duolingo tarzı canlı kamera kart sihirbazlığı koçusun.
Teknik: "${(techniqueName ?? 'Double Lift').slice(0, 80)}"
Şu anki hedef aşama: Aşama ${Number(stageNumber) || 1} — "${(stageTitle ?? '').slice(0, 100)}"
Beklenen el ve kart duruşu: "${(stageCue ?? '').slice(0, 220)}"

Kameradaki bu anlık kareye bak:
1. Elleri ve kartları görebiliyor musun? Göremiyorsan passed=false döndür ve kartları kameraya göstermesini söyle.
2. El ve kart duruşu bu aşamanın beklenen pozisyonuna yeterince uygun mu (parmak teması ve kart hizası açısından)?
   - Uygun ise passed=true ver ve kısa bir tebrik + sıradaki harekete hazırlık cümlesi yaz.
   - Uygun değilse passed=false ver ve tek bir net düzeltme ipucu ver.
Türkçe, çok kısa ve net konuş (maksimum 12-15 kelime).`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: {
          parts: [
            { inlineData: { mimeType: parsed.mimeType, data: parsed.data } },
            { text: prompt },
          ],
        },
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              passed: {
                type: Type.BOOLEAN,
                description: 'Kullanıcı bu aşamanın hareketini doğru pozisyonda yapıyorsa true, değilse false.',
              },
              statusLabel: {
                type: Type.STRING,
                description: 'Kısa durum etiketi: örn. "Pozisyon Doğru", "Kartlar Ayrık", "El Görünmüyor", "Açıyı Düzelt".',
              },
              feedback: {
                type: Type.STRING,
                description: 'Anlık sesli/yazılı koçluk geri bildirimi (maksimum 15 kelime, Türkçe).',
              },
              tip: {
                type: Type.STRING,
                description: 'Tek satırlık pratik düzeltme veya onay notu.',
              },
            },
            required: ['passed', 'statusLabel', 'feedback', 'tip'],
          },
        },
      });

      const rawText = (response.text ?? '{}').trim();
      const result = JSON.parse(rawText);
      res.json(result);
    } catch (err) {
      const mapped = extractGeminiError(err);
      res.status(mapped.status).json({ error: mapped.message });
    }
  });

  // 3) AI Teknik Öğretmeni: İstenilen herhangi bir kart tekniğini 5 adımda öğretir
  app.post('/api/teach-technique', async (req: Request, res: Response) => {
    try {
      const { techniqueQuery } = req.body as { techniqueQuery?: string };
      const query = (techniqueQuery ?? '').trim().slice(0, 120);
      if (!query) {
        res.status(400).json({ error: 'Öğrenmek istediğiniz teknik adını yazın.' });
        return;
      }

      const ai = getGeminiClient();

      const prompt = `Kullanıcı şu kart sihirbazlığı tekniğini öğrenmek istiyor: "${query}".
Bu tekniği mobil ekranda kolayca okunacak şekilde, sade, net ve doğru teknik terminolojiyle Türkçe olarak tam 5 aşamada öğret.
Her adım hem yazılı anlatım hem de canlı kamerada kas hafızası antrenmanında kontrol edilecek net bir görsel duruş (visualCue) içermelidir.`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: {
                type: Type.STRING,
                description: 'Başlık, örn: "Elmsley Count Nasıl Yapılır?"',
              },
              name: {
                type: Type.STRING,
                description: 'Tekniğin kısa adı, örn: "Elmsley Count"',
              },
              summary: {
                type: Type.STRING,
                description: 'Tekniğin amacını özetleyen 1 cümlelik net açıklama.',
              },
              difficulty: {
                type: Type.STRING,
                enum: ['Başlangıç', 'Orta', 'İleri'],
              },
              steps: {
                type: Type.ARRAY,
                description: 'Tam olarak 5 maddelik kısa ve net anlatım.',
                items: {
                  type: Type.OBJECT,
                  properties: {
                    number: { type: Type.INTEGER },
                    title: { type: Type.STRING, description: 'Adımın kısa başlığı (2-5 kelime).' },
                    detail: { type: Type.STRING, description: 'Adımın 1-2 cümlelik net açıklaması.' },
                    visualCue: {
                      type: Type.STRING,
                      description: 'Kamerada koçun kontrol edeceği parmak ve kart pozisyonu.',
                    },
                  },
                  required: ['number', 'title', 'detail', 'visualCue'],
                },
              },
            },
            required: ['title', 'name', 'summary', 'difficulty', 'steps'],
          },
        },
      });

      const rawText = (response.text ?? '{}').trim();
      const result = JSON.parse(rawText);
      res.json(result);
    } catch (err) {
      const mapped = extractGeminiError(err);
      res.status(mapped.status).json({ error: mapped.message });
    }
  });

  // 4) Çok Turlu AI Sihirbazlık Mentoru Sohbeti (SSE Streaming)
  app.post('/api/chat', async (req: Request, res: Response) => {
    try {
      const { history, message, activeTechnique } = req.body as {
        history?: Array<{ role: 'user' | 'model'; text: string }>;
        message?: string;
        activeTechnique?: string;
      };

      const userMessage = (message ?? '').trim().slice(0, 1500);
      if (!userMessage) {
        res.status(400).json({ error: 'Lütfen bir mesaj yazın.' });
        return;
      }

      const ai = getGeminiClient();
      const safeHistory = Array.isArray(history)
        ? history
            .filter(
              (item) =>
                item &&
                (item.role === 'user' || item.role === 'model') &&
                typeof item.text === 'string' &&
                item.text.trim().length > 0
            )
            .slice(-20)
            .map((item) => ({
              role: item.role,
              parts: [{ text: item.text.slice(0, 1500) }],
            }))
        : [];

      const techniqueContext = (activeTechnique ?? 'Double Lift').trim().slice(0, 80);

      const chat = ai.chats.create({
        model: 'gemini-4-hydrogen',
        history: safeHistory,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          systemInstruction: `Sen "El Sihri" adlı uygulamanın deneyimli yakın çekim (close-up) kart sihirbazlığı koçusun.
Kullanıcı şu anda "${techniqueContext}" tekniği üzerinde çalışıyor.
Görevin:
- Türkçe, samimi, net ve teknik açıdan doğru tavsiyeler vermek.
- Parmak yerleşimi, açı gizleme (misdirection ve angles), deste bakımı, kas hafızası antrenmanı ve rutin kurgusu hakkında pratik öneriler sunmak.
- Yanıtlarını mobil ekranda rahat okunacak şekilde kısa paragraflar veya 3-5 maddelik net adımlar halinde tutmak.`,
        },
      });

      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const streamResponse = await chat.sendMessageStream({ message: userMessage });
      for await (const chunk of streamResponse) {
        const text = chunk.text ?? '';
        if (text) {
          res.write(`data: ${JSON.stringify({ text })}\n\n`);
        }
      }
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (err) {
      const mapped = extractGeminiError(err);
      if (!res.headersSent) {
        res.status(mapped.status).json({ error: mapped.message });
      } else {
        res.write(`data: ${JSON.stringify({ error: mapped.message })}\n\n`);
        res.end();
      }
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build bulunamadı. Lütfen npm run build çalıştırın.');
      }
    });
  }

  // HTTP server + Gemini 3.8 Live API WebSocket Bridge (/api/live-voice)
  const httpServer = http.createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/api/live-voice' });

  wss.on('connection', async (clientWs: WebSocket, req) => {
    let session: Awaited<ReturnType<GoogleGenAI['live']['connect']>> | null = null;
    let isClosed = false;

    try {
      const url = new URL(req.url ?? '/api/live-voice', `http://${req.headers.host ?? 'localhost'}`);
      const technique = (url.searchParams.get('technique') ?? 'Double Lift').slice(0, 80);

      const ai = getGeminiClient();
      session = await ai.live.connect({
        model: 'gemini-3.8-live',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: `Sen "El Sihri" kart sihirbazlığı uygulamasının canlı sesli koçusun.
Kullanıcı şu anda ellerinde deste varken seninle sesli pratik yapıyor; odak tekniği: "${technique}".
Kuralların:
- Her zaman Türkçe konuş, sıcak ama net bir eğitmen tonu kullan.
- Yanıtların kısa ve aksiyona yönelik olsun (2-3 cümleyi geçme), çünkü kullanıcının elleri dolu.
- Parmak pozisyonu, pinky break, kart kenarı hizası, tempo ve açı gizleme hakkında anlık koçluk ver.`,
        },
        callbacks: {
          onopen: () => {
            if (!isClosed && clientWs.readyState === clientWs.OPEN) {
              clientWs.send(JSON.stringify({ ready: true }));
            }
          },
          onmessage: (message: LiveServerMessage) => {
            if (isClosed || clientWs.readyState !== clientWs.OPEN) return;

            const content = message.serverContent;
            if (content?.inputTranscription?.text) {
              clientWs.send(JSON.stringify({ inputTranscript: content.inputTranscription.text }));
            }
            if (content?.outputTranscription?.text) {
              clientWs.send(JSON.stringify({ outputTranscript: content.outputTranscription.text }));
            }
            if (content?.interrupted) {
              clientWs.send(JSON.stringify({ interrupted: true }));
            }
            if (content?.turnComplete) {
              clientWs.send(JSON.stringify({ turnComplete: true }));
            }
            for (const part of content?.modelTurn?.parts ?? []) {
              if (part.inlineData?.data) {
                clientWs.send(JSON.stringify({ audio: part.inlineData.data }));
              }
            }
          },
          onerror: (err: unknown) => {
            if (!isClosed && clientWs.readyState === clientWs.OPEN) {
              const mapped = extractGeminiError(err);
              clientWs.send(JSON.stringify({ error: mapped.message }));
            }
          },
          onclose: () => {
            if (!isClosed && clientWs.readyState === clientWs.OPEN) {
              clientWs.close();
            }
          },
        },
      });
    } catch (err) {
      const mapped = extractGeminiError(err);
      if (clientWs.readyState === clientWs.OPEN) {
        clientWs.send(JSON.stringify({ error: mapped.message }));
        clientWs.close();
      }
      return;
    }

    clientWs.on('message', (raw) => {
      if (!session || isClosed) return;
      try {
        const msg = JSON.parse(raw.toString()) as { audio?: string; video?: string; text?: string };
        if (msg.audio) {
          session.sendRealtimeInput({
            audio: { data: msg.audio, mimeType: 'audio/pcm;rate=16000' },
          });
        }
        if (msg.video) {
          session.sendRealtimeInput({
            video: { data: msg.video, mimeType: 'image/jpeg' },
          });
        }
        if (msg.text) {
          session.sendRealtimeInput({ text: msg.text });
        }
      } catch {
        // Ignore malformed frame packets
      }
    });

    clientWs.on('close', () => {
      isClosed = true;
      try {
        session?.close();
      } catch {
        // Ignore close errors
      }
    });
  });

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`El Sihri sunucusu http://0.0.0.0:${PORT} adresinde çalışıyor`);
  });
}

startServer().catch((err) => {
  console.error('Sunucu başlatma hatası:', err);
  process.exit(1);
});
