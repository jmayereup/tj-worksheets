import { useState, useEffect, useRef, useCallback } from 'react';
import { getLangCode } from '../utils/textUtils';
import { getVoicesForLang, getBestVoice } from '../utils/tts';

interface UseTTSProps {
  language: string;
  audioFileUrl?: string;
  defaultAudioPreference?: 'recorded' | 'tts';
  onStartCallback?: () => void;
  defaultReadingText?: string;
}

export const useTTS = ({ 
  language, 
  audioFileUrl, 
  defaultAudioPreference = 'tts',
  onStartCallback,
  defaultReadingText
}: UseTTSProps) => {
  const [ttsState, setTtsState] = useState<{ status: 'playing' | 'paused' | 'stopped', rate: number }>({ 
    status: 'stopped', 
    rate: 1.0 
  });
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string | null>(null);
  const [audioPreference, setAudioPreference] = useState<'recorded' | 'tts'>(
    audioFileUrl ? (defaultAudioPreference || 'recorded') : 'tts'
  );
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const userHasSelectedVoice = useRef(false);
  const activeContentRef = useRef<string | null>(null);
  const prevLanguageRef = useRef<string>(language);

  // Initialize and update voices
  useEffect(() => {
    // Reset user voice preference flag when language changes so we auto-select the best voice
    if (prevLanguageRef.current !== language) {
      userHasSelectedVoice.current = false;
      prevLanguageRef.current = language;
    }

    const updateVoices = () => {
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        return;
      }
      
      const langCode = getLangCode(language);
      const voices = getVoicesForLang(langCode);
      setAvailableVoices(voices);

      const synth = window.speechSynthesis;
      const allVoices = synth.getVoices();
      
      const savedVoiceName = typeof localStorage !== 'undefined' 
        ? localStorage.getItem(`reader-voice-${langCode}`)
        : null;

      if (savedVoiceName && allVoices.some(v => v.name === savedVoiceName)) {
        setSelectedVoiceName(savedVoiceName);
        userHasSelectedVoice.current = true;
      } else {
        const currentVoice = allVoices.find(v => v.name === selectedVoiceName);
        const langPrefix = langCode.split(/[-_]/)[0].toLowerCase();
        const currentVoicePrefix = currentVoice?.lang.split(/[-_]/)[0].toLowerCase();

        if (!selectedVoiceName || (currentVoicePrefix !== langPrefix && !userHasSelectedVoice.current)) {
          const best = getBestVoice(langCode);
          if (best) setSelectedVoiceName(best.name);
        }
      }
    };

    updateVoices();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = updateVoices;
      }
    }

    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
          window.speechSynthesis.onvoiceschanged = null;
        }
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [language, selectedVoiceName]);

  const playTTS = useCallback((rate: number, text: string, overrideLang?: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
        console.warn('SpeechSynthesis not supported/available');
        return;
    }
    const synth = window.speechSynthesis;

    // If clicking the active button (same text and same rate)
    if (ttsState.rate === rate && ttsState.status !== 'stopped' && activeContentRef.current === text) {
      if (ttsState.status === 'playing') {
        synth.pause();
        setTtsState(prev => ({ ...prev, status: 'paused' }));
      } else {
        synth.resume();
        setTtsState(prev => ({ ...prev, status: 'playing' }));
      }
      return;
    }

    // New start or changing rate/content
    activeContentRef.current = text;
    synth.cancel();
    if (audioRef.current) {
      audioRef.current.pause();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    const langCode = getLangCode(overrideLang || language);
    utterance.lang = langCode;
    utterance.rate = rate;

    // Use selected voice ONLY if it matches the requested language prefix
    // otherwise fall back to getBestVoice for the specific language
    const voices = synth.getVoices();
    let voiceToUse = null;

    if (selectedVoiceName) {
      const selectedVoice = voices.find(v => v.name === selectedVoiceName);
      if (selectedVoice) {
        const requestedPrefix = langCode.split(/[-_]/)[0].toLowerCase();
        const voicePrefix = selectedVoice.lang.split(/[-_]/)[0].toLowerCase();
        if (requestedPrefix === voicePrefix) {
          voiceToUse = selectedVoice;
        }
      }
    }

    if (!voiceToUse) {
      voiceToUse = getBestVoice(langCode);
    }

    if (voiceToUse) {
      utterance.voice = voiceToUse;
    }

    utterance.onend = () => {
      setTtsState(prev => ({ ...prev, status: 'stopped' }));
    };

    synth.speak(utterance);
    setTtsState({ status: 'playing', rate });

    if (onStartCallback) onStartCallback();
  }, [language, selectedVoiceName, ttsState, onStartCallback]);

  const toggleTTS = useCallback((rate: number, overrideText?: string, overrideLang?: string, isPassage?: boolean) => {
    // Use audio file if available and preferred, but ONLY if no override text is provided OR if it is explicitly a passage text
    if (audioFileUrl && audioPreference === 'recorded' && (!overrideText || isPassage)) {
      if (!audioRef.current) {
        audioRef.current = new Audio(audioFileUrl);
        audioRef.current.onended = () => {
          setTtsState(prev => ({ ...prev, status: 'stopped' }));
        };
      }

      const audio = audioRef.current;

      // If clicking the active button (same source and same rate)
      if (ttsState.rate === rate && ttsState.status !== 'stopped' && activeContentRef.current === audioFileUrl) {
        if (ttsState.status === 'playing') {
          audio.pause();
          setTtsState(prev => ({ ...prev, status: 'paused' }));
        } else {
          audio.play();
          setTtsState(prev => ({ ...prev, status: 'playing' }));
        }
        return;
      }

      // New start or changing rate/content
      activeContentRef.current = audioFileUrl;
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel(); 
      }
      audio.pause();
      audio.currentTime = 0;
      audio.playbackRate = rate;

      audio.play()
        .then(() => {
          setTtsState({ status: 'playing', rate });
        })
        .catch(e => {
          console.error("Audio playback failed, falling back to TTS:", e);
          setAudioPreference('tts');
          // If fallback occurs, we need text. The caller should provide a sensible default if they want TTS fallback.
        });

      if (onStartCallback) onStartCallback();
      return;
    }

    // Default to TTS if not recorded or if override provided
    const textToSpeak = overrideText || defaultReadingText || ""; 
    if (textToSpeak) {
        playTTS(rate, textToSpeak, overrideLang);
    }
  }, [audioFileUrl, audioPreference, ttsState, onStartCallback, playTTS, defaultReadingText]);


  const handleSetSelectedVoiceName = useCallback((name: string | null) => {
    userHasSelectedVoice.current = true;
    setSelectedVoiceName(name);
    if (typeof localStorage !== 'undefined') {
      const langCode = getLangCode(language);
      if (name) {
        localStorage.setItem(`reader-voice-${langCode}`, name);
      } else {
        localStorage.removeItem(`reader-voice-${langCode}`);
      }
    }
  }, [language]);

  const handleSetAudioPreference = useCallback((pref: 'recorded' | 'tts') => {
    userHasSelectedVoice.current = true;
    setAudioPreference(pref);
    if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
    if (audioRef.current) audioRef.current.pause();
    setTtsState(prev => ({ ...prev, status: 'stopped' }));
  }, []);

  return {
    ttsState,
    availableVoices,
    selectedVoiceName,
    setSelectedVoiceName: handleSetSelectedVoiceName,
    audioPreference,
    setAudioPreference: handleSetAudioPreference,
    toggleTTS
  };
};
