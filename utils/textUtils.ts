import { speak } from './tts';

export const normalizeString = (str: string, language?: string): string => {
  if (!str) return '';
  const isThai = (language && ['thai', 'th'].includes(language.toLowerCase())) || /[\u0E00-\u0E7F]/.test(str);
  // Remove all punctuation and normalize whitespace (mobile browsers can add extra spaces)
  // Included smart quotes (curly quotes) which are common on iOS
  const cleaned = str.trim().toLowerCase().replace(/[.!,?;:"'()\[\]{}‘’“”]/g, '');
  if (isThai) {
    // In Thai, sentences have no standard inter-word spaces; strip whitespace for robust comparison
    return cleaned.replace(/\s+/g, '');
  }
  return cleaned.replace(/\s+/g, ' ').trim();
};

export const getSentenceWords = (text: string, language?: string): string[] => {
  if (!text) return [];
  const clean = text.replace(/[.!?。！？]+$/, '').trim();
  if (!clean) return [];

  const isThai = (language && ['thai', 'th'].includes(language.toLowerCase())) || /[\u0E00-\u0E7F]/.test(clean);

  if (isThai && typeof Intl !== 'undefined' && (Intl as any).Segmenter) {
    try {
      const segmenter = new (Intl as any).Segmenter('th', { granularity: 'word' });
      const segments = Array.from(segmenter.segment(clean)) as any[];
      const words = segments
        .filter((s: any) => s.isWordLike && s.segment.trim().length > 0)
        .map((s: any) => s.segment.trim());
      if (words.length > 0) {
        return words;
      }
    } catch (e) {
      console.warn('Thai segmentation failed, falling back to whitespace:', e);
    }
  }

  return clean.split(/\s+/).filter(w => w.length > 0);
};

export const shuffleArray = <T,>(array: T[]): T[] => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

export const seededShuffle = <T,>(array: T[], seed: string): T[] => {
  if (!seed) return shuffleArray(array);
  
  const arr = [...array];
  
  // Simple consistent string hash (FNV-1a variant)
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  }

  // SplitMix32 PRNG
  const random = () => {
    h = (h + 0x9E3779B9) | 0;
    let t = h ^ (h >>> 16);
    t = Math.imul(t, 0x21F0AAAD);
    t = t ^ (t >>> 15);
    t = Math.imul(t, 0x735A2D97);
    t = t ^ (t >>> 15);
    return (t >>> 0) / 4294967296;
  };

  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    if (i !== j) {
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }
  return arr;
};

export const getLangCode = (langName: string): string => {
  if (!langName) return "en-US";
  const normalized = langName.toLowerCase().trim();
  const map: Record<string, string> = {
    "english": "en-US",
    "en": "en-US",
    "french": "fr-FR",
    "fr": "fr-FR",
    "spanish": "es-ES",
    "es": "es-ES",
    "german": "de-DE",
    "de": "de-DE",
    "thai": "th-TH",
    "th": "th-TH",
    "arabic": "ar-SA",
    "ar": "ar-SA",
    "chinese": "zh-CN",
    "zh": "zh-CN",
    "danish": "da-DK",
    "da": "da-DK",
    "dutch": "nl-NL",
    "nl": "nl-NL",
    "finnish": "fi-FI",
    "fi": "fi-FI",
    "greek": "el-GR",
    "el": "el-GR",
    "hindi": "hi-IN",
    "hi": "hi-IN",
    "indonesian": "id-ID",
    "id": "id-ID",
    "italian": "it-IT",
    "it": "it-IT",
    "japanese": "ja-JP",
    "ja": "ja-JP",
    "korean": "ko-KR",
    "ko": "ko-KR",
    "norwegian": "nb-NO",
    "nb": "nb-NO",
    "no": "nb-NO",
    "polish": "pl-PL",
    "pl": "pl-PL",
    "portuguese": "pt-PT",
    "pt": "pt-PT",
    "russian": "ru-RU",
    "ru": "ru-RU",
    "swedish": "sv-SE",
    "sv": "sv-SE",
    "turkish": "tr-TR",
    "tr": "tr-TR",
    "vietnamese": "vi-VN",
    "vi": "vi-VN"
  };
  return map[normalized] || "en-US";
};

export const speakText = (text: string, language: string, rate: number = 1.0, voiceName?: string | null) => {
  const langCode = getLangCode(language);
  speak(text, langCode, rate, voiceName);
};

export const shouldShowAudioControls = (): boolean => {
  const ua = navigator.userAgent.toLowerCase();

  const isAndroidUserAgent = /android/i.test(ua);
  
  // On iOS, WKWebView (used by FB/IG/Messenger) supports SpeechSynthesis.
  // On Android, in-app browsers often have broken TTS.
  const isProblematicInApp = isAndroidUserAgent && (
    ua.includes("instagram") || ua.includes("facebook") ||
    ua.includes("messenger") || ua.includes("fb_iab") ||
    ua.includes("fban") || ua.includes("fbav") ||
    ua.includes("line")
  );

  // Block known in-app browsers and WebViews
  if (ua.includes("wv") || ua.includes("webview") || isProblematicInApp) {
    return false;
  }

  return true;
};

export const getAndroidIntentLink = (lessonId?: string): string => {
  const isAndroid = /android/i.test(navigator.userAgent);
  if (!isAndroid) return '';

  const url = new URL(window.location.href);
  if (lessonId) {
    url.searchParams.set('lesson', lessonId);
  }

  const urlString = url.toString();
  const urlNoScheme = urlString.replace(/^https?:\/\//, '');
  const scheme = window.location.protocol.replace(':', '');

  return `intent://${urlNoScheme}#Intent;scheme=${scheme};package=com.android.chrome;end`;
};

export const selectElementText = (element: HTMLElement | null) => {
  if (!element) return;
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(element);
  selection?.removeAllRanges();
  selection?.addRange(range);
};
