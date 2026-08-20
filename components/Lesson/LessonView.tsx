import React, { useState, useEffect } from 'react';
import { ParsedLesson, StandardLessonContent, InformationGapContent, FocusedReaderContent, LessonContent, ReportData, WordBlasterContent, ChapterBookContent } from '../../types';
import { selectElementText } from '../../utils/textUtils';
import { Loader } from 'lucide-react';
import { getComponentConfig } from '../../utils/componentMapper';
import { buildPreviewElementHtml } from '../../utils/htmlCompiler';
import confetti from 'canvas-confetti';
import { useTTS } from '../../hooks/useTTS';
import { useLessonProgress } from '../../hooks/useLessonProgress';
import { ReportCard } from '../UI/ReportCard';
import { LessonMedia } from '../UI/LessonMedia';


import { fetchTeacherSubmissionUrl } from '../../services/pocketbase';

const InformationGapView = React.lazy(() => import('./InformationGapView').then(m => ({ default: m.InformationGapView })));
const WorksheetView = React.lazy(() => import('./WorksheetView').then(m => ({ default: m.WorksheetView })));
const FocusedReaderView = React.lazy(() => import('./FocusedReaderView').then(m => ({ default: m.FocusedReaderView })));
const WordBlasterView = React.lazy(() => import('./WordBlasterView').then(m => ({ default: m.WordBlasterView })));
const ChapterBookView = React.lazy(() => import('./ChapterBookView').then(m => ({ default: m.ChapterBookView })));

interface Props {
  lesson: ParsedLesson;
  teacherCode?: string;
  submissionUrl?: string;
}

const isStandardLesson = (content: LessonContent): content is StandardLessonContent => {
  return content !== null && typeof content === 'object' && 'activities' in content && !Array.isArray(content.activities);
};

const isFocusedReader = (content: LessonContent): content is FocusedReaderContent => {
  return content !== null && typeof content === 'object' && 'parts' in content && Array.isArray((content as any).parts);
};

const isWordBlaster = (content: LessonContent): content is WordBlasterContent => {
  return content !== null && typeof content === 'object' && 'words' in content && Array.isArray((content as any).words);
};

const isInformationGapLesson = (content: LessonContent): content is InformationGapContent => {
  if (Array.isArray(content)) {
    return content.length > 0 && typeof content[0] === 'object' && content[0] !== null && ('topic' in content[0] || 'blocks' in content[0]);
  }
  return content !== null && typeof content === 'object' && ('topic' in content || 'player_count' in content || ('activities' in content && Array.isArray((content as any).activities)));
};

const isChapterBook = (content: LessonContent): content is ChapterBookContent => {
  return content !== null && typeof content === 'object' && 'chapters' in content && Array.isArray((content as any).chapters);
};

export const LessonView: React.FC<Props> = ({ lesson, teacherCode, submissionUrl }) => {
  const isStandard = isStandardLesson(lesson.content);
  const isFocused = isFocusedReader(lesson.content);
  const isBlaster = isWordBlaster(lesson.content);
  const isInfoGap = isInformationGapLesson(lesson.content);
  const isChapter = isChapterBook(lesson.content);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const htmlContent = lesson.html || '';

  // Determine effective lesson type - trust explicit database field first, fall back to structure detection
  const effectiveLessonType = lesson.lessonType || (
    isBlaster ? 'word-blaster' :
    isFocused ? 'focused-reading' :
    isChapter ? 'chapter-book' :
    isInfoGap ? 'information-gap' :
    isStandard ? 'standard' :
    'worksheet'
  );

  const {
    answers,
    setAnswers,
    completionStates,
    setCompletionStates,
    studentName,
    setStudentName,
    studentId,
    setStudentId,
    homeroom,
    setHomeroom,
    resetProgress,
  } = useLessonProgress(lesson.id);

  const [showReportCard, setShowReportCard] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  
  const [isNameLocked, setIsNameLocked] = useState(false);
  const passageRef = React.useRef<HTMLDivElement>(null);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  // Dynamically load the CDN script on mount for external web components
  useEffect(() => {
    const componentConfig = getComponentConfig(effectiveLessonType);
    if (componentConfig) {
      const scriptId = `script-view-${effectiveLessonType}`;
      if (!document.getElementById(scriptId)) {
        const script = document.createElement('script');
        script.id = scriptId;
        script.src = componentConfig.script;
        script.type = 'module';
        script.defer = true;
        document.body.appendChild(script);
      }
    }
  }, [effectiveLessonType]);

  // Automatically apply teacher code and submission URL to nested custom elements in the HTML content
  useEffect(() => {
    if (!containerRef.current) return;
    const effectiveCode = (teacherCode || lesson.teacherCode || '6767').trim();

    const applyAttrs = (subUrl: string) => {
      if (!containerRef.current) return;
      const elements = containerRef.current.querySelectorAll('*');
      elements.forEach(el => {
        // Skip the main worksheet wrapper tag itself to avoid infinite setting loop
        if (el.tagName.includes('-') && el.tagName.toLowerCase() !== 'tj-pocketbase-worksheet') {
          el.setAttribute('code', effectiveCode);
          (el as any).code = effectiveCode;

          const effectiveUrl = (submissionUrl || lesson.submissionUrl || lesson.customConfig?.submissionUrl || subUrl || '').trim();
          if (effectiveUrl) {
            el.setAttribute('submission-url', effectiveUrl);
            (el as any).submissionUrl = effectiveUrl;
          }
        }
      });
    };

    let isCancelled = false;
    const directUrl = submissionUrl || lesson.submissionUrl || lesson.customConfig?.submissionUrl;
    if (directUrl) {
      applyAttrs(directUrl);
    } else {
      fetchTeacherSubmissionUrl().then(url => {
        if (!isCancelled) {
          applyAttrs(url || '');
        }
      });
    }

    return () => { isCancelled = true; };
  }, [htmlContent, teacherCode, lesson.teacherCode, lesson.submissionUrl, lesson.customConfig?.submissionUrl, submissionUrl, resetKey]);

  // Determine Translation Language
  const getTranslationLanguage = () => {
    if (isChapter) {
      const content = lesson.content as ChapterBookContent;
      // Default translation for chapter books
      return content.translationLanguage || (
        (['english', 'en'].includes(lesson.language.toLowerCase())) ? 'Thai' : 'English'
      );
    }
    if (isFocused) {
      // Focused reader might also need translation lang logic if we add it there later
      return (['english', 'en'].includes(lesson.language.toLowerCase())) ? 'Thai' : 'English';
    }
    return (['english', 'en'].includes(lesson.language.toLowerCase())) ? 'Thai' : 'English';
  };

  const translationLanguage = getTranslationLanguage();
  const activeReadingLanguage = answers.activeReadingLanguage || 'original';
  const effectiveLanguage = activeReadingLanguage === 'translation' ? translationLanguage : lesson.language;

  // TTS Hook
  const {
    ttsState,
    availableVoices,
    selectedVoiceName,
    setSelectedVoiceName,
    audioPreference,
    setAudioPreference,
    toggleTTS
  } = useTTS({
    language: effectiveLanguage,
    audioFileUrl: lesson.audioFileUrl,
    defaultAudioPreference: lesson.audioFileUrl ? 'recorded' : 'tts',
    defaultReadingText: isStandard ? (lesson.content as StandardLessonContent).readingText : (isFocused ? (lesson.content as FocusedReaderContent).parts[0].text : ''),
    onStartCallback: () => {}
  });




  const handleReset = () => {
    if (window.confirm('Are you sure you want to clear all your progress? This cannot be undone.')) {
      resetProgress();
      setResetKey(prev => prev + 1);
      setShowReportCard(false);
      setReportData(null);
      setIsNameLocked(false);
      window.scrollTo(0, 0);
    }
  };

  const isWebComponent = typeof window !== 'undefined' && 
    window.location.origin !== 'https://worksheets.teacherjake.com' && 
    !window.location.origin.includes('localhost') &&
    !window.location.origin.includes('127.0.0.1');
    
  const editUrl = isWebComponent 
    ? `https://worksheets.teacherjake.com/?view=admin&edit=${lesson.id}`
    : `/?view=admin&edit=${lesson.id}`;

  const handleFinish = (data: ReportData) => {
    if (!studentName.trim() || !studentId.trim() || !homeroom.trim()) {
      alert('Please fill in your Nickname, Student ID, and Homeroom.');
      return;
    }

    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    setIsNameLocked(true);
    setReportData(data);
    setShowReportCard(true);

    setTimeout(() => {
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (e) {
        console.warn('Confetti failed:', e);
      }
    }, 200);
  };

  const displayTitle = lesson.title || (isStandard ? (lesson.content as StandardLessonContent).title : (isFocused ? (lesson.content as FocusedReaderContent).title : (isBlaster ? "Word Blaster" : (lesson.content as InformationGapContent).topic))) || 'Lesson';

  const seoDescription = lesson.seo || 
    (isStandard ? (lesson.content as StandardLessonContent).seo_intro : 
     isFocused ? (lesson.content as FocusedReaderContent).seo_intro : 
     isInfoGap ? (lesson.content as InformationGapContent).seo_intro : undefined);


  const placeholderRegex = /<(?:lesson-component|web-component)\b[^>]*>(?:<\/(?:lesson-component|web-component)>)?|<(?:lesson-component|web-component)\b[^>]*\/>/i;
  const hasPlaceholder = placeholderRegex.test(htmlContent);

  const renderLessonContent = () => (
    <React.Suspense fallback={<div className="flex items-center justify-center p-20"><Loader className="w-8 h-8 animate-spin text-green-600" /></div>}>
      {['lbl-reader', 'grammar-hearts', 'listening', 'speed-review', 'pronunciation', 'quiz-element', 'tj-test', 'test'].includes(effectiveLessonType) ? (
        <div className="tj-external-wc-container min-h-[500px]">
          <LessonMedia
            videoUrl={lesson.videoUrl}
            imageUrl={lesson.imageUrl}
            isVideoLesson={lesson.isVideoLesson}
            title={displayTitle}
          />
          {(() => {
            const config = getComponentConfig(effectiveLessonType);
            if (!config) return null;
            const { elementHtml } = buildPreviewElementHtml(lesson);
            return <div dangerouslySetInnerHTML={{ __html: elementHtml }} />;
          })()}
        </div>
      ) : effectiveLessonType === 'information-gap' ? (
        <InformationGapView 
          key={`info-gap-${resetKey}`}
          lesson={{...lesson, content: lesson.content as InformationGapContent}} 
          onReset={handleReset}
          onFinish={handleFinish}
          studentName={studentName}
          setStudentName={setStudentName}
          studentId={studentId}
          setStudentId={setStudentId}
          homeroom={homeroom}
          setHomeroom={setHomeroom}
          isNameLocked={isNameLocked}
          toggleTTS={toggleTTS}
          ttsState={ttsState}
          availableVoices={availableVoices}
          selectedVoiceName={selectedVoiceName}
          setSelectedVoiceName={setSelectedVoiceName}
          isVoiceModalOpen={isVoiceModalOpen}
          setIsVoiceModalOpen={setIsVoiceModalOpen}
          audioPreference={audioPreference}
          setAudioPreference={setAudioPreference}
          answers={answers}
          setAnswers={setAnswers}
        />
      ) : effectiveLessonType === 'focused-reading' ? (
        <FocusedReaderView
          key={`focused-reader-${resetKey}`}
          lesson={{...lesson, content: lesson.content as FocusedReaderContent}}
          studentName={studentName}
          setStudentName={setStudentName}
          studentId={studentId}
          setStudentId={setStudentId}
          homeroom={homeroom}
          setHomeroom={setHomeroom}
          isNameLocked={isNameLocked}
          onFinish={handleFinish}
          onReset={handleReset}
          answers={answers}
          setAnswers={setAnswers}
          toggleTTS={toggleTTS}
          ttsState={ttsState}
          availableVoices={availableVoices}
          selectedVoiceName={selectedVoiceName}
          setSelectedVoiceName={setSelectedVoiceName}
          isVoiceModalOpen={isVoiceModalOpen}
          setIsVoiceModalOpen={setIsVoiceModalOpen}
          audioPreference={audioPreference}
          setAudioPreference={setAudioPreference}
        />
      ) : effectiveLessonType === 'word-blaster' ? (
        <WordBlasterView
          key={`word-blaster-${resetKey}`}
          lesson={{...lesson, content: lesson.content as WordBlasterContent}}
          onFinish={handleFinish}
          onReset={handleReset}
        />
      ) : effectiveLessonType === 'chapter-book' ? (
        <ChapterBookView
          key={`chapter-book-${resetKey}`}
          lesson={{...lesson, content: lesson.content as ChapterBookContent}}
          studentName={studentName}
          setStudentName={setStudentName}
          studentId={studentId}
          setStudentId={setStudentId}
          homeroom={homeroom}
          setHomeroom={setHomeroom}
          isNameLocked={isNameLocked}
          onFinish={handleFinish}
          onReset={handleReset}
          answers={answers}
          setAnswers={setAnswers}
          toggleTTS={toggleTTS}
          ttsState={ttsState}
          availableVoices={availableVoices}
          selectedVoiceName={selectedVoiceName}
          setSelectedVoiceName={setSelectedVoiceName}
          isVoiceModalOpen={isVoiceModalOpen}
          setIsVoiceModalOpen={setIsVoiceModalOpen}
          audioPreference={audioPreference}
          setAudioPreference={setAudioPreference}
        />
      ) : (
        <WorksheetView
          key={`worksheet-${resetKey}`}
          lesson={{...lesson, content: lesson.content as StandardLessonContent}}
          studentName={studentName}
          setStudentName={setStudentName}
          studentId={studentId}
          setStudentId={setStudentId}
          homeroom={homeroom}
          setHomeroom={setHomeroom}
          isNameLocked={isNameLocked}
          onFinish={handleFinish}
          onReset={handleReset}
          answers={answers}
          setAnswers={setAnswers}
          completionStates={completionStates}
          setCompletionStates={setCompletionStates}
          toggleTTS={toggleTTS}
          ttsState={ttsState}
          availableVoices={availableVoices}
          selectedVoiceName={selectedVoiceName}
          setSelectedVoiceName={setSelectedVoiceName}
          isVoiceModalOpen={isVoiceModalOpen}
          setIsVoiceModalOpen={setIsVoiceModalOpen}
          audioPreference={audioPreference}
          setAudioPreference={setAudioPreference}
          passageRef={passageRef}
        />
      )}
    </React.Suspense>
  );

  return (
    <div ref={containerRef} className="bg-white max-w-4xl mx-auto pb-4 px-1 py-4 sm:px-6 tj-printable-worksheet">
      {/* Page Title - Unified Layout */}
      <div className="mb-4 text-center print:hidden">
        <h1 className="text-3xl md:text-4xl font-black text-green-900 mb-2 tracking-tight">
          {displayTitle}
        </h1>
        {seoDescription && (
          <p className="text-sm md:text-base text-gray-600 max-w-2xl mx-auto mt-2">
            {seoDescription}
          </p>
        )}
      </div>

      {(() => {
        if (hasPlaceholder) {
          const parts = htmlContent.split(placeholderRegex);
          const beforeHtml = parts[0];
          const afterHtml = parts.slice(1).join('');
          return (
            <>
              {beforeHtml && (
                <div 
                  className="tj-html-content prose max-w-none mb-6 print:mb-4"
                  dangerouslySetInnerHTML={{ __html: beforeHtml }} 
                />
              )}
              <main>
                {renderLessonContent()}
              </main>
              {afterHtml && (
                <div 
                  className="tj-html-content prose max-w-none mt-6 print:mt-4"
                  dangerouslySetInnerHTML={{ __html: afterHtml }} 
                />
              )}
            </>
          );
        } else {
          return (
            <>
              {htmlContent && (
                <div 
                  className="tj-html-content prose max-w-none mb-6 print:mb-4"
                  dangerouslySetInnerHTML={{ __html: htmlContent }} 
                />
              )}
              <main>
                {renderLessonContent()}
              </main>
            </>
          );
        }
      })()}

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

      {/* Edit Button for Admins/Teachers */}
      <div className="mt-8 text-center print:hidden">
        <a 
          href={editUrl}
          target={isWebComponent ? "_blank" : "_self"}
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center text-xs font-medium text-gray-200 hover:text-gray-400 transition-colors"
          title="Edit this lesson"
        >
          <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
          Edit Lesson
        </a>
      </div>
    </div>
  );
};