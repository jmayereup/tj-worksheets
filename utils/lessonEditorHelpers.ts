import { parseContent, DetectedContent } from './contentFormat';
import { LessonObjectData, ParsedContentResult } from '../types/lessonEditor';
import { formatFilename } from '../config/lessonEditor';
import { compileLessonHtml } from './htmlCompiler';

export const parseContentWithValidation = (
  jsonContent: string,
  title?: string
): ParsedContentResult => {
  if (!jsonContent.trim()) {
    return {
      detected: { format: 'invalid', error: 'Empty content' },
      parsedContent: null,
      isValid: false,
      isJson: false,
      error: 'Empty content'
    };
  }

  const detected = parseContent(jsonContent);
  
  if (detected.format === 'invalid') {
    return {
      detected,
      parsedContent: null,
      isValid: false,
      isJson: false,
      error: detected.error
    };
  }

  let parsedContent: any;
  if (detected.format === 'json') {
    parsedContent = detected.value;
    if (title && parsedContent && typeof parsedContent === 'object' && !Array.isArray(parsedContent) && parsedContent.title !== title) {
      parsedContent.title = title;
    }
  } else {
    parsedContent = jsonContent.trim();
  }

  return {
    detected,
    parsedContent,
    isValid: true,
    isJson: detected.format === 'json',
    error: null
  };
};

export const buildLessonObject = (
  formState: any,
  content: any,
  idOverride?: string,
  existingData?: any
): LessonObjectData => {
  const isTest = ['tj-test', 'test', 'quiz-element'].includes(formState.lessonType);
  const effectiveStartCode = formState.startCode || (isTest ? '6767' : '');
  const effectiveTeacherCode = formState.teacherCode || (isTest ? '7676' : '6767');
  const effectivePassThreshold = formState.passThreshold || (isTest ? '75%' : '');
  const effectiveTestMode = Boolean(formState.testMode);

  let updatedContent = content;
  if (content && typeof content === 'object' && !Array.isArray(content)) {
    updatedContent = { ...content };
    if (isTest) {
      updatedContent.startCode = effectiveStartCode;
      updatedContent.teacherCode = effectiveTeacherCode;
      updatedContent.testMode = effectiveTestMode;
      if (effectivePassThreshold) {
        updatedContent.passThreshold = effectivePassThreshold;
      }
      if ('start-code' in updatedContent) updatedContent['start-code'] = effectiveStartCode;
      if ('start_code' in updatedContent) updatedContent['start_code'] = effectiveStartCode;
      if ('teacher-code' in updatedContent) updatedContent['teacher-code'] = effectiveTeacherCode;
      if ('teacher_code' in updatedContent) updatedContent['teacher_code'] = effectiveTeacherCode;
      if ('test-mode' in updatedContent) updatedContent['test-mode'] = effectiveTestMode;
      if ('test_mode' in updatedContent) updatedContent['test_mode'] = effectiveTestMode;
      if ('pass-threshold' in updatedContent) updatedContent['pass-threshold'] = effectivePassThreshold;
      if ('pass_threshold' in updatedContent) updatedContent['pass_threshold'] = effectivePassThreshold;
    }
  }

  const customConfig = {
    ...formState.customConfig,
    testMode: effectiveTestMode,
    ...(effectiveStartCode ? { startCode: effectiveStartCode } : {}),
    ...(effectivePassThreshold ? { passThreshold: effectivePassThreshold } : {})
  };

  return {
    id: idOverride || undefined,
    title: formState.title,
    language: formState.language,
    level: formState.level,
    tags: formState.selectedTags,
    videoUrl: formState.videoUrl,
    isVideoLesson: formState.isVideoLesson,
    notForBlog: formState.notForBlog,
    lessonType: formState.lessonType,
    seo: formState.seo,
    html: formState.html,
    teacherCode: effectiveTeacherCode,
    startCode: effectiveStartCode,
    passThreshold: effectivePassThreshold,
    customConfig,
    content: updatedContent,
    imageUrl: formState.imagePreview || existingData?.imageUrl,
    audioFileUrl: existingData?.audioFileUrl,
    created: existingData?.created || new Date().toISOString(),
    updated: new Date().toISOString()
  };
};

export const generateFormData = (
  lesson: LessonObjectData,
  htmlCompiled: string,
  imageFile?: File | null,
  audioFile?: File | null
): FormData => {
  const formData = new FormData();
  
  formData.append('title', lesson.title);
  formData.append('language', lesson.language);
  formData.append('level', lesson.level);
  lesson.tags.forEach(tag => formData.append('tags', tag));
  formData.append('videoUrl', lesson.videoUrl);
  formData.append('isVideoLesson', String(lesson.isVideoLesson));
  formData.append('notForBlog', String(!!lesson.notForBlog));
  formData.append('lessonType', lesson.lessonType);
  formData.append('seo', lesson.seo);
  formData.append('html', lesson.html);
  formData.append('teacherCode', lesson.teacherCode);
  formData.append('customConfig', JSON.stringify(lesson.customConfig));
  formData.append('content', JSON.stringify(lesson.content));
  formData.append('htmlCompiled', htmlCompiled);

  if (imageFile) {
    formData.append('image', imageFile);
  }
  if (audioFile) {
    formData.append('audioFile', audioFile);
  }

  return formData;
};

export const downloadFile = (
  content: string,
  filename: string,
  mimeType: string
): void => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const downloadLessonAsJSON = (lesson: LessonObjectData): void => {
  const jsonContent = JSON.stringify(lesson, null, 2);
  const filename = formatFilename(lesson.title, 'json');
  downloadFile(jsonContent, filename, 'application/json');
};

export const downloadLessonAsHTML = (
  lesson: LessonObjectData,
  htmlContent: string
): void => {
  const filename = formatFilename(lesson.title, 'html');
  downloadFile(htmlContent, filename, 'text/html');
};

export const generateEmbedCode = (
  lesson: LessonObjectData,
  html: string
): string | null => {
  try {
    return compileLessonHtml(lesson, html);
  } catch (e) {
    console.error('Failed to generate embed code:', e);
    return null;
  }
};

export const syncSEOFromContent = (
  jsonContent: string,
  currentSEO: string
): string | null => {
  if (currentSEO.trim()) return null;
  
  const detected = parseContent(jsonContent);
  if (detected.format !== 'json') return null;
  
  const parsed = detected.value as any;
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && parsed.seo_intro) {
    return parsed.seo_intro;
  }
  
  return null;
};

export const syncTitleFromContent = (
  jsonContent: string
): string | null => {
  const detected = parseContent(jsonContent);
  if (detected.format !== 'json') return null;
  
  const parsed = detected.value as any;
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && parsed.title) {
    return parsed.title;
  }
  
  return null;
};

export const clearPreviewStorage = (): void => {
  if (typeof window === 'undefined') return;
  try {
    if (window.localStorage) {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        // Never remove PocketBase auth tokens or core admin credentials
        if (key.startsWith('pocketbase') || key.startsWith('pb_')) continue;

        if (
          key.startsWith('lesson-progress-') ||
          key.startsWith('tj-') ||
          key.startsWith('tj_') ||
          key.startsWith('quiz-') ||
          key.startsWith('test-')
        ) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    }
  } catch (e) {
    console.warn('Could not clear preview localStorage:', e);
  }

  try {
    if (window.sessionStorage) {
      sessionStorage.clear();
    }
  } catch (e) {
    console.warn('Could not clear preview sessionStorage:', e);
  }
};