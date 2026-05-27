/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CharacterPronunciation {
  char: string;       // e.g., "河"
  bopomofo: string;   // e.g., "ㄏㄜˊ"
}

export interface VocabularyItem {
  word: string;                          // e.g., "河流"
  characters: CharacterPronunciation[];  // e.g., [{char: "河", bopomofo: "ㄏㄜˊ"}, {char: "流", bopomofo: "ㄌㄧㄡˊ"}]
  meaning?: string;                      // Optional dictionary helper definition
  lesson?: string;                       // Name of the lesson, e.g., "第一課"
}

export type TextbookVersion = '自訂題目' | 'AI 主題產生' | '1v1 PK 對戰';

export interface LessonData {
  version: string;
  grade: string;        // e.g., "一年級", "二年級" etc.
  semester: '上' | '下'; // e.g., 1上, 1下
  lessonName: string;   // e.g., "第一課" or "全冊生字"
  words: VocabularyItem[];
}

export interface GameStats {
  correctCount: number;
  incorrectCount: number;
  completedCount: number;
  startTime: number | null;
  totalTimeSpent: number; // in seconds
  multiplier: number;
  score: number;
}
