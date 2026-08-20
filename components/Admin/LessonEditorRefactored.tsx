import React from 'react';
import { useLesson } from '../../hooks/useLessons';
import { FormHeader } from './LessonEditor/FormHeader';
import { PublicCreatorWarning } from './LessonEditor/PublicCreatorWarning';
import { BasicInfoSection } from './LessonEditor/BasicInfoSection';
import { MediaSection } from './LessonEditor/MediaSection';
import { SEOSection } from './LessonEditor/SEOSection';
import { HTMLContentSection } from './LessonEditor/HTMLContentSection';
import { JSONContentSection } from './LessonEditor/JSONContentSection';
import { ActionButtons } from './LessonEditor/ActionButtons';
import { useLessonFormState } from '../../hooks/useLessonFormState';
import { useContentParsing } from '../../hooks/useContentParsing';
import { useFileHandlers } from '../../hooks/useFileHandlers';
import { useLessonActions } from '../../hooks/useLessonActions';
import { createValidationMessage } from '../../utils/contentValidation';
import { parseContent } from '../../utils/contentFormat';
import { FileJson } from 'lucide-react';

interface LessonEditorProps {
  lessonId: string | null;
  initialData?: any;
  isPublicCreator?: boolean;
  onSave: () => void;
  onCancel: () => void;
  onPreview: (lesson: any) => void;
}

export const LessonEditor: React.FC<LessonEditorProps> = ({ 
  lessonId, 
  initialData, 
  isPublicCreator = false, 
  onSave, 
  onCancel, 
  onPreview 
}) => {
  const { data: lesson, isLoading: fetching } = useLesson(lessonId);
  
  const [jsonContent, setJsonContent] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  const { formState, actions } = useLessonFormState(lesson, lessonId, initialData, isPublicCreator);
  const { media, handleImageFileChange, handleAudioFileChange, handlePasteImageFromClipboard } = useFileHandlers();
  
  const { liveDetection, isContentValid, isJsonContent, autoSEO, autoTitle } = useContentParsing(
    jsonContent,
    formState.title,
    formState.metadata.seo
  );

  const lessonActions = useLessonActions({
    lessonId,
    isPublicCreator,
    formState: {
      ...formState,
      ...formState.metadata,
      ...formState.media,
      ...formState.ui
    },
    jsonContent,
    media,
    existingData: lesson,
    onSave,
    onPreview,
    onError: setError
  });

  React.useEffect(() => {
    if (autoSEO && !formState.metadata.seo) {
      actions.setMetadata({ seo: autoSEO });
    }
  }, [autoSEO, formState.metadata.seo, actions]);

  React.useEffect(() => {
    if (autoTitle && !formState.title) {
      actions.setTitle(autoTitle);
    }
  }, [autoTitle, formState.title, actions]);

  React.useEffect(() => {
    if (lesson?.content) {
      const contentString = typeof lesson.content === 'string' 
        ? lesson.content 
        : JSON.stringify(lesson.content, null, 2);
      setJsonContent(contentString);
    } else if (!lessonId && !jsonContent) {
      setJsonContent('');
    }
  }, [lesson, lessonId]);

  const handleContentChange = (newContent: string) => {
    setJsonContent(newContent);
    if (formState.ui.validationMessage) {
      actions.setUI({ validationMessage: null });
    }
  };

  const handleVisualEditorApply = (updatedData: any) => {
    setJsonContent(JSON.stringify(updatedData, null, 2));
    actions.setUI({ showVisualEditor: false });
  };

  const handleCheckFormat = () => {
    const validationMessage = createValidationMessage(liveDetection);
    actions.setUI({ validationMessage });
  };

  const handlePasteFromClipboard = async () => {
    const text = await lessonActions.handlePasteFromClipboard(handleContentChange);
    if (text) {
      const detected = parseContent(text);
      if (detected.format === 'json') {
        const parsed = detected.value as any;
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          if (parsed.title) {
            actions.setTitle(parsed.title);
          }
          if (parsed.seo_intro) {
            actions.setMetadata({ seo: parsed.seo_intro });
          }
        }
      }
    }
  };

  if (fetching) {
    return (
      <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-gray-100 shadow-sm animate-pulse">
        <FileJson className="w-10 h-10 text-gray-300 mb-4" />
        <p className="text-gray-400 font-medium">Preparing worksheet data...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
      <FormHeader
        isPublicCreator={isPublicCreator}
        lessonId={lessonId}
        onCancel={onCancel}
      />

      {isPublicCreator && <PublicCreatorWarning />}

      <form onSubmit={lessonActions.handleSubmit} className="p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
          <BasicInfoSection
            title={formState.title}
            language={formState.language}
            level={formState.level}
            selectedTags={formState.selectedTags}
            lessonType={formState.lessonType}
            isPublicCreator={isPublicCreator}
            onTitleChange={actions.setTitle}
            onLanguageChange={actions.setLanguage}
            onLevelChange={actions.setLevel}
            onTagsChange={actions.setSelectedTags}
            onLessonTypeChange={actions.setLessonType}
          />

          <MediaSection
            videoUrl={formState.videoUrl}
            teacherCode={formState.metadata.teacherCode}
            startCode={formState.metadata.startCode}
            passThreshold={formState.metadata.passThreshold}
            submissionUrl={formState.metadata.submissionUrl}
            lessonType={formState.lessonType}
            testMode={formState.metadata.testMode}
            isVideoLesson={formState.isVideoLesson}
            notForBlog={formState.notForBlog}
            isPublicCreator={isPublicCreator}
            media={media}
            existingAudioFile={lesson?.audioFile}
            existingAudioFileUrl={lesson?.audioFileUrl}
            onVideoUrlChange={actions.setVideoUrl}
            onTeacherCodeChange={(code) => actions.setMetadata({ teacherCode: code })}
            onStartCodeChange={(code) => actions.setMetadata({ startCode: code })}
            onPassThresholdChange={(threshold) => actions.setMetadata({ passThreshold: threshold })}
            onSubmissionUrlChange={(url) => actions.setMetadata({ submissionUrl: url })}
            onTestModeChange={(enabled) => actions.setMetadata({ testMode: enabled })}
            onIsVideoLessonChange={actions.setIsVideoLesson}
            onNotForBlogChange={actions.setNotForBlog}
            onImageFileChange={handleImageFileChange}
            onAudioFileChange={handleAudioFileChange}
            onPasteImageFromClipboard={handlePasteImageFromClipboard}
            onRemoveNewAudio={() => handleAudioFileChange(null)}
          />
        </div>

        <SEOSection
          seo={formState.metadata.seo}
          onChange={(seo) => actions.setMetadata({ seo })}
        />

        <HTMLContentSection
          html={formState.metadata.html}
          onChange={(html) => actions.setMetadata({ html })}
        />

        <JSONContentSection
          jsonContent={jsonContent}
          lessonType={formState.lessonType}
          liveDetection={liveDetection}
          isContentValid={isContentValid}
          isJsonContent={isJsonContent}
          showVisualEditor={formState.ui.showVisualEditor}
          validationMessage={formState.ui.validationMessage}
          error={error}
          onContentChange={handleContentChange}
          onVisualEditorToggle={() => actions.setUI({ showVisualEditor: !formState.ui.showVisualEditor })}
          onVisualEditorApply={handleVisualEditorApply}
          onPasteFromClipboard={handlePasteFromClipboard}
          onCheckFormat={handleCheckFormat}
        />

        <ActionButtons
          isPublicCreator={isPublicCreator}
          lessonId={lessonId}
          lessonType={formState.lessonType}
          language={formState.language}
          isContentValid={isContentValid}
          isLoading={lessonActions.isLoading}
          onCancel={onCancel}
          onPreview={lessonActions.handlePreview}
          onCopyEmbed={lessonActions.handleCopyEmbed}
          onDownloadHTML={lessonActions.handleDownloadHTML}
          onSubmit={lessonActions.handleSubmit}
        />
      </form>
    </div>
  );
};