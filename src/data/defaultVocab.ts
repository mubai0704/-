/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LessonData, VocabularyItem } from '../types';

export const DEFAULT_LESSONS: LessonData[] = [
  // ================= 康軒 =================
  {
    version: '康軒',
    grade: '一年級',
    semester: '上',
    lessonName: '第一課 拍拍手',
    words: [
      {
        word: '拍手',
        characters: [
          { char: '拍', bopomofo: 'ㄆㄞ' },
          { char: '手', bopomofo: 'ㄕㄡˇ' }
        ],
        meaning: '兩手相擊發出聲音。'
      },
      {
        word: '唱歌',
        characters: [
          { char: '唱', bopomofo: 'ㄔㄤˋ' },
          { char: '歌', bopomofo: 'ㄍㄜ' }
        ],
        meaning: '吟詠歌唱。'
      },
      {
        word: '跳舞',
        characters: [
          { char: '跳', bopomofo: 'ㄊㄧㄠˋ' },
          { char: '舞', bopomofo: 'ㄨˇ' }
        ],
        meaning: '手舞足蹈，隨著音樂活動肢體。'
      },
      {
        word: '快樂',
        characters: [
          { char: '快', bopomofo: 'ㄎㄨㄞˋ' },
          { char: '樂', bopomofo: 'ㄌㄜˋ' }
        ],
        meaning: '高興、愉悅的心理狀態。'
      },
      {
        word: '朋友',
        characters: [
          { char: '朋', bopomofo: 'ㄆㄥˊ' },
          { char: '友', bopomofo: 'ㄧㄡˇ' }
        ],
        meaning: '志同道合、有交情的人。'
      }
    ]
  },
  {
    version: '康軒',
    grade: '一年級',
    semester: '上',
    lessonName: '第二課 看星星',
    words: [
      {
        word: '星星',
        characters: [
          { char: '星', bopomofo: 'ㄒㄧㄥ' },
          { char: '星', bopomofo: 'ㄒㄧㄥ' }
        ],
        meaning: '夜空中閃爍的恆星。'
      },
      {
        word: '月亮',
        characters: [
          { char: '月', bopomofo: 'ㄩㄝˋ' },
          { char: '亮', bopomofo: 'ㄌㄧㄤˋ' }
        ],
        meaning: '地球的天然衛星，夜間發光。'
      },
      {
        word: '太陽',
        characters: [
          { char: '太', bopomofo: 'ㄊㄞˋ' },
          { char: '陽', bopomofo: 'ㄧㄤˊ' }
        ],
        meaning: '太陽系的中心恆星，帶來光與熱。'
      },
      {
        word: '天空',
        characters: [
          { char: '天', bopomofo: 'ㄊㄧㄢ' },
          { char: '空', bopomofo: 'ㄎㄨㄥ' }
        ],
        meaning: '地球上方的廣大空間。'
      },
      {
        word: '閃爍',
        characters: [
          { char: '閃', bopomofo: 'ㄕㄢˇ' },
          { char: '爍', bopomofo: 'ㄕㄨㄛˋ' }
        ],
        meaning: '光亮搖晃、忽明忽暗。'
      }
    ]
  },
  {
    version: '康軒',
    grade: '一年級',
    semester: '上',
    lessonName: '第三課 大自然',
    words: [
      {
        word: '高山',
        characters: [
          { char: '高', bopomofo: 'ㄍㄠ' },
          { char: '山', bopomofo: 'ㄕㄢ' }
        ],
        meaning: '高聳的山峰。'
      },
      {
        word: '流水',
        characters: [
          { char: '流', bopomofo: 'ㄌㄧㄡˊ' },
          { char: '水', bopomofo: 'ㄕㄨㄟˇ' }
        ],
        meaning: '流動的水流。'
      },
      {
        word: '白雲',
        characters: [
          { char: '白', bopomofo: 'ㄅㄞˊ' },
          { char: '雲', bopomofo: 'ㄩㄣˊ' }
        ],
        meaning: '天空中白色的雲氣。'
      },
      {
        word: '微風',
        characters: [
          { char: '微', bopomofo: 'ㄨㄟˊ' },
          { char: '風', bopomofo: 'ㄈㄥ' }
        ],
        meaning: '輕微和緩的風。'
      },
      {
        word: '大地',
        characters: [
          { char: '大', bopomofo: 'ㄉㄚˋ' },
          { char: '地', bopomofo: 'ㄉㄧˋ' }
        ],
        meaning: '廣大的陸地、地球表面。'
      }
    ]
  },
  {
    version: '康軒',
    grade: '一年級',
    semester: '下',
    lessonName: '第一課 春天的歌',
    words: [
      {
        word: '春天',
        characters: [
          { char: '春', bopomofo: 'ㄔㄨㄣ' },
          { char: '天', bopomofo: 'ㄊㄧㄢ' }
        ],
        meaning: '一年的第一個季節。'
      },
      {
        word: '花朵',
        characters: [
          { char: '花', bopomofo: 'ㄏㄨㄚ' },
          { char: '朵', bopomofo: 'ㄉㄨㄛˇ' }
        ],
        meaning: '植物花卉的總稱。'
      },
      {
        word: '綠草',
        characters: [
          { char: '綠', bopomofo: 'ㄌㄩˋ' },
          { char: '草', bopomofo: 'ㄘㄠˇ' }
        ],
        meaning: '綠色的草地或草本植物。'
      },
      {
        word: '飛舞',
        characters: [
          { char: '飛', bopomofo: 'ㄈㄟ' },
          { char: '舞', bopomofo: 'ㄨˇ' }
        ],
        meaning: '在大氣中飛揚盤旋。'
      }
    ]
  },
  {
    version: '康軒',
    grade: '二年級',
    semester: '上',
    lessonName: '第一課 晨光森林',
    words: [
      {
        word: '早晨',
        characters: [
          { char: '早', bopomofo: 'ㄗㄠˇ' },
          { char: '晨', bopomofo: 'ㄔㄣˊ' }
        ],
        meaning: '清晨、黎明時分。'
      },
      {
        word: '松鼠',
        characters: [
          { char: '松', bopomofo: 'ㄙㄨㄥ' },
          { char: '鼠', bopomofo: 'ㄕㄨˇ' }
        ],
        meaning: '一種在樹上活動的囓齒目小動物。'
      },
      {
        word: '跳躍',
        characters: [
          { char: '跳', bopomofo: 'ㄊㄧㄠˋ' },
          { char: '躍', bopomofo: 'ㄩㄝˋ' }
        ],
        meaning: '跳動飛奔。'
      },
      {
        word: '露珠',
        characters: [
          { char: '露', bopomofo: 'ㄌㄨˋ' },
          { char: '珠', bopomofo: 'ㄓㄨ' }
        ],
        meaning: '凝結在草木上的圓潤水滴。'
      }
    ]
  },

  // ================= 翰林 =================
  {
    version: '翰林',
    grade: '一年級',
    semester: '上',
    lessonName: '第一課 上學去',
    words: [
      {
        word: '學校',
        characters: [
          { char: '學', bopomofo: 'ㄒㄩㄝˊ' },
          { char: '校', bopomofo: 'ㄒㄧㄠˋ' }
        ],
        meaning: '專門從事教育、傳授知識的場所。'
      },
      {
        word: '老師',
        characters: [
          { char: '老', bopomofo: 'ㄌㄠˇ' },
          { char: '師', bopomofo: 'ㄕ' }
        ],
        meaning: '教導、傳授學問技術的人。'
      },
      {
        word: '同學',
        characters: [
          { char: '同', bopomofo: 'ㄊㄨㄥˊ' },
          { char: '學', bopomofo: 'ㄒㄩㄝˊ' }
        ],
        meaning: '在同一個學校或班級讀書的人。'
      },
      {
        word: '讀書',
        characters: [
          { char: '讀', bopomofo: 'ㄉㄨˊ' },
          { char: '書', bopomofo: 'ㄕㄨ' }
        ],
        meaning: '閱讀書籍或學習知識。'
      },
      {
        word: '書包',
        characters: [
          { char: '書', bopomofo: 'ㄕㄨ' },
          { char: '包', bopomofo: 'ㄅㄠ' }
        ],
        meaning: '上學裝盛課本、文具的包袋。'
      }
    ]
  },
  {
    version: '翰林',
    grade: '一年級',
    semester: '上',
    lessonName: '第二課 我的家',
    words: [
      {
        word: '爸爸',
        characters: [
          { char: '爸', bopomofo: 'ㄅㄚˋ' },
          { char: '爸', bopomofo: 'ㄅㄚ˙' }
        ],
        meaning: '稱謂，對父親的口語稱呼。'
      },
      {
        word: '媽媽',
        characters: [
          { char: '媽', bopomofo: 'ㄇㄚ' },
          { char: '媽', bopomofo: 'ㄇㄚ˙' }
        ],
        meaning: '稱謂，對母親的口語稱呼。'
      },
      {
        word: '哥哥',
        characters: [
          { char: '哥', bopomofo: 'ㄍㄜ' },
          { char: '哥', bopomofo: 'ㄍㄜ˙' }
        ],
        meaning: '稱謂，同父母而年紀比自己大的男子。'
      },
      {
        word: '姊姊',
        characters: [
          { char: '姊', bopomofo: 'ㄐㄧㄝˇ' },
          { char: '姊', bopomofo: 'ㄐㄧㄝˇ' }
        ],
        meaning: '稱謂，同父母而年紀比自己大的女子。'
      },
      {
        word: '弟弟',
        characters: [
          { char: '弟', bopomofo: 'ㄉㄧˋ' },
          { char: '弟', bopomofo: 'ㄉㄧˋ' }
        ],
        meaning: '稱謂，同父母而年紀比自己小的男子。'
      },
      {
        word: '妹妹',
        characters: [
          { char: '妹', bopomofo: 'ㄇㄟˋ' },
          { char: '妹', bopomofo: 'ㄇㄟˋ' }
        ],
        meaning: '稱謂，同父母而年紀比自己小的女子。'
      }
    ]
  },

  // ================= 南一 =================
  {
    version: '南一',
    grade: '一年級',
    semester: '上',
    lessonName: '第一課 開學了',
    words: [
      {
        word: '鉛筆',
        characters: [
          { char: '鉛', bopomofo: 'ㄑㄧㄢ' },
          { char: '筆', bopomofo: 'ㄅㄧˇ' }
        ],
        meaning: '石墨做筆芯，外包木材的寫字畫圖文具。'
      },
      {
        word: '寫字',
        characters: [
          { char: '寫', bopomofo: 'ㄒㄧㄝˇ' },
          { char: '字', bopomofo: 'ㄗˋ' }
        ],
        meaning: '用筆、墨或其他工具書寫文字。'
      },
      {
        word: '畫畫',
        characters: [
          { char: '畫', bopomofo: 'ㄏㄨㄚˋ' },
          { char: '畫', bopomofo: 'ㄏㄨㄚˋ' }
        ],
        meaning: '繪製圖畫的工作。'
      },
      {
        word: '橡皮擦',
        characters: [
          { char: '橡', bopomofo: 'ㄒㄧㄤˋ' },
          { char: '皮', bopomofo: 'ㄆㄧˊ' },
          { char: '擦', bopomofo: 'ㄘㄚ' }
        ],
        meaning: '用来擦除鉛筆字跡的橡膠塊。'
      }
    ]
  },
  {
    version: '南一',
    grade: '一年級',
    semester: '上',
    lessonName: '第二課 好朋友',
    words: [
      {
        word: '微笑',
        characters: [
          { char: '微', bopomofo: 'ㄨㄟˊ' },
          { char: '笑', bopomofo: 'ㄒㄧㄠˋ' }
        ],
        meaning: '不顯露出聲音的、溫和愉悅的笑。'
      },
      {
        word: '遊戲',
        characters: [
          { char: '遊', bopomofo: 'ㄧㄡˊ' },
          { char: '戲', bopomofo: 'ㄒㄧˋ' }
        ],
        meaning: '娛樂、嬉戲的活動。'
      },
      {
        word: '散步',
        characters: [
          { char: '散', bopomofo: 'ㄙㄢˋ' },
          { char: '步', bopomofo: 'ㄅㄨˋ' }
        ],
        meaning: '隨意、悠閒地慢步行走。'
      },
      {
        word: '手拉手',
        characters: [
          { char: '手', bopomofo: 'ㄕㄡˇ' },
          { char: '拉', bopomofo: 'ㄌㄚ' },
          { char: '手', bopomofo: 'ㄕㄡˇ' }
        ],
        meaning: '手牽著手在一起，代表團結、友好。'
      }
    ]
  },

  // ================= 綜合高年級生字 =================
  {
    version: '康軒',
    grade: '三年級',
    semester: '上',
    lessonName: '常用高難度字挑戰',
    words: [
      {
        word: '捉迷藏',
        characters: [
          { char: '捉', bopomofo: 'ㄓㄨㄛ' },
          { char: '迷', bopomofo: 'ㄇㄧˊ' },
          { char: '藏', bopomofo: 'ㄘㄤˊ' }
        ],
        meaning: '一種把眼睛蒙住或躲起來讓別人尋找的兒童遊戲。'
      },
      {
        word: '鯨魚',
        characters: [
          { char: '鯨', bopomofo: 'ㄐㄧㄥ' },
          { char: '魚', bopomofo: 'ㄩˊ' }
        ],
        meaning: '水生哺乳動物，體型龐大。'
      },
      {
        word: '螃蟹',
        characters: [
          { char: '螃', bopomofo: 'ㄆㄤˊ' },
          { char: '蟹', bopomofo: 'ㄒㄧㄝˋ' }
        ],
        meaning: '有節肢、硬殼和一對大螯的海洋或淡水甲殼類。'
      },
      {
        word: '發芽',
        characters: [
          { char: '發', bopomofo: 'ㄈㄚ' },
          { char: '芽', bopomofo: 'ㄧㄚˊ' }
        ],
        meaning: '植物開始長出嫩綠的芽尖。'
      },
      {
        word: '彩虹',
        characters: [
          { char: '彩', bopomofo: 'ㄘㄞˇ' },
          { char: '虹', bopomofo: 'ㄏㄨㄥˊ' }
        ],
        meaning: '雨後陽光在天空中折射反射形成的光學彩色圓弧。'
      }
    ]
  }
];

// Extrapolate list of all unique grades
export const AVAILABLE_GRADES = ['一年級', '二年級', '三年級', '四年級', '五年級', '六年級'];

// Mapping of letters to Bopomofo for internal virtual and physical keyboard
export const KEY_TO_BOPOMOFO: Record<string, string> = {
  '1': 'ㄅ', 'q': 'ㄆ', 'a': 'ㄇ', 'z': 'ㄈ',
  '2': 'ㄉ', 'w': 'ㄊ', 's': 'ㄋ', 'x': 'ㄌ',
  'e': 'ㄍ', 'd': 'ㄎ', 'c': 'ㄏ',
  'r': 'ㄐ', 'f': 'ㄑ', 'v': 'ㄒ',
  '5': 'ㄓ', 't': 'ㄔ', 'g': 'ㄕ', 'b': 'ㄖ',
  'y': 'ㄗ', 'h': 'ㄘ', 'n': 'ㄙ',
  'u': 'ㄧ', 'j': 'ㄨ', 'm': 'ㄩ',
  '8': 'ㄚ', 'i': 'ㄛ', 'k': 'ㄜ', ',': 'ㄝ',
  '9': 'ㄞ', 'o': 'ㄟ', 'l': 'ㄠ', '.': 'ㄡ',
  '0': 'ㄢ', 'p': 'ㄣ', ';': 'ㄤ', '/': 'ㄥ',
  '-': 'ㄦ',
  '6': 'ˊ', '3': 'ˇ', '4': 'ˋ', '7': '˙', ' ': 'ˉ'
};

export const BOPOMOFO_TO_KEY: Record<string, string> = Object.entries(KEY_TO_BOPOMOFO).reduce((acc, [k, v]) => {
  acc[v] = k;
  return acc;
}, {} as Record<string, string>);

// Split a Bopomofo syllable into components for visual spelling guidance if needed
// A syllable consists of [initial] [medial] [final] [tone]
export function parseBopomofoParts(syllable: string) {
  const initials = 'ㄅㄆㄇㄈㄉㄊㄋㄌㄍㄎㄏㄐㄑㄒㄓㄔㄕㄖㄗㄘㄙ';
  const medials = 'ㄧㄨㄩ';
  const finals = 'ㄚㄛㄜㄝㄞㄟㄠㄡㄢㄣㄤㄥㄦ';
  const tones = 'ˊˇˋ˙ˉ';

  let initial = '';
  let medial = '';
  let final = '';
  let tone = 'ˉ'; // Default first tone

  for (const char of syllable) {
    if (initials.includes(char)) initial = char;
    else if (medials.includes(char)) medial = char;
    else if (finals.includes(char)) final = char;
    else if (tones.includes(char)) tone = char;
  }

  return { initial, medial, final, tone };
}
