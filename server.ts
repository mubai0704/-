/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not defined. Please add your Gemini API Key in Settings > Secrets.');
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

const app = express();
const PORT = 3000;

app.use(express.json());

// API: Generate topic-based vocabulary
app.post('/api/gemini/generate-topic', async (req, res) => {
  try {
    const { topic, limit } = req.body;
    if (!topic) {
      res.status(400).json({ error: 'Topic is required' });
      return;
    }

    const ai = getGeminiClient();
    const count = limit && typeof limit === 'number' && limit > 0 ? limit : 10;
    const prompt = `請針對主題「${topic}」產生剛好 ${count} 個適合台灣國小生練習注音打字的中文詞彙（每個詞 1 到 4 個字）。
每個詞彙必須包含正確的台灣教育部標準注音與詞義解釋。例如：
「太陽」：太(ㄊㄞˋ)、陽(ㄧㄤˊ)，解釋：「太陽系的中心恆星，帶來光與熱。」
請務必遵守台灣標準，聲調符號有二聲「ˊ」、三聲「ˇ」、四聲「ˋ」、輕聲「˙」，一聲不寫聲調。`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        systemInstruction: `You are an expert Taiwanese school teacher and elementary curriculum designer.
Your response MUST be in JSON format matching the schema exactly.
Ensure the Bopomofo (注音) pronunciations are strictly compliant with Taiwanese Ministry of Education (MOE) standards (臺灣教育部國語標準).
Every Bopomofo syllable should be fully computed including correct tone marks.
For light tones (neutral tone), prefix or suffix with "˙" (e.g. ㄇㄚ˙).
Default first tone should not have a tone symbol or should have 'ˉ' if specified, but usually first tone is written alone without marks like "ㄇㄚ".`,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              word: {
                type: Type.STRING,
                description: 'The whole vocabulary word, e.g., "太陽" or "蜜蜂".',
              },
              characters: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    char: { type: Type.STRING, description: 'Single Chinese character, e.g. "太"' },
                    bopomofo: { type: Type.STRING, description: 'The complete Bopomofo representation, e.g. "ㄊㄞˋ"' }
                  },
                  required: ['char', 'bopomofo']
                },
                description: 'The breakdown of each individual character inside the word.'
              },
              meaning: {
                type: Type.STRING,
                description: 'A simple, friendly definition of the word in Traditional Chinese.',
              }
            },
            required: ['word', 'characters']
          }
        }
      }
    });

    if (!response.text) {
      throw new Error('Emply response returned from Gemini API');
    }

    const result = JSON.parse(response.text.trim());
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Error generating topic words:', error);
    res.status(500).json({
      success: false,
      error: error.message || '無法產生主題詞彙，請檢查您的 Gemini API 金鑰設定是否正確。'
    });
  }
});

// API: Convert custom text paragraph into vocabulary words + correct Bopomofo
app.post('/api/gemini/convert-text', async (req, res) => {
  try {
    const { text, limit } = req.body;
    if (!text || typeof text !== 'string') {
      res.status(400).json({ error: 'Text content is required' });
      return;
    }

    const ai = getGeminiClient();
    const cleanText = text.trim().substring(0, 500); // Limit length to avoid over-tokens
    const count = limit && typeof limit === 'number' && limit > 0 ? limit : 10;
    const prompt = `請將以下段落分割為剛好 ${count} 個適合練習注音的生字或詞彙（編排為 1 至 4 個字的詞句，排除英文及標點符號），並標註正確的台灣教育部標準注音與簡單詞義：
「${cleanText}」
每個詞彙必須包含完整的字元拆解與標準注音聲調（包含輕聲「˙」、二聲「ˊ」、三聲「ˇ」、四聲「ˋ」）。如果文章長度較短或生詞不夠生出剛好 ${count} 個，則對其中某些重要單字進行單獨拆分，以確保產生剛好 ${count} 個詞彙！`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        systemInstruction: `You are an expert Taiwanese school teacher and elementary curriculum designer.
Split the provided text into key vocabulary words (1-4 characters each).
Your response MUST be in JSON format matching the schema exactly.
Always use standard Taiwanese Mandarin pronunciations (臺灣教育部拼音注音規範).`,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              word: {
                type: Type.STRING,
                description: 'The extracted vocabulary word.',
              },
              characters: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    char: { type: Type.STRING, description: 'Single character' },
                    bopomofo: { type: Type.STRING, description: 'Exact Taiwan standard Bopomofo notation, e.g. "ㄋㄧˇ" or "ㄏㄜˊ"' }
                  },
                  required: ['char', 'bopomofo']
                }
              },
              meaning: {
                type: Type.STRING,
                description: 'A brief explanation of the word if possible.'
              }
            },
            required: ['word', 'characters']
          }
        }
      }
    });

    if (!response.text) {
      throw new Error('Empty response from text converter');
    }

    const result = JSON.parse(response.text.trim());
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Error converting custom text:', error);
    res.status(500).json({
      success: false,
      error: error.message || '文字轉換失敗，請確認您的 Gemini API 金鑰設定。'
    });
  }
});

// ==========================================
// In-Memory PK Rooms Storage for Pair Battles
// ==========================================
const pkRooms = new Map<string, any>();

// Clean up old idle rooms that are older than 2 hours to avoid leaks
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of pkRooms.entries()) {
    if (now - room.createdAt > 2 * 60 * 60 * 1000) {
      pkRooms.delete(code);
    }
  }
}, 5 * 60 * 1000);

// 1. Create a PK Room
app.post('/api/pk/create', (req, res) => {
  try {
    const { roomCode, username, selectedWords, timeLimit } = req.body;
    if (!roomCode || !username || !selectedWords) {
      res.status(400).json({ success: false, error: '缺少必要資訊：房間代碼、暱稱、或題庫資料。' });
      return;
    }

    const cleanCode = String(roomCode).trim();
    const cleanUser = String(username).trim();

    const newRoom = {
      roomCode: cleanCode,
      timeLimit: Number(timeLimit) || 180,
      selectedWords,
      status: 'waiting',
      createdAt: Date.now(),
      players: {
        [cleanUser]: {
          username: cleanUser,
          score: 0,
          completedCount: 0,
          correctCount: 0,
          incorrectCount: 0,
          accuracy: 100,
          isFinished: false,
          lastActive: Date.now()
        }
      }
    };

    pkRooms.set(cleanCode, newRoom);
    res.json({ success: true, room: newRoom });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Join a PK Room
app.post('/api/pk/join', (req, res) => {
  try {
    const { roomCode, username } = req.body;
    if (!roomCode || !username) {
      res.status(400).json({ success: false, error: '請輸入房間號碼與您的暱稱' });
      return;
    }

    const cleanCode = String(roomCode).trim();
    const cleanUser = String(username).trim();

    const room = pkRooms.get(cleanCode);
    if (!room) {
      res.status(404).json({ success: false, error: `找不到此房號「${cleanCode}」，請確認房長是否已建立。` });
      return;
    }

    // Check if player is already there, or if names clash, or if room is full
    const existingPlayers = Object.keys(room.players);
    if (existingPlayers.length >= 2 && !room.players[cleanUser]) {
      res.status(400).json({ success: false, error: '此房間已滿，每房最多支援 2 人雙拼對決！' });
      return;
    }

    // Register active player
    room.players[cleanUser] = room.players[cleanUser] || {
      username: cleanUser,
      score: 0,
      completedCount: 0,
      correctCount: 0,
      incorrectCount: 0,
      accuracy: 100,
      isFinished: false,
      lastActive: Date.now()
    };

    // If we have exactly 2 players, trigger match starting status countdown (if in waiting)
    if (Object.keys(room.players).length === 2 && room.status === 'waiting') {
      room.status = 'starting';
      room.countdownStartedAt = Date.now();
    }

    res.json({ success: true, room });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Update Status and Poll Room Data
app.post('/api/pk/update', (req, res) => {
  try {
    const { roomCode, username, score, completedCount, correctCount, incorrectCount, accuracy, isFinished } = req.body;
    if (!roomCode || !username) {
      res.status(400).json({ success: false, error: '缺少房間代碼或玩家暱稱' });
      return;
    }

    const cleanCode = String(roomCode).trim();
    const cleanUser = String(username).trim();

    const room = pkRooms.get(cleanCode);
    if (!room) {
      res.status(404).json({ success: false, error: '找不到此對戰房間，可能已被關閉或超時釋放' });
      return;
    }

    const p = room.players[cleanUser];
    if (p) {
      p.score = Number(score) || 0;
      p.completedCount = Number(completedCount) || 0;
      p.correctCount = Number(correctCount) || 0;
      p.incorrectCount = Number(incorrectCount) || 0;
      p.accuracy = Number(accuracy) || 0;
      p.isFinished = Boolean(isFinished);
      p.lastActive = Date.now();
    }

    // If starting countdown has ended, transition room to 'playing'
    if (room.status === 'starting' && room.countdownStartedAt) {
      const elapsedSeconds = (Date.now() - room.countdownStartedAt) / 1000;
      if (elapsedSeconds >= 4) { // Let client render 3, 2, 1, start
        room.status = 'playing';
      }
    }

    // Checking if all players finished the game
    if (room.status === 'playing') {
      const playersList = Object.values(room.players);
      const allFinished = playersList.every((pl: any) => pl.isFinished);
      if (allFinished && playersList.length >= 2) {
        room.status = 'finished';
      }
    }

    res.json({ success: true, room });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Start routing & static assets serving
async function startServer() {
  // Vite developer configuration or serving production builds
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Bopomofo practice server loaded successfully on port ${PORT}`);
  });
}

startServer();
