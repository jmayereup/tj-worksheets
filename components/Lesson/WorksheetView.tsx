import React, { useMemo } from 'react';
import { ParsedLesson, StandardLessonContent, UserAnswers, ReportData, CompletionStates } from '../../types';
import { seededShuffle } from '../../utils/textUtils';
import { Vocabulary } from '../Activities/Vocabulary';
import { FillInBlanks } from '../Activities/FillInBlanks';
import { Comprehension } from '../Activities/Comprehension';
import { Scrambled } from '../Activities/Scrambled';
import { ReadingPassage } from '../Activities/ReadingPassage';
import { WrittenExpression } from '../Activities/WrittenExpression';
import { CriticalThinkingExtension } from '../Activities/CriticalThinkingExtension';
import { VoiceSelectorModal } from '../UI/VoiceSelectorModal';
import { LessonFooter } from './LessonFooter';
import { CollapsibleActivity } from '../UI/CollapsibleActivity';
import { WorksheetExportActions } from '../UI/WorksheetExportActions';
import { VideoExploration } from '../UI/VideoExploration';
import { LessonMedia } from '../UI/LessonMedia';
import { ReferenceLinks } from '../UI/ReferenceLinks';
import { useWorksheetScores } from '../../hooks/useWorksheetScores';

interface WorksheetViewProps {
  lesson: ParsedLesson & { content: StandardLessonContent };
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
  completionStates: CompletionStates;
  setCompletionStates: React.Dispatch<React.SetStateAction<CompletionStates>>;
  toggleTTS: (rate: number, overrideText?: string) => void;
  ttsState: { status: 'playing' | 'paused' | 'stopped', rate: number };
  availableVoices: SpeechSynthesisVoice[];
  selectedVoiceName: string | null;
  setSelectedVoiceName: (name: string) => void;
  isVoiceModalOpen: boolean;
  setIsVoiceModalOpen: (isOpen: boolean) => void;
  audioPreference: 'recorded' | 'tts';
  setAudioPreference: (pref: 'recorded' | 'tts') => void;
  passageRef: React.RefObject<HTMLDivElement>;
}

export const WorksheetView: React.FC<WorksheetViewProps> = ({
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
  completionStates,
  setCompletionStates,
  toggleTTS,
  ttsState,
  availableVoices,
  selectedVoiceName,
  setSelectedVoiceName,
  isVoiceModalOpen,
  setIsVoiceModalOpen,
  audioPreference,
  setAudioPreference,
  passageRef,
}) => {
  const standardContent = lesson.content;
  const displayTitle = lesson.title || standardContent.title;

  const updateAnswers = (section: keyof UserAnswers, data: any) => {
    setAnswers(prev => ({ ...prev, [section]: data }));
  };

  const handleTranslate = async () => {
    const text = standardContent.readingText;
    const langMap: Record<string, string> = {
      "English": "en",
      "French": "fr",
      "Spanish": "es",
      "German": "de"
    };
    const sourceLang = langMap[lesson.language] || 'auto';

    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.warn('Failed to copy to clipboard:', err);
    }

    const isAndroid = /android/i.test(navigator.userAgent);

    if (isAndroid) {
      const intentUrl = `intent://translate.google.com/?sl=${sourceLang}&text=${encodeURIComponent(text)}&op=translate#Intent;scheme=https;package=com.google.android.apps.translate;end`;
      const intentWindow = window.open(intentUrl, '_blank');
      setTimeout(() => {
        if (!intentWindow || intentWindow.closed) {
          window.open(`https://translate.google.com/?sl=${sourceLang}&text=${encodeURIComponent(text)}&op=translate`, '_blank');
        }
      }, 1000);
    } else {
      window.open(`https://translate.google.com/?sl=${sourceLang}&text=${encodeURIComponent(text)}&op=translate`, '_blank');
    }
  };

  const {
    vocabScore,
    fillScore,
    compScore,
    scrambledScore,
    calculateReportData
  } = useWorksheetScores(standardContent, answers);

  const handleFinishClick = () => {
    onFinish(calculateReportData(displayTitle, studentName, studentId, homeroom));
  };





  const printVocabItems = useMemo(() =>
    seededShuffle([...(standardContent.activities?.vocabulary?.items || [])], `${lesson.id}-print-vocab`),
    [standardContent, lesson.id]
  );

  const printScrambledItems = useMemo(() => {
    return (standardContent.activities?.scrambled || []).map((item, idx) => {
      const words = (item.answer || '').replace(/[.!?]+$/, '').split(/\s+/).filter(w => w);
      const shuffled = seededShuffle([...words], `${lesson.id}-print-scramble-${idx}`);
      return {
        ...item,
        scrambledText: shuffled.join(' / ')
      };
    });
  }, [standardContent, lesson.id]);

  const optimizedImageUrl = useMemo(() => {
    if (!lesson.imageUrl) return undefined;
    
    // In Astro, images are often optimized and their URLs changed.
    // Since this component might be in a Shadow DOM (via pocketbase-worksheet.tsx),
    // we try to find the image element by ID.
    try {
      // First try standard document lookup
      let img = document.getElementById('lesson-image') as HTMLImageElement;
      
      // If not found, try searching from the current element's root (for Shadow DOM)
      if (!img && passageRef.current) {
        const root = passageRef.current.getRootNode() as ShadowRoot | Document;
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
  
  const vocabularyExplanations = useMemo(() => {
    const map: Record<string, string> = {};
    const items = standardContent.activities?.vocabulary?.items || [];
    const definitions = standardContent.activities?.vocabulary?.definitions || [];
    
    items.forEach(item => {
      const definition = definitions.find(d => d.id === item.answer);
      if (definition) {
        map[item.label] = definition.text;
      }
    });
    return map;
  }, [standardContent.activities?.vocabulary]);

  return (
    <div className="space-y-4">
      {/* Worksheet Actions */}
      <div className="hidden sm:flex">
        <WorksheetExportActions
          lesson={{ ...lesson, optimizedImageUrl }}
          displayTitle={displayTitle}
          studentName={studentName}
          studentId={studentId}
          homeroom={homeroom}
        />
      </div>
      {/* Media Section */}
      <LessonMedia
        videoUrl={lesson.videoUrl}
        imageUrl={lesson.imageUrl}
        isVideoLesson={lesson.isVideoLesson}
        title={displayTitle}
      />

      <div className="print:hidden">
        <ReadingPassage
          text={standardContent.readingText}
          language={lesson.language}
          vocabularyExplanations={vocabularyExplanations}
          onSlowToggle={() => toggleTTS(0.6)}
          onListenToggle={() => toggleTTS(1.0)}
          ttsStatus={ttsState.status}
          currentRate={ttsState.rate}
          hasVoices={availableVoices.length > 0 || !!lesson.audioFileUrl}
          onVoiceOpen={availableVoices.length > 0 || !!lesson.audioFileUrl ? () => setIsVoiceModalOpen(true) : undefined}
          onTranslate={handleTranslate}
          passageRef={passageRef}
          showHighlightHelp={true}
        />
      </div>

      <div className="print:hidden">
        {(availableVoices.length > 0 || !!lesson.audioFileUrl) && (
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
        )}
      </div>

      {/* Activities Section */}
      <div className="space-y-2 pb-4 print:hidden">
        <section id="vocabulary">
          <CollapsibleActivity
            isCompleted={completionStates.vocabularyChecked}
            title="Vocabulary Matching"
            score={`${vocabScore}/${standardContent.activities?.vocabulary?.items?.length || 0}`}
            isPerfectScore={vocabScore === standardContent.activities?.vocabulary?.items?.length}
          >
            <Vocabulary
              data={standardContent.activities.vocabulary}
              language={lesson.language}
              onChange={(data) => updateAnswers('vocabulary', data)}
              savedAnswers={answers.vocabulary}
              voiceName={selectedVoiceName}
              savedIsChecked={completionStates.vocabularyChecked}
              onComplete={(isChecked) => setCompletionStates(prev => ({ ...prev, vocabularyChecked: isChecked }))}
              toggleTTS={toggleTTS}
              ttsState={ttsState}
              lessonId={lesson.id}
              limitToFive={false}
            />
          </CollapsibleActivity>
        </section>

        <section id="fill-blanks">
          <CollapsibleActivity
            isCompleted={completionStates.fillBlanksChecked}
            title="Fill in the Blanks"
            score={`${fillScore}/${standardContent.activities?.fillInTheBlanks?.length || 0}`}
            isPerfectScore={fillScore === standardContent.activities?.fillInTheBlanks?.length}
          >
            <FillInBlanks
              data={standardContent.activities?.fillInTheBlanks || []}
              vocabItems={standardContent.activities?.vocabulary?.items || []}
              level={lesson.level.replace('Level ', '')}
              language={lesson.language}
              onChange={(data) => updateAnswers('fillBlanks', data)}
              savedAnswers={answers.fillBlanks}
              voiceName={selectedVoiceName}
              savedIsChecked={completionStates.fillBlanksChecked}
              onComplete={(isChecked) => setCompletionStates(prev => ({ ...prev, fillBlanksChecked: isChecked }))}
              toggleTTS={toggleTTS}
              ttsState={ttsState}
              lessonId={lesson.id}
            />
          </CollapsibleActivity>
        </section>

        <section id="comprehension">
          <CollapsibleActivity
            isCompleted={completionStates.comprehensionCompleted}
            title="Comprehension Check"
            score={`${compScore}/${standardContent.activities?.comprehension?.questions?.length || 0}`}
            isPerfectScore={compScore === (standardContent.activities?.comprehension?.questions?.length || 0)}
          >
            <Comprehension
              data={standardContent.activities.comprehension}
              readingText={standardContent.readingText}
              language={lesson.language}
              onChange={(data) => updateAnswers('comprehension', data)}
              savedAnswers={answers.comprehension}
              voiceName={selectedVoiceName}
              savedIsCompleted={completionStates.comprehensionCompleted}
              onComplete={(isChecked) => setCompletionStates(prev => ({ ...prev, comprehensionCompleted: isChecked }))}
              toggleTTS={toggleTTS}
              ttsState={ttsState}
              lessonId={lesson.id}
              showReferenceText={false}
            />
          </CollapsibleActivity>
        </section>

        <section id="scrambled">
          <CollapsibleActivity
            isCompleted={completionStates.scrambledCompleted}
            title="Scrambled Sentences"
            score={`${scrambledScore}/${standardContent.activities?.scrambled?.length || 0}`}
            isPerfectScore={scrambledScore === (standardContent.activities?.scrambled?.length || 0)}
          >
            <Scrambled
              data={standardContent.activities.scrambled}
              level={lesson.level.replace('Level ', '')}
              language={lesson.language}
              onChange={(data) => updateAnswers('scrambled', data)}
              savedAnswers={answers.scrambled}
              voiceName={selectedVoiceName}
              savedIsChecked={completionStates.scrambledCompleted}
              onComplete={(isChecked) => setCompletionStates(prev => ({ ...prev, scrambledCompleted: isChecked }))}
              toggleTTS={toggleTTS}
              ttsState={ttsState}
              lessonId={lesson.id}
            />
          </CollapsibleActivity>
        </section>

        <section id="writing">
          <CollapsibleActivity
            isCompleted={completionStates.scrambledCompleted}
            title="Written Expression"
          >
            <WrittenExpression
              data={standardContent.activities?.writtenExpression || { questions: [], examples: '' }}
              savedAnswers={answers.writing}
              onChange={(newWriting) => updateAnswers('writing', newWriting)}
            />
          </CollapsibleActivity>
        </section>

        {standardContent.activities?.criticalThinking && (
          <section id="critical-thinking">
            <CollapsibleActivity
              isCompleted={false}
              title={standardContent.activities.criticalThinking.title || "Critical Thinking & Discussion"}
            >
              <CriticalThinkingExtension data={standardContent.activities.criticalThinking} />
            </CollapsibleActivity>
          </section>
        )}

        <ReferenceLinks references={standardContent.references} />

        <VideoExploration videoUrl={lesson.videoUrl} isVideoLesson={lesson.isVideoLesson} />

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
          <h1 className="text-xl font-bold text-gray-900 leading-tight mb-1">{displayTitle}</h1>
          <p className="text-xs text-gray-500">Language: {lesson.language} | Level: {lesson.level}</p>
        </div>

        <div className="space-y-3">
          {lesson.imageUrl && (
            <div className="flex justify-center">
              <img
                id="lesson-image-print"
                src={optimizedImageUrl || lesson.imageUrl}
                alt="Lesson topic"
                className="max-h-36 w-auto object-contain rounded"
              />
            </div>
          )}
          <section>
            <h2 className="text-sm font-bold mb-1 bg-gray-100 px-2 py-1">Reading Passage</h2>
            <p className={`whitespace-pre-wrap ${/[\u0E00-\u0E7F]/.test(standardContent.readingText) ? 'text-sm leading-loose' : 'text-xs leading-relaxed'}`}>{standardContent.readingText}</p>
          </section>

          <section>
            <h2 className="text-sm font-bold mb-1 bg-gray-100 px-2 py-1">1. Vocabulary Matching</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                {printVocabItems.map((item, i) => (
                  <div key={i} className="flex gap-1 items-center">
                    <span className="w-5 h-5 border border-gray-400 shrink-0 inline-block"></span>
                    <span className="text-xs">{item.label}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-1">
                {(standardContent.activities?.vocabulary?.definitions || []).map((def, i) => (
                  <div key={i} className="text-xs">
                    <span className="font-bold">{String.fromCharCode(97 + i)}.</span> {def.text}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-sm font-bold mb-1 bg-gray-100 px-2 py-1">2. Fill in the Blanks</h2>
            <div className="space-y-1">
              {(standardContent.activities?.fillInTheBlanks || []).map((item, i) => (
                <div key={i} className="text-xs">
                  {i + 1}. {item.before} <u>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</u> {item.after}
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-sm font-bold mb-1 bg-gray-100 px-2 py-1">3. Reading Questions</h2>
            <div className="space-y-1">
              {(standardContent.activities?.comprehension?.questions || []).map((q, i) => (
                <div key={i} className="flex justify-between items-center border-b border-gray-100 pb-1">
                  <span className="text-xs">{i + 1}. {q.text}</span>
                  <span className="font-bold text-xs flex gap-3 shrink-0 ml-2">
                    <span>True</span>
                    <span>False</span>
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-sm font-bold mb-1 bg-gray-100 px-2 py-1">4. Scrambled Sentences</h2>
            <div className="space-y-2">
              {printScrambledItems.map((item, i) => (
                <div key={i}>
                  <p className="text-xs text-gray-500 italic mb-0.5">({item.scrambledText})</p>
                  <div className="border-b border-gray-300 h-5"></div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-sm font-bold mb-1 bg-gray-100 px-2 py-1">5. Written Expression</h2>
            <div className="space-y-3">
              {(standardContent.activities?.writtenExpression?.questions || []).map((q, i) => (
                <div key={i}>
                  <p className="text-xs font-bold mb-1">{i + 1}. {q.text}</p>
                  <div className="space-y-2">
                    <div className="border-b border-gray-300 h-5"></div>
                    <div className="border-b border-gray-300 h-5"></div>
                    <div className="border-b border-gray-300 h-5"></div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

    </div>
  );
};
