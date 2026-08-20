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
    languages: [
      { code: 'en-US', name: 'English (United States)' },
      { code: 'en-GB', name: 'English (United Kingdom)' },
      { code: 'es-ES', name: 'Spanish (Spain)' },
      { code: 'fr-FR', name: 'French (France)' },
      { code: 'it-IT', name: 'Italian (Italy)' },
      { code: 'ja-JP', name: 'Japanese (Japan)' },
      { code: 'pt-BR', name: 'Portuguese (Brazil)' },
      { code: 'zh-CN', name: 'Chinese (Simplified)' },
    ],
  },
  'google/gemini-3.1-flash-tts-preview': {
    id: 'google/gemini-3.1-flash-tts-preview',
    name: 'Google: Gemini 3.1 Flash TTS Preview',
    description:
      'High-performance TTS model supporting 70+ languages and inline audio tags (e.g. [whispers], [laughs]).',
    pricing: { prompt: '0.000001', completion: '0.00002', unit: 'token' },
    voices: [
      { id: 'Puck', name: 'Upbeat Male: Puck' },
      { id: 'Zephyr', name: 'Bright Female: Zephyr' },
      { id: 'Charon', name: 'Charon' },
      { id: 'Kore', name: 'Kore' },
      { id: 'Fenrir', name: 'Fenrir' },
      { id: 'Aoede', name: 'Aoede' },
    ],
    response_format: 'pcm',
    supportsLanguage: true,
    supportsInstructions: true,
    defaultInstructions: 'A slow clear voice suitable for ESL students.',
    languages: [
      { code: 'en-US', name: 'English (United States)' },
      { code: 'en-GB', name: 'English (United Kingdom)' },
      { code: 'es-ES', name: 'Spanish (Spain)' },
      { code: 'fr-FR', name: 'French (France)' },
      { code: 'de-DE', name: 'German (Germany)' },
      { code: 'it-IT', name: 'Italian (Italy)' },
      { code: 'ja-JP', name: 'Japanese (Japan)' },
      { code: 'ko-KR', name: 'Korean (South Korea)' },
      { code: 'zh-CN', name: 'Chinese (Simplified)' },
      { code: 'hi-IN', name: 'Hindi (India)' },
      { code: 'pt-BR', name: 'Portuguese (Brazil)' },
    ],
  },
  'mistralai/voxtral-mini-tts-2603': {
    id: 'mistralai/voxtral-mini-tts-2603',
    name: 'Mistral: Voxtral Mini TTS',
    description:
      "Mistral's specialized text-to-speech model featuring zero-shot voice cloning capabilities.",
    pricing: { prompt: '0.000016', completion: '0.000016', unit: 'character' },
    voices: [
      { id: 'en_paul_neutral', name: 'EN: Paul (Neutral)' },
      { id: 'gb_oliver_neutral', name: 'GB: Oliver (Neutral)' },
      { id: 'gb_jane_neutral', name: 'GB: Jane (Neutral)' },
      { id: 'fr_marie_neutral', name: 'FR: Marie (Neutral)' },
    ],
    response_format: 'mp3',
    supportsLanguage: true,
    supportsInstructions: true,
    defaultInstructions: 'A slow clear voice suitable for ESL students.',
    languages: [
      { code: 'en-US', name: 'English (United States)' },
      { code: 'en-GB', name: 'English (United Kingdom)' },
      { code: 'fr-FR', name: 'French (France)' },
    ],
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
    return {
      models: data.models || FALLBACK_MODELS,
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
