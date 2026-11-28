import React, { useState, useEffect, useMemo, useRef } from 'react';
import { VocabularyActivity } from '../../types';
import { Button } from '../UI/Button';
import { Volume2, RefreshCw, XCircle, Check, CheckCircle2, ArrowRight, RotateCcw } from 'lucide-react';
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
  const [isChecked, setIsChecked] = useState(savedIsChecked);
  const [selectedWordIndex, setSelectedWordIndex] = useState<number | null>(null);
  const [continueCount, setContinueCount] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setIsChecked(savedIsChecked);
  }, [savedIsChecked]);

  const { shuffledWordIndices, shuffledDefIndices } = useMemo(() => {
    let wordIndices = data.items.map((_, i) => i);
    let defIndices = data.definitions.map((_, i) => i);

    if (limitToFive) {
      // Choose a subset of 5 words for matching mode
      const allShuffledIndices = seededShuffle(wordIndices, `${lessonId}-vocab-subset-seed`);
      wordIndices = allShuffledIndices.slice(0, 5);

      // Definitions need to be filtered to only include those for the selected words
      const selectedAnswers = wordIndices.map(idx => data.items[idx].answer);
      defIndices = selectedAnswers
        .map(ansId => data.definitions.findIndex(d => d.id === ansId))
        .filter(idx => idx !== -1);

      // Re-shuffle definitions for matching
      defIndices = seededShuffle(defIndices, `${lessonId}-vocab-defs-subset`);
    } else {
      wordIndices = seededShuffle(wordIndices, `${lessonId}-vocab-words`);
      defIndices = seededShuffle(defIndices, `${lessonId}-vocab-defs`);
    }

    return { shuffledWordIndices: wordIndices, shuffledDefIndices: defIndices };
  }, [data, lessonId, limitToFive]);

  const totalWords = shuffledWordIndices.length;

  const matchedCount = useMemo(() => {
    return shuffledWordIndices.reduce((acc, idx) => {
      return savedAnswers[`vocab_${idx}`] ? acc + 1 : acc;
    }, 0);
  }, [shuffledWordIndices, savedAnswers]);

  const score = useMemo(() => {
    return shuffledWordIndices.reduce((acc, idx) => {
      const item = data.items[idx];
      const userAnswer = savedAnswers[`vocab_${idx}`] || '';
      const correctDefIndex = data.definitions.findIndex(d => d.id === item.answer);
      const correctChar = String.fromCharCode(97 + correctDefIndex);
      return userAnswer.toLowerCase() === correctChar ? acc + 1 : acc;
    }, 0);
  }, [shuffledWordIndices, data.items, data.definitions, savedAnswers]);

  const allMatched = totalWords > 0 && matchedCount === totalWords;
  const isPerfectScore = totalWords > 0 && score === totalWords;

  const handleStartPractice = () => {
    setMode('matching');
    requestAnimationFrame(() => {
      sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

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

  const checkAnswers = () => {
    setSelectedWordIndex(null);
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
    onChange(newAnswers);
    setSelectedWordIndex(null);
    onComplete?.(false);
  };

  const handleFullReset = () => {
    setContinueCount(0);
    setIsChecked(false);
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
    <section ref={sectionRef} className="bg-white p-2 sm:p-4 rounded-xl sm:shadow-sm sm:border sm:border-gray-100 mb-2 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="flex items-center justify-between gap-2 w-full sm:w-auto sm:flex-1">
          <h2 className="text-xl font-black text-green-900 uppercase tracking-tight">{title}</h2>
          {mode === 'matching' && (
            isChecked ? (
              <div className={`px-3 py-1 rounded-full font-bold text-sm shrink-0 ${isPerfectScore ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                Score: {score} / {totalWords}
              </div>
            ) : (
              <div className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-bold text-sm shrink-0">
                Matched: {matchedCount} / {totalWords}
              </div>
            )
          )}
        </div>

        {hasActivityToggle && (
          <div className="flex bg-gray-100 p-1 rounded-lg self-end sm:self-auto shrink-0">
            <button
              onClick={() => setMode('list')}
              className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-all ${mode === 'list'
                  ? 'bg-white text-green-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              1. Study
            </button>
            <button
              onClick={() => setMode('matching')}
              className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-all flex items-center gap-1.5 ${mode === 'matching'
                  ? 'bg-white text-green-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              <span>2. Practice</span>
              {isChecked ? (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${isPerfectScore ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                  ✓ {score}/{totalWords}
                </span>
              ) : matchedCount > 0 ? (
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-700 font-bold">
                  {matchedCount}/{totalWords}
                </span>
              ) : null}
            </button>
          </div>
        )}
      </div>

      {mode === 'list' ? (
        <>
          <VocabularyList
            items={data.items}
            definitions={data.definitions}
            toggleTTS={toggleTTS}
          />
          {hasActivityToggle && totalWords > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-sm text-gray-500 font-medium">
                {isChecked
                  ? `Practice checked — you scored ${score} out of ${totalWords}.`
                  : matchedCount > 0
                    ? `You've matched ${matchedCount} of ${totalWords} words so far.`
                    : `Ready to test yourself on ${totalWords} words?`}
              </p>
              <Button
                onClick={handleStartPractice}
                variant="primary"
                size="md"
                className="w-full sm:w-auto gap-2"
              >
                <span>
                  {isChecked
                    ? `View Matching Results (${score}/${totalWords})`
                    : matchedCount > 0
                      ? 'Continue Matching Practice'
                      : 'Practice Matching'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </>
      ) : (
        <>
          <p className="text-gray-500 mb-4 text-sm font-medium">Tap a word and then tap its definition to match. Match all {totalWords} words, then click "Check Answers".</p>

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

              let isCorrect = false;
              if (isChecked && matched) {
                const item = data.items[matched.index];
                const correctDefIndex = data.definitions.findIndex(d => d.id === item.answer);
                isCorrect = defIdx === correctDefIndex;
                borderClass = isCorrect ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50";
              }

              return (
                <div
                  key={def.id}
                  onClick={() => handleDefSelect(defIdx)}
                  className={`group flex items-start gap-2 p-2 md:p-4 md:gap-4 rounded-xl border-2 transition-all ${isChecked ? 'cursor-default' : 'cursor-pointer'} ${borderClass}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-700 text-sm md:text-base font-medium leading-relaxed mb-2" translate="no">{def.text}</p>
                    {matched ? (
                      <div className="flex items-center gap-2">
                        {isChecked && (
                          isCorrect
                            ? <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                            : <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                        )}
                        <span className="font-black text-gray-900 text-sm md:text-base" translate="no">{matched.label}</span>
                        {!isChecked && (
                          <span className="text-xs text-gray-400 font-medium">(tap to remove)</span>
                        )}
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
                      className="p-2 rounded-full hover:bg-gray-100 text-gray-400 transition-colors shrink-0"
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
                  <span className="text-lg font-black leading-tight" translate="no">{data.items[selectedWordIndex].label}</span>
                  <span className="text-[11px] text-slate-300 font-medium">Tap a definition below</span>
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
          <div className="mt-8 flex flex-col items-center gap-3">
            {!isChecked ? (
              <>
                {!allMatched && totalWords > 0 && (
                  <p className="text-xs font-medium text-gray-400">
                    Match all {totalWords} words to check your answers ({matchedCount}/{totalWords} matched)
                  </p>
                )}
                {allMatched && (
                  <p className="text-xs font-semibold text-green-700">
                    All {totalWords} words matched! Ready to check.
                  </p>
                )}
                <Button
                  onClick={() => checkAnswers()}
                  variant={allMatched ? 'success' : 'primary'}
                  size="md"
                  disabled={!allMatched}
                  className="gap-2"
                >
                  <Check size={20} /> Check Answers
                </Button>
              </>
            ) : (
              <>
                {isPerfectScore ? (
                  <div className="w-full max-w-md text-center text-green-800 font-semibold text-sm bg-green-50 px-4 py-3 rounded-xl border border-green-200">
                    Nice work! You matched all {totalWords} words correctly.
                  </div>
                ) : (
                  <div className="w-full max-w-md text-center text-amber-900 font-medium text-sm bg-amber-50 px-4 py-3 rounded-xl border border-amber-200">
                    <p className="font-semibold">You got {score} out of {totalWords}.</p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      {continueCount >= MAX_CONTINUES
                        ? 'Your score is saved. You can move on or start over.'
                        : 'Your score is saved — you can move on, or fix the red ones to improve it.'}
                    </p>
                  </div>
                )}
                <div className="flex flex-wrap justify-center gap-3">
                  {!isPerfectScore && continueCount < MAX_CONTINUES && (
                    <Button
                      onClick={handleRetry}
                      variant="outline"
                      size="md"
                      className="gap-2"
                    >
                      <RefreshCw className="w-4 h-4" /> Fix Wrong Answers ({MAX_CONTINUES - continueCount} left)
                    </Button>
                  )}
                  <Button
                    onClick={handleFullReset}
                    variant="secondary"
                    size="md"
                    className="gap-2"
                  >
                    <RotateCcw className="w-4 h-4" /> Start Over
                  </Button>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </section>
  );
};