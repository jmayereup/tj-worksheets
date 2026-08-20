import { WorksheetsLessonTypeOptions } from '../pocketbase-types';

export const DEFAULT_TEACHER_CODE = '6767';

export const TEXTAREA_HEIGHT = 'h-[500px]';

export const GEMINI_URLS: Record<string, string> = {
  'worksheet': 'https://gemini.google.com/gem/03def3a81ea5',
  'pronunciation': 'https://gemini.google.com/gem/d45e00c6dcb5',
  'grammar-hearts': 'https://gemini.google.com/gem/d8664c27f003',
  'focused-reading': 'https://gemini.google.com/gem/35b48fa98b7b',
  'speed-review': 'https://gemini.google.com/gem/5a7412981b90',
  'quiz-element': 'https://gemini.google.com/gem/4bbfe190f849',
  'word-blaster': 'https://gemini.google.com/gem/e5a67e2602df',
  'information-gap': 'https://gemini.google.com/gem/c4ce1f63dfd9',
  'listening': 'https://gemini.google.com/gem/a282ff7b4b26',
  'lbl-reader': 'https://gemini.google.com/gem/9dfd58f9fc59',
  'chapter-book': 'https://gemini.google.com/gem/209dda1b768d',
  'tj-test': 'https://gemini.google.com/gem/1GR1C-bhcrWfUS79b0SA1Llna4NiWaCef?usp=sharing',
  'test': 'https://gemini.google.com/gem/1GR1C-bhcrWfUS79b0SA1Llna4NiWaCef?usp=sharing',
  'default': 'https://gemini.google.com/gem/03def3a81ea5'
};

export const FILE_UPLOAD_CONSTRAINTS = {
  image: {
    maxSize: 5 * 1024 * 1024, // 5MB
    acceptedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  },
  audio: {
    maxSize: 10 * 1024 * 1024, // 10MB
    acceptedTypes: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a']
  }
};

export const VALIDATION_MESSAGES = {
  EMPTY_CONTENT: 'Content is empty.',
  INVALID_JSON: 'Invalid JSON syntax.',
  INVALID_CUSTOM_ELEMENT: 'Invalid custom element. Must contain a hyphen (e.g. "my-element").',
  MULTIPLE_ROOT_ELEMENTS: 'HTML must contain exactly one root element.',
  MISSING_TAGS: 'Please select at least one tag.',
  UNSUPPORTED_LANGUAGE: 'Online saving is disabled: this language is not an officially supported platform language.',
  CLIPBOARD_PERMISSION_DENIED: 'Failed to read from clipboard. Please ensure you have granted permission.',
  CLIPBOARD_NO_IMAGE: 'No image found in clipboard.',
  INVALID_CONTENT_FORMAT: 'Invalid content. Must be JSON or a custom HTML element.',
  FAILED_TO_GENERATE_JSON: 'Failed to generate JSON for download.',
  FAILED_TO_GENERATE_EMBED: 'Failed to generate embed code.',
  FAILED_TO_SAVE_LESSON: 'Failed to save lesson.',
  CANNOT_PREVIEW_INVALID: 'Cannot preview: Invalid JSON content.'
};

export const getGeminiUrl = (lessonType: string): string => {
  return GEMINI_URLS[lessonType] || GEMINI_URLS['default'];
};

export const formatFilename = (title: string, extension: string): string => {
  const sanitized = title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'worksheet';
  return `${sanitized}.${extension}`;
};