/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { 
  Keyboard as KeyboardIcon, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Timer, 
  Sparkles, 
  BookOpen, 
  Award, 
  Activity, 
  Check, 
  HelpCircle, 
  Send, 
  FileText, 
  X, 
  Info, 
  Settings, 
  AlertCircle 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  KEY_TO_BOPOMOFO, 
  BOPOMOFO_TO_KEY,
  parseBopomofoParts 
} from './data/defaultVocab';
import { convertTextToVocabularyOffline } from './data/chineseToBopomofo';
import { audioSynth } from './utils/audio';
import { VocabularyItem, TextbookVersion, GameStats } from './types';

export default function App() {
  // Navigation / Mode Select states
  const [textbook, setTextbook] = useState<TextbookVersion>('自訂題目');
  const [questionCountLimit, setQuestionCountLimit] = useState<number>(10);
  
  // Custom topic and text inputs
  const [customText, setCustomText] = useState<string>('清晨，高大的山林蒙上一層白雲。小松鼠穿梭在樹枝間，尋找著松果。');
  const [aiTopic, setAiTopic] = useState<string>('海洋探險');
  
  // Game Play states
  const [gameMode, setGameMode] = useState<'setup' | 'play' | 'result'>('setup');
  const [playModeType, setPlayModeType] = useState<'normal' | 'timeAttack'>('normal');
  const [timeLimit, setTimeLimit] = useState<number>(180); // in seconds, default 3 minutes (180s)
  const [timeRemaining, setTimeRemaining] = useState<number>(180);
  const [timerActive, setTimerActive] = useState<boolean>(false);
  const [infiniteTime, setInfiniteTime] = useState<boolean>(false);
  
  // Words to practice
  const [selectedWords, setSelectedWords] = useState<VocabularyItem[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState<number>(0);
  const [currentCharacterIndex, setCurrentCharacterIndex] = useState<number>(0);
  const [typedWordSymbols, setTypedWordSymbols] = useState<string[][]>([]);
  const [wrongAnswer, setWrongAnswer] = useState<boolean>(false);
  const [wrongCharIndices, setWrongCharIndices] = useState<number[]>([]);
  const [completedWordItems, setCompletedWordItems] = useState<VocabularyItem[]>([]);
  
  // PK Battle State Management
  const [pkRole, setPkRole] = useState<'host' | 'join'>('host');
  const [pkRoomCode, setPkRoomCode] = useState<string>('');
  const [pkUsername, setPkUsername] = useState<string>('');
  const [pkQuestionSource, setPkQuestionSource] = useState<'custom' | 'ai'>('custom');
  const [pkCustomText, setPkCustomText] = useState<string>('極速拼音大對決！看誰打得最快最準確！');
  const [pkAiTopic, setPkAiTopic] = useState<string>('太空探險');
  const [pkRoomState, setPkRoomState] = useState<any>(null);
  const [pkLobbyError, setPkLobbyError] = useState<string>('');
  const [pkCountdown, setPkCountdown] = useState<number>(-1);
  const [pkLoading, setPkLoading] = useState<boolean>(false);
  const [isPkPolling, setIsPkPolling] = useState<boolean>(false);

  // Statistics
  const [stats, setStats] = useState<GameStats>({
    correctCount: 0,
    incorrectCount: 0,
    completedCount: 0,
    startTime: null,
    totalTimeSpent: 0,
    multiplier: 1,
    score: 0
  });

  // User Help / Interface Controls
  const [showHint, setShowHint] = useState<boolean>(false);
  const [highlightHelper, setHighlightHelper] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [physicalKeyPress, setPhysicalKeyPress] = useState<string | null>(null);
  const [wrongKeyFlash, setWrongKeyFlash] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // References
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Normalization for robust Bopomofo syllable comparison across all platform sources
  const normalizeBopomofo = (bopomofoStr: string): string => {
    if (!bopomofoStr) return '';
    let clean = bopomofoStr.trim();
    
    // Replace various lookalike second tones
    clean = clean.replace(/[\u00b4\u02ca´′ˊ]/g, 'ˊ');
    
    // Replace various lookalike third tones
    clean = clean.replace(/[\u02c7\u02ecˇ]/g, 'ˇ');
    
    // Replace various lookalike fourth tones
    clean = clean.replace(/[\u0060\u02cb`ˋ]/g, 'ˋ');
    
    // Replace various lookalike light tones
    clean = clean.replace(/[\u02d9\u00b7·•\u0307˙]/g, '˙');
    
    // Replace various lookalike first tones or spaces
    clean = clean.replace(/[\u02c9ˉ]/g, 'ˉ');
    
    // Remove any English alphabets or punctuation symbols but keep standard symbols
    clean = clean.replace(/[^ㄅㄆㄇㄈㄉㄊㄋㄌㄍㄎㄏㄐㄑㄒㄓㄔㄕㄖㄗㄘㄙㄧㄨㄩㄚㄛㄜㄝㄞㄟㄠㄡㄢㄣㄤㄥㄦˊˇˋ˙ˉ]/g, '');

    return clean;
  };

  const setNormalizedSelectedWords = (words: VocabularyItem[]) => {
    const normalized = words.map(item => ({
      ...item,
      characters: item.characters.map(charItem => ({
        ...charItem,
        bopomofo: normalizeBopomofo(charItem.bopomofo)
      }))
    }));
    setSelectedWords(normalized);
  };

  // Helper for actual expected symbols sequence (forces space for 1st tone)
  const getCharacterTargetSymbols = (bopomofo: string) => {
    const normalized = normalizeBopomofo(bopomofo);
    const base = Array.from(normalized);
    const hasTone = /[ˊˇˋ˙ˉ]/.test(normalized);
    if (hasTone) {
      return base;
    } else {
      return [...base, ' '];
    }
  };

  // Retrieve current active word
  const activeWord: VocabularyItem | undefined = selectedWords[currentWordIndex];
  
  // Retrieve current active character
  const activeChar = activeWord?.characters[currentCharacterIndex];

  const targetSymbols = activeChar ? getCharacterTargetSymbols(activeChar.bopomofo) : [];

  // Automatically initialize typedWordSymbols when activeWord changes or game starts
  useEffect(() => {
    if (activeWord) {
      setTypedWordSymbols(activeWord.characters.map(() => []));
      setCurrentCharacterIndex(0);
      setWrongAnswer(false);
      setWrongCharIndices([]);
    } else {
      setTypedWordSymbols([]);
      setWrongCharIndices([]);
    }
  }, [currentWordIndex, selectedWords]);

  // Adjust sound synthesizer state matching soundEnabled configuration
  useEffect(() => {
    audioSynth.enabled = soundEnabled;
  }, [soundEnabled]);

  // Game timer loop
  useEffect(() => {
    if (timerActive && !infiniteTime) {
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setTimerActive(false);
            endGame();
            return 0;
          }
          return prev - 1;
        });
        setStats(prev => ({
          ...prev,
          totalTimeSpent: prev.totalTimeSpent + 1
        }));
      }, 1000);
    } else if (timerActive && infiniteTime) {
      timerRef.current = setInterval(() => {
        setStats(prev => ({
          ...prev,
          totalTimeSpent: prev.totalTimeSpent + 1
        }));
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerActive, infiniteTime]);

  // Poll PK state when playing
  useEffect(() => {
    let intervalId: any = null;

    if (gameMode === 'play' && textbook === '1v1 PK 對戰' && pkRoomCode && pkUsername) {
      const runPoll = async () => {
        try {
          const totalKeys = stats.correctCount + stats.incorrectCount;
          const currentAccuracy = totalKeys > 0 ? Math.round((stats.correctCount / totalKeys) * 100) : 100;

          const payload = {
            roomCode: pkRoomCode,
            username: pkUsername,
            score: stats.score,
            completedCount: completedWordItems.length,
            correctCount: stats.correctCount,
            incorrectCount: stats.incorrectCount,
            accuracy: currentAccuracy,
            isFinished: false
          };

          const res = await fetch('/api/pk/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          const data = await res.json();
          if (data.success) {
            setPkRoomState(data.room);
          }
        } catch (err) {
          console.error('Error polling PK status in play:', err);
        }
      };

      runPoll();
      intervalId = setInterval(runPoll, 1500);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [gameMode, textbook, pkRoomCode, pkUsername, stats.score, completedWordItems.length, stats.correctCount, stats.incorrectCount]);

  // Poll PK state when on Result screen
  useEffect(() => {
    let intervalId: any = null;

    if (gameMode === 'result' && textbook === '1v1 PK 對戰' && pkRoomCode && pkUsername) {
      const runPoll = async () => {
        try {
          const totalKeys = stats.correctCount + stats.incorrectCount;
          const currentAccuracy = totalKeys > 0 ? Math.round((stats.correctCount / totalKeys) * 100) : 100;

          const payload = {
            roomCode: pkRoomCode,
            username: pkUsername,
            score: stats.score,
            completedCount: completedWordItems.length,
            correctCount: stats.correctCount,
            incorrectCount: stats.incorrectCount,
            accuracy: currentAccuracy,
            isFinished: true
          };

          const res = await fetch('/api/pk/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          const data = await res.json();
          if (data.success) {
            setPkRoomState(data.room);
          }
        } catch (err) {
          console.error('Error polling PK status in result:', err);
        }
      };

      runPoll();
      intervalId = setInterval(runPoll, 2000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [gameMode, textbook, pkRoomCode, pkUsername, stats.score, completedWordItems.length, stats.correctCount, stats.incorrectCount]);

  // Classroom Countdown effect for synchronous matchstart
  useEffect(() => {
    let intervalId: any = null;
    if (pkCountdown > 0) {
      intervalId = setInterval(() => {
        setPkCountdown(prev => {
          if (prev <= 1) {
            clearInterval(intervalId);
            // Trigger actual game-start!
            setGameMode('play');
            setTimerActive(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [pkCountdown]);

  // Handle AI Topic generation via Gemini server-side route
  const handleAiGenerateTopic = async () => {
    if (!aiTopic.trim()) return;
    setLoading(true);
    setApiError(null);
    try {
      const response = await fetch('/api/gemini/generate-topic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: aiTopic, limit: questionCountLimit })
      });
      const resData = await response.json();
      if (!response.ok || !resData.success) {
        throw new Error(resData.error || '無法呼叫伺服器 API，請確認後台運作或檢視 Settings Secrets。');
      }
      
      let words = resData.data;
      if (playModeType !== 'timeAttack' && questionCountLimit > 0 && words.length > questionCountLimit) {
        words = words.slice(0, questionCountLimit);
      }

      setNormalizedSelectedWords(words);
      setCurrentWordIndex(0);
      setCurrentCharacterIndex(0);
      setTypedWordSymbols(words.length > 0 ? words[0].characters.map(() => []) : []);
      setWrongAnswer(false);
      setCompletedWordItems([]);
      setTimeRemaining(timeLimit);
      setGameMode('play');
      setTimerActive(true);
      setStats({
        correctCount: 0,
        incorrectCount: 0,
        completedCount: 0,
        startTime: Date.now(),
        totalTimeSpent: 0,
        multiplier: 1,
        score: 0
      });
      audioSynth.playLevelSuccess();
    } catch (err: any) {
      console.error(err);
      setApiError(err.message || '主題產生失敗。請手動切換至「自訂題目」或是重新嘗試。');
    } finally {
      setLoading(false);
    }
  };

  // Handle Custom text parsing from paste input
  const handleCustomTextParse = async () => {
    if (!customText.trim()) return;
    setLoading(true);
    setApiError(null);
    try {
      let finalWords: VocabularyItem[] = [];
      // Attempt Server-Side Conversion with Gemini
      const response = await fetch('/api/gemini/convert-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: customText, limit: questionCountLimit })
      });
      const resData = await response.json();
      
      if (response.ok && resData.success && resData.data && resData.data.length > 0) {
        finalWords = resData.data;
      } else {
        // Fall back gracefully to offline converter
        console.warn('Gemini server convert failed, falling back to local dictionaries');
        const parsedOffline = convertTextToVocabularyOffline(customText, questionCountLimit);
        if (parsedOffline.length === 0) {
          throw new Error('無法從內容解析出中文字。');
        }
        finalWords = parsedOffline;
      }
      
      if (playModeType !== 'timeAttack' && questionCountLimit > 0 && finalWords.length > questionCountLimit) {
        finalWords = finalWords.slice(0, questionCountLimit);
      }

      setNormalizedSelectedWords(finalWords);
      setCurrentWordIndex(0);
      setCurrentCharacterIndex(0);
      setTypedWordSymbols(finalWords.length > 0 ? finalWords[0].characters.map(() => []) : []);
      setWrongAnswer(false);
      setCompletedWordItems([]);
      setTimeRemaining(timeLimit);
      setGameMode('play');
      setTimerActive(true);
      setStats({
        correctCount: 0,
        incorrectCount: 0,
        completedCount: 0,
        startTime: Date.now(),
        totalTimeSpent: 0,
        multiplier: 1,
        score: 0
      });
      audioSynth.playLevelSuccess();
    } catch (err: any) {
      console.error(err);
      setApiError(err.message || '自訂題目載入出錯，請確認字句。');
    } finally {
      setLoading(false);
    }
  };

  // Handle PK Room creation
  const handleCreatePkRoom = async () => {
    if (!pkRoomCode.trim()) {
      setPkLobbyError('請輸入對戰房號（例如：1234）');
      return;
    }
    if (!pkUsername.trim()) {
      setPkLobbyError('請輸入您的玩家暱稱');
      return;
    }

    setPkLoading(true);
    setPkLobbyError('');

    try {
      let finalWords: VocabularyItem[] = [];

      // Generate or convert words depending on pkQuestionSource
      if (pkQuestionSource === 'ai') {
        const topicToGenerate = pkAiTopic.trim() || '太空探險';
        const response = await fetch('/api/gemini/generate-topic', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic: topicToGenerate, limit: questionCountLimit })
        });
        const resData = await response.json();
        if (!response.ok || !resData.success) {
          throw new Error(resData.error || '無法透過 AI 產生對戰題目，請檢查網路或確認 API 金鑰配對。');
        }
        finalWords = resData.data;
      } else {
        const textToConvert = pkCustomText.trim() || customText;
        if (!textToConvert.trim()) {
          throw new Error('請輸入對戰自訂題目字句！');
        }
        try {
          const response = await fetch('/api/gemini/convert-text', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: textToConvert, limit: questionCountLimit })
          });
          const resData = await response.json();
          if (response.ok && resData.success && resData.data && resData.data.length > 0) {
            finalWords = resData.data;
          } else {
            console.warn('Gemini server convert failed for PK, falling back offline');
            finalWords = convertTextToVocabularyOffline(textToConvert, questionCountLimit);
          }
        } catch (convertErr) {
          console.warn('Network error or convert failed for PK, falling back offline');
          finalWords = convertTextToVocabularyOffline(textToConvert, questionCountLimit);
        }
      }

      if (finalWords.length === 0) {
        throw new Error('無法從目前設定的內容產生對戰詞彙！請確認輸入是否包含中文字。');
      }

      // Respect the questionCountLimit
      if (finalWords.length > questionCountLimit) {
        finalWords = finalWords.slice(0, questionCountLimit);
      }

      const payload = {
        roomCode: pkRoomCode,
        username: pkUsername,
        selectedWords: finalWords.map(item => ({
          ...item,
          characters: item.characters.map(charItem => ({
            ...charItem,
            bopomofo: normalizeBopomofo(charItem.bopomofo)
          }))
        })),
        timeLimit: timeLimit
      };

      const res = await fetch('/api/pk/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || '房號建立失敗');
      }

      setPkRoomState(data.room);
      setNormalizedSelectedWords(finalWords);
      setIsPkPolling(true); // Begin checking for second player inside lobby
      audioSynth.playClick();
    } catch (err: any) {
      console.error(err);
      setPkLobbyError(err.message || '建立房間時遭遇錯誤，請確認網路與對手連線。');
    } finally {
      setPkLoading(false);
    }
  };

  // Handle Joining an established PK Room
  const handleJoinPkRoom = async () => {
    if (!pkRoomCode.trim()) {
      setPkLobbyError('請輸入對戰房號（例如：1234）');
      return;
    }
    if (!pkUsername.trim()) {
      setPkLobbyError('請輸入您的玩家暱稱');
      return;
    }

    setPkLoading(true);
    setPkLobbyError('');

    try {
      const payload = {
        roomCode: pkRoomCode,
        username: pkUsername
      };

      const res = await fetch('/api/pk/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || '進入房間失敗，請確認房號是否正確且未滿。');
      }

      const room = data.room;
      setPkRoomState(room);
      setNormalizedSelectedWords(room.selectedWords);
      setTimeLimit(room.timeLimit);
      setTimeRemaining(room.timeLimit);

      // Start lobby matching sync
      setIsPkPolling(true);
      audioSynth.playClick();
    } catch (err: any) {
      console.error(err);
      setPkLobbyError(err.message || '加入房間時遭遇錯誤，請確認房號代碼是否已被建立。');
    } finally {
      setPkLoading(false);
    }
  };

  // Poll matching status while players wait in the lobby setup cards
  useEffect(() => {
    let intervalId: any = null;

    if (gameMode === 'setup' && textbook === '1v1 PK 對戰' && isPkPolling && pkRoomCode && pkUsername) {
      const lobbyPoll = async () => {
        try {
          const res = await fetch('/api/pk/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              roomCode: pkRoomCode,
              username: pkUsername,
              score: 0,
              completedCount: 0,
              correctCount: 0,
              incorrectCount: 0,
              accuracy: 100,
              isFinished: false
            })
          });
          const data = await res.json();
          if (data.success) {
            setPkRoomState(data.room);

            // Synchronize starting triggers
            if (data.room.status === 'starting') {
              setIsPkPolling(false);
              setPkCountdown(3); // Trigger visual countdown: 3, 2, 1, GO!
              
              setStats({
                correctCount: 0,
                incorrectCount: 0,
                completedCount: 0,
                startTime: Date.now(),
                totalTimeSpent: 0,
                multiplier: 1,
                score: 0
              });
              setCompletedWordItems([]);
              setCurrentWordIndex(0);
              setCurrentCharacterIndex(0);
            }
          }
        } catch (e) {
          console.error('Lobby polling error:', e);
        }
      };

      lobbyPoll();
      intervalId = setInterval(lobbyPoll, 1500);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [gameMode, textbook, isPkPolling, pkRoomCode, pkUsername]);

  // Exit game and gather final analytics
  const endGame = async () => {
    setTimerActive(false);
    setGameMode('result');
    audioSynth.playLevelSuccess();

    // If online PK mode, send final game finished status report
    if (textbook === '1v1 PK 對戰' && pkRoomCode && pkUsername) {
      try {
        const totalKeys = stats.correctCount + stats.incorrectCount;
        const currentAccuracy = totalKeys > 0 ? Math.round((stats.correctCount / totalKeys) * 100) : 100;
        
        const payload = {
          roomCode: pkRoomCode,
          username: pkUsername,
          score: stats.score,
          completedCount: completedWordItems.length,
          correctCount: stats.correctCount,
          incorrectCount: stats.incorrectCount,
          accuracy: currentAccuracy,
          isFinished: true
        };

        const res = await fetch('/api/pk/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          setPkRoomState(data.room);
        }
      } catch (err) {
        console.error('Error ending PK stats:', err);
      }
    }
  };

  // Process a Bopomofo character key press
  const handleBopomofoInput = (symbol: string) => {
    if (gameMode !== 'play' || !activeWord) return;
    
    // Animate visual keypress style
    setPhysicalKeyPress(symbol);
    setTimeout(() => setPhysicalKeyPress(null), 100);

    const activeCharItem = activeWord.characters[currentCharacterIndex];
    if (!activeCharItem) return;

    const targetSymbols = getCharacterTargetSymbols(activeCharItem.bopomofo);
    const currentTyped = typedWordSymbols[currentCharacterIndex] || [];

    // Allow typing only if we haven't reached the max size of target symbols
    if (currentTyped.length < targetSymbols.length) {
      let actualSymbol = symbol;
      // In Bopomofo input layout, if they entered Spacebar ' ' it can represent ' ' or 'ˉ'
      const expectedSymbol = targetSymbols[currentTyped.length];
      if ((expectedSymbol === ' ' || expectedSymbol === 'ˉ') && (symbol === ' ' || symbol === 'ˉ')) {
        actualSymbol = expectedSymbol; // standardise
      }

      const nextTyped = [...currentTyped, actualSymbol];
      const nextWordSymbols = [...typedWordSymbols];
      nextWordSymbols[currentCharacterIndex] = nextTyped;
      setTypedWordSymbols(nextWordSymbols);
      
      // Play a normal keypress click sound without doing active correctness checks yet
      audioSynth.playClick();

      setWrongAnswer(false); // Clear incorrect mark as they change/type
      setWrongCharIndices(prev => prev.filter(idx => idx !== currentCharacterIndex)); // Clear this character's error red flag when re-typing!

      // Auto-advance focus to next character box once current is completely filled (even with incorrect typing)
      if (nextTyped.length === targetSymbols.length) {
        if (currentCharacterIndex < activeWord.characters.length - 1) {
          audioSynth.playCharCorrect();
          setCurrentCharacterIndex((prev) => prev + 1);
        }
      }
    } else {
      // Length exceeded style flash
      setWrongKeyFlash(true);
      setTimeout(() => setWrongKeyFlash(false), 200);
      audioSynth.playError();
    }
  };

  // Skip current word question
  const handleSkipWord = () => {
    if (gameMode !== 'play' || !activeWord) return;
    audioSynth.playClick();
    advanceNextWord();
  };

  // Submit current typed word answer
  const handleSubmitWord = () => {
    if (gameMode !== 'play' || !activeWord) return;

    let allCorrect = true;
    const incorrectIndices: number[] = [];

    let localCorrectKeys = 0;
    let localIncorrectKeys = 0;

    for (let charIdx = 0; charIdx < activeWord.characters.length; charIdx++) {
      const charItem = activeWord.characters[charIdx];
      const expected = getCharacterTargetSymbols(charItem.bopomofo);
      const typed = typedWordSymbols[charIdx] || [];

      let charCorrect = true;
      for (let sIdx = 0; sIdx < expected.length; sIdx++) {
        const eSym = expected[sIdx];
        const tSym = typed[sIdx];
        if (tSym === undefined) {
          charCorrect = false;
          localIncorrectKeys++;
        } else {
          const isSymCorrect = (eSym === ' ' || eSym === 'ˉ')
            ? (tSym === ' ' || tSym === 'ˉ')
            : (tSym === eSym);
          if (isSymCorrect) {
            localCorrectKeys++;
          } else {
            charCorrect = false;
            localIncorrectKeys++;
          }
        }
      }

      if (typed.length > expected.length) {
        localIncorrectKeys += (typed.length - expected.length);
        charCorrect = false;
      }

      if (!charCorrect) {
        incorrectIndices.push(charIdx);
        allCorrect = false;
      }
    }

    if (allCorrect) {
      audioSynth.playWordCorrect();
      setWrongAnswer(false);
      setWrongCharIndices([]);
      setCompletedWordItems((prev) => [...prev, activeWord]);
      
      setStats(prev => {
        const nextMultiplier = Math.min(5, prev.multiplier + 0.25);
        return {
          ...prev,
          correctCount: prev.correctCount + localCorrectKeys,
          incorrectCount: prev.incorrectCount + localIncorrectKeys,
          completedCount: prev.completedCount + 1,
          multiplier: parseFloat(nextMultiplier.toFixed(1)),
          score: prev.score + Math.round(150 * prev.multiplier)
        };
      });

      advanceNextWord();
    } else {
      setWrongAnswer(true);
      setWrongCharIndices(incorrectIndices); // Put red outlines specifically on error character boxes!
      setWrongKeyFlash(true);
      setTimeout(() => setWrongKeyFlash(false), 200);

      setStats(prev => ({
        ...prev,
        correctCount: prev.correctCount + localCorrectKeys,
        incorrectCount: prev.incorrectCount + localIncorrectKeys,
        multiplier: 1 // Reset multiplier on incorrect submit
      }));
      audioSynth.playError();
    }
  };

  // Helper to advance to next word, wrap around, or end game
  const advanceNextWord = () => {
    if (playModeType === 'timeAttack') {
      if (currentWordIndex < selectedWords.length - 1) {
        setCurrentWordIndex((prev) => prev + 1);
      } else {
        // Wrap around in time attack mode to guarantee continuous typing
        setCurrentWordIndex(0);
      }
    } else {
      if (currentWordIndex < selectedWords.length - 1) {
        setCurrentWordIndex((prev) => prev + 1);
      } else {
        endGame();
      }
    }
  };

  // Backspace supports correction across phonetic syllables
  const handleBackspace = () => {
    audioSynth.playClick();
    const currentTyped = typedWordSymbols[currentCharacterIndex] || [];
    if (currentTyped.length > 0) {
      const nextTyped = currentTyped.slice(0, currentTyped.length - 1);
      const nextWordSymbols = [...typedWordSymbols];
      nextWordSymbols[currentCharacterIndex] = nextTyped;
      setTypedWordSymbols(nextWordSymbols);
      setWrongAnswer(false);
      setWrongCharIndices(prev => prev.filter(idx => idx !== currentCharacterIndex)); // clear errors
    } else if (currentCharacterIndex > 0) {
      const prevCharIndex = currentCharacterIndex - 1;
      const prevTyped = typedWordSymbols[prevCharIndex] || [];
      const nextTyped = prevTyped.slice(0, Math.max(0, prevTyped.length - 1));
      const nextWordSymbols = [...typedWordSymbols];
      nextWordSymbols[prevCharIndex] = nextTyped;
      setTypedWordSymbols(nextWordSymbols);
      setCurrentCharacterIndex(prevCharIndex);
      setWrongAnswer(false);
      setWrongCharIndices(prev => prev.filter(idx => idx !== prevCharIndex)); // clear errors
    }
  };

  // Key event capturing physical layout mapping
  useEffect(() => {
    const handlePhysicalKeyDown = (e: KeyboardEvent) => {
      if (gameMode !== 'play') return;

      // Handle custom block key exceptions
      if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        endGame();
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmitWord();
        return;
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        handleSkipWord();
        return;
      }
      
      const key = e.key.toLowerCase();
      
      // Stop space bar scrolling page
      if (e.key === ' ') {
        e.preventDefault();
        handleBopomofoInput(' ');
        return;
      }

      if (KEY_TO_BOPOMOFO[key]) {
        e.preventDefault();
        handleBopomofoInput(KEY_TO_BOPOMOFO[key]);
      }
    };

    window.addEventListener('keydown', handlePhysicalKeyDown);
    return () => {
      window.removeEventListener('keydown', handlePhysicalKeyDown);
    };
  }, [gameMode, currentWordIndex, currentCharacterIndex, typedWordSymbols, selectedWords, playModeType]);

  // Compute stats helper
  const totalKeystrokes = stats.correctCount + stats.incorrectCount;
  const accuracyPercent = totalKeystrokes > 0 ? Math.round((stats.correctCount / totalKeystrokes) * 100) : 100;
  
  // Characters Per Minute (CPM) metric
  const minutesSpent = stats.totalTimeSpent > 0 ? stats.totalTimeSpent / 60 : 0.01;
  const cpmSpeed = Math.round(stats.correctCount / minutesSpent);

  return (
    <div id="app_frame" className="min-h-screen bg-stone-50 text-slate-800 font-sans flex flex-col antialiased">
      {/* Header Bar */}
      <header id="app_header" className="border-b border-stone-200 bg-white/70 backdrop-blur-md sticky top-0 z-50 transition-all duration-200">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-inner shadow-amber-600/20">
              <KeyboardIcon className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                注音打字大進擊 <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-medium">100% 題目無注音版</span>
              </h1>
              <p className="text-xs text-slate-500">
                專為台灣學童及注音學習者設計。聽音思考，打入正確注音符號（QWERTY 鍵盤對應）
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-sm">
            {/* Audio Toggle */}
            <button
              id="sound_toggle_btn"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-xl border flex items-center gap-1.5 transition-all ${
                soundEnabled 
                  ? 'bg-amber-50 border-amber-200 text-amber-800' 
                  : 'bg-stone-100 border-stone-200 text-slate-400'
              }`}
              title="啟用/禁用鍵盤點擊與獎勵提示音"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              <span className="font-medium">{soundEnabled ? '音效：開' : '靜音'}</span>
            </button>

            {/* Helper Hint Toggle */}
            <button
              id="highlight_toggle_btn"
              onClick={() => setHighlightHelper(!highlightHelper)}
              className={`p-2 rounded-xl border flex items-center gap-1.5 transition-all ${
                highlightHelper 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                  : 'bg-stone-100 border-stone-200 text-slate-400'
              }`}
              title="提示哪些鍵對應當前所需注音"
            >
              <Info className="w-4 h-4" />
              <span className="font-medium">{highlightHelper ? '輔助高亮：開' : '無鍵盤提示'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main id="app_main" className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 sm:px-6 lg:px-8 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          
          {/* ==================== 1. SETUP SCREEN ==================== */}
          {gameMode === 'setup' && (
            <motion.div
              key="setup_screen"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start max-w-5xl mx-auto w-full"
            >
              {/* Option Selector Canvas */}
              <div id="selector_card" className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-3xl border border-stone-200/80 shadow-xl shadow-stone-100/40 relative overflow-hidden flex flex-col gap-6">
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-amber-500 to-emerald-500" />
                
                <div>
                  <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-amber-500" />
                    選擇打字練習模式
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    輸入自訂長文短句，或利用 AI 聯網自動產出主題生字。
                  </p>
                </div>

                 {/* Primary Textbook Tabs */}
                <div className="grid grid-cols-3 gap-1.5 bg-stone-100 p-1.5 rounded-2xl border border-stone-200/50">
                  {(['自訂題目', 'AI 主題產生', '1v1 PK 對戰'] as TextbookVersion[]).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => {
                        setTextbook(tab);
                        setPkLobbyError('');
                      }}
                      className={`py-2.5 px-2 text-xs font-bold rounded-xl transition-all cursor-pointer text-center ${
                        textbook === tab 
                          ? 'bg-amber-500 text-white shadow-md shadow-amber-500/10 font-extrabold scale-102' 
                          : 'text-slate-600 hover:text-slate-800 hover:bg-stone-200/50'
                      }`}
                    >
                      {tab === '1v1 PK 對戰' ? '🎮 1v1 PK 對戰' : tab}
                    </button>
                  ))}
                </div>

                {/* Custom input Segment */}
                {textbook === '自訂題目' && (
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-500">貼上自訂中文文章（系統將自動把每個中文字轉成對應注音打字考題）</label>
                      <textarea
                        value={customText}
                        onChange={(e) => setCustomText(e.target.value)}
                        rows={4}
                        placeholder="在此貼上您要練習的國語課文、詩詞或任意中文字句，如：床前明月光..."
                        className="w-full bg-stone-50 border border-stone-200 rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 leading-relaxed font-sans placeholder-slate-400"
                        maxLength={500}
                      />
                      <span className="text-right text-[10px] text-slate-400">限制 500 字以內 | 支援離線注音資料庫分析</span>
                    </div>
                  </div>
                )}

                {/* AI Theme Topic Generator */}
                {textbook === 'AI 主題產生' && (
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-500">自訂 AI 發想主題（點選後，聯網 Gemini 將自動產出主題生詞字典）</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={aiTopic}
                          onChange={(e) => setAiTopic(e.target.value)}
                          placeholder="例如：熱帶雨林、太空探險、海底動物、美味便當..."
                          className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                          maxLength={30}
                        />
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        系統將使用 <b>Gemini AI</b> 模型幫您自動擬定學童生字難度，並配對正確聲調，極具趣味性！
                      </p>
                    </div>
                  </div>
                )}

                {/* 1v1 PK Arena Setup Controls */}
                {textbook === '1v1 PK 對戰' && (
                  <div className="flex flex-col gap-4 bg-orange-50/20 p-5 rounded-2xl border border-orange-200/50">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-amber-800 flex items-center gap-1.5 uppercase tracking-wider">
                        ⚔️ 雙人注音拼字對抗擂台
                      </span>
                      <div className="flex bg-stone-200 p-0.5 rounded-lg shrink-0">
                        {(['host', 'join'] as const).map((role) => (
                          <button
                            key={role}
                            type="button"
                            onClick={() => {
                              setPkRole(role);
                              setPkLobbyError('');
                            }}
                            className={`px-2.5 py-1 text-[10px] font-black rounded-md transition-all cursor-pointer ${
                              pkRole === role
                                ? 'bg-amber-500 text-white shadow-sm'
                                : 'text-slate-600 hover:text-slate-850'
                            }`}
                          >
                            {role === 'host' ? '開對抗房' : '加入對抗'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {pkLobbyError && (
                      <div className="p-3 bg-red-50 text-red-800 border border-red-200/50 text-xs font-bold rounded-xl flex items-center gap-1.5 animate-pulse">
                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                        <span>{pkLobbyError}</span>
                      </div>
                    )}

                    {isPkPolling && pkRoomState ? (
                      <div className="bg-amber-50 border border-amber-350/60 p-4 rounded-xl flex flex-col items-center justify-center gap-3.5 text-center animate-pulse">
                        <div className="w-8 h-8 border-3 border-amber-500 border-t-amber-800 rounded-full animate-spin" />
                        <div>
                          <div className="text-sm font-black text-amber-950">
                            已成功登錄房號：【{pkRoomState.roomCode}】
                          </div>
                          <div className="text-xs text-amber-700 font-medium mt-1">
                            {pkRole === 'host' 
                              ? '請分享此代碼讓另一台電腦「加入房間」，對方進入後將立刻同步開賽！' 
                              : '對方正在連線中，兩台電腦已自動配對相同題目...'}
                          </div>
                        </div>

                        <div className="w-full border-t border-amber-200 pt-2 flex flex-col gap-1.5 text-left">
                          <span className="text-[10px] text-amber-850 font-black uppercase tracking-wider">房內玩家連線清單：</span>
                          {Object.values(pkRoomState.players).map((p: any) => (
                            <div key={p.username} className="text-xs text-amber-900 font-bold flex items-center gap-1.5 pl-1">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
                              <span>🧑‍💻 {p.username} {p.username === pkUsername ? '(你)' : '(對手已就位)'} 已連線</span>
                            </div>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setIsPkPolling(false);
                            setPkRoomState(null);
                          }}
                          className="px-4 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-700 text-xs font-bold rounded-lg transition-all cursor-pointer"
                        >
                          取消等待
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-500">我的玩家暱稱</label>
                            <input
                              type="text"
                              maxLength={12}
                              value={pkUsername}
                              onChange={(e) => setPkUsername(e.target.value)}
                              placeholder="例如：小華"
                              className="bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-500">房間密碼代碼</label>
                            <input
                              type="text"
                              maxLength={10}
                              value={pkRoomCode}
                              onChange={(e) => setPkRoomCode(e.target.value)}
                              placeholder="例如：8888"
                              className="bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                            />
                          </div>
                        </div>

                        {pkRole === 'host' ? (
                          <div className="flex flex-col gap-3">
                            {/* Question Source Chooser inside PK setup */}
                            <div className="border border-amber-200/50 bg-amber-50/35 p-3 rounded-xl flex flex-col gap-2.5">
                              <span className="text-[10px] font-bold text-amber-950 flex items-center gap-1">
                                🎯 請設定本次 PK 對戰的題目來源：
                              </span>
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  onClick={() => setPkQuestionSource('custom')}
                                  className={`py-1.5 px-1 text-xs font-bold rounded-lg transition-all border cursor-pointer text-center ${
                                    pkQuestionSource === 'custom'
                                      ? 'bg-amber-500 border-amber-500 text-white font-extrabold shadow-sm'
                                      : 'bg-white border-stone-200 text-slate-600 hover:bg-stone-50'
                                  }`}
                                >
                                  ✍️ 房長自訂字句
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setPkQuestionSource('ai')}
                                  className={`py-1.5 px-1 text-xs font-bold rounded-lg transition-all border cursor-pointer text-center ${
                                    pkQuestionSource === 'ai'
                                      ? 'bg-amber-500 border-amber-500 text-white font-extrabold shadow-sm'
                                      : 'bg-white border-stone-200 text-slate-600 hover:bg-stone-50'
                                  }`}
                                >
                                  🤖 AI 主題產生考題
                                </button>
                              </div>

                              {pkQuestionSource === 'custom' ? (
                                <div className="flex flex-col gap-1 text-left mt-0.5">
                                  <label className="text-[10px] font-bold text-slate-500">輸入 PK 自訂中文文章（自動轉為注音）</label>
                                  <textarea
                                    value={pkCustomText}
                                    onChange={(e) => setPkCustomText(e.target.value)}
                                    rows={2}
                                    placeholder="例如：極速注音拼字王擂台，大家準備好了嗎？"
                                    className="w-full bg-white border border-stone-200 rounded-xl p-2 text-[11px] focus:outline-none focus:ring-1 focus:ring-amber-500/20 leading-relaxed font-sans text-slate-800 placeholder-slate-400"
                                    maxLength={150}
                                  />
                                </div>
                              ) : (
                                <div className="flex flex-col gap-1 text-left mt-0.5">
                                  <label className="text-[10px] font-bold text-slate-500">輸入 AI 主題發想關鍵字</label>
                                  <input
                                    type="text"
                                    value={pkAiTopic}
                                    onChange={(e) => setPkAiTopic(e.target.value)}
                                    placeholder="例如：動物園、魔法世界、恐龍探險、水果拼圖..."
                                    className="w-full bg-white border border-stone-200 rounded-xl px-2.5 py-1.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-amber-500/20 text-slate-800"
                                    maxLength={20}
                                  />
                                </div>
                              )}
                            </div>
                            <div className="text-[10px] text-amber-700 leading-normal font-medium bg-amber-50/50 p-3 rounded-xl border border-amber-205/40">
                              💡 <b>房長溫馨提示：</b>您設定的詞彙清單將會在兩台電腦同步下載，題目完全一致，保證 PK 絕對的公平！
                            </div>
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-500 leading-normal font-medium bg-slate-50 p-3 rounded-xl border border-slate-200/40">
                            🤝 <b>對手溫馨提示：</b>加入房號後，系統會自動在房長那端拉取預設題目和總時限，並同步進入拼字大賽畫面！
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={pkRole === 'host' ? handleCreatePkRoom : handleJoinPkRoom}
                          disabled={pkLoading}
                          className={`w-full py-2.5 rounded-xl font-black text-xs active:scale-95 transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer shadow-sm ${
                            pkRole === 'host'
                              ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/15'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/15'
                          }`}
                        >
                          {pkLoading ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : pkRole === 'host' ? (
                            <span>建立並等待對手加入</span>
                          ) : (
                            <span>輸入密碼加入對戰</span>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Play Mode Selector Area */}
                <div className="border-t border-stone-100 pt-4 flex flex-col gap-2.5">
                  <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500 animate-spin" />
                    遊戲挑戰模式選擇
                  </span>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setPlayModeType('normal');
                      }}
                      className={`p-3.5 rounded-2xl flex flex-col gap-1 items-start text-left border transition-all cursor-pointer ${
                        playModeType === 'normal'
                          ? 'bg-amber-50/50 border-amber-300 text-amber-950 ring-2 ring-amber-400/25 font-bold'
                          : 'bg-white border-stone-200 text-slate-600 hover:bg-stone-50'
                      }`}
                    >
                      <span className="text-xs font-black flex items-center gap-1">
                        🏆 闖關挑戰模式
                      </span>
                      <span className="text-[10px] text-slate-400 leading-relaxed">
                        打完指定數量題目，即完成挑戰。適合平時練習。
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPlayModeType('timeAttack');
                        setTimeLimit(60); // default to 60s for time attack speedrun
                        setInfiniteTime(false);
                      }}
                      className={`p-3.5 rounded-2xl flex flex-col gap-1 items-start text-left border transition-all cursor-pointer ${
                        playModeType === 'timeAttack'
                          ? 'bg-rose-50/40 border-rose-300 text-rose-950 ring-2 ring-rose-400/25 font-bold'
                          : 'bg-white border-stone-200 text-slate-600 hover:bg-stone-50'
                      }`}
                    >
                      <span className="text-xs font-black text-rose-700 flex items-center gap-1">
                        ⚡ 極速限時模式
                      </span>
                      <span className="text-[10px] text-slate-400 leading-relaxed">
                        時限內挑戰手速，字庫自動循環，打越多字分數越高！
                      </span>
                    </button>
                  </div>
                </div>

                {/* Question Count Constraints Area */}
                {playModeType === 'normal' ? (
                  <div className="border-t border-stone-100 pt-4 flex flex-col gap-2.5">
                    <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-slate-500" />
                      題目數量選擇
                    </span>
                    
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { label: '3 題', value: 3 },
                        { label: '5 題', value: 5 },
                        { label: '10 題', value: 10 },
                        { label: '20 題', value: 20 }
                      ].map((opt) => (
                        <button
                          key={opt.label}
                          type="button"
                          onClick={() => {
                            setQuestionCountLimit(opt.value);
                          }}
                          className={`py-2 text-xs font-bold rounded-xl transition-all border cursor-pointer ${
                            questionCountLimit === opt.value
                              ? 'bg-amber-50 border-amber-300 text-amber-700 font-extrabold shadow-sm'
                              : 'bg-white border-stone-200 text-slate-600 hover:bg-stone-50'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="border-t border-stone-100 pt-4 flex flex-col gap-1.5 google-classroom-accent">
                    <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-rose-500" />
                      題目數量限制
                    </span>
                    <div className="bg-rose-50/50 border border-rose-200/60 p-3 rounded-2xl text-[11px] text-rose-800 leading-relaxed font-bold">
                      💡 <b>「限時模式」專屬機制：</b>時限內將不設題數上限！如果您的自訂題庫已打完，系統會自動在時限內循環出題，直到倒數結束為止！
                    </div>
                  </div>
                )}

                {/* Timer Constraints Area */}
                <div className="border-t border-stone-100 pt-4 flex flex-col gap-2.5">
                  <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                    <Timer className="w-4 h-4 text-slate-500" />
                    時間限制設定
                  </span>
                  
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: '60 秒', value: 60, inf: false },
                      { label: '3 分鐘', value: 180, inf: false },
                      { label: '5 分鐘', value: 300, inf: false },
                      { label: '不限時間', value: 9999, inf: true }
                    ].map((opt) => (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => {
                          setTimeLimit(opt.value);
                          setInfiniteTime(opt.inf);
                        }}
                        className={`py-2 text-xs font-bold rounded-xl transition-all border ${
                          (infiniteTime && opt.inf) || (!infiniteTime && !opt.inf && timeLimit === opt.value)
                            ? 'bg-amber-50 border-amber-300 text-amber-700 font-extrabold shadow-sm'
                            : 'bg-white border-stone-200 text-slate-600 hover:bg-stone-50'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {/* Custom Minutes and Seconds Time limit Setting */}
                  <div className="flex items-center gap-2 mt-2.5 bg-stone-50 border border-stone-200/60 p-2.5 rounded-xl">
                    <span className="text-[11px] text-slate-500 font-bold shrink-0">⏰ 自訂倒數秒數：</span>
                    <input
                      type="number"
                      min="5"
                      max="3600"
                      value={infiniteTime ? '' : timeLimit}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (!isNaN(val) && val > 0) {
                          setTimeLimit(val);
                          setInfiniteTime(false);
                        }
                      }}
                      placeholder="自訂秒數"
                      className="flex-1 max-w-[120px] bg-white border border-stone-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-amber-400 font-mono text-slate-800 font-extrabold focus:ring-1 focus:ring-amber-300"
                    />
                    <span className="text-[10px] text-slate-400 font-medium">秒 (範圍 5 至 3600 秒)</span>
                  </div>
                </div>

                {/* Action Trigger Buttons */}
                {textbook !== '1v1 PK 對戰' && (
                  <div className="mt-2">
                  {apiError && (
                    <div className="mb-4 p-3 bg-red-50 text-red-800 rounded-xl border border-red-100 flex items-start gap-2 text-xs leading-relaxed">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <b>連線金鑰提示：</b>{apiError}
                        <div className="text-[10px] text-red-500 mt-1">若尚未在 Secrets 設定 GEMINI_API_KEY，自訂題目仍可本機轉換播放！</div>
                      </div>
                    </div>
                  )}

                  {textbook === 'AI 主題產生' ? (
                    <button
                      id="ai_start_btn"
                      onClick={handleAiGenerateTopic}
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-amber-500/10 active:scale-95 transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                      {loading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>AI 生成詞彙與注音中...請稍候</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>開始 AI 主題產生考題</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      id="custom_start_btn"
                      onClick={handleCustomTextParse}
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-emerald-600/10 active:scale-95 transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                      {loading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>解析漢字與注音庫中，請稍候</span>
                        </>
                      ) : (
                        <>
                          <FileText className="w-4 h-4" />
                          <span>轉換自訂字句並開始挑戰</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
                )}
              </div>

              {/* Informational Board / Help pane */}
              <div id="tutorial_info_deck" className="lg:col-span-5 flex flex-col gap-6">
                
                {/* Visual Keyboard Guide Banner */}
                <div className="bg-stone-900 text-stone-100 p-6 rounded-3xl border border-stone-800 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
                  
                  <div className="relative">
                    <h3 className="text-base font-extrabold text-amber-400 flex items-center gap-2">
                      <KeyboardIcon className="w-5 h-5 text-amber-400" />
                      專用「模擬英文輸入」機制
                    </h3>
                    
                    <p className="text-xs text-stone-300 mt-2.5 leading-relaxed">
                      為了防止瀏覽器原生中文輸入法（如微軟注音）產生的選字視窗、聯想詞干擾練習，本軟體採用<b>直接攔截實體鍵盤 (English Key Layout)</b> 的高感度設計！
                    </p>

                    <div className="mt-4 p-3.5 bg-stone-800/80 rounded-2xl border border-stone-700 flex flex-col gap-2.5">
                      <div className="text-xs font-bold text-amber-200">🔑 玩家操作步驟：</div>
                      <ol className="text-xs text-stone-300 list-decimal list-inside flex flex-col gap-1.5">
                        <li>確認已將電腦輸入法切換至 <span className="px-1.5 py-0.5 bg-stone-900 border border-stone-600 rounded font-mono text-[10px] text-amber-300 font-extrabold">英文/半形</span> 狀態。</li>
                        <li>眼睛盯著中央的中文字。</li>
                        <li>直接敲擊對應的英文鍵（例如輸入「河 ㄏㄜˊ」，鍵盤敲擊 <span className="font-mono bg-stone-950 px-1 rounded border border-stone-700">c</span> + <span className="font-mono bg-stone-950 px-1 rounded border border-stone-700">k</span> + <span className="font-mono bg-stone-950 px-1 rounded border border-stone-700">6</span>）。</li>
                        <li>聲調代號對應：
                          <div className="grid grid-cols-2 gap-1.5 mt-2 pl-4 text-[11px] text-stone-400">
                            <span>2 聲 (ˊ)：鍵盤 <span className="font-mono bg-stone-950 px-1 rounded">6</span></span>
                            <span>3 聲 (ˇ)：鍵盤 <span className="font-mono bg-stone-950 px-1 rounded">3</span></span>
                            <span>4 聲 (ˋ)：鍵盤 <span className="font-mono bg-stone-950 px-1 rounded">4</span></span>
                            <span>輕 聲 (˙)：鍵盤 <span className="font-mono bg-stone-950 px-1 rounded">7</span></span>
                            <span className="col-span-2">1 聲 (ˉ/無)：敲完最後一個韻母，直接按 <span className="font-mono bg-stone-950 px-1 rounded text-amber-300">空白鍵</span>。</span>
                          </div>
                        </li>
                      </ol>
                    </div>
                  </div>
                </div>

                {/* Grade Statistics Banner */}
                <div className="bg-amber-50 border border-amber-200/65 p-6 rounded-3xl flex flex-col gap-3">
                  <h4 className="text-sm font-extrabold text-amber-800 flex items-center gap-1.5">
                    <Award className="w-5 h-5 text-amber-600" />
                    學習要點說明
                  </h4>
                  <ul className="text-xs text-slate-600 flex flex-col gap-2 list-disc list-inside leading-relaxed">
                    <li>本系統中間字庫<b>不顯示任何注音提示</b>，旨在強迫學童在大腦中進行「國字讀音解碼」。</li>
                    <li>極速輸入拼音：拼寫正確立即前進下一個字母，打字一律不累積多餘贅字、無延遲。</li>
                    <li>隨時能利用鍵盤 <span className="font-mono px-1 py-0.5 bg-white border border-stone-300 rounded text-[10px]">Backspace</span> 刪除已敲字母，安全方便。</li>
                  </ul>
                </div>
              </div>

            </motion.div>
          )}

          {/* ==================== 2. MAIN ACTIVE PLAY GAMEPLAY ==================== */}
          {gameMode === 'play' && activeWord && (
            <motion.div
              key="play_screen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-4xl mx-auto w-full flex flex-col gap-6"
            >
              {/* PK Mode Live Duel Status Scoreboard */}
              {textbook === '1v1 PK 對戰' && pkRoomState && (
                <div className="bg-gradient-to-r from-orange-400 to-amber-500 p-0.5 rounded-3xl shadow-xl border border-orange-300">
                  <div className="bg-amber-950/95 text-white rounded-[22px] px-5 py-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5 animate-pulse">
                        ⚔️ 1v1 線上即時拼字對抗賽
                      </span>
                      <span className="text-[10px] bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 rounded-full text-amber-400 font-mono font-bold">
                        對決房號: {pkRoomCode}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {Object.values(pkRoomState.players).map((p: any) => {
                        const isMe = p.username === pkUsername;
                        return (
                          <div key={p.username} className="flex flex-col gap-1.5 px-2 first:border-r first:border-amber-950/40">
                            <div className="flex items-center justify-between">
                              <span className={`text-xs font-extrabold flex items-center gap-1.5 ${isMe ? 'text-amber-300' : 'text-stone-300'}`}>
                                {isMe ? '🧑‍💻' : '🧑‍🏫'} {p.username} {isMe && '(你)'}
                              </span>
                              <span className="text-xs font-black font-mono text-amber-400">
                                {p.score || 0} 分
                              </span>
                            </div>

                            <div className="w-full bg-stone-900/80 h-3 rounded-full overflow-hidden p-[2px] border border-stone-800">
                              <div 
                                className={`h-full rounded-full transition-all duration-300 ${isMe ? 'bg-gradient-to-r from-amber-400 to-yellow-300' : 'bg-gradient-to-r from-sky-400 to-blue-300'}`}
                                style={{ width: `${Math.min(100, Math.max(12, ((p.completedCount || 0) / (selectedWords.length || 10)) * 100))}%` }}
                              />
                            </div>

                            <div className="flex justify-between text-[10px] text-stone-400 font-medium font-mono">
                              <span>答對: {p.completedCount || 0} 詞</span>
                              <span>正確率: {p.accuracy || 100}%</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Stat Strip bar */}
              <div id="game_stats_bar" className="grid grid-cols-2 md:grid-cols-5 gap-3">
                
                {/* 1. Timer Countdown */}
                <div className="bg-white p-3 rounded-2xl border border-stone-200 flex items-center gap-2.5">
                  <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
                    <Timer className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold">剩餘時間</div>
                    <div className="text-base font-black font-mono text-slate-800">
                      {infiniteTime ? '無限制' : `${timeRemaining} 秒`}
                    </div>
                  </div>
                </div>

                {/* 2. Completed / Total Words progress */}
                <div className="bg-white p-3 rounded-2xl border border-stone-200 flex items-center gap-2.5">
                  <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
                    <BookOpen className="w-5 h-5 animate-bounce" />
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold">
                      {playModeType === 'timeAttack' ? '已拼對詞數' : '進度個數'}
                    </div>
                    <div className="text-base font-black text-slate-800">
                      {playModeType === 'timeAttack' 
                        ? `${completedWordItems.length} 個` 
                        : `${currentWordIndex + 1} / ${selectedWords.length} 個`}
                    </div>
                  </div>
                </div>

                {/* 3. Accuracy level */}
                <div className="bg-white p-3 rounded-2xl border border-stone-200 flex items-center gap-2.5">
                  <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold">正確率</div>
                    <div className="text-base font-black font-mono text-emerald-600">
                      {accuracyPercent}%
                    </div>
                  </div>
                </div>

                {/* 4. Speed (Characters Per Minute) */}
                <div className="bg-white p-3 rounded-2xl border border-stone-200 flex items-center gap-2.5">
                  <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold">速度倍乘</div>
                    <div className="text-sm font-bold text-blue-600 flex items-center gap-1">
                      <span>{cpmSpeed} CPM</span>
                      <span className="text-[10px] bg-blue-100 text-blue-800 px-1 py-0.2 rounded">
                        x{stats.multiplier}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 5. Game score */}
                <div className="bg-white p-3 rounded-2xl border border-stone-200 col-span-2 md:col-span-1 flex items-center gap-2.5">
                  <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                    <Sparkles className="w-5 h-5 text-indigo-500 animate-spin" />
                  </div>
                  <div className="flex-1">
                    <div className="text-[10px] text-slate-400 font-bold font-sans">當前得積分</div>
                    <div className="text-base font-black text-indigo-600 font-mono">
                      {stats.score}
                    </div>
                  </div>
                </div>

              </div>

              {/* Core Presentation Arena */}
              <div 
                id="word_arena_panel" 
                className={`bg-white p-8 md:p-12 rounded-3xl border transition-all duration-150 relative overflow-hidden flex flex-col items-center justify-center min-h-[340px] ${
                  wrongAnswer
                    ? 'border-red-400 bg-red-50/15 shadow-xl shadow-red-100/30'
                    : wrongKeyFlash 
                      ? 'border-orange-400 bg-orange-50/10 shadow-lg' 
                      : 'border-stone-200/90 shadow-2xl shadow-stone-100/30'
                }`}
              >
                {/* School blackboard accent background to support cozy classroom theme */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-yellow-400 to-emerald-400" />
                
                {/* Source marker badge */}
                <div className="absolute top-4 left-4 flex gap-1.5 items-center">
                  <span className="text-[10px] bg-stone-100 text-slate-500 font-extrabold px-2.5 py-1 rounded-lg border border-stone-200/50 uppercase tracking-wider">
                    練習模式：{textbook}
                  </span>
                  {playModeType === 'timeAttack' && (
                    <span className="text-[10px] bg-rose-100 text-rose-700 font-black px-2 py-0.5 rounded-md border border-rose-200 animate-pulse">
                      ⚡ 極速限時倒數中
                    </span>
                  )}
                </div>

                {/* Floating controls */}
                <div className="absolute top-4 right-4 flex gap-2">
                  <button
                    onClick={() => {
                      setShowHint(true);
                      setTimeout(() => setShowHint(false), 2000);
                    }}
                    className="p-1 px-2 text-[10px] font-extrabold bg-stone-100 hover:bg-stone-200 text-slate-500 rounded-lg flex items-center gap-1 cursor-pointer"
                    title="短暫顯示當前注音 2 秒，可協助卡關時過關"
                  >
                    <HelpCircle className="w-3 h-3" />
                    注音提示
                  </button>

                  <button
                    onClick={() => {
                      if (confirm('確定要放棄並重新開始設定嗎？')) {
                        setGameMode('setup');
                        setTimerActive(false);
                      }
                    }}
                    className="p-1 px-2 text-[10px] font-bold bg-stone-100 hover:bg-red-50 hover:text-red-700 text-slate-500 rounded-lg flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    重新設定
                  </button>
                </div>

                {/* Big word question display (BOPOMOFO HIDDEN) */}
                <div className="flex flex-col items-center gap-6 mt-4 w-full">
                  <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">當前拼音題字</div>
                  
                  {/* Huge Chinese characters */}
                  <div className="flex items-center gap-1.5 text-slate-900 justify-center">
                    {Array.from(activeWord.word).map((character, idx) => {
                      const isActiveChar = idx === currentCharacterIndex;
                      const isCompletedChar = idx < currentCharacterIndex;

                      return (
                        <div
                          key={idx}
                          onClick={() => setCurrentCharacterIndex(idx)}
                          className={`flex flex-col items-center relative py-1 px-3.5 rounded-2xl transition-all duration-300 cursor-pointer ${
                            isActiveChar 
                              ? 'bg-amber-50/50 scale-110 border-2 border-dashed border-amber-300/80 shadow-md ring-4 ring-amber-400/5' 
                              : isCompletedChar 
                                ? 'text-emerald-600 bg-emerald-50/20 opacity-70' 
                                : 'text-slate-400 scale-95 opacity-50 hover:opacity-80'
                          }`}
                        >
                          <span className="text-7xl md:text-8xl font-black font-serif select-none">
                            {character}
                          </span>
                          
                          {/* Progress indicator bubble */}
                          <div className="absolute -top-3 bg-white border px-2 py-0.5 rounded-full text-[9px] font-extrabold shadow-sm">
                            {isActiveChar ? '拼寫中' : isCompletedChar ? '完成 ✓' : '等待'}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {wrongAnswer && (
                    <div className="bg-rose-50 text-rose-800 border border-rose-200/60 px-5 py-2 rounded-2xl text-xs font-bold leading-relaxed shadow-sm flex items-center gap-2 animate-bounce">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>答案拼寫不完全或不正確，請修改後再次按「Enter鍵」送出</span>
                    </div>
                  )}

                  {/* Character slot spellers */}
                  <div className="flex flex-wrap items-center justify-center gap-4 w-full max-w-2xl mt-2">
                    {activeWord.characters.map((charItem, charIdx) => {
                      const isActive = charIdx === currentCharacterIndex;
                      const isPast = charIdx < currentCharacterIndex;
                      
                      // Explicitly get true sequence including space slots
                      const sylSymbols = getCharacterTargetSymbols(charItem.bopomofo);
                      const typedSymbols = typedWordSymbols[charIdx] || [];

                      // Calculate correctness of this specific character in real-time
                      let isCharCorrect = true;
                      if (typedSymbols.length !== sylSymbols.length) {
                        isCharCorrect = false;
                      } else {
                        for (let sIdx = 0; sIdx < sylSymbols.length; sIdx++) {
                          const eSym = sylSymbols[sIdx];
                          const tSym = typedSymbols[sIdx];
                          if (eSym === ' ' || eSym === 'ˉ') {
                            if (tSym !== ' ' && tSym !== 'ˉ') {
                              isCharCorrect = false;
                              break;
                            }
                          } else if (tSym !== eSym) {
                            isCharCorrect = false;
                            break;
                          }
                        }
                      }

                      // Check if any symbols typed so far are incorrect (real-time error checking)
                      // Determine if this character box has an error or is incorrect (only after submitting)
                      const hasError = wrongAnswer && wrongCharIndices.includes(charIdx);
                      const isCorrectlyFinished = wrongAnswer && !wrongCharIndices.includes(charIdx);

                      return (
                        <div 
                          key={charIdx}
                          onClick={() => setCurrentCharacterIndex(charIdx)}
                          className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all duration-300 cursor-pointer flex-1 min-w-[160px] ${
                            hasError
                              ? 'border-red-500 bg-red-50/50 shadow-md shadow-red-100/20 ring-2 ring-red-400/20 scale-102 animate-shake'
                              : isCorrectlyFinished
                                ? 'border-emerald-500 bg-emerald-50/15 shadow-md shadow-emerald-100/10'
                                : isActive
                                  ? 'border-amber-400 bg-amber-50/15 shadow-lg shadow-amber-100/10 scale-105 ring-2 ring-amber-300/20'
                                  : 'border-stone-200 bg-stone-50/40 hover:bg-stone-100/80 opacity-70'
                          }`}
                        >
                          <span className={`text-xs font-extrabold font-serif flex items-center gap-1 ${
                            hasError ? 'text-red-700' : isCorrectlyFinished ? 'text-emerald-700' : 'text-slate-500'
                          }`}>
                            {hasError ? '❌' : isCorrectlyFinished ? '✓' : '🎯'} 「{charItem.char}」的注音符號
                          </span>

                          <div className="flex items-center gap-2">
                            {sylSymbols.map((sym, symbolIdx) => {
                              const typedForChar = typedWordSymbols[charIdx] || [];
                              const isFilled = symbolIdx < typedForChar.length;
                              const isCurrentlyTarget = isActive && symbolIdx === typedForChar.length;
                              
                              // Real-time symbol correctness check (only activates after submit has marked error)
                              let isSymbolIncorrect = false;
                              if (hasError && symbolIdx < typedForChar.length) {
                                const eSym = sym;
                                const tSym = typedForChar[symbolIdx];
                                if (eSym === ' ' || eSym === 'ˉ') {
                                  if (tSym !== ' ' && tSym !== 'ˉ') {
                                    isSymbolIncorrect = true;
                                  }
                                } else if (tSym !== eSym) {
                                  isSymbolIncorrect = true;
                                }
                              }

                              let displaySymbol = '';
                              if (symbolIdx < typedForChar.length) {
                                const t = typedForChar[symbolIdx];
                                displaySymbol = t === ' ' ? 'ˉ' : t;
                              }

                              return (
                                <div
                                  key={symbolIdx}
                                  className={`w-11 h-13 rounded-xl flex flex-col items-center justify-center text-lg font-black font-mono transition-all border ${
                                    isSymbolIncorrect
                                      ? 'bg-red-100 border-red-300 text-red-700 font-bold'
                                      : isCorrectlyFinished
                                        ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                                        : isFilled
                                          ? hasError
                                            ? 'bg-emerald-50 border-emerald-200 text-emerald-600 opacity-80' // Correct symbol in failed card
                                            : 'bg-amber-400 border-amber-500 text-slate-800 scale-105'
                                          : isCurrentlyTarget
                                            ? 'bg-white border-amber-400 text-slate-400 animate-bounce shadow-sm ring-2 ring-amber-300'
                                            : 'bg-stone-50 border-stone-200 text-slate-200'
                                  }`}
                                >
                                  <span className="leading-none">{displaySymbol}</span>
                                </div>
                              );
                            })}
                          </div>

                          {/* Temporary help hint text if trigger toggled */}
                          {(showHint || highlightHelper) && isActive && (
                            <div className="text-[10px] font-extrabold text-amber-700 bg-amber-100/70 px-2.5 py-0.5 rounded-full animate-pulse">
                              解答提示：{charItem.bopomofo || '無'}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Submit Shortcuts Button Strip Panel */}
                  <div className="flex flex-col sm:flex-row items-center gap-3 mt-4 w-full justify-center max-w-md">
                    <button
                      id="skip_question_btn"
                      type="button"
                      onClick={handleSkipWord}
                      className="px-5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-xl font-bold text-xs active:scale-95 transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer flex-1 w-full border border-stone-200"
                    >
                      <span>跳過此題 [ 按 <b>Tab</b> 鍵 ]</span>
                    </button>

                    <button
                      id="submit_word_btn"
                      type="button"
                      onClick={handleSubmitWord}
                      className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-black text-xs active:scale-95 transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer flex-1 w-full shadow-md shadow-amber-500/15"
                    >
                      <span>確認送出 [ 按 <b>Enter</b> 鍵 ]</span>
                    </button>
                  </div>

                  {/* Word dictionary definition label */}
                  {activeWord.meaning && (
                    <p className="text-xs text-slate-400 max-w-md text-center line-clamp-2 italic leading-relaxed border-t border-stone-100 pt-3.5 px-4">
                      詞義辭源：{activeWord.meaning}
                    </p>
                  )}

                  <div className="text-[10px] text-slate-400/80 mt-1 uppercase tracking-widest font-bold">
                    請按鍵盤輸入注音，或點選下方軟鍵盤。Backspace 鍵可刪除
                  </div>

                </div>

              </div>

              {/* ==================== BOPOMOFO HIGH-FIDELITY CHASSIS KEYBOARD ==================== */}
              <div id="keyboard_panel" className="bg-stone-100 p-4 sm:p-5 rounded-3xl border border-stone-200 shadow-md">
                
                {/* 4 Rows of standard Taiwanese layout */}
                <div className="flex flex-col gap-2">
                  {[
                    // Row 1
                    ['ㄅ', 'ㄉ', 'ˇ', 'ˋ', 'ㄓ', 'ˊ', '˙', 'ㄚ', 'ㄞ', 'ㄢ', 'ㄦ'],
                    // Row 2
                    ['ㄆ', 'ㄊ', 'ㄍ', 'ㄐ', 'ㄔ', 'ㄗ', 'ㄧ', 'ㄛ', 'ㄟ', 'ㄣ'],
                    // Row 3
                    ['ㄇ', 'ㄋ', 'ㄎ', 'ㄑ', 'ㄕ', 'ㄘ', 'ㄨ', 'ㄜ', 'ㄠ', 'ㄤ'],
                    // Row 4
                    ['ㄈ', 'ㄌ', 'ㄏ', 'ㄒ', 'ㄖ', 'ㄙ', 'ㄩ', 'ㄝ', 'ㄡ', 'ㄥ']
                  ].map((row, rowIdx) => (
                    <div key={rowIdx} className="flex justify-center gap-1 sm:gap-1.5 w-full">
                      {row.map((symbol) => {
                        const qwertyKey = BOPOMOFO_TO_KEY[symbol] || '';
                        
                        // Check active status
                        const isActivePressed = physicalKeyPress === symbol;
                        
                        // Check if this key corresponds to the exact correct next key
                        const currentTypedForAc = typedWordSymbols[currentCharacterIndex] || [];
                        const correctNextSymbol = targetSymbols[currentTypedForAc.length];
                        const isHintRecommended = highlightHelper && correctNextSymbol === symbol;

                        return (
                          <button
                            key={symbol}
                            type="button"
                            onClick={() => handleBopomofoInput(symbol)}
                            className={`flex flex-col items-center justify-between p-1 sm:p-2 h-10 sm:h-12 flex-1 max-w-[56px] rounded-lg sm:rounded-xl border transition-all cursor-pointer ${
                              isActivePressed
                                ? 'bg-amber-500 text-white border-amber-600 scale-90 translate-y-0.5'
                                : isHintRecommended
                                  ? 'bg-emerald-400 text-slate-900 border-emerald-500 scale-105 font-black ring-4 ring-emerald-300 animate-pulse shadow-md'
                                  : 'bg-white border-stone-300/80 text-slate-700 hover:bg-stone-50 hover:border-stone-400 active:scale-95'
                            }`}
                          >
                            <span className="text-sm sm:text-base font-black font-mono leading-none">
                              {symbol}
                            </span>
                            <span className="text-[8px] sm:text-[9px] font-extrabold text-slate-400 uppercase leading-none font-mono">
                              {qwertyKey}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ))}

                  {/* Spacebar Row */}
                  <div className="flex justify-center gap-1 sm:gap-1.5 w-full mt-1">
                    {/* Backspace utility */}
                    <button
                      type="button"
                      onClick={handleBackspace}
                      className="px-4 h-10 sm:h-12 rounded-lg sm:rounded-xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 font-extrabold text-xs active:scale-95 cursor-pointer uppercase flex items-center justify-center gap-1"
                    >
                      <span>倒退</span>
                      <span className="text-[9px] text-rose-500 font-mono">Back</span>
                    </button>

                    {/* True Spacebar Mapping First tone */}
                    <button
                      type="button"
                      onClick={() => handleBopomofoInput(' ')}
                      className={`h-10 sm:h-12 flex-1 max-w-sm rounded-lg sm:rounded-xl border transition-all cursor-pointer flex flex-col items-center justify-center leading-none ${
                        physicalKeyPress === ' ' || physicalKeyPress === 'ˉ'
                          ? 'bg-amber-500 text-white border-amber-600'
                          : highlightHelper && (targetSymbols[(typedWordSymbols[currentCharacterIndex] || []).length] === ' ' || targetSymbols[(typedWordSymbols[currentCharacterIndex] || []).length] === 'ˉ' || targetSymbols[(typedWordSymbols[currentCharacterIndex] || []).length] === undefined)
                            ? 'bg-emerald-400 text-slate-900 border-emerald-500 ring-4 ring-emerald-300 font-bold'
                            : 'bg-white border-stone-300 text-slate-700 hover:bg-stone-50'
                      }`}
                    >
                      <span className="text-xs sm:text-sm font-black leading-none">空白鍵 SPACE ˉ</span>
                      <span className="text-[8px] sm:text-[9px] text-slate-400 mt-1">（一聲 / 確認前進）</span>
                    </button>
                  </div>

                </div>

              </div>
            </motion.div>
          )}

          {/* ==================== 3. ANALYTICS RESULT SCREEN ==================== */}
          {gameMode === 'result' && (
            <motion.div
              key="result_screen"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-2xl mx-auto w-full bg-white p-8 md:p-10 rounded-3xl border border-stone-200 shadow-2xl relative"
            >
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-400 via-amber-500 to-emerald-500 rounded-t-3xl" />

              <div className="flex flex-col items-center text-center gap-6 mt-2">
                <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center border-4 border-amber-200 text-amber-500 animate-spin">
                  <Sparkles className="w-10 h-10 text-amber-500" />
                </div>

                <div>
                  <h2 className="text-2xl font-black text-slate-900 leading-tight">學習解析報告</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    恭喜您完成挑戰！以下是您本次注音打字大進擊的學習數據：
                  </p>
                </div>

                {/* Score Canvas Grid */}
                <div className="grid grid-cols-2 gap-4 w-full mt-4">
                  
                  {/* Score */}
                  <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100 flex flex-col justify-center">
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider">打字總積分</span>
                    <span className="text-3xl font-black text-indigo-600 mt-1 font-mono">{stats.score} 分</span>
                  </div>

                  {/* Words Spelled */}
                  <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100 flex flex-col justify-center">
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider">拼出總詞量</span>
                    <span className="text-3xl font-black text-slate-800 mt-1 font-mono">{stats.completedCount} 個詞</span>
                  </div>

                  {/* Accuracy rate */}
                  <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100 flex flex-col justify-center">
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider">精準正確率</span>
                    <span className="text-3xl font-black text-emerald-600 mt-1 font-mono">{accuracyPercent}%</span>
                  </div>

                  {/* Typing CPM Speed */}
                  <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100 flex flex-col justify-center">
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider">按鍵速度 (CPM)</span>
                    <span className="text-3xl font-black text-blue-600 mt-1 font-mono">{cpmSpeed} 字/分</span>
                  </div>

                </div>

                {/* 1v1 PK 對戰 Results Score comparison Section */}
                {textbook === '1v1 PK 對戰' && pkRoomState && (
                  <div className="w-full bg-gradient-to-r from-orange-100 to-amber-100 p-5 rounded-2xl border border-amber-300 flex flex-col gap-4 text-left mt-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🏆</span>
                      <span className="text-sm font-black text-amber-950 uppercase tracking-widest">
                        PK 對抗戰統計成績單
                      </span>
                    </div>

                    <div className="flex flex-col gap-2.5">
                      {Object.values(pkRoomState.players).map((p: any) => {
                        const isMe = p.username === pkUsername;
                        const isFinished = p.isFinished;
                        
                        return (
                          <div 
                            key={p.username}
                            className={`p-3.5 rounded-xl border flex flex-col gap-2 transition-all ${
                              isMe 
                                ? 'bg-white border-amber-450 shadow-sm' 
                                : 'bg-white/85 border-stone-250'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                                {isMe ? `🧑‍💻 我的戰績：${p.username}` : `🧑‍🏫 對戰對手：${p.username}`}
                              </span>
                              <span className="text-sm font-black text-rose-600 font-mono">
                                {p.score || 0} 分
                              </span>
                            </div>

                            <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold text-slate-500">
                              <div className="bg-stone-50 p-1.5 rounded-lg border border-stone-100">
                                <div>合格拼對</div>
                                <div className="text-xs text-slate-800 font-black mt-0.5">{p.completedCount || 0} 詞</div>
                              </div>
                              <div className="bg-stone-50 p-1.5 rounded-lg border border-stone-100">
                                <div>正確率</div>
                                <div className="text-xs text-emerald-700 font-black mt-0.5">{p.accuracy || 100}%</div>
                              </div>
                              <div className="bg-stone-50 p-1.5 rounded-lg border border-stone-100">
                                <div>對戰狀態</div>
                                <div className={`text-xs font-black mt-0.5 ${isFinished ? 'text-blue-700' : 'text-orange-500 animate-pulse'}`}>
                                  {isFinished ? '已完成 🏁' : '奮力拼寫中...'}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Dynamic Winner crown announcement! */}
                    {Object.values(pkRoomState.players).every((p: any) => p.isFinished) && (
                      <div className="bg-emerald-700 text-white rounded-xl p-3.5 text-center flex flex-col items-center justify-center gap-1 shadow-md">
                        <span className="text-lg">👑 本場拼字大擂台贏家 👑</span>
                        <div className="text-sm font-black mt-1">
                          {(() => {
                            const players = Object.values(pkRoomState.players) as any[];
                            if (players.length < 2) return `恭喜 ${pkUsername} 獨佔鰲頭！`;
                            const p1 = players[0];
                            const p2 = players[1];
                            if (p1.score > p2.score) return `恭喜 【${p1.username}】 榮登拼音之冠！`;
                            if (p2.score > p1.score) return `恭喜 【${p2.username}】 榮登拼音之冠！`;
                            return '雙方平分秋色，握手言和！';
                          })()}
                        </div>
                        <span className="text-[10px] text-emerald-200 mt-0.5">反應流暢且聲調完全到位，簡直是注音神射手！</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Completed words tags */}
                {completedWordItems.length > 0 && (
                  <div className="w-full text-left mt-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">本次拼寫成功字庫：</span>
                    <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 bg-stone-50/50 rounded-2xl border border-stone-100">
                      {completedWordItems.map((wordItem, idx) => (
                        <div key={idx} className="flex items-center gap-1 text-xs bg-white border border-stone-200.text-slate-700 px-3 py-1 rounded-xl">
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="font-bold">{wordItem.word}</span>
                          <span className="text-[10px] text-slate-400">({wordItem.characters.map(c => c.bopomofo).join('')})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Stats recap row */}
                <p className="text-[10px] text-slate-400">
                  總點擊按鍵：{totalKeystrokes} 次 | 錯誤拼鍵：{stats.incorrectCount} 次 | 耗時：{stats.totalTimeSpent} 秒
                </p>

                {/* Button actions */}
                <div className="flex gap-4 w-full mt-2">
                  <button
                    onClick={() => {
                      // Restart active lesson words list
                      setCurrentWordIndex(0);
                      setCurrentCharacterIndex(0);
                      setTypedWordSymbols(selectedWords.length > 0 ? selectedWords[0].characters.map(() => []) : []);
                      setWrongAnswer(false);
                      setCompletedWordItems([]);
                      setTimeRemaining(timeLimit);
                      setGameMode('play');
                      setTimerActive(true);
                      setStats({
                        correctCount: 0,
                        incorrectCount: 0,
                        completedCount: 0,
                        startTime: Date.now(),
                        totalTimeSpent: 0,
                        multiplier: 1,
                        score: 0
                      });
                    }}
                    className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold py-3 px-4 rounded-xl shadow-md cursor-pointer active:scale-95 transition-all text-sm flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw className="w-4 h-4" />
                    再挑戰一次
                  </button>

                  <button
                    onClick={() => setGameMode('setup')}
                    className="flex-1 bg-stone-100 hover:bg-stone-200 text-slate-700 font-bold py-3 px-4 rounded-xl cursor-pointer active:scale-95 transition-all text-sm border border-stone-200"
                  >
                    更換章節/設定
                  </button>
                </div>

              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* Footer copyright */}
      <footer id="app_footer" className="text-center py-6 border-t border-stone-200 text-slate-400 text-xs flex flex-col gap-1 items-center bg-white/40">
        <p>© 2026 注音輸入挑戰學堂 - 仿國小 1200 字及 3 分鐘打字練習模式設計</p>
        <p className="opacity-80">
          支援實體鍵盤（英文狀態）和螢幕觸控點擊 QWERTY 注音鍵盤對應
        </p>
      </footer>

      {/* Synchronized Battle Countdown Overlay */}
      {pkCountdown > 0 && (
        <div className="fixed inset-0 bg-stone-950/85 backdrop-blur-lg flex flex-col items-center justify-center z-50">
          <div className="text-center animate-bounce p-8">
            <div className="text-[130px] md:text-[170px] font-black font-mono text-amber-400 leading-none drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)]">
              {pkCountdown}
            </div>
            <div className="text-xl font-black text-white tracking-widest mt-6 bg-amber-500/10 px-6 py-2 rounded-full border border-amber-500/30">
              ⚔️ 兩台電腦已對齊！線上對擊同步載入中... ⚔️
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
