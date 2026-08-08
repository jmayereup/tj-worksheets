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
    teacherCode: formState.teacherCode,
    customConfig: { ...formState.customConfig, testMode: formState.testMode },
    content,
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