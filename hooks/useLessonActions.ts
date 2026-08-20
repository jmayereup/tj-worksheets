import { useCallback } from 'react';
import { useCreateLesson, useUpdateLesson } from './useLessons';
import { 
  parseContentWithValidation, 
  buildLessonObject, 
  generateFormData, 
  downloadLessonAsJSON, 
  downloadLessonAsHTML, 
  generateEmbedCode,
  clearPreviewStorage
} from '../utils/lessonEditorHelpers';
import { VALIDATION_MESSAGES, getGeminiUrl } from '../config/lessonEditor';
import { LessonObjectData, MediaState } from '../types/lessonEditor';

interface UseLessonActionsProps {
  lessonId: string | null;
  isPublicCreator: boolean;
  formState: any;
  jsonContent: string;
  media: MediaState;
  existingData?: any;
  onSave: () => void;
  onPreview: (lesson: any) => void;
  onError: (error: string) => void;
}

export const useLessonActions = ({
  lessonId,
  isPublicCreator,
  formState,
  jsonContent,
  media,
  existingData,
  onSave,
  onPreview,
  onError
}: UseLessonActionsProps) => {
  const createMutation = useCreateLesson();
  const updateMutation = useUpdateLesson();

  const handlePreview = useCallback(() => {
    try {
      clearPreviewStorage();

      const parsedResult = parseContentWithValidation(jsonContent, formState.title);
      if (!parsedResult.isValid) {
        onError(parsedResult.error || VALIDATION_MESSAGES.CANNOT_PREVIEW_INVALID);
        return;
      }

      const lessonForPreview = buildLessonObject(
        formState,
        parsedResult.parsedContent,
        `preview-${lessonId || 'new'}-${Date.now()}`,
        existingData
      );
      
      onPreview(lessonForPreview);
    } catch (e: any) {
      onError(e.message || VALIDATION_MESSAGES.CANNOT_PREVIEW_INVALID);
    }
  }, [jsonContent, formState, lessonId, existingData, onPreview, onError]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isPublicCreator && formState.selectedTags.length === 0) {
      onError(VALIDATION_MESSAGES.MISSING_TAGS);
      return;
    }

    try {
      const parsedResult = parseContentWithValidation(jsonContent, formState.title);
      if (!parsedResult.isValid) {
        onError(parsedResult.error || VALIDATION_MESSAGES.INVALID_CONTENT_FORMAT);
        return;
      }

      const lessonForCompile = buildLessonObject(
        formState,
        parsedResult.parsedContent,
        undefined,
        existingData
      );

      const htmlCompiled = generateEmbedCode(lessonForCompile, formState.html);
      if (!htmlCompiled) {
        onError(VALIDATION_MESSAGES.FAILED_TO_GENERATE_EMBED);
        return;
      }

      const formData = generateFormData(
        lessonForCompile,
        htmlCompiled,
        media.imageFile,
        media.audioFile
      );

      if (lessonId) {
        await updateMutation.mutateAsync({ id: lessonId, data: formData });
      } else {
        await createMutation.mutateAsync(formData);
      }

      onSave();
    } catch (err: any) {
      onError(err.message || VALIDATION_MESSAGES.FAILED_TO_SAVE_LESSON);
    }
  }, [
    isPublicCreator,
    formState,
    jsonContent,
    media,
    existingData,
    lessonId,
    createMutation,
    updateMutation,
    onSave,
    onError
  ]);

  const handleDownloadJSON = useCallback(() => {
    try {
      const parsedResult = parseContentWithValidation(jsonContent, formState.title);
      if (!parsedResult.isValid) {
        onError(parsedResult.error || VALIDATION_MESSAGES.FAILED_TO_GENERATE_JSON);
        return;
      }

      const lessonForDownload = buildLessonObject(
        formState,
        parsedResult.parsedContent,
        undefined,
        existingData
      );

      downloadLessonAsJSON(lessonForDownload);
    } catch (e: any) {
      onError(VALIDATION_MESSAGES.FAILED_TO_GENERATE_JSON);
    }
  }, [jsonContent, formState, existingData, onError]);

  const handleCopyEmbed = useCallback(() => {
    try {
      const parsedResult = parseContentWithValidation(jsonContent, formState.title);
      if (!parsedResult.isValid) {
        onError(parsedResult.error || VALIDATION_MESSAGES.FAILED_TO_GENERATE_EMBED);
        return;
      }

      const lessonForEmbed = buildLessonObject(
        formState,
        parsedResult.parsedContent,
        lessonId || undefined,
        existingData
      );

      const embedCode = generateEmbedCode(lessonForEmbed, formState.html);
      if (embedCode) {
        navigator.clipboard.writeText(embedCode);
        alert("Embed code copied to clipboard!");
      } else {
        onError(VALIDATION_MESSAGES.FAILED_TO_GENERATE_EMBED);
      }
    } catch (e: any) {
      onError(VALIDATION_MESSAGES.FAILED_TO_GENERATE_EMBED);
    }
  }, [jsonContent, formState, lessonId, existingData, onError]);

  const handleDownloadHTML = useCallback(() => {
    try {
      const parsedResult = parseContentWithValidation(jsonContent, formState.title);
      if (!parsedResult.isValid) {
        onError(parsedResult.error || VALIDATION_MESSAGES.FAILED_TO_GENERATE_EMBED);
        return;
      }

      const lessonForHTML = buildLessonObject(
        formState,
        parsedResult.parsedContent,
        lessonId || undefined,
        existingData
      );

      const embedCode = generateEmbedCode(lessonForHTML, formState.html);
      if (!embedCode) {
        onError(VALIDATION_MESSAGES.FAILED_TO_GENERATE_EMBED);
        return;
      }

      const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${formState.title || 'TeacherJake Worksheet'}</title>
    <style>
        body { margin: 0; padding: 0; background-color: #f9fafb; font-family: sans-serif; }
    </style>
</head>
<body>
    <div style="max-w: 1000px; margin: 0 auto; padding: 20px;">
        ${embedCode}
    </div>
</body>
</html>`;

      downloadLessonAsHTML(lessonForHTML, htmlContent);
    } catch (e: any) {
      onError(VALIDATION_MESSAGES.FAILED_TO_GENERATE_EMBED);
    }
  }, [jsonContent, formState, lessonId, existingData, onError]);

  const handlePasteFromClipboard = useCallback(async (onContentChange: (content: string) => void): Promise<string | null> => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        onContentChange(text);
        return text;
      }
      return null;
    } catch (err) {
      onError(VALIDATION_MESSAGES.CLIPBOARD_PERMISSION_DENIED);
      return null;
    }
  }, [onError]);

  const getGeminiUrlForLessonType = useCallback((lessonType: string) => {
    return getGeminiUrl(lessonType);
  }, []);

  return {
    handlePreview,
    handleSubmit,
    handleDownloadJSON,
    handleCopyEmbed,
    handleDownloadHTML,
    handlePasteFromClipboard,
    getGeminiUrlForLessonType,
    isLoading: createMutation.isPending || updateMutation.isPending
  };
};