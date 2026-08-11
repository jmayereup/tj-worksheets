import React, { useState, useMemo } from 'react';
import { FillInBlankItem, VocabularyItem } from '../../types';
import { normalizeString, seededShuffle, shouldShowAudioControls } from '../../utils/textUtils';
import { Button } from '../UI/Button';
import { Check, XCircle, RefreshCw } from 'lucide-react';
import { AudioControls } from '../UI/AudioControls';

interface Props {
  data: FillInBlankItem[];
  vocabItems: VocabularyItem[];
  level: string;
  language: string;
  onChange: (answers: Record<number, string>) => void;
  savedAnswers: Record<number, string>;
  voiceName?: string | null;
  savedIsChecked?: boolean;
  onComplete?: (isChecked: boolean) => void;
  toggleTTS: (rate: number, overrideText?: string) => void;
  ttsState: { status: 'playing' | 'paused' | 'stopped', rate: number };
  lessonId: string;
}

const MAX_CONTINUES = 3;

export const FillInBlanks: React.FC<Props> = ({
  data,
  vocabItems,
  level,
  language,
  onChange,
  savedAnswers,
  voiceName,
  savedIsChecked = false,
  onComplete,
  toggleTTS,
  ttsState,
  lessonId
}) => {
  const [isChecked, setIsChecked] = useState(savedIsChecked);
  const [activeSpeechIdx, setActiveSpeechIdx] = useState<number | null>(null);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [continueCount, setContinueCount] = useState(0);

  // Randomize question order once on mount/data change
  const shuffledIndices = useMemo(() => {
    const indices = data.map((_, i) => i);
    return seededShuffle(indices, `${lessonId}-fill-indices`);
  }, [data, lessonId]);

  // Create word bank from answers
  const wordBank = useMemo(() => {
    const answers = data.map(item => item.answer);
    return seededShuffle(answers, `${lessonId}-fill-bank`);
  }, [data, lessonId]);

  if (!data || data.length === 0) return null;

  const handleCheck = () => {
    setIsChecked(true);
    onComplete?.(true);
  };

  const handleWordSelect = (word: string) => {
    if (isChecked) return;

    // If word is already used, unmatch it
    const isUsed = Object.values(savedAnswers).includes(word);
    if (isUsed) {
      const newAnswers = { ...savedAnswers };
      const keyToRemove = Object.keys(newAnswers).find(key => newAnswers[parseInt(key)] === word);
      if (keyToRemove) {
        delete newAnswers[parseInt(keyToRemove)];
        onChange(newAnswers);
        setSelectedWord(null);
        return;
      }
    }

    setSelectedWord(selectedWord === word ? null : word);
  };

  const handleSlotClick = (originalIndex: number) => {
    if (isChecked) return;

    if (selectedWord) {
      // Place selected word
      onChange({
        ...savedAnswers,
        [originalIndex]: selectedWord
      });
      setSelectedWord(null);
    } else if (savedAnswers[originalIndex]) {
      // Remove word if slot is clicked and no word is selected
      const newAnswers = { ...savedAnswers };
      delete newAnswers[originalIndex];
      onChange(newAnswers);
    }
  };

  const handleRetry = () => {
    if (continueCount >= MAX_CONTINUES) return;

    // Keep only correct matches
    const newAnswers: Record<number, string> = {};
    data.forEach((item, idx) => {
      const userAnswer = savedAnswers[idx] || '';
      if (normalizeString(userAnswer) === normalizeString(item.answer)) {
        newAnswers[idx] = userAnswer;
      }
    });

    setContinueCount(prev => prev + 1);
    setIsChecked(false);
    onChange(newAnswers);
    setSelectedWord(null);
    onComplete?.(false);
  };

  const handleFullReset = () => {
    setContinueCount(0);
    setIsChecked(false);
    onChange({});
    setSelectedWord(null);
    onComplete?.(false);
  };

  // Calculate score
  const correctCount = data.reduce((acc, item, index) => {
    const userAnswer = savedAnswers[index] || '';
    return normalizeString(userAnswer) === normalizeString(item.answer) ? acc + 1 : acc;
  }, 0);

  return (
    <section className="mb-8 relative">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xl font-black text-green-900 uppercase tracking-tight">Fill in the blanks</h2>
        {isChecked && (
          <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full font-bold text-sm">
            Score: {correctCount} / {data.length}
          </div>
        )}
      </div>

      <p className="text-gray-500 mb-4 text-sm font-medium">Fill in the missing words to complete the sentences.</p>

      <div className="bg-gray-50 p-4 rounded-xl mb-8 border border-gray-100 shadow-inner">
        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Word Bank</h3>
        <div className="flex flex-wrap justify-center gap-3" translate="no">
          {wordBank.map((word, idx) => {
            const isUsed = Object.values(savedAnswers).includes(word);
            const isSelected = selectedWord === word;

            let colorClass = isSelected
              ? "bg-slate-700 text-white border-slate-700 shadow-lg ring-4 ring-slate-100 scale-105"
              : (isUsed ? "bg-gray-100 text-gray-400 border-gray-200" : "bg-white text-gray-700 border-gray-200 hover:border-slate-300 hover:bg-slate-50");

            return (
              <button
                key={idx}
                onClick={() => handleWordSelect(word)}
                disabled={isChecked}
                className={`px-4 py-1.5 rounded-full border font-bold transition-all duration-200 shadow-sm ${colorClass}`}
              >
                {word}
              </button>
            );
          })}
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-6">
        {shuffledIndices.map((originalIndex) => {
          const item = data[originalIndex];
          const userAnswer = savedAnswers[originalIndex] || '';
          const isCorrect = normalizeString(userAnswer) === normalizeString(item.answer);
          const isSlotActive = selectedWord !== null;

          let slotClass = "border-b-2 border-solid px-2 py-1 mx-2 focus:outline-none transition-all min-w-[100px] text-center font-bold cursor-pointer rounded-t-md";

          if (isChecked) {
            slotClass += isCorrect
              ? " border-green-500 bg-green-50 text-green-700"
              : " border-red-500 bg-red-50 text-red-700";
          } else if (userAnswer) {
            slotClass += " border-slate-400 bg-slate-50/50 text-slate-900";
          } else if (isSlotActive) {
            slotClass += " border-slate-300 bg-slate-50 ring-4 ring-slate-100 animate-pulse";
          } else {
            slotClass += " border-slate-300 bg-gray-50/50 text-transparent";
          }

          return (
            <div key={originalIndex} className="leading-loose text-base text-gray-700 flex flex-wrap items-center">
              <div className="flex items-center mr-3">
                {shouldShowAudioControls() && (
                  <AudioControls
                    onSlowToggle={() => {
                      setActiveSpeechIdx(originalIndex);
                      toggleTTS(0.6, `${item.before} ${item.answer} ${item.after}`);
                      if (ttsState.status === 'stopped') {
                        setTimeout(() => setActiveSpeechIdx(null), 3000);
                      }
                    }}
                    onListenToggle={() => {
                      setActiveSpeechIdx(originalIndex);
                      toggleTTS(1.0, `${item.before} ${item.answer} ${item.after}`);
                      if (ttsState.status === 'stopped') {
                        setTimeout(() => setActiveSpeechIdx(null), 3000);
                      }
                    }}
                    ttsStatus={activeSpeechIdx === originalIndex ? ttsState.status : 'stopped'}
                    currentRate={activeSpeechIdx === originalIndex ? ttsState.rate : 1.0}
                    hasVoices={false}
                  />
                )}
              </div>
              <div className="selectable-text flex flex-wrap items-center" translate="no">
                <span>{item.before}</span>
                <button
                  onClick={() => handleSlotClick(originalIndex)}
                  className={slotClass}
                  disabled={isChecked}
                >
                  {userAnswer || '_____'}
                </button>
                <span>{item.after}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selection Bar */}
      {selectedWord && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-bounce-in">
          <div className="bg-slate-700 text-white px-4 py-2 rounded-2xl shadow-2xl flex items-center gap-3 border-4 border-white ring-8 ring-slate-700/20">
            <span className="text-lg font-black" translate="no">{selectedWord}</span>
            <button
              onClick={() => setSelectedWord(null)}
              className="bg-white/20 hover:bg-white/40 p-1.5 rounded-lg transition-colors"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 flex flex-col items-center gap-4">
        {isChecked && correctCount < data.length && continueCount >= MAX_CONTINUES && (
          <div className="text-red-600 font-semibold text-sm bg-red-50 px-4 py-2 rounded-lg border border-red-200">
            No continues remaining (3/3 used). You must reset the activity to try again.
          </div>
        )}
        <div className="flex flex-wrap justify-center gap-4">
          {!isChecked ? (
            <Button
              onClick={handleCheck}
              variant='primary'
              size='md'
              disabled={Object.keys(savedAnswers).length === 0}
            >
              <Check size={20} /> Check Answers
            </Button>
          ) : (
            <>
              {correctCount < data.length && continueCount < MAX_CONTINUES && (
                <Button
                  onClick={handleRetry}
                  variant="primary"
                  size="md"
                >
                  <RefreshCw className="w-5 h-5 mr-2" /> Continue ({MAX_CONTINUES - continueCount} left)
                </Button>
              )}
              <Button
                onClick={handleFullReset}
                variant="danger"
                size="md"
              >
                Reset Activity
              </Button>
            </>
          )}
        </div>
      </div>
    </section>
  );
};
