import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  fetchTTSModels,
  generateTTSAudio,
  estimateTTSCost,
  TTSModelMetadata,
  FALLBACK_MODELS,
  TTSHistoryItem,
  getBaseTjGenUrl,
} from '../../services/tts';
import { Button } from '../UI/Button';
import {
  Mic,
  Volume2,
  Sparkles,
  Cloud,
  Check,
  Copy,
  Download,
  Play,
  Pause,
  RotateCcw,
  ArrowLeft,
  Info,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Zap,
} from 'lucide-react';

interface TTSGeneratorProps {
  onBack: () => void;
  onAudioGenerated?: (r2Url: string | null, localUrl: string) => void;
}

const STORAGE_KEY = 'tts_history';

export const TTSGenerator: React.FC<TTSGeneratorProps> = ({ onBack, onAudioGenerated }) => {
  const [models, setModels] = useState<Record<string, TTSModelMetadata>>(FALLBACK_MODELS);
  const [selectedModelId, setSelectedModelId] = useState<string>('hexgrad/kokoro-82m');
  const [text, setText] = useState<string>('');
  const [voice, setVoice] = useState<string>('af_heart');
  const [language, setLanguage] = useState<string>('en-US');
  const [customLanguage, setCustomLanguage] = useState<string>('');
  const [instructions, setInstructions] = useState<string>('A slow clear voice suitable for ESL students.');
  const [pushToR2, setPushToR2] = useState<boolean>(true);
  const [r2Configured, setR2Configured] = useState<boolean>(true);

  // Generation status state
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{
    localUrl: string;
    r2Url: string | null;
    r2Error: string | null;
    stats?: {
      originalSizeKb: string;
      compressedSizeKb: string;
      compressionRatio: string;
      cost: string;
    };
  } | null>(null);

  const [copiedR2, setCopiedR2] = useState<boolean>(false);
  const [history, setHistory] = useState<TTSHistoryItem[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const resolveAudioUrl = (url?: string | null): string => {
    if (!url) return '';
    if (url.startsWith('/')) {
      return `${getBaseTjGenUrl()}${url}`;
    }
    return url;
  };

  // Load models and history on mount
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const { models: fetchedModels, r2Configured: r2Avail } = await fetchTTSModels();
        if (isMounted) {
          setModels(fetchedModels);
          setR2Configured(r2Avail);
          setPushToR2(r2Avail);
          if (!fetchedModels[selectedModelId]) {
            const firstKey = Object.keys(fetchedModels)[0];
            if (firstKey) setSelectedModelId(firstKey);
          }
        }
      } catch (e) {
        console.warn('Could not fetch models:', e);
      }
    }

    loadData();

    try {
      const savedHistory = localStorage.getItem(STORAGE_KEY);
      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
      }
    } catch (e) {
      console.warn('Failed to parse history:', e);
    }

    return () => {
      isMounted = false;
    };
  }, []);

  const currentModel = useMemo(() => {
    return models[selectedModelId] || FALLBACK_MODELS[selectedModelId] || null;
  }, [models, selectedModelId]);

  // Voice filtering by language with safe normalization
  const availableVoices = useMemo(() => {
    if (!currentModel?.voices || !Array.isArray(currentModel.voices)) return [];
    const activeLang = language === 'custom' ? customLanguage : language;

    // Normalize voices array so every item is { id: string, name: string }
    const normalized: { id: string; name: string }[] = currentModel.voices
      .filter(Boolean)
      .map((v: any) => {
        const id = typeof v === 'string' ? v : (v?.id || v?.name || '');
        let name = typeof v === 'object' && v?.name ? v.name : id;

        if (selectedModelId === 'hexgrad/kokoro-82m' && typeof id === 'string') {
          const parts = id.split('_');
          if (parts.length >= 2) {
            const prefix = parts[0];
            const raw = parts[1];
            const formatted = raw.charAt(0).toUpperCase() + raw.slice(1);
            const langMap: Record<string, string> = {
              af: 'US Female',
              am: 'US Male',
              bf: 'UK Female',
              bm: 'UK Male',
              ef: 'ES Female',
              em: 'ES Male',
              ff: 'FR Female',
              hf: 'HI Female',
              hm: 'HI Male',
              if: 'IT Female',
              im: 'IT Male',
              jf: 'JA Female',
              jm: 'JA Male',
              pf: 'PT Female',
              pm: 'PT Male',
              zf: 'ZH Female',
              zm: 'ZH Male',
            };
            const langLabel = langMap[prefix] || prefix.toUpperCase();
            name = `${langLabel}: ${formatted}`;
          }
        } else if (selectedModelId === 'mistralai/voxtral-mini-tts-2603' && typeof id === 'string') {
          const parts = id.split('_');
          if (parts.length >= 3) {
            const lang = parts[0].toUpperCase();
            const raw = parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
            const tone = parts[2].charAt(0).toUpperCase() + parts[2].slice(1);
            name = `${lang}: ${raw} (${tone})`;
          }
        }

        return { id: String(id), name: String(name) };
      })
      .filter((v) => Boolean(v.id));

    if (selectedModelId === 'hexgrad/kokoro-82m' && activeLang) {
      const mapping: Record<string, string[]> = {
        'en-US': ['af', 'am'],
        'en-GB': ['bf', 'bm'],
        'es-ES': ['ef', 'em'],
        'fr-FR': ['ff'],
        'it-IT': ['if', 'im'],
        'ja-JP': ['jf', 'jm'],
        'pt-BR': ['pf', 'pm'],
        'zh-CN': ['zf', 'zm'],
      };
      const allowedPrefixes = mapping[activeLang];
      if (allowedPrefixes) {
        const filtered = normalized.filter((v) =>
          allowedPrefixes.some((p) => typeof v.id === 'string' && v.id.startsWith(p + '_'))
        );
        if (filtered.length > 0) return filtered;
      }
    }

    if (selectedModelId === 'mistralai/voxtral-mini-tts-2603' && activeLang) {
      const mapping: Record<string, string[]> = {
        'en-US': ['en'],
        'en-GB': ['gb'],
        'fr-FR': ['fr'],
      };
      const allowedPrefixes = mapping[activeLang];
      if (allowedPrefixes) {
        const filtered = normalized.filter((v) =>
          allowedPrefixes.some((p) => typeof v.id === 'string' && v.id.startsWith(p + '_'))
        );
        if (filtered.length > 0) return filtered;
      }
    }

    return normalized;
  }, [currentModel, selectedModelId, language, customLanguage]);

  // Update default voice when available voices change
  useEffect(() => {
    if (availableVoices.length > 0) {
      const hasCurrent = availableVoices.some((v) => v.id === voice);
      if (!hasCurrent) {
        setVoice(availableVoices[0].id);
      }
    }
  }, [availableVoices]);

  // Update model instructions if switched
  const handleModelChange = (modelId: string) => {
    setSelectedModelId(modelId);
    const m = models[modelId];
    if (m?.defaultInstructions && !instructions) {
      setInstructions(m.defaultInstructions);
    }
  };

  // Estimate cost calculation
  const estimatedCost = useMemo(() => {
    return estimateTTSCost(models, selectedModelId, text.trim());
  }, [models, selectedModelId, text]);

  // Handle TTS Generation
  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || isGenerating) return;

    setIsGenerating(true);
    setError(null);

    const activeLang = language === 'custom' ? customLanguage.trim() : language;

    try {
      const res = await generateTTSAudio({
        text: trimmed,
        modelId: selectedModelId,
        voice,
        language: activeLang || undefined,
        instructions: currentModel?.supportsInstructions ? instructions.trim() : undefined,
        pushToR2,
      });

      if (!res.success) {
        throw new Error(res.error || 'Generation failed');
      }

      setLastResult({
        localUrl: res.localUrl || '',
        r2Url: res.r2Url || null,
        r2Error: res.r2Error || null,
        stats: res.stats,
      });

      if (onAudioGenerated) {
        onAudioGenerated(res.r2Url || null, res.localUrl || '');
      }

      // Add to history
      const historyEntry: TTSHistoryItem = {
        id: `tts_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        textPreview: trimmed.substring(0, 60) + (trimmed.length > 60 ? '...' : ''),
        fullText: trimmed,
        modelId: selectedModelId,
        modelName: currentModel?.name || selectedModelId,
        voiceName: voice,
        languageName: activeLang || 'Default',
        instructionsPrompt: currentModel?.supportsInstructions ? instructions : undefined,
        compressedSizeKb: res.stats?.compressedSizeKb,
        compressionRatio: res.stats?.compressionRatio,
        localUrl: res.localUrl,
        r2Url: res.r2Url,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      const updatedHistory = [historyEntry, ...history.slice(0, 19)];
      setHistory(updatedHistory);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
      } catch (err) {
        console.warn('Failed to save history to localStorage:', err);
      }
    } catch (err: any) {
      console.error('Generation failed:', err);
      setError(err.message || 'An error occurred during audio generation.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyR2 = (url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopiedR2(true);
      setTimeout(() => setCopiedR2(false), 2000);
    });
  };

  const handleClearHistory = () => {
    setHistory([]);
    setPlayingId(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const handlePlayHistory = (item: TTSHistoryItem) => {
    const playUrl = resolveAudioUrl(item.r2Url || item.localUrl);
    if (!playUrl) return;

    if (playingId === item.id && audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
      setPlayingId(null);
      return;
    }

    const localUrlResolved = resolveAudioUrl(item.localUrl) || playUrl;
    const r2UrlResolved = item.r2Url ? resolveAudioUrl(item.r2Url) : null;

    setLastResult({
      localUrl: localUrlResolved,
      r2Url: r2UrlResolved,
      r2Error: null,
      stats: {
        originalSizeKb: '-',
        compressedSizeKb: item.compressedSizeKb || '-',
        compressionRatio: item.compressionRatio || '-',
        cost: '-',
      },
    });
    setText(item.fullText);
    setPlayingId(item.id);

    // Explicitly load and start playback
    setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.src = playUrl;
        audioRef.current.load();
        audioRef.current
          .play()
          .catch((err) => {
            console.warn('[TTS Studio] Audio playback failed:', err.message);
            setPlayingId(null);
          });
      }
    }, 50);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={onBack} className="items-center gap-2 text-sm">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Button>
          <div className="h-6 w-px bg-gray-200 hidden sm:block"></div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-100 text-purple-700 rounded-xl">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 leading-tight">TTS Audio Studio</h2>
              <p className="text-xs text-gray-500">High-efficiency speech synthesis for worksheets</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 text-xs font-semibold rounded-full border border-green-200">
            <Zap className="w-3.5 h-3.5" /> High-Efficiency VBR MP3
          </span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handleGenerate} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-5">
            {/* Text Input */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-sm font-medium text-gray-700">
                <label htmlFor="tts-input-text" className="font-semibold text-gray-800">
                  Input Text
                </label>
                <div className="flex items-center gap-3 text-xs text-gray-500 font-mono">
                  <span>{text.trim().length} chars</span>
                  {text.trim().length > 0 && (
                    <span className="text-purple-600 font-bold bg-purple-50 px-2 py-0.5 rounded">
                      Est. ${estimatedCost.toFixed(6)}
                    </span>
                  )}
                </div>
              </div>
              <textarea
                id="tts-input-text"
                rows={5}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type or paste the story, sentence, or vocabulary words you want to convert into speech..."
                className="w-full rounded-xl border border-gray-200 p-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                required
              />
              {selectedModelId === 'google/gemini-3.1-flash-tts-preview' && (
                <p className="flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 p-2 rounded-lg">
                  <Info className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Tip: You can use inline speech tags like <code>[whispers]</code>, <code>[laughs]</code>, or <code>[excited]</code> in your text.</span>
                </p>
              )}
            </div>

            {/* Model Selector Cards */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-800">Speech Model</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {Object.entries(models).map(([key, m]) => {
                  const isSelected = selectedModelId === key;
                  const priceLabel =
                    m.pricing.unit === 'token'
                      ? `$${(parseFloat(m.pricing.completion) * 1000000).toFixed(2)}/M out tokens`
                      : `$${(parseFloat(m.pricing.prompt) * 1000000).toFixed(2)}/M chars`;

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleModelChange(key)}
                      className={`text-left p-3.5 rounded-xl border transition-all relative flex flex-col justify-between ${
                        isSelected
                          ? 'border-purple-600 bg-purple-50/50 shadow-sm ring-1 ring-purple-500'
                          : 'border-gray-200 bg-gray-50/50 hover:bg-gray-50 hover:border-gray-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-xs text-gray-900 line-clamp-1">{m.name.split(':')[1] || m.name}</span>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-purple-600 flex-shrink-0" />}
                        </div>
                        <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed mb-2">
                          {m.description}
                        </p>
                      </div>
                      <div className="mt-auto pt-2 border-t border-gray-200/60 flex items-center justify-between text-[10px] font-mono text-gray-600">
                        <span className="font-semibold text-purple-700">{priceLabel}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Voice Guide Prompt / Instructions (if supported) */}
            {currentModel?.supportsInstructions && (
              <div className="space-y-1.5 p-3.5 bg-purple-50/40 rounded-xl border border-purple-100">
                <div className="flex justify-between items-center text-xs font-semibold text-purple-900">
                  <label htmlFor="tts-instructions" className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                    Voice Guide Prompt
                  </label>
                  <span className="text-[10px] bg-purple-200/70 text-purple-800 px-2 py-0.5 rounded font-mono">
                    Supported
                  </span>
                </div>
                <input
                  id="tts-instructions"
                  type="text"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="e.g. A slow clear voice suitable for ESL students."
                  className="w-full text-xs rounded-lg border border-purple-200 bg-white p-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-[11px] text-purple-700/80">
                  Direct the vocal tone, pacing, or accent (e.g. "Slow tempo, warm tone, clear vowels").
                </p>
              </div>
            )}

            {/* Voice & Language Dropdowns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Language Selector */}
              {currentModel?.supportsLanguage && (
                <div className="space-y-1.5">
                  <label htmlFor="tts-language" className="text-xs font-semibold text-gray-800">
                    Language
                  </label>
                  <select
                    id="tts-language"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 p-2.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Auto-detect / Default</option>
                    {currentModel.languages?.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.name} ({lang.code})
                      </option>
                    ))}
                    <option value="custom">Custom BCP-47 Code...</option>
                  </select>

                  {language === 'custom' && (
                    <input
                      type="text"
                      value={customLanguage}
                      onChange={(e) => setCustomLanguage(e.target.value)}
                      placeholder="e.g. de-DE, pt-BR"
                      className="w-full rounded-lg border border-gray-200 p-2 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 mt-1"
                    />
                  )}
                </div>
              )}

              {/* Voice Selector */}
              <div className="space-y-1.5">
                <label htmlFor="tts-voice" className="text-xs font-semibold text-gray-800">
                  Voice
                </label>
                <select
                  id="tts-voice"
                  value={voice}
                  onChange={(e) => setVoice(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 p-2.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                >
                  {availableVoices.length === 0 ? (
                    <option value="">No voices for this language</option>
                  ) : (
                    availableVoices.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            {/* R2 Cloudflare Push Option */}
            <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${r2Configured ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                  <Cloud className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-900">Cloudflare R2 Storage</span>
                    {!r2Configured && (
                      <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded font-medium border border-amber-200">
                        Not configured on backend
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-gray-500 block">
                    {r2Configured
                      ? 'Upload MP3 directly to your public R2 bucket CDN'
                      : 'Audio will be generated and served locally'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={pushToR2}
                disabled={!r2Configured}
                onClick={() => setPushToR2(!pushToR2)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                  !r2Configured
                    ? 'cursor-not-allowed bg-gray-200 opacity-60'
                    : pushToR2
                    ? 'cursor-pointer bg-purple-600'
                    : 'cursor-pointer bg-gray-200'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    pushToR2 && r2Configured ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isGenerating || !text.trim()}
              className="w-full justify-center items-center gap-2 py-3 text-sm font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-sm transition"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Synthesizing Speech & Compressing...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" /> Generate Speech Audio
                </>
              )}
            </Button>
          </form>
        </div>

        {/* Right Column: Audio Output & History (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Output Card */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-purple-600" /> Audio Result
            </h3>

            {error && (
              <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Generation Error</p>
                  <p className="mt-0.5">{error}</p>
                </div>
              </div>
            )}

            {!lastResult && !isGenerating && !error && (
              <div className="text-center py-10 px-4 border-2 border-dashed border-gray-100 rounded-xl">
                <Volume2 className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                <p className="text-xs font-medium text-gray-500">Ready to convert</p>
                <p className="text-[11px] text-gray-400 mt-1">Enter text and hit Generate to produce compressed MP3 audio.</p>
              </div>
            )}

            {isGenerating && (
              <div className="text-center py-10 px-4 bg-purple-50/30 border border-purple-100 rounded-xl space-y-3">
                <Loader2 className="w-8 h-8 mx-auto text-purple-600 animate-spin" />
                <div>
                  <p className="text-xs font-bold text-gray-900">Processing Audio...</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">Calling OpenRouter & running high-efficiency FFmpeg compression</p>
                </div>
              </div>
            )}

            {lastResult && (
              <div className="space-y-4">
                {/* HTML5 Audio Player */}
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                  <audio
                    ref={audioRef}
                    controls
                    autoPlay
                    src={resolveAudioUrl(lastResult.localUrl || lastResult.r2Url || '')}
                    onPause={() => setPlayingId(null)}
                    onEnded={() => setPlayingId(null)}
                    className="w-full h-10"
                  />
                </div>

                {/* Compression Metrics Grid */}
                {lastResult.stats && (
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                      <span className="text-gray-400 block text-[10px] uppercase font-semibold">Size</span>
                      <span className="font-bold text-gray-800 font-mono">{lastResult.stats.compressedSizeKb} KB</span>
                    </div>
                    <div className="bg-green-50 p-2.5 rounded-xl border border-green-100 text-green-800">
                      <span className="text-green-600 block text-[10px] uppercase font-semibold">Saved</span>
                      <span className="font-bold font-mono">{lastResult.stats.compressionRatio}%</span>
                    </div>
                    <div className="bg-purple-50 p-2.5 rounded-xl border border-purple-100 text-purple-800">
                      <span className="text-purple-600 block text-[10px] uppercase font-semibold">Cost</span>
                      <span className="font-bold font-mono">${lastResult.stats.cost}</span>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-2 pt-2">
                  {lastResult.r2Url ? (
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-gray-700 flex items-center gap-1.5">
                        <Cloud className="w-3.5 h-3.5 text-blue-600" /> Cloudflare R2 URL
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          readOnly
                          value={resolveAudioUrl(lastResult.r2Url)}
                          className="w-full text-xs font-mono bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700 focus:outline-none"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleCopyR2(resolveAudioUrl(lastResult.r2Url))}
                          className="items-center gap-1 text-xs px-3 flex-shrink-0"
                        >
                          {copiedR2 ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedR2 ? 'Copied' : 'Copy'}
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  {lastResult.r2Error && (
                    <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
                      R2 notice: {lastResult.r2Error}
                    </p>
                  )}

                  <a
                    href={resolveAudioUrl(lastResult.localUrl || lastResult.r2Url || '#')}
                    download
                    className="inline-flex w-full items-center justify-center gap-2 py-2 text-xs font-semibold rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 transition"
                  >
                    <Download className="w-3.5 h-3.5" /> Download MP3 File
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* History Panel */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                <RotateCcw className="w-3.5 h-3.5 text-gray-500" /> Recent Audio History
              </h3>
              {history.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearHistory}
                  className="text-[11px] text-gray-400 hover:text-red-600 transition flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" /> Clear
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">No recent audio generations.</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {history.map((item) => {
                  const isItemPlaying = playingId === item.id;
                  const itemDownloadUrl = resolveAudioUrl(item.r2Url || item.localUrl || '#');

                  return (
                    <div
                      key={item.id}
                      className={`p-3 border rounded-xl transition flex items-center justify-between gap-3 text-xs ${
                        isItemPlaying
                          ? 'bg-purple-50/70 border-purple-200 shadow-xs'
                          : 'bg-gray-50/70 hover:bg-gray-50 border-gray-100'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-800 truncate" title={item.fullText}>
                          {item.textPreview}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-gray-500 mt-1">
                          <span className="bg-white px-1.5 py-0.5 rounded border border-gray-200 font-medium">
                            {item.modelName.split(':')[1]?.trim() || item.modelName}
                          </span>
                          <span>{item.compressedSizeKb} KB</span>
                          <span>•</span>
                          <span>{item.timestamp}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handlePlayHistory(item)}
                          title={isItemPlaying ? 'Pause Audio' : 'Play Audio'}
                          className={`p-1.5 rounded-lg transition ${
                            isItemPlaying
                              ? 'text-purple-700 bg-purple-100 ring-1 ring-purple-300'
                              : 'text-gray-600 hover:text-purple-600 hover:bg-purple-50'
                          }`}
                        >
                          {isItemPlaying ? (
                            <Pause className="w-3.5 h-3.5 fill-current" />
                          ) : (
                            <Play className="w-3.5 h-3.5 fill-current" />
                          )}
                        </button>
                        <a
                          href={itemDownloadUrl}
                          download
                          title="Download Audio"
                          className="p-1.5 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                        {item.r2Url && (
                          <button
                            type="button"
                            onClick={() => handleCopyR2(resolveAudioUrl(item.r2Url))}
                            title="Copy R2 URL"
                            className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
