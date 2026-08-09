import React, { useEffect, useState } from 'react';
import { X, PlayCircle, CheckCircle2, Volume2, Globe } from 'lucide-react';
import { Button } from './Button';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    voices: SpeechSynthesisVoice[];
    selectedVoiceName: string | null;
    onSelectVoice: (voiceName: string) => void;
    language: string;
    hasRecordedAudio?: boolean;
    audioPreference: 'recorded' | 'tts';
    onSelectPreference: (pref: 'recorded' | 'tts') => void;
}

export const VoiceSelectorModal: React.FC<Props> = ({
    isOpen,
    onClose,
    voices,
    selectedVoiceName,
    onSelectVoice,
    language,
    hasRecordedAudio,
    audioPreference,
    onSelectPreference
}) => {
    const [testPlaying, setTestPlaying] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const testVoice = (voice: SpeechSynthesisVoice) => {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(`Hello, this is my voice in ${language}.`);
        utterance.voice = voice;
        utterance.lang = voice.lang;
        utterance.rate = 1.0;

        utterance.onstart = () => setTestPlaying(voice.name);
        utterance.onend = () => setTestPlaying(null);
        utterance.onerror = () => setTestPlaying(null);

        window.speechSynthesis.speak(utterance);
    };

    return (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
                onClick={onClose}
            />

            {/* Modal Container */}
            <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden animate-scale-in border border-slate-100 flex flex-col max-h-[85vh]">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-linear-to-r from-blue-50 to-white">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-100">
                            <Volume2 size={22} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">Audio Settings</h2>
                            <p className="text-xs text-slate-500 font-medium">Select your preferred audio source for {language}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-600"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Voice List */}
                <div className="p-4 overflow-y-auto space-y-2 custom-scrollbar">
                    {/* Recorded Audio Option */}
                    {hasRecordedAudio && (
                        <div
                            onClick={() => onSelectPreference('recorded')}
                            className={`
                group relative p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between
                ${audioPreference === 'recorded'
                                    ? 'border-blue-500 bg-blue-50/80 shadow-md outline-2 outline-blue-300'
                                    : 'border-slate-100 bg-white hover:border-blue-200 hover:bg-slate-50'
                                }
              `}
                        >
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                <div className={`
                  w-10 h-10 rounded-xl flex items-center justify-center shrink-0
                  ${audioPreference === 'recorded' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-white'}
                `}>
                                    <Volume2 size={20} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className={`font-bold truncate ${audioPreference === 'recorded' ? 'text-blue-900' : 'text-slate-700'}`}>
                                            Recorded Audio
                                        </span>
                                        <span className="text-[10px] font-black tracking-tighter text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded uppercase">
                                            OFFICIAL
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider text-wrap leading-tight">High Quality</p>
                                </div>
                            </div>
                            {audioPreference === 'recorded' && <CheckCircle2 size={20} className="text-blue-600 ml-3 shrink-0" />}
                        </div>
                    )}

                    {voices.length > 0 && hasRecordedAudio && (
                        <div className="pt-2 pb-1">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-2">System TTS Voices</p>
                        </div>
                    )}

                    {voices.length === 0 ? (
                        <div className="py-12 text-center text-wrap">
                            <Globe className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                            <p className="text-slate-500 font-medium">No system voices found for {language}</p>
                        </div>
                    ) : (
                        voices.map((voice) => {
                            const isSelected = audioPreference === 'tts' && voice.name === selectedVoiceName;
                            const vName = voice.name.toLowerCase();
                            const isNatural =
                                vName.includes('natural') ||
                                vName.includes('google') ||
                                vName.includes('enhanced') ||
                                vName.includes('premium') ||
                                vName.includes('neural') ||
                                vName.includes('wavenet') ||
                                vName.includes('multilingual') ||
                                vName.includes('multi-lingual') ||
                                vName.includes('siri') ||
                                vName.includes('alex');

                            return (
                                <div
                                    key={voice.name}
                                    onClick={() => {
                                        onSelectVoice(voice.name);
                                        onSelectPreference('tts');
                                    }}
                                    className={`
                    group relative p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between
                    ${isSelected
                                            ? 'border-blue-500 bg-blue-50/80 shadow-md outline-2 outline-blue-300'
                                            : 'border-slate-100 bg-white hover:border-blue-200 hover:bg-slate-50'
                                        }
                  `}
                                >
                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                        <div className={`
                      w-10 h-10 rounded-xl flex items-center justify-center shrink-0
                      ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-white'}
                    `}>
                                            {isSelected ? <CheckCircle2 size={20} /> : <Globe size={20} />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className={`font-bold truncate ${isSelected ? 'text-blue-900' : 'text-slate-700'}`}>
                                                    {voice.name.replace(/Microsoft |Google /g, '')}
                                                </span>
                                                {isNatural && (
                                                    <span className="text-[10px] font-black tracking-tighter text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded uppercase flex items-center gap-0.5">
                                                        ✨ PREMIUM
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider leading-tight">{voice.lang}</p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            testVoice(voice);
                                        }}
                                        disabled={testPlaying === voice.name}
                                        className={`
                      ml-3 p-2 rounded-xl transition-all shrink-0
                      ${testPlaying === voice.name
                                                ? 'bg-blue-600 text-white animate-pulse'
                                                : 'bg-slate-50 text-slate-400 hover:bg-blue-100 hover:text-blue-600'
                                            }
                    `}
                                        title="Preview Voice"
                                    >
                                        <PlayCircle size={20} />
                                    </button>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
                    <Button onClick={onClose} variant="primary" className="rounded-xl px-8">
                        Done
                    </Button>
                </div>
            </div>
        </div>
    );
};
