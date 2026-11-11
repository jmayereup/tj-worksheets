import React, { useState, useEffect } from 'react';
import { ScrambledItem } from '../../types';
import { normalizeString, shouldShowAudioControls, seededShuffle, getSentenceWords } from '../../utils/textUtils';
import { Button } from '../UI/Button';
import { RefreshCw, SkipForward } from 'lucide-react';
import { AudioControls } from '../UI/AudioControls';

interface Props {
  data: ScrambledItem[];
  level: string;
  language: string;
  onChange: (answers: Record<number, string>) => void;
  savedAnswers: Record<number, string>;
  voiceName?: string | null;
  savedIsChecked?: boolean;
  onComplete?: (isCompleted: boolean) => void;
  toggleTTS: (rate: number, overrideText?: string) => void;
  ttsState: { status: 'playing' | 'paused' | 'stopped', rate: number };
  lessonId: string;
  defaultMode?: 'scramble' | 'dictation';
}

export const Scrambled: React.FC<Props> = ({
  data,
  level,
  language,
  onChange,
  savedAnswers,
  voiceName,
  savedIsChecked = false,
  onComplete,
  toggleTTS,
  ttsState,
  lessonId,
  defaultMode
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [wordBank, setWordBank] = useState<{ id: number, text: string }[]>([]);
  const [formedSentence, setFormedSentence] = useState<{ id: number, text: string }[]>([]);
  const [isChecked, setIsChecked] = useState(savedIsChecked);
  const [isCorrectState, setIsCorrectState] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false); // isCompleted is not saved via props
  const [activityMode, setActivityMode] = useState<'scramble' | 'dictation'>(() => {
    if (defaultMode) return defaultMode;
    if (!shouldShowAudioControls()) return 'scramble';
    return (level === 'A1' || level === 'A2') ? 'scramble' : 'dictation';
  });
  const [activeSpeechIdx, setActiveSpeechIdx] = useState<number | null>(null);

  if (!data || data.length === 0) return null;

  const currentItem = data[currentIndex];

  useEffect(() => {
    // Reset local state when question changes
    if (currentItem && activityMode === 'scramble') {
      // Create fresh word tokens using language-aware segmentation
      const words = getSentenceWords(currentItem.answer, language)
        .map((text, i) => ({ id: i, text }));

      // Shuffle deterministically
      const shuffled = seededShuffle(words, `${lessonId}-scramble-${currentIndex}`);

      setWordBank(shuffled);
      setFormedSentence([]);
      setIsChecked(false);
      setIsCorrectState(false);
    } else {
      setIsChecked(false);
      setIsCorrectState(false);
    }
  }, [currentIndex, currentItem, activityMode, lessonId, language]);

  // Sync formed sentence to parent state
  useEffect(() => {
    if (activityMode === 'scramble') {
      const isThai = (language && ['thai', 'th'].includes(language.toLowerCase())) || /[\u0E00-\u0E7F]/.test(currentItem?.answer || '');
      const currentSentence = formedSentence.map(w => w.text).join(isThai ? '' : ' ');
      const savedSentence = savedAnswers[currentIndex] || '';

      // Only update if different to avoid loops
      if (currentSentence !== savedSentence) {
        onChange({ ...savedAnswers, [currentIndex]: currentSentence });
      }
    }
  }, [formedSentence, currentIndex, activityMode, savedAnswers, onChange, language, currentItem]);

  const moveWordToSentence = (wordId: number) => {
    if (isCorrectState) return;
    setIsChecked(false);
    const word = wordBank.find(w => w.id === wordId);
    if (word) {
      setWordBank(prev => prev.filter(w => w.id !== wordId));
      setFormedSentence(prev => [...prev, word]);
      toggleTTS(1.0, word.text);
    }
  };

  const moveWordToBank = (wordId: number) => {
    if (isCorrectState) return;
    setIsChecked(false);
    const word = formedSentence.find(w => w.id === wordId);
    if (word) {
      setFormedSentence(prev => prev.filter(w => w.id !== wordId));
      setWordBank(prev => [...prev, word]);
    }
  };

  const handleManualInput = (val: string) => {
    setIsChecked(false);
    onChange({ ...savedAnswers, [currentIndex]: val });
  };

  const checkAnswer = () => {
    setIsChecked(true);

    const isThai = (language && ['thai', 'th'].includes(language.toLowerCase())) || /[\u0E00-\u0E7F]/.test(currentItem.answer);
    // Use local state for validation to ensure what user sees is what is checked
    const currentAnswer = activityMode === 'scramble'
      ? formedSentence.map(w => w.text).join(isThai ? '' : ' ')
      : (savedAnswers[currentIndex] || '');

    const isCorrect = normalizeString(currentAnswer, language) === normalizeString(currentItem.answer, language);

    if (isCorrect) {
      setIsCorrectState(true);
      setTimeout(() => {
        if (currentIndex < data.length - 1) {
          setCurrentIndex(prev => prev + 1);
        } else {
          setIsCompleted(true);
          onComplete?.(true);
        }
      }, 1500);
    }
  };

  const handleSkip = () => {
    if (currentIndex < data.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setIsCompleted(true);
      onComplete?.(true);
    }
  };

  const nextQuestion = () => {
    if (currentIndex < data.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setIsCompleted(true);
    }
  };

  if (isCompleted) {
    const totalCorrect = data.reduce((acc, item, idx) => {
      return normalizeString(savedAnswers[idx] || '', language) === normalizeString(item.answer, language) ? acc + 1 : acc;
    }, 0);
    return (
      <section className="mb-8 relative text-center">
        <h2 className="text-xl font-black text-green-900 uppercase tracking-tight mb-4">Scrambled Sentences</h2>
        <div className="text-2xl font-black mb-4 text-green-600">
          Activity Completed!
        </div>
        <div className="flex justify-center mb-6">
          <div className="bg-green-100 text-green-800 px-4 py-2 rounded-full font-bold text-lg">
            Score: {totalCorrect} / {data.length}
          </div>
        </div>
        <Button onClick={() => { setCurrentIndex(0); setIsCompleted(false); setIsChecked(false); onChange({}); }} variant="secondary" className="px-8 py-3 rounded-full font-bold">
          <RefreshCw className="w-5 h-5 mr-2" /> Retry Activity
        </Button>
      </section>
    );
  }

  const userAnswer = savedAnswers[currentIndex] || '';
  const isCorrect = normalizeString(userAnswer, language) === normalizeString(currentItem?.answer || '', language);

  return (
    <section className="mb-8 relative">
      <div className="space-y-4 mb-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center justify-between w-full">
            <h2 className="text-xl font-black text-green-900 uppercase tracking-tight">Scrambled Sentences</h2>
            <span className="bg-green-50 text-green-700 px-3 py-1 rounded-full font-bold text-sm">
              Score {currentIndex + 1} of {data.length}
            </span>
          </div>

          <div className="flex justify-between gap-3">
            {shouldShowAudioControls() && (
              <>
                <div className="flex bg-gray-100 p-1 rounded-lg">
                  <button
                    onClick={() => setActivityMode('scramble')}
                    className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${
                      activityMode === 'scramble'
                        ? 'bg-white text-green-700 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Scramble
                  </button>
                  <button
                    onClick={() => setActivityMode('dictation')}
                    className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${
                      activityMode === 'dictation'
                        ? 'bg-white text-green-700 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Dictation
                  </button>
                </div>

                <AudioControls
                  onSlowToggle={() => {
                    setActiveSpeechIdx(currentIndex);
                    toggleTTS(0.6, currentItem.answer);
                    if (ttsState.status === 'stopped') {
                      setTimeout(() => setActiveSpeechIdx(null), 3000);
                    }
                  }}
                  onListenToggle={() => {
                    setActiveSpeechIdx(currentIndex);
                    toggleTTS(1.0, currentItem.answer);
                    if (ttsState.status === 'stopped') {
                      setTimeout(() => setActiveSpeechIdx(null), 3000);
                    }
                  }}
                  ttsStatus={activeSpeechIdx === currentIndex ? ttsState.status : 'stopped'}
                  currentRate={activeSpeechIdx === currentIndex ? ttsState.rate : 1.0}
                  hasVoices={false}
                />
              </>
            )}
          </div>
        </div>

        <p className="text-gray-500 mb-4 text-sm font-medium">
          {activityMode === 'dictation' 
            ? 'Listen to the audio and type the sentence.' 
            : 'Unscramble the words to form a correct sentence.'}
        </p>
      </div>

      <div className="min-h-[200px] py-4">
        {/* Answer Area */}
        <div className={`
          min-h-[80px] p-4 rounded-lg mb-6 border-2 flex flex-wrap gap-2 items-center transition-colors
          ${isChecked
            ? (isCorrect ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50')
            : 'border-dashed border-green-300 bg-green-50/30'
          }
        `}>
          {activityMode === 'scramble' ? (
            formedSentence.length === 0 && !isChecked ? (
              <span className="text-gray-400 italic pointer-events-none text-lg">Click words below to form the sentence...</span>
            ) : (
              <div className="selectable-text flex flex-wrap gap-2 items-center" translate="no">
                {formedSentence.map(word => (
                  <button
                    key={word.id}
                    onClick={() => moveWordToBank(word.id)}
                    disabled={isCorrectState}
                    className="bg-white text-green-800 px-3 py-2 rounded shadow-sm border border-green-200 font-medium hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors animate-pop-in text-lg"
                  >
                    {word.text}
                  </button>
                ))}
              </div>
            )
          ) : (
            <input
              type="text"
              className="w-full bg-transparent outline-none text-lg p-2 selectable-text"
              placeholder="Type the sentence here..."
              value={userAnswer}
              onChange={(e) => handleManualInput(e.target.value)}
              disabled={isCorrectState}
              translate="no"
            />
          )}
        </div>

        {/* Result Message */}
        <div className="min-h-[40px] flex items-center justify-center mb-6">
          {isChecked && !isCorrectState && (
            <div className="text-center animate-fade-in text-lg">
              <p className="text-red-600 font-bold">Incorrect. Try again.</p>
            </div>
          )}
          {isCorrectState && (
            <div className="text-center animate-fade-in text-lg">
              <p className="text-green-600 font-bold">Correct!</p>
            </div>
          )}
        </div>

        {/* Word Bank (Scramble Mode Only) */}
        {activityMode === 'scramble' && (
          <div className="flex flex-wrap gap-3 justify-center" translate="no">
            {wordBank.map(word => (
              <button
                key={word.id}
                onClick={() => moveWordToSentence(word.id)}
                className="bg-white text-green-800 px-4 py-2 rounded-lg shadow-sm border border-green-200 font-medium hover:bg-green-50 hover:border-green-300 hover:scale-105 transition-all text-lg"
              >
                {word.text}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-end mt-6 pt-6 border-t border-gray-100">

        <div className="flex gap-2">
          {!isCorrectState && (
            <Button
              variant="secondary"
              onClick={handleSkip}
              className="min-w-[80px]"
            >
              {SkipForward ? <SkipForward className="w-4 h-4 mr-2" /> : null} Skip
            </Button>
          )}

          <Button
            variant={isChecked && !isCorrectState ? "secondary" : "primary"}
            onClick={checkAnswer}
            disabled={(!userAnswer && activityMode === 'dictation' && !isCorrectState) || (activityMode === 'scramble' && formedSentence.length === 0 && !isCorrectState) || isCorrectState}
            className="min-w-[120px]"
          >
            {isCorrectState ? 'Correct!' : (isChecked ? 'Try Again' : 'Check')}
          </Button>
        </div>
      </div>
    </section>
  );
};