import React, { useState, useRef } from 'react';
import { ParsedLesson, ChapterBookContent, UserAnswers, ReportData, ChapterQuizQuestion } from '../../types';
import { VoiceSelectorModal } from '../UI/VoiceSelectorModal';
import { LessonFooter } from './LessonFooter';
import { Button } from '../UI/Button';
import { ReadingPassage } from '../Activities/ReadingPassage';
import { Comprehension } from '../Activities/Comprehension';
import { CollapsibleActivity } from '../UI/CollapsibleActivity';
import { LessonMedia } from '../UI/LessonMedia';
import { ReportCard } from '../UI/ReportCard';
import { Gamepad2, PenTool, Puzzle } from 'lucide-react';
import { PracticeGamesModal } from './PracticeGamesModal';
import { getVoicesForLang } from '../../utils/tts';
import { getLangCode } from '../../utils/textUtils';

interface ChapterBookViewProps {
  lesson: ParsedLesson & { content: ChapterBookContent };
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
  teacherCode?: string;
}

export const ChapterBookView: React.FC<ChapterBookViewProps> = ({
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
  teacherCode,
}) => {
  const content = lesson.content;
  const [currentChapterIndex, setCurrentChapterIndex] = useState(answers.focusedReaderPage || 0);
  
  const currentChapter = content.chapters[currentChapterIndex] || content.chapters[0];
  const chapterText = currentChapter.content.join('\n\n');
  
  const translationLanguage = currentChapter.translationLanguage || content.translationLanguage || (
    (['english', 'en'].includes(lesson.language.toLowerCase())) ? 'Thai' : 'English'
  );

  const activeReadingLanguage = answers.activeReadingLanguage || 'original';
  const isTranslated = activeReadingLanguage === 'translation';

  const displayText = isTranslated ? currentChapter.translation : chapterText;
  const currentLanguage = isTranslated ? translationLanguage : lesson.language;
  const [showReportCard, setShowReportCard] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [activePracticeGame, setActivePracticeGame] = useState<'scramble' | 'fill' | 'wordblaster' | null>(null);
  
  const readingPassageRef = useRef<HTMLDivElement>(null);

  const handleChapterChange = (newIndex: number) => {
    setCurrentChapterIndex(newIndex);
    setAnswers(prev => ({ ...prev, focusedReaderPage: newIndex }));
  };

  const toggleTranslation = () => {
    const nextLang = activeReadingLanguage === 'original' ? 'translation' : 'original';
    setAnswers(prev => ({ ...prev, activeReadingLanguage: nextLang }));
  };

  // Map ChapterQuizQuestion to the format expected by Comprehension component
  const mapQuizData = (questions: ChapterQuizQuestion[]) => {
    return {
      questions: questions.map(q => ({
        question: q.question,
        options: q.options.map(o => o.text),
        answer: q.options.find(o => o.value === 'correct')?.text || ''
      }))
    };
  };

  // We reuse useFocusedReaderScores by adapting ChapterBookContent to FocusedReaderContent structure if needed,
  // or we can just implement a simplified version. For now, let's use the hook but adapt the data.
  // Actually, useFocusedReaderScores expects FocusedReaderContent.
  // Let's implement a quick scoring logic here or adapt.
  
  const chapterAnswers = answers.focusedReader?.[currentChapterIndex] || {};
  const isChapterCompleted = !!answers.completionStates?.[`chapter_${currentChapterIndex}`];

  // Always compute voices for the current reading language at render time
  // so the modal immediately reflects a language switch without waiting for the hook
  const modalVoices = getVoicesForLang(getLangCode(currentLanguage));

  const calculateScore = () => {
    let totalScore = 0;
    let totalPossible = 0;
    
    content.chapters.forEach((chapter, cIdx) => {
      const cAnswers = answers.focusedReader?.[cIdx] || {};
      chapter.quiz.forEach((q, qIdx) => {
        totalPossible++;
        const correctAnswer = q.options.find(o => o.value === 'correct')?.text;
        if (cAnswers[qIdx] === correctAnswer) {
          totalScore++;
        }
      });
    });
    
    return { score: totalScore, total: totalPossible };
  };

  const handleFinishClick = () => {
    const { score, total } = calculateScore();
    const data: ReportData = {
      title: lesson.title || content.title,
      nickname: studentName,
      studentId: studentId,
      homeroom: homeroom,
      finishTime: new Date().toLocaleTimeString(),
      totalScore: score,
      maxScore: total,
      pills: [
        { label: 'Reading Comprehension', score, total }
      ]
    };
    setReportData(data);
    setShowReportCard(true);
    onFinish(data);
  };

  return (
    <div className="space-y-4">
      <div className="max-w-4xl mx-auto px-1 sm:px-4 py-4 space-y-6">
        <div className="text-center space-y-2">
            <h2 className="text-2xl font-black text-green-800">{content.title}</h2>
            {content.subtitle && <p className="text-gray-500 font-bold">{content.subtitle}</p>}
        </div>

        <LessonMedia 
          imageUrl={lesson.imageUrl} 
          title={currentChapter.title} 
        />

        
        {/* Language Toggle */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex p-1 bg-green-50/50 rounded-xl border border-green-100 shadow-sm overflow-hidden">
            <button
              onClick={() => setAnswers(prev => ({ ...prev, activeReadingLanguage: 'original' }))}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-black transition-all duration-300 ${
                activeReadingLanguage === 'original' 
                  ? 'bg-white text-green-700 shadow-sm ring-1 ring-black/5' 
                  : 'text-green-600 hover:text-green-700'
              }`}
            >
              READ IN {lesson.language.toUpperCase()}
            </button>
            <button
              onClick={() => setAnswers(prev => ({ ...prev, activeReadingLanguage: 'translation' }))}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-black transition-all duration-300 ${
                activeReadingLanguage === 'translation' 
                  ? 'bg-white text-green-700 shadow-sm ring-1 ring-black/5' 
                  : 'text-green-600 hover:text-green-700'
              }`}
            >
              READ IN {translationLanguage.toUpperCase()}
            </button>
          </div>
        </div>

        
        <ReadingPassage
          text={displayText}
          language={isTranslated ? translationLanguage : lesson.language}
          title={currentChapter.title}
          onSlowToggle={() => toggleTTS(0.6, displayText, currentLanguage, true)}
          onListenToggle={() => toggleTTS(1.0, displayText, currentLanguage, true)}
          ttsStatus={ttsState.status}
          currentRate={ttsState.rate}
          hasVoices={availableVoices.length > 0 || !!lesson.audioFileUrl}
          onTranslate={() => toggleTranslation()}
          onSwipeLeft={currentChapterIndex < content.chapters.length - 1 ? () => handleChapterChange(currentChapterIndex + 1) : undefined}
          onSwipeRight={currentChapterIndex > 0 ? () => handleChapterChange(currentChapterIndex - 1) : undefined}
          onVoiceOpen={modalVoices.length > 0 || !!lesson.audioFileUrl ? () => setIsVoiceModalOpen(true) : undefined}
          className="animate-slide-up"
          showHighlightHelp={!isTranslated}
          currentPage={currentChapterIndex}
          totalPages={content.chapters.length}
          onPageChange={handleChapterChange}
          passageRef={readingPassageRef}
        />

        {/* Quiz Section */}
        {currentChapter.quiz.length > 0 && (
          <section className="animate-fade-in" key={currentChapterIndex}>
            <CollapsibleActivity
              isCompleted={isChapterCompleted}
              title={`${currentChapter.title} Quiz`}
              score={isChapterCompleted ? "" : undefined}
            >
              <Comprehension
                data={mapQuizData(currentChapter.quiz)}
                readingText={chapterText}
                language={lesson.language}
                onChange={(partAnswers) => {
                  setAnswers(prev => {
                    const focusedReader = { ...(prev.focusedReader || {}) };
                    focusedReader[currentChapterIndex] = partAnswers;
                    return { ...prev, focusedReader };
                  });
                }}
                savedAnswers={chapterAnswers}
                voiceName={selectedVoiceName}
                toggleTTS={toggleTTS}
                ttsState={ttsState}
                lessonId={`${lesson.id}-chapter-${currentChapterIndex}`}
                title="Chapter Quiz"
                showReferenceText={false}
                savedIsCompleted={isChapterCompleted}
                shuffleQuestions={false}
                onComplete={(completed) => {
                    setAnswers(prev => ({
                        ...prev,
                        completionStates: {
                            ...(prev.completionStates || {}),
                            [`chapter_${currentChapterIndex}`]: completed
                        }
                    }));
                }}
                onNextPage={() => {
                  if (currentChapterIndex < content.chapters.length - 1) {
                    handleChapterChange(currentChapterIndex + 1);
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

        <LessonFooter
          studentName={studentName}
          setStudentName={setStudentName}
          studentId={studentId}
          setStudentId={setStudentId}
          homeroom={homeroom}
          setHomeroom={setHomeroom}
          isNameLocked={isNameLocked}
          onFinish={handleFinishClick}
          onReset={onReset}
        />
      </div>

      <VoiceSelectorModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        voices={modalVoices}
        selectedVoiceName={selectedVoiceName}
        onSelectVoice={setSelectedVoiceName}
        language={currentLanguage}
        hasRecordedAudio={!!lesson.audioFileUrl}
        audioPreference={audioPreference}
        onSelectPreference={setAudioPreference}
      />

      {showReportCard && reportData && (
        <ReportCard
          data={reportData}
          teacherCode={teacherCode || lesson.teacherCode || '6767'}
          onClose={() => {
            setShowReportCard(false);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      )}

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
