import React, { useState, useEffect } from 'react';
import { VocabularyActivity } from '../../types';
import { Button } from '../UI/Button';
import { Volume2, RefreshCw, XCircle, Check } from 'lucide-react';
import { shouldShowAudioControls, seededShuffle } from '../../utils/textUtils';
import { VocabularyList } from '../UI/VocabularyList';

interface Props {
  data: VocabularyActivity;
  language: string;
  onChange: (answers: Record<string, string>) => void;
  savedAnswers: Record<string, string>;
  voiceName?: string | null;
  savedIsChecked?: boolean;
  onComplete?: (isChecked: boolean) => void;
  toggleTTS: (rate: number, overrideText?: string) => void;
  ttsState: { status: 'playing' | 'paused' | 'stopped', rate: number };
  lessonId: string;
  title?: string;
  hasActivityToggle?: boolean;
  limitToFive?: boolean;
}

const MAX_CONTINUES = 3;

export const Vocabulary: React.FC<Props> = ({
  data,
  onChange,
  savedAnswers,
  savedIsChecked = false,
  onComplete,
  toggleTTS,
  lessonId,
  title = "Vocabulary Matching",
  hasActivityToggle = false,
  limitToFive = false
}) => {
  const [mode, setMode] = useState<'matching' | 'list'>(hasActivityToggle ? 'list' : 'matching');
  const [shuffledWordIndices, setShuffledWordIndices] = useState<number[]>([]);
  const [shuffledDefIndices, setShuffledDefIndices] = useState<number[]>([]);
  const [isChecked, setIsChecked] = useState(savedIsChecked);
  const [score, setScore] = useState(0);
  const [selectedWordIndex, setSelectedWordIndex] = useState<number | null>(null);
  const [continueCount, setContinueCount] = useState(0);

  useEffect(() => {
    setIsChecked(savedIsChecked);
  }, [savedIsChecked]);

  useEffect(() => {
    // Shuffle words and definitions once on mount
    let wordIndices = data.items.map((_, i) => i);
    let defIndices = data.definitions.map((_, i) => i);

    if (limitToFive && mode === 'matching') {
      // Choose a subset of 5 words for matching mode
      const allShuffledIndices = seededShuffle(wordIndices, `${lessonId}-vocab-subset-seed`);
      wordIndices = allShuffledIndices.slice(0, 5);

      // Definitions need to be filtered to only include those for the selected words
      const selectedAnswers = wordIndices.map(idx => data.items[idx].answer);
      defIndices = data.definitions
        .filter(d => selectedAnswers.includes(d.id))
        .map((_, i) => {
          // We need the original index in data.definitions to map correctly to characters
          const originalDef = data.definitions.findIndex(d => d.id === selectedAnswers[i]);
          return originalDef;
        })
        .filter(idx => idx !== -1);

      // Re-shuffle definitions for matching
      defIndices = seededShuffle(defIndices, `${lessonId}-vocab-defs-subset`);
    } else if (!limitToFive) {
      wordIndices = seededShuffle(wordIndices, `${lessonId}-vocab-words`);
      defIndices = seededShuffle(defIndices, `${lessonId}-vocab-defs`);
    }

    setShuffledWordIndices(wordIndices);
    setShuffledDefIndices(defIndices);
  }, [data, lessonId, mode, hasActivityToggle]);

  const handleWordSelect = (wordIndex: number) => {
    if (isChecked) return;

    // If word is already matched, unmatch it
    const isMatched = Object.keys(savedAnswers).some(key => key === `vocab_${wordIndex}`);
    if (isMatched) {
      const newAnswers = { ...savedAnswers };
      delete newAnswers[`vocab_${wordIndex}`];
      onChange(newAnswers);
      setSelectedWordIndex(null);
      return;
    }

    setSelectedWordIndex(selectedWordIndex === wordIndex ? null : wordIndex);
  };

  const handleDefSelect = (defIndex: number) => {
    if (isChecked) return;

    if (selectedWordIndex === null) {
      // If no word selected, check if this slot is matched and unmatch it
      const matched = getMatchedWordLabel(defIndex);
      if (matched) {
        const newAnswers = { ...savedAnswers };
        delete newAnswers[`vocab_${matched.index}`];
        onChange(newAnswers);
      }
      return;
    }

    // Map definition index to letter (a, b, c...)
    const char = String.fromCharCode(97 + defIndex);

    // Check if this word was already matched elsewhere and remove that old match
    const newAnswers = { ...savedAnswers };
    Object.keys(newAnswers).forEach(key => {
      if (key.startsWith('vocab_') && newAnswers[key] === char) {
        delete newAnswers[key];
      }
    });

    // Set new match
    newAnswers[`vocab_${selectedWordIndex}`] = char;
    onChange(newAnswers);
    setSelectedWordIndex(null); // Clear selection after matching

  };

  const checkAnswers = (currentAnswers = savedAnswers) => {
    let correctCount = 0;
    shuffledWordIndices.forEach((idx) => {
      const item = data.items[idx];
      const userAnswer = currentAnswers[`vocab_${idx}`] || '';
      const correctDefIndex = data.definitions.findIndex(d => d.id === item.answer);
      const correctChar = String.fromCharCode(97 + correctDefIndex);

      if (userAnswer.toLowerCase() === correctChar) {
        correctCount++;
      }
    });

    setScore(correctCount);
    setIsChecked(true);
    onComplete?.(true);
  };

  const handleRetry = () => {
    if (continueCount >= MAX_CONTINUES) return;

    // Keep only correct matches
    const newAnswers: Record<string, string> = {};
    shuffledWordIndices.forEach((idx) => {
      const item = data.items[idx];
      const userAnswer = savedAnswers[`vocab_${idx}`] || '';
      const correctDefIndex = data.definitions.findIndex(d => d.id === item.answer);
      const correctChar = String.fromCharCode(97 + correctDefIndex);

      if (userAnswer.toLowerCase() === correctChar) {
        newAnswers[`vocab_${idx}`] = userAnswer;
      }
    });

    setContinueCount(prev => prev + 1);
    setIsChecked(false);
    setScore(0);
    onChange(newAnswers);
    setSelectedWordIndex(null);
    onComplete?.(false);
  };

  const handleFullReset = () => {
    setContinueCount(0);
    setIsChecked(false);
    setScore(0);
    onChange({});
    setSelectedWordIndex(null);
    onComplete?.(false);
  };

  // Find which word is matched to which definition for display
  const getMatchedWordLabel = (defIndex: number) => {
    const char = String.fromCharCode(97 + defIndex);
    const itemKey = Object.keys(savedAnswers).find(key => key.startsWith('vocab_') && savedAnswers[key] === char);
    if (!itemKey) return null;
    const itemIndex = parseInt(itemKey.split('_')[1]);
    return { label: data.items[itemIndex].label, index: itemIndex };
  };

  return (
    <section className="bg-white p-2 sm:p-4 rounded-xl sm:shadow-sm sm:border sm:border-gray-100 mb-2 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="flex items-center justify-between w-full">
          <h2 className="text-xl font-black text-green-900 uppercase tracking-tight">{title}</h2>
          {isChecked && mode === 'matching' && (
            <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full font-bold text-sm">
              Score: {score} / {shuffledWordIndices.length}
            </div>
          )}
        </div>

        {hasActivityToggle && (
          <div className="flex bg-gray-100 p-1 rounded-lg self-end sm:self-auto">
            <button
              onClick={() => {
                setMode('list');
                setIsChecked(false);
              }}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${mode === 'list'
                  ? 'bg-white text-green-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              List
            </button>
            <button
              onClick={() => setMode('matching')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${mode === 'matching'
                  ? 'bg-white text-green-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              Matching
            </button>
          </div>
        )}
      </div>

      {mode === 'list' ? (
        <VocabularyList
          items={data.items}
          definitions={data.definitions}
          toggleTTS={toggleTTS}
        />
      ) : (
        <>
          <p className="text-gray-500 mb-4 text-sm font-medium">Tap a word and then tap its definition to match. Click "Check" when finished.</p>

          {/* Words Grid - Compact */}
          <div className="mb-8">
            <h3 className="font-bold text-gray-400 text-sm uppercase tracking-widest mb-3">1. Select a Word</h3>
            <div className="flex flex-wrap gap-2 text-sm">
              {shuffledWordIndices.map((idx) => {
                const item = data.items[idx];
                const isSelected = selectedWordIndex === idx;
                const isMatched = Object.keys(savedAnswers).some(key => key === `vocab_${idx}`);

                // Validation colors if checked
                let colorClass = isSelected
                  ? "bg-slate-700 text-white border-slate-700 shadow-lg ring-4 ring-slate-100 scale-105"
                  : (isMatched ? "bg-gray-100 text-gray-400 border-gray-200" : "bg-white text-gray-700 border-gray-200 hover:border-slate-300 hover:bg-slate-50");

                if (isChecked && isMatched) {
                  const userAnswer = savedAnswers[`vocab_${idx}`];
                  const correctDefIndex = data.definitions.findIndex(d => d.id === item.answer);
                  const correctChar = String.fromCharCode(97 + correctDefIndex);
                  colorClass = userAnswer === correctChar
                    ? "bg-green-50 text-green-700 border-green-200"
                    : "bg-red-50 text-red-700 border-red-200";
                }

                return (
                  <button
                    key={idx}
                    onClick={() => handleWordSelect(idx)}
                    disabled={isChecked}
                    className={`px-4 py-2 rounded-full border-2 font-bold transition-all duration-200 flex items-center gap-2 ${colorClass}`}
                  >
                    <span translate="no">{item.label}</span>
                    {shouldShowAudioControls() && !isMatched && (
                      <Volume2
                        className="w-4 h-4 opacity-50 hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleTTS(1.0, item.label);
                        }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Definitions List */}
          <div className="space-y-3">
            <h3 className="font-bold text-gray-400 text-sm uppercase tracking-widest mb-3">2. Assign to Definition</h3>
            {shuffledDefIndices.map((defIdx) => {
              const def = data.definitions[defIdx];
              const matched = getMatchedWordLabel(defIdx);
              const isSlotActive = selectedWordIndex !== null;

              let borderClass = "border-gray-100 bg-gray-50";
              if (isSlotActive) borderClass = "border-slate-300 bg-slate-50 ring-2 ring-slate-100/50";
              if (matched) borderClass = "border-blue-100 bg-white shadow-sm";

              if (isChecked && matched) {
                const item = data.items[matched.index];
                const correctDefIndex = data.definitions.findIndex(d => d.id === item.answer);
                const isCorrect = defIdx === correctDefIndex;
                borderClass = isCorrect ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50";
              }

              return (
                <div
                  key={def.id}
                  onClick={() => handleDefSelect(defIdx)}
                  className={`group flex items-start gap-2 p-2 md:p-4 md:gap-4 rounded-xl border-2 transition-all cursor-pointer ${borderClass}`}
                >
                  <div className="flex-l">
                    <p className="text-gray-700 text-sm md:text-base font-medium leading-relaxed mb-2" translate="no">{def.text}</p>
                    {matched ? (
                      <div className="flex items-center gap-2">
                        <span className="font-black text-gray-900 text-sm md:text-base" translate="no">{matched.label}</span>
                      </div>
                    ) : (
                      <span className="text-xs font-bold text-gray-300 italic">Tap to assign word...</span>
                    )}
                  </div>
                  {shouldShowAudioControls() && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTTS(1.0, def.text);
                      }}
                      className="p-2 rounded-full hover:bg-gray-100 text-gray-400 transition-colors"
                    >
                      <Volume2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Sticky Selection Bar */}
          {selectedWordIndex !== null && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-bounce-in">
              <div className="bg-slate-700 text-white px-4 py-2 rounded-2xl shadow-2xl flex items-center gap-3 border-4 border-white ring-8 ring-slate-700/20">
                <div className="flex flex-col">
                  <span className="text-lg font-black" translate="no">{data.items[selectedWordIndex].label}</span>
                </div>
                <button
                  onClick={() => setSelectedWordIndex(null)}
                  className="bg-white/20 hover:bg-white/40 p-1.5 rounded-lg transition-colors"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-10 flex flex-col items-center gap-4">
            {isChecked && score < shuffledWordIndices.length && continueCount >= MAX_CONTINUES && (
              <div className="text-red-600 font-semibold text-sm bg-red-50 px-4 py-2 rounded-lg border border-red-200">
                No continues remaining (3/3 used). You must reset the activity to try again.
              </div>
            )}
            <div className="flex flex-wrap justify-center gap-4">
              {!isChecked ? (
                <Button
                  onClick={() => checkAnswers()}
                  variant='primary'
                  size="md"
                  disabled={Object.keys(savedAnswers).length === 0}
                >
                  <Check size={20} /> Check Answers
                </Button>
              ) : (
                <>
                  {score < shuffledWordIndices.length && continueCount < MAX_CONTINUES && (
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
        </>
      )}
    </section>
  );
};