import { config } from '../config';
import { getAuthToken } from './pocketbase';

export interface VoiceOption {
  id: string;
  name: string;
}

export interface LanguageOption {
  code: string;
  name: string;
}

export interface TTSModelMetadata {
  id: string;
  name: string;
  description: string;
  pricing: {
    prompt: string;
    completion: string;
    unit: 'character' | 'token';
  };
  voices: VoiceOption[];
  response_format: string;
  supportsLanguage: boolean;
  supportsInstructions: boolean;
  defaultInstructions?: string;
  languages?: LanguageOption[];
}

export interface TTSGenerationRequest {
  text: string;
  modelId: string;
  voice?: string;
  language?: string;
  instructions?: string;
  pushToR2?: boolean;
}

export interface TTSGenerationStats {
  originalSizeKb: string;
  compressedSizeKb: string;
  compressionRatio: string;
  cost: string;
}

export interface TTSGenerationResponse {
  success: boolean;
  localUrl?: string;
  r2Url?: string | null;
  r2Error?: string | null;
  filename?: string;
  stats?: TTSGenerationStats;
  error?: string;
}

export interface TTSHistoryItem {
  id: string;
  textPreview: string;
  fullText: string;
  modelId: string;
  modelName: string;
  voiceName?: string;
  languageName?: string;
  instructionsPrompt?: string;
  compressedSizeKb?: string;
  compressionRatio?: string;
  localUrl?: string;
  r2Url?: string | null;
  timestamp: string;
}

const KOKORO_LANGUAGES: LanguageOption[] = [
  { code: 'en-US', name: 'English (United States)' },
  { code: 'en-GB', name: 'English (United Kingdom)' },
  { code: 'es-ES', name: 'Spanish (Spain)' },
  { code: 'fr-FR', name: 'French (France)' },
  { code: 'hi-IN', name: 'Hindi (India)' },
  { code: 'it-IT', name: 'Italian (Italy)' },
  { code: 'ja-JP', name: 'Japanese (Japan)' },
  { code: 'pt-BR', name: 'Portuguese (Brazil)' },
  { code: 'zh-CN', name: 'Chinese (Simplified)' },
];

const VOXTRAL_LANGUAGES: LanguageOption[] = [
  { code: 'ar-SA', name: 'Arabic (Modern Standard)' },
  { code: 'ar-AE', name: 'Arabic (UAE)' },
  { code: 'bn-BD', name: 'Bengali (Bangladesh)' },
  { code: 'zh-CN', name: 'Chinese (Simplified)' },
  { code: 'cs-CZ', name: 'Czech (Czechia)' },
  { code: 'da-DK', name: 'Danish (Denmark)' },
  { code: 'nl-NL', name: 'Dutch (Netherlands)' },
  { code: 'en-US', name: 'English (United States)' },
  { code: 'en-GB', name: 'English (United Kingdom)' },
  { code: 'fi-FI', name: 'Finnish (Finland)' },
  { code: 'fr-FR', name: 'French (France)' },
  { code: 'de-DE', name: 'German (Germany)' },
  { code: 'el-GR', name: 'Greek (Greece)' },
  { code: 'he-IL', name: 'Hebrew (Israel)' },
  { code: 'hi-IN', name: 'Hindi (India)' },
  { code: 'hu-HU', name: 'Hungarian (Hungary)' },
  { code: 'id-ID', name: 'Indonesian (Indonesia)' },
  { code: 'it-IT', name: 'Italian (Italy)' },
  { code: 'ja-JP', name: 'Japanese (Japan)' },
  { code: 'ko-KR', name: 'Korean (South Korea)' },
  { code: 'ms-MY', name: 'Malay (Malaysia)' },
  { code: 'nb-NO', name: 'Norwegian (Norway)' },
  { code: 'pl-PL', name: 'Polish (Poland)' },
  { code: 'pt-BR', name: 'Portuguese (Brazil)' },
  { code: 'pt-PT', name: 'Portuguese (Portugal)' },
  { code: 'ro-RO', name: 'Romanian (Romania)' },
  { code: 'ru-RU', name: 'Russian (Russia)' },
  { code: 'es-ES', name: 'Spanish (Spain)' },
  { code: 'es-419', name: 'Spanish (Latin America)' },
  { code: 'sv-SE', name: 'Swedish (Sweden)' },
  { code: 'ta-IN', name: 'Tamil (India)' },
  { code: 'th-TH', name: 'Thai (Thailand)' },
  { code: 'tr-TR', name: 'Turkish (Turkey)' },
  { code: 'uk-UA', name: 'Ukrainian (Ukraine)' },
  { code: 'ur-PK', name: 'Urdu (Pakistan)' },
  { code: 'vi-VN', name: 'Vietnamese (Vietnam)' },
];

const GEMINI_LANGUAGES: LanguageOption[] = [
  { code: 'af-ZA', name: 'Afrikaans (South Africa)' },
  { code: 'am-ET', name: 'Amharic (Ethiopia)' },
  { code: 'ar-EG', name: 'Arabic (Egypt)' },
  { code: 'ar-XA', name: 'Arabic (Multi-region)' },
  { code: 'bn-BD', name: 'Bengali (Bangladesh)' },
  { code: 'bg-BG', name: 'Bulgarian (Bulgaria)' },
  { code: 'ca-ES', name: 'Catalan (Spain)' },
  { code: 'zh-CN', name: 'Chinese (Simplified)' },
  { code: 'zh-TW', name: 'Chinese (Traditional)' },
  { code: 'hr-HR', name: 'Croatian (Croatia)' },
  { code: 'cs-CZ', name: 'Czech (Czechia)' },
  { code: 'da-DK', name: 'Danish (Denmark)' },
  { code: 'nl-NL', name: 'Dutch (Netherlands)' },
  { code: 'en-AU', name: 'English (Australia)' },
  { code: 'en-IN', name: 'English (India)' },
  { code: 'en-GB', name: 'English (United Kingdom)' },
  { code: 'en-US', name: 'English (United States)' },
  { code: 'et-EE', name: 'Estonian (Estonia)' },
  { code: 'fil-PH', name: 'Filipino (Philippines)' },
  { code: 'fi-FI', name: 'Finnish (Finland)' },
  { code: 'fr-CA', name: 'French (Canada)' },
  { code: 'fr-FR', name: 'French (France)' },
  { code: 'de-DE', name: 'German (Germany)' },
  { code: 'el-GR', name: 'Greek (Greece)' },
  { code: 'gu-IN', name: 'Gujarati (India)' },
  { code: 'he-IL', name: 'Hebrew (Israel)' },
  { code: 'hi-IN', name: 'Hindi (India)' },
  { code: 'hu-HU', name: 'Hungarian (Hungary)' },
  { code: 'id-ID', name: 'Indonesian (Indonesia)' },
  { code: 'it-IT', name: 'Italian (Italy)' },
  { code: 'ja-JP', name: 'Japanese (Japan)' },
  { code: 'kn-IN', name: 'Kannada (India)' },
  { code: 'ko-KR', name: 'Korean (South Korea)' },
  { code: 'lv-LV', name: 'Latvian (Latvia)' },
  { code: 'lt-LT', name: 'Lithuanian (Lithuania)' },
  { code: 'ms-MY', name: 'Malay (Malaysia)' },
  { code: 'ml-IN', name: 'Malayalam (India)' },
  { code: 'mr-IN', name: 'Marathi (India)' },
  { code: 'nb-NO', name: 'Norwegian (Norway)' },
  { code: 'fa-IR', name: 'Persian (Iran)' },
  { code: 'pl-PL', name: 'Polish (Poland)' },
  { code: 'pt-BR', name: 'Portuguese (Brazil)' },
  { code: 'pt-PT', name: 'Portuguese (Portugal)' },
  { code: 'pa-IN', name: 'Punjabi (India)' },
  { code: 'ro-RO', name: 'Romanian (Romania)' },
  { code: 'ru-RU', name: 'Russian (Russia)' },
  { code: 'sr-RS', name: 'Serbian (Serbia)' },
  { code: 'sk-SK', name: 'Slovak (Slovakia)' },
  { code: 'sl-SI', name: 'Slovenian (Slovenia)' },
  { code: 'es-419', name: 'Spanish (Latin America)' },
  { code: 'es-ES', name: 'Spanish (Spain)' },
  { code: 'es-US', name: 'Spanish (United States)' },
  { code: 'sw-KE', name: 'Swahili (Kenya)' },
  { code: 'sv-SE', name: 'Swedish (Sweden)' },
  { code: 'ta-IN', name: 'Tamil (India)' },
  { code: 'te-IN', name: 'Telugu (India)' },
  { code: 'th-TH', name: 'Thai (Thailand)' },
  { code: 'tr-TR', name: 'Turkish (Turkey)' },
  { code: 'uk-UA', name: 'Ukrainian (Ukraine)' },
  { code: 'ur-PK', name: 'Urdu (Pakistan)' },
  { code: 'vi-VN', name: 'Vietnamese (Vietnam)' },
];

const OPENAI_LANGUAGES: LanguageOption[] = [
  { code: 'af-ZA', name: 'Afrikaans' },
  { code: 'ar-SA', name: 'Arabic' },
  { code: 'hy-AM', name: 'Armenian' },
  { code: 'az-AZ', name: 'Azerbaijani' },
  { code: 'be-BY', name: 'Belarusian' },
  { code: 'bs-BA', name: 'Bosnian' },
  { code: 'bg-BG', name: 'Bulgarian' },
  { code: 'ca-ES', name: 'Catalan' },
  { code: 'zh-CN', name: 'Chinese' },
  { code: 'hr-HR', name: 'Croatian' },
  { code: 'cs-CZ', name: 'Czech' },
  { code: 'da-DK', name: 'Danish' },
  { code: 'nl-NL', name: 'Dutch' },
  { code: 'en-US', name: 'English (United States)' },
  { code: 'en-GB', name: 'English (United Kingdom)' },
  { code: 'et-EE', name: 'Estonian' },
  { code: 'fi-FI', name: 'Finnish' },
  { code: 'fr-FR', name: 'French' },
  { code: 'gl-ES', name: 'Galician' },
  { code: 'de-DE', name: 'German' },
  { code: 'el-GR', name: 'Greek' },
  { code: 'he-IL', name: 'Hebrew' },
  { code: 'hi-IN', name: 'Hindi' },
  { code: 'hu-HU', name: 'Hungarian' },
  { code: 'is-IS', name: 'Icelandic' },
  { code: 'id-ID', name: 'Indonesian' },
  { code: 'it-IT', name: 'Italian' },
  { code: 'ja-JP', name: 'Japanese' },
  { code: 'kn-IN', name: 'Kannada' },
  { code: 'kk-KZ', name: 'Kazakh' },
  { code: 'ko-KR', name: 'Korean' },
  { code: 'lv-LV', name: 'Latvian' },
  { code: 'lt-LT', name: 'Lithuanian' },
  { code: 'mk-MK', name: 'Macedonian' },
  { code: 'ms-MY', name: 'Malay' },
  { code: 'mr-IN', name: 'Marathi' },
  { code: 'mi-NZ', name: 'Maori' },
  { code: 'ne-NP', name: 'Nepali' },
  { code: 'nb-NO', name: 'Norwegian' },
  { code: 'fa-IR', name: 'Persian' },
  { code: 'pl-PL', name: 'Polish' },
  { code: 'pt-BR', name: 'Portuguese (Brazil)' },
  { code: 'pt-PT', name: 'Portuguese (Portugal)' },
  { code: 'ro-RO', name: 'Romanian' },
  { code: 'ru-RU', name: 'Russian' },
  { code: 'sr-RS', name: 'Serbian' },
  { code: 'sk-SK', name: 'Slovak' },
  { code: 'sl-SI', name: 'Slovenian' },
  { code: 'es-ES', name: 'Spanish' },
  { code: 'sw-KE', name: 'Swahili' },
  { code: 'sv-SE', name: 'Swedish' },
  { code: 'tl-PH', name: 'Tagalog' },
  { code: 'ta-IN', name: 'Tamil' },
  { code: 'th-TH', name: 'Thai' },
  { code: 'tr-TR', name: 'Turkish' },
  { code: 'uk-UA', name: 'Ukrainian' },
  { code: 'ur-PK', name: 'Urdu' },
  { code: 'vi-VN', name: 'Vietnamese' },
  { code: 'cy-GB', name: 'Welsh' },
];

export const FALLBACK_MODELS: Record<string, TTSModelMetadata> = {
  'hexgrad/kokoro-82m': {
    id: 'hexgrad/kokoro-82m',
    name: 'Hexgrad: Kokoro 82M',
    description:
      'Ultra-lightweight, lightning-fast open-weight TTS model. Delivers exceptionally natural-sounding speech.',
    pricing: { prompt: '0.00000062', completion: '0.00000062', unit: 'character' },
    voices: [
      { id: 'af_heart', name: 'US Female: Heart' },
      { id: 'af_bella', name: 'US Female: Bella' },
      { id: 'af_nicole', name: 'US Female: Nicole' },
      { id: 'af_sarah', name: 'US Female: Sarah' },
      { id: 'am_adam', name: 'US Male: Adam' },
      { id: 'am_michael', name: 'US Male: Michael' },
      { id: 'bf_emma', name: 'UK Female: Emma' },
      { id: 'bm_george', name: 'UK Male: George' },
      { id: 'ef_dora', name: 'ES Female: Dora' },
      { id: 'em_alex', name: 'ES Male: Alex' },
      { id: 'ff_siwis', name: 'FR Female: Siwis' },
      { id: 'if_sara', name: 'IT Female: Sara' },
      { id: 'im_nicola', name: 'IT Male: Nicola' },
      { id: 'jf_alpha', name: 'JA Female: Alpha' },
      { id: 'pf_dora', name: 'PT Female: Dora' },
      { id: 'zf_xiaobei', name: 'ZH Female: Xiaobei' },
    ],
    response_format: 'pcm',
    supportsLanguage: true,
    supportsInstructions: false,
    languages: KOKORO_LANGUAGES,
  },
  'google/gemini-3.8-flash-lite-tts': {
    id: 'google/gemini-3.8-flash-lite-tts',
    name: 'Google: Gemini 3.8 Flash Lite TTS',
    description:
      'Fast, high-throughput speech model supporting 70+ languages, inline audio tags (e.g. [whispers], [laughs]), and 30 voices.',
    pricing: { prompt: '0.0000005', completion: '0.000006', unit: 'token' },
    voices: [
      { id: 'Puck', name: 'Upbeat Male: Puck' },
      { id: 'Zephyr', name: 'Bright Female: Zephyr' },
      { id: 'Charon', name: 'Deep Male: Charon' },
      { id: 'Kore', name: 'Warm Female: Kore' },
      { id: 'Fenrir', name: 'Resonant Male: Fenrir' },
      { id: 'Aoede', name: 'Expressive Female: Aoede' },
      { id: 'Leda', name: 'Leda' },
      { id: 'Orus', name: 'Orus' },
      { id: 'Callirrhoe', name: 'Callirrhoe' },
      { id: 'Autonoe', name: 'Autonoe' },
      { id: 'Enceladus', name: 'Enceladus' },
      { id: 'Iapetus', name: 'Iapetus' },
      { id: 'Umbriel', name: 'Umbriel' },
      { id: 'Algieba', name: 'Algieba' },
      { id: 'Despina', name: 'Despina' },
      { id: 'Erinome', name: 'Erinome' },
      { id: 'Algenib', name: 'Algenib' },
      { id: 'Rasalgethi', name: 'Rasalgethi' },
      { id: 'Laomedeia', name: 'Laomedeia' },
      { id: 'Achernar', name: 'Achernar' },
      { id: 'Alnilam', name: 'Alnilam' },
      { id: 'Schedar', name: 'Schedar' },
      { id: 'Gacrux', name: 'Gacrux' },
      { id: 'Pulcherrima', name: 'Pulcherrima' },
      { id: 'Achird', name: 'Achird' },
      { id: 'Zubenelgenubi', name: 'Zubenelgenubi' },
      { id: 'Vindemiatrix', name: 'Vindemiatrix' },
      { id: 'Sadachbia', name: 'Sadachbia' },
      { id: 'Sadaltager', name: 'Sadaltager' },
      { id: 'Sulafat', name: 'Sulafat' },
    ],
    response_format: 'pcm',
    supportsLanguage: true,
    supportsInstructions: true,
    defaultInstructions: 'A slow clear voice suitable for ESL students.',
    languages: GEMINI_LANGUAGES,
  },
  'mistralai/voxtral-mini-tts-3-0': {
    id: 'mistralai/voxtral-mini-tts-3-0',
    name: 'Mistral: Voxtral Mini TTS 3',
    description:
      "Mistral's Voxtral 3 text-to-speech model with 35+ languages, 50+ dialects, inline emotion/pace tags, and zero-shot voice cloning.",
    pricing: { prompt: '0.000013', completion: '0.000013', unit: 'character' },
    voices: [
      { id: 'voice_3150', name: 'James' },
      { id: 'voice_592', name: 'Marie' },
    ],
    response_format: 'mp3',
    supportsLanguage: true,
    supportsInstructions: false,
    languages: VOXTRAL_LANGUAGES,
  },
  'openai/gpt-audio-mini': {
    id: 'openai/gpt-audio-mini',
    name: 'OpenAI: GPT Audio Mini',
    description:
      'Cost-efficient OpenAI voice-native model supporting 57 languages, built-in voices, and natural-language delivery instructions.',
    pricing: { prompt: '0.0000006', completion: '0.0000024', unit: 'token' },
    voices: [
      { id: 'alloy', name: 'Alloy' },
      { id: 'ash', name: 'Ash' },
      { id: 'ballad', name: 'Ballad' },
      { id: 'coral', name: 'Coral' },
      { id: 'echo', name: 'Echo' },
      { id: 'fable', name: 'Fable' },
      { id: 'nova', name: 'Nova' },
      { id: 'onyx', name: 'Onyx' },
      { id: 'sage', name: 'Sage' },
      { id: 'shimmer', name: 'Shimmer' },
      { id: 'verse', name: 'Verse' },
    ],
    response_format: 'mp3',
    supportsLanguage: true,
    supportsInstructions: true,
    defaultInstructions: 'A slow clear voice suitable for ESL students.',
    languages: OPENAI_LANGUAGES,
  },
};

export const getBaseTjGenUrl = (): string => {
  return config.tjGenUrl.replace(/\/+$/, '');
};

export const fetchTTSModels = async (): Promise<{
  models: Record<string, TTSModelMetadata>;
  r2Configured: boolean;
}> => {
  const baseUrl = getBaseTjGenUrl();
  const token = getAuthToken();

  try {
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${baseUrl}/api/tts/models`, {
      method: 'GET',
      headers,
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch models: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    const rawModels: Record<string, TTSModelMetadata> = data.models || FALLBACK_MODELS;
    const sanitizedModels: Record<string, TTSModelMetadata> = {};

    for (const [key, model] of Object.entries(rawModels)) {
      if (key === 'google/gemini-3.1-flash-tts-preview') {
        sanitizedModels['google/gemini-3.8-flash-lite-tts'] = {
          ...FALLBACK_MODELS['google/gemini-3.8-flash-lite-tts'],
          ...(model.voices && model.voices.length > 0 ? { voices: model.voices } : {}),
        };
      } else {
        sanitizedModels[key] = model;
      }
    }

    // Ensure gemini-3.8-flash-lite-tts is always present if not already added
    if (!sanitizedModels['google/gemini-3.8-flash-lite-tts'] && FALLBACK_MODELS['google/gemini-3.8-flash-lite-tts']) {
      sanitizedModels['google/gemini-3.8-flash-lite-tts'] = FALLBACK_MODELS['google/gemini-3.8-flash-lite-tts'];
    }

    return {
      models: sanitizedModels,
      r2Configured: !!data.r2Configured,
    };
  } catch (err: any) {
    console.warn('[TTS Service] Using fallback models metadata:', err.message);
    return {
      models: FALLBACK_MODELS,
      r2Configured: true,
    };
  }
};

export const generateTTSAudio = async (
  request: TTSGenerationRequest
): Promise<TTSGenerationResponse> => {
  const baseUrl = getBaseTjGenUrl();
  const token = getAuthToken();

  if (!token) {
    throw new Error('You must be signed in as an administrator to generate TTS audio.');
  }

  const res = await fetch(`${baseUrl}/api/tts/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(request),
  });

  const data = await res.json();

  if (!res.ok || !data.success) {
    throw new Error(data.error || `Server error during generation (${res.status})`);
  }

  // Prepend baseUrl to localUrl if localUrl is relative
  if (data.localUrl && data.localUrl.startsWith('/')) {
    data.localUrl = `${baseUrl}${data.localUrl}`;
  }

  return data;
};

export const previewTTSVoice = async (
  modelId: string,
  voice: string,
  language?: string
): Promise<string> => {
  const baseUrl = getBaseTjGenUrl();
  const token = getAuthToken();

  if (!token) {
    throw new Error('You must be signed in as an administrator to preview voices.');
  }

  const params = new URLSearchParams({ modelId, voice });
  if (language) {
    params.set('language', language);
  }

  const res = await fetch(`${baseUrl}/api/tts/preview?${params.toString()}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();

  if (!res.ok || !data.success || !data.previewUrl) {
    throw new Error(data.error || `Failed to load voice preview (${res.status})`);
  }

  return data.previewUrl.startsWith('/') ? `${baseUrl}${data.previewUrl}` : data.previewUrl;
};

export const estimateTTSCost = (
  models: Record<string, TTSModelMetadata>,
  modelId: string,
  text: string
): number => {
  const model = models[modelId] || FALLBACK_MODELS[modelId];
  if (!model || !text) return 0;

  const textLength = text.length;
  const promptPrice = parseFloat(model.pricing.prompt);
  const completionPrice = parseFloat(model.pricing.completion);

  if (model.pricing.unit === 'character') {
    return textLength * promptPrice;
  } else {
    // Approx 1 token ≈ 4 characters
    const inputTokens = Math.ceil(textLength / 4);
    const outputTokens = Math.ceil(textLength / 3);
    return inputTokens * promptPrice + outputTokens * completionPrice;
  }
};
