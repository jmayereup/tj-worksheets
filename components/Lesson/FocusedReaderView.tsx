import React, { useState, useRef, useEffect } from 'react';
import { ParsedLesson, FocusedReaderContent, UserAnswers, ReportData } from '../../types';
import { VoiceSelectorModal } from '../UI/VoiceSelectorModal';
import { LessonFooter } from './LessonFooter';
import { Gamepad2, PenTool, Puzzle } from 'lucide-react';
import { Button } from '../UI/Button';
import { Vocabulary } from '../Activities/Vocabulary';
import { ReadingPassage } from '../Activities/ReadingPassage';
import { Comprehension } from '../Activities/Comprehension';
import { CollapsibleActivity } from '../UI/CollapsibleActivity';
import { LessonMedia } from '../UI/LessonMedia';
import { ReferenceLinks } from '../UI/ReferenceLinks';
import { VideoExploration } from '../UI/VideoExploration';
import { CriticalThinkingExtension } from '../Activities/CriticalThinkingExtension';
import { useFocusedReaderScores } from '../../hooks/useFocusedReaderScores';
import { FocusedReaderExportActions } from '../UI/FocusedReaderExportActions';
import { seededShuffle } from '../../utils/textUtils';
import { PracticeGamesModal } from './PracticeGamesModal';

interface FocusedReaderViewProps {
  lesson: ParsedLesson & { content: FocusedReaderContent };
  studentName: string;
  setStudentName: (name: string) => void;
  studentId: string;
  setStudentId: (id: string) => void;
  homeroom: string;
  setHomeroom: (homeroom: string) => void;
  isNameLocked: boolean;
  onFinish: (data: ReportData) => void;
  onReset: () => void;
  answers: UserAnswers;
  setAnswers: React.Dispatch<React.SetStateAction<UserAnswers>>;
  toggleTTS: (rate: number, overrideText?: string, overrideLang?: string, isPassage?: boolean) => void;
  ttsState: { status: 'playing' | 'paused' | 'stopped', rate: number };
  availableVoices: SpeechSynthesisVoice[];
  selectedVoiceName: string | null;
  setSelectedVoiceName: (name: string) => void;
  isVoiceModalOpen: boolean;
  setIsVoiceModalOpen: (isOpen: boolean) => void;
  audioPreference: 'recorded' | 'tts';
  setAudioPreference: (pref: 'recorded' | 'tts') => void;
}

export const FocusedReaderView: React.FC<FocusedReaderViewProps> = ({
  lesson,
  studentName,
  setStudentName,
  studentId,
  setStudentId,
  homeroom,
  setHomeroom,
  isNameLocked,
  onFinish,
  onReset,
  answers,
  setAnswers,
  toggleTTS,
  ttsState,
  availableVoices,
  selectedVoiceName,
  setSelectedVoiceName,
  isVoiceModalOpen,
  setIsVoiceModalOpen,
  audioPreference,
  setAudioPreference,
}) => {
  const content = lesson.content;
  const [rawPartIndex, setCurrentPartIndex] = useState(answers.focusedReaderPage || 0);
  const [activePracticeGame, setActivePracticeGame] = useState<'scramble' | 'fill' | 'wordblaster' | null>(null);
  
  const currentPartIndex = (content.parts && rawPartIndex < content.parts.length) 
    ? (rawPartIndex >= 0 ? rawPartIndex : 0) 
    : 0;

  useEffect(() => {
    if (rawPartIndex !== currentPartIndex) {
      setCurrentPartIndex(currentPartIndex);
    }
  }, [rawPartIndex, currentPartIndex]);

  if (!content.parts || content.parts.length === 0) {
    return (
      <div className="p-8 text-center bg-amber-50 rounded-2xl border border-amber-200">
        <h3 className="text-lg font-bold text-amber-900 mb-2">Incomplete Content</h3>
        <p className="text-amber-700">This Focused Reader lesson doesn't have any parts yet. Please add content to the parts array in the JSON editor.</p>
      </div>
    );
  }

  const currentPart = content.parts[currentPartIndex];
  const readingPassageRef = useRef<HTMLDivElement>(null);

  const optimizedImageUrl = React.useMemo(() => {
    if (!lesson.imageUrl) return undefined;
    try {
      let img = document.getElementById('lesson-image') as HTMLImageElement;
      if (!img && readingPassageRef.current) {
        const root = readingPassageRef.current.getRootNode() as ShadowRoot | Document;
        if (root && 'getElementById' in root) {
          img = root.getElementById('lesson-image') as HTMLImageElement;
        }
      }
      if (img && img.src) return img.src;
    } catch (e) {
      console.warn('Failed to resolve optimized image URL:', e);
    }
    return lesson.imageUrl;
  }, [lesson.imageUrl]);

  const handlePageChange = (newIndex: number) => {
    setCurrentPartIndex(newIndex);
    setAnswers(prev => ({ ...prev, focusedReaderPage: newIndex }));
    setTimeout(() => {
      if (readingPassageRef.current) {
        readingPassageRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  };

  const {
    vocabScore,
    vocabTotal,
    isVocabCompleted,
    comprehensionScore,
    comprehensionTotal,
    isComprehensionCompleted,
    calculateReportData
  } = useFocusedReaderScores(content, answers, currentPartIndex, lesson.id);


  return (
    <div className="space-y-4">
      <div className="hidden sm:flex">
        <FocusedReaderExportActions
          lesson={{ ...lesson, optimizedImageUrl }}
          displayTitle={lesson.title || content.title}
          studentName={studentName}
          studentId={studentId}
          homeroom={homeroom}
        />
      </div>

      <div className="max-w-4xl mx-auto px-1 sm:px-4 py-4 space-y-2 print:hidden">
        <LessonMedia 
          videoUrl={lesson.videoUrl}
          imageUrl={lesson.imageUrl} 
          isVideoLesson={lesson.isVideoLesson}
          title={lesson.title || content.title} 
        />



        <ReadingPassage
          text={currentPart.text}
          language={lesson.language}
          title={`Page ${currentPart.part_number}`}
          vocabularyExplanations={currentPart.vocabulary_explanations}
          onSlowToggle={() => toggleTTS(0.6, currentPart.text, undefined, true)}
          onListenToggle={() => toggleTTS(1.0, currentPart.text, undefined, true)}
          ttsStatus={ttsState.status}
          currentRate={ttsState.rate}
          hasVoices={availableVoices.length > 0 || !!lesson.audioFileUrl}
          onSwipeLeft={currentPartIndex < content.parts.length - 1 ? () => handlePageChange(currentPartIndex + 1) : undefined}
          onSwipeRight={currentPartIndex > 0 ? () => handlePageChange(currentPartIndex - 1) : undefined}
          onVoiceOpen={availableVoices.length > 0 || !!lesson.audioFileUrl ? () => setIsVoiceModalOpen(true) : undefined}
          showHighlightHelp={true}
          className="animate-slide-up"
          currentPage={currentPartIndex}
          totalPages={content.parts.length}
          onPageChange={handlePageChange}
          passageRef={readingPassageRef}
        />

        {/* Vocabulary Section */}
        {currentPart.vocabulary_explanations && Object.keys(currentPart.vocabulary_explanations).length > 0 && (
          <section className="animate-fade-in">
            <CollapsibleActivity
              isCompleted={isVocabCompleted}
              title={`Page ${currentPart.part_number} Vocabulary`}
              score={`${vocabScore}/${vocabTotal}`}
              isPerfectScore={vocabScore === vocabTotal && vocabTotal > 0}
            >
              <Vocabulary 
                data={{
                  items: Object.keys(currentPart.vocabulary_explanations || {}).map((word, i) => ({
                    label: word,
                    answer: `def_${i}`
                  })),
                  definitions: Object.entries(currentPart.vocabulary_explanations || {}).map(([word, def], i) => ({
                    id: `def_${i}`,
                    text: def
                  }))
                }}
                language={lesson.language}
                onChange={(vAnswers) => {
                  setAnswers(prev => {
                    const newVocab = { ...(prev.vocabulary || {}) };
                    // First clear all existing matches for this specific part
                    Object.keys(newVocab).forEach(key => {
                      if (key.startsWith(`vocab_${currentPartIndex}_`)) {
                        delete newVocab[key];
                      }
                    });
                    // Then apply the new set of matches
                    Object.entries(vAnswers).forEach(([key, val]) => {
                      const pIdxKey = key.replace('vocab_', `vocab_${currentPartIndex}_`);
                      newVocab[pIdxKey] = val;
                    });
                    return { ...prev, vocabulary: newVocab };
                  });
                }}
                savedAnswers={(() => {
                  const partVocab: Record<string, string> = {};
                  Object.entries(answers.vocabulary || {}).forEach(([key, val]) => {
                    if (key.startsWith(`vocab_${currentPartIndex}_`)) {
                      const originalKey = key.replace(`vocab_${currentPartIndex}_`, 'vocab_');
                      partVocab[originalKey] = val;
                    }
                  });
                  return partVocab;
                })()}
                toggleTTS={toggleTTS}
                ttsState={ttsState}
                lessonId={`${lesson.id}-part-${currentPartIndex}`}
                title={`Page ${currentPart.part_number} Vocabulary`}
                savedIsChecked={isVocabCompleted}
                hasActivityToggle={true}
                limitToFive={true}
              />
            </CollapsibleActivity>
          </section>
        )}

        {/* Questions Section */}
        {currentPart.questions.length > 0 && (
          <section className="animate-fade-in" key={currentPartIndex}>
            <CollapsibleActivity
              isCompleted={isComprehensionCompleted}
              title={`Page ${currentPart.part_number} Questions`}
              score={`${comprehensionScore}/${comprehensionTotal}`}
              isPerfectScore={comprehensionScore === comprehensionTotal && comprehensionTotal > 0}
            >
              <Comprehension
                data={{ questions: currentPart.questions }}
                readingText={currentPart.text}
                language={lesson.language}
                onChange={(partAnswers) => {
                  setAnswers(prev => {
                    const focusedReader = { ...(prev.focusedReader || {}) };
                    focusedReader[currentPartIndex] = partAnswers;
                    return { ...prev, focusedReader };
                  });
                }}
                savedAnswers={answers.focusedReader?.[currentPartIndex] || {}}
                voiceName={selectedVoiceName}
                toggleTTS={toggleTTS}
                ttsState={ttsState}
                lessonId={`${lesson.id}-part-${currentPartIndex}`}
                title={`Page ${currentPart.part_number} Questions`}
                showReferenceText={false}
                savedIsCompleted={isComprehensionCompleted}
                onNextPage={() => {
                  if (currentPartIndex < content.parts.length - 1) {
                    handlePageChange(currentPartIndex + 1);
                  } else {
                    const el = document.querySelector('.tj-lesson-footer') || document.querySelector('footer');
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth' });
                    }
                  }
                }}
              />
            </CollapsibleActivity>
          </section>
        )}


        {currentPartIndex === content.parts.length - 1 && (
          <ReferenceLinks references={content.references} />
        )}

        {/* Practice Games Section */}
        <section className="mt-8 animate-fade-in print:hidden">
          <CollapsibleActivity
            isCompleted={false}
            title="Extra Practice Games"
          >
            <div className="p-4 bg-white rounded-xl">
              <p className="text-gray-500 mb-4 font-medium text-sm">Practice what you've learned. These games are just for fun and don't affect your score.</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Button variant="secondary" onClick={() => setActivePracticeGame('scramble')} className="flex flex-col items-center justify-center gap-2 h-20 shadow-sm border border-gray-100 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 transition-all">
                  <Puzzle className="w-6 h-6 text-indigo-500" /> Scrambled Sentences
                </Button>
                <Button variant="secondary" onClick={() => setActivePracticeGame('fill')} className="flex flex-col items-center justify-center gap-2 h-20 shadow-sm border border-gray-100 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 transition-all">
                  <PenTool className="w-6 h-6 text-emerald-500" /> Fill-in-the-Blanks
                </Button>
                <Button variant="secondary" onClick={() => setActivePracticeGame('wordblaster')} className="flex flex-col items-center justify-center gap-2 h-20 shadow-sm border border-gray-100 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 transition-all">
                  <Gamepad2 className="w-6 h-6 text-amber-500" /> Word Blaster
                </Button>
              </div>
            </div>
          </CollapsibleActivity>
        </section>

        {/* Critical Thinking Section (Independent of parts) */}
        {content.criticalThinking && (
          <section className="mt-8 animate-fade-in">
            <CollapsibleActivity
              isCompleted={false}
              title={content.criticalThinking.title || "Critical Thinking & Discussion"}
            >
              <CriticalThinkingExtension data={content.criticalThinking} />
            </CollapsibleActivity>
          </section>
        )}

        <div className="mt-8">
          <VideoExploration videoUrl={lesson.videoUrl} isVideoLesson={lesson.isVideoLesson} />
        </div>
      </div>

        <LessonFooter
          studentName={studentName}
          setStudentName={setStudentName}
          studentId={studentId}
          setStudentId={setStudentId}
          homeroom={homeroom}
          setHomeroom={setHomeroom}
          isNameLocked={isNameLocked}
          onFinish={() => onFinish(calculateReportData(lesson.title, studentName, studentId, homeroom))}
          onReset={onReset}
        />

      {/* Print-only Layout */}
      <div className="hidden print:block" style={{ fontSize: '12px', padding: '16px 24px' }}>
        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-end gap-6 text-[13px] mb-4 text-gray-900 font-medium">
            <div className="flex items-end gap-2">
              <span>Name</span>
              <div className="border-b border-black w-48 text-center px-2 pb-0.5">{studentName || ''}</div>
            </div>
            <div className="flex items-end gap-2">
              <span>ID:</span>
              <div className="border-b border-black w-24 text-center px-2 pb-0.5">{studentId || ''}</div>
            </div>
            <div className="flex items-end gap-2">
              <span>Homeroom:</span>
              <div className="border-b border-black w-24 text-center px-2 pb-0.5">{homeroom || ''}</div>
            </div>
          </div>
          <h1 className="text-xl font-bold text-gray-900 leading-tight mb-1">{lesson.title || content.title}</h1>
          <p className="text-xs text-gray-500">Language: {lesson.language} | Level: {lesson.level}</p>
        </div>

        <div className="space-y-3">
          {lesson.imageUrl && (
            <div className="flex justify-center mb-4">
              <img
                id="lesson-image-reader-print"
                src={optimizedImageUrl || lesson.imageUrl}
                alt="Lesson topic"
                className="max-h-36 w-auto object-contain rounded"
              />
            </div>
          )}

          {content.parts.map((part, pIndex) => {
            const allVocabWords = Object.keys(part.vocabulary_explanations || {});
            let printWords: string[] = [];
            let printDefs: string[] = [];
            
            if (allVocabWords.length > 0) {
              const selectedWords = seededShuffle([...allVocabWords], `${lesson.id}-part-${pIndex}-vocab-subset-seed`).slice(0, 5);
              printWords = seededShuffle([...selectedWords], `${lesson.id}-print-vocab-${part.part_number}`);
              printDefs = selectedWords.map(w => part.vocabulary_explanations[w]).sort();
            }
            
            return (
              <div key={pIndex} className="space-y-3 mb-6">
                <section>
                  <h2 className="text-sm font-bold mb-1 bg-gray-100 px-2 py-1">Page {part.part_number}</h2>
                  <p className="text-xs leading-relaxed whitespace-pre-wrap">{part.text}</p>
                </section>
                
                {printWords.length > 0 && (
                  <section>
                    <h3 className="text-sm font-bold mb-1 bg-gray-50 px-2 py-1">Vocabulary</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        {printWords.map((word, i) => (
                          <div key={i} className="flex gap-1 items-center">
                            <span className="w-5 h-5 border border-gray-400 shrink-0 inline-block"></span>
                            <span className="text-xs">{word}</span>
                          </div>
                        ))}
                      </div>
                      <div className="space-y-1">
                        {printDefs.map((def, i) => (
                          <div key={i} className="text-xs">
                            <span className="font-bold">{String.fromCharCode(97 + i)}.</span> {def}
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>
                )}
                
                {part.questions.length > 0 && (
                  <section>
                    <h3 className="text-sm font-bold mb-1 bg-gray-50 px-2 py-1">Questions</h3>
                    <div className="space-y-2">
                      {part.questions.map((q, i) => (
                        <div key={i}>
                          {q.type === 'True/False' ? (
                            <div className="flex justify-between items-center border-b border-gray-100 pb-1">
                              <span className="text-xs">{i + 1}. {q.question}</span>
                              <span className="font-bold text-xs flex gap-3 shrink-0 ml-2">
                                <span>True</span>
                                <span>False</span>
                              </span>
                            </div>
                          ) : q.type === 'Multiple Choice' && q.options && q.options.length > 0 ? (
                            <div className="mb-2">
                              <span className="text-xs">{i + 1}. {q.question}</span>
                              <div className="ml-4 space-y-1 mt-1">
                                {q.options.map((opt, oIdx) => (
                                  <div key={oIdx} className="flex gap-1 items-center">
                                    <span className="w-3 h-3 border border-gray-400 rounded-full shrink-0 inline-block"></span>
                                    <span className="text-xs">{opt}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div>
                              <p className="text-xs font-bold mb-1">{i + 1}. {q.question}</p>
                              <div className="space-y-2">
                                <div className="border-b border-gray-300 h-5"></div>
                                <div className="border-b border-gray-300 h-5"></div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <VoiceSelectorModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        voices={availableVoices}
        selectedVoiceName={selectedVoiceName}
        onSelectVoice={setSelectedVoiceName}
        language={lesson.language}
        hasRecordedAudio={!!lesson.audioFileUrl}
        audioPreference={audioPreference}
        onSelectPreference={setAudioPreference}
      />

      <PracticeGamesModal
        lesson={lesson}
        gameType={activePracticeGame}
        onClose={() => setActivePracticeGame(null)}
        toggleTTS={toggleTTS}
        ttsState={ttsState}
        selectedVoiceName={selectedVoiceName}
      />
    </div>
  );
};
