import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '../UI/Button';
import { ChevronRight, RefreshCw, XCircle } from 'lucide-react';
import { shouldShowAudioControls, seededShuffle } from '../../utils/textUtils';
import { AudioControls } from '../UI/AudioControls';

interface Props {
  data: { questions: any[] };
  readingText: string;
  language: string;
  onChange: (answers: Record<number, string>) => void;
  savedAnswers: Record<number, string>;
  voiceName?: string | null;
  savedIsCompleted?: boolean;
  onComplete?: (isCompleted: boolean) => void;
  toggleTTS: (rate: number, overrideText?: string) => void;
  ttsState: { status: 'playing' | 'paused' | 'stopped', rate: number };
  lessonId: string;
  title?: string;
  showReferenceText?: boolean;
  shuffleQuestions?: boolean;
  onNextPage?: () => void;
}

export const Comprehension: React.FC<Props> = ({
  data,
  readingText,
  onChange,
  savedAnswers,
  savedIsCompleted = false,
  onComplete,
  toggleTTS,
  ttsState,
  lessonId,
  title = "Reading Questions",
  showReferenceText = true,
  shuffleQuestions = true,
  onNextPage
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isChecked, setIsChecked] = useState(false);
  const [isCompleted, setIsCompleted] = useState(savedIsCompleted);

  useEffect(() => {
    // Only force completed screen if we aren't currently checking an answer (e.g. on mount)
    // and if we aren't already in the completed state.
    // This prevents the "Activity Completed" screen from flashing instantly 
    // when the user answers the last question.
    if (savedIsCompleted && !isCompleted && !isChecked) {
      setIsCompleted(true);
    }
  }, [savedIsCompleted, isCompleted, isChecked]);

  // Randomize question order once on mount/data change
  const shuffledIndices = useMemo(() => {
    const indices = data.questions.map((_, i) => i);
    return shuffleQuestions ? seededShuffle(indices, `${lessonId}-comprehension`) : indices;
  }, [data.questions, lessonId, shuffleQuestions]);

  if (!data || !data.questions || data.questions.length === 0) return null;

  const actualIndex = shuffledIndices[currentIndex];
  const currentQuestion = data.questions[actualIndex];
  const userAnswer = savedAnswers[actualIndex];

  const handleOptionChange = (value: string) => {
    if (isChecked) return;
    
    // Immediately record the answer
    onChange({ ...savedAnswers, [shuffledIndices[currentIndex]]: value });
    
    // Immediately check the answer
    setIsChecked(true);
    const isCorrect = value === currentQuestion.answer;

    if (isCorrect) {
      // Auto-advance after delay if correct
      // Increased delay to give students time to see the green highlight on the last question
      const delay = 2000;
      if (currentIndex < data.questions.length - 1) {
        setTimeout(() => {
          setIsChecked(false);
          setCurrentIndex(prev => prev + 1);
        }, delay);
      } else {
        setTimeout(() => {
          setIsCompleted(true);
          onComplete?.(true);
        }, delay);
      }
    }
    // If incorrect, we stay on the page so the user can see the correction and then click "Next"
  };

  const handleNext = () => {
    if (currentIndex < data.questions.length - 1) {
      setIsChecked(false);
      setCurrentIndex(prev => prev + 1);
    } else {
      setIsCompleted(true);
      onComplete?.(true);
    }
  };


  const handleRetry = () => {
    setCurrentIndex(0);
    setIsChecked(false);
    setIsCompleted(false);
    onChange({});
    onComplete?.(false);
  };

  if (isCompleted) {
    // Calculate score
    let score = 0;
    data.questions.forEach((q, i) => {
      if (savedAnswers[i] === q.answer) score++;
    });

    return (
      <section className="bg-white p-6 rounded-xl sm:shadow-sm sm:border sm:border-gray-100 mb-2 text-center">
        <h2 className="text-xl font-black text-green-900 uppercase tracking-tight mb-4">{isCompleted ? "Activity Completed!" : title}</h2>
        <div className="text-2xl font-black mb-4 text-green-600">
          {score === data.questions.length ? '🎉 Perfect!' : ''}
        </div>
        <p className="text-gray-600 text-lg mb-6 font-medium">You got {score} out of {data.questions.length} correct.</p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Button onClick={handleRetry} variant="secondary" className="px-8 py-3 rounded-full font-bold">
            <RefreshCw className="w-5 h-5 mr-2" /> Retry Activity
          </Button>
          {onNextPage && (
            <Button onClick={onNextPage} variant="primary" className="px-8 py-3 rounded-full font-bold shadow-md hover:shadow-lg transition-all">
              <div className="flex items-center justify-center gap-2">
                <span>Next</span>
                <ChevronRight className="w-5 h-5" />
              </div>
            </Button>
          )}
        </div>
      </section>
    );
  }

  const isCorrect = userAnswer === currentQuestion.answer;

  return (
    <section className="bg-white p-2 sm:p-4 rounded-xl sm:shadow-sm sm:border sm:border-gray-100 mb-2 relative">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xl font-black text-green-900 uppercase tracking-tight">{title}</h2>
        <span className="bg-green-50 text-green-700 px-3 py-1 rounded-full font-bold text-sm">
          Score {currentIndex + 1} of {data.questions.length}
        </span>
      </div>

      <p className="text-gray-500 mb-4 text-sm font-medium">Read the text and choose the correct answer for each question.</p>

      <div className={showReferenceText ? "grid grid-cols-1 lg:grid-cols-2 gap-8" : "max-w-3xl mx-auto"}>
        {/* Reading Text Column */}
        {showReferenceText && (
          <div className="order-2 lg:order-1">
            <h3 className="font-black text-gray-400 text-xs uppercase tracking-widest mb-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              Reference Text
            </h3>
            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 max-h-[400px] overflow-y-auto custom-scrollbar shadow-inner select-text">
              <p className="text-gray-700 leading-relaxed font-sans text-base whitespace-pre-wrap" translate="no">
                {readingText}
              </p>
            </div>
          </div>
        )}

        {/* Question Column */}
        <div className={showReferenceText ? "order-1 lg:order-2 flex flex-col" : "flex flex-col"}>
          <div className="mb-6 min-h-[120px]">
            <div className="flex items-start gap-4 mb-4">
              <p className="text-base md:text-lg font-black text-gray-900 flex-1 leading-tight tracking-tight selectable-text" translate="no">
                {currentQuestion.text || currentQuestion.question}
              </p>
              {shouldShowAudioControls() && (
                <AudioControls
                  onSlowToggle={() => toggleTTS(0.6, currentQuestion.text || currentQuestion.question)}
                  onListenToggle={() => toggleTTS(1.0, currentQuestion.text || currentQuestion.question)}
                  ttsStatus={ttsState.status}
                  currentRate={ttsState.rate}
                  hasVoices={false}
                />
              )}
            </div>

            <div className={`flex ${currentQuestion.options ? 'flex-col' : 'flex-col sm:flex-row'} gap-2`}>
              {currentQuestion.options ? (
                // Multiple Choice rendering
                currentQuestion.options.map((option: string, idx: number) => {
                  const isOptionSelected = userAnswer === option;
                  const isCorrectOption = option === currentQuestion.answer;

                  return (
                    <label 
                      key={idx}
                      className={`
                        flex items-center gap-2 sm:gap-4 p-2 sm:p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 select-none
                        ${isOptionSelected 
                          ? (isChecked 
                              ? (isCorrectOption ? 'border-green-500 bg-green-50 text-green-800' : 'border-red-500 bg-red-50 text-red-800')
                              : 'border-slate-500 bg-slate-50 text-slate-800 shadow-md ring-2 ring-slate-100')
                          : (isChecked && isCorrectOption 
                              ? 'border-green-500 bg-green-50 text-green-800' 
                              : 'border-gray-100 hover:border-slate-300 hover:bg-slate-50 text-gray-700')
                        }
                      `}
                    >
                      <input
                        type="radio"
                        name={`q-${currentIndex}`}
                        value={option}
                        checked={isOptionSelected}
                        onChange={() => handleOptionChange(option)}
                        className="hidden"
                        disabled={isChecked}
                      />
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors
                        ${isOptionSelected 
                          ? (isChecked 
                              ? (isCorrectOption ? 'border-green-600 bg-green-600' : 'border-red-600 bg-red-600')
                              : 'border-slate-600 bg-slate-600')
                          : 'border-gray-300'}
                      `}>
                        {isOptionSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <span className="font-bold text-base leading-tight" translate="no">{option}</span>
                    </label>
                  );
                })
              ) : (
                // True/False rendering (Standard fallback)
                ['true', 'false'].map((val) => {
                  const isValSelected = userAnswer === val;
                  const isCorrectVal = val === currentQuestion.answer;
                  
                  return (
                    <label 
                      key={val}
                      className={`
                        flex-1 flex items-center justify-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 select-none
                        ${isValSelected
                          ? (isChecked
                            ? (isCorrectVal ? 'border-green-500 bg-green-50 text-green-800' : 'border-red-500 bg-red-50 text-red-800')
                            : 'border-slate-500 bg-slate-50 text-slate-800 shadow-md ring-2 ring-slate-100')
                          : 'border-gray-100 hover:border-slate-300 hover:bg-slate-50 text-gray-700'
                        }
                      `}
                    >
                      <input
                        type="radio"
                        name={`q-${currentIndex}`}
                        value={val}
                        checked={isValSelected}
                        onChange={() => handleOptionChange(val)}
                        className="hidden"
                        disabled={isChecked}
                      />
                      <span className="font-black text-lg uppercase tracking-widest" translate="no">{val}</span>
                    </label>
                  );
                })
              )}
            </div>

            <div className="min-h-[60px] flex items-center justify-center">
              {isChecked && !isCorrect && (
                <div className="w-full p-4 bg-red-50 rounded-xl border border-red-100 text-center font-bold text-red-700 animate-fade-in text-base flex items-center justify-center gap-3">
                  <XCircle className="w-5 h-5" />
                  Correct answer: <span className="underline decoration-2">{currentQuestion.answer}</span>
                </div>
              )}
            </div>
          </div>

          {/* Navigation - Only show if incorrect or explicitly checked */}
          {isChecked && !isCorrect && (
            <div className="flex items-center justify-end mt-4 pt-4 border-t border-gray-100">
              <Button
                variant="primary"
                onClick={handleNext}
                className="min-w-[120px] px-6 py-2 rounded-full font-black text-base shadow-md hover:shadow-lg transition-all"
              >
                <div className="flex items-center justify-center gap-2">
                  {currentIndex === data.questions.length - 1 ? 'Finish' : 'Next'}
                  <ChevronRight className="w-5 h-5" />
                </div>
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};