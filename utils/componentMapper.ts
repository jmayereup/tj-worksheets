export interface ComponentConfig {
  tag: string;
  script: string;
}

export const getComponentConfig = (
  lessonType: string,
  options?: { forExport?: boolean }
): ComponentConfig | null => {
  const isExport = options?.forExport ?? false;
  const baseUrl = (!isExport && typeof import.meta !== 'undefined' && import.meta.env?.DEV)
    ? (import.meta.env.VITE_SCRIPTS_BASE_URL || '/@tj-components')
    : (import.meta.env?.VITE_SCRIPTS_BASE_URL || 'https://scripts.teacherjake.com');

  const cleanBaseUrl = baseUrl.replace(/\/$/, '');

  switch (lessonType) {
    case 'lbl-reader':
      return { tag: 'lbl-reader', script: `${cleanBaseUrl}/tj-reader.js` };
    case 'grammar-hearts':
      return { tag: 'tj-grammar-hearts', script: `${cleanBaseUrl}/tj-grammar-hearts.js` };

    case 'listening':
      return { tag: 'tj-listening', script: `${cleanBaseUrl}/tj-listening.js` };
    case 'speed-review':
      return { tag: 'tj-speed-review', script: `${cleanBaseUrl}/tj-speed-review.js` };
    case 'chapter-book':
      return { tag: 'tj-chapter-book', script: `${cleanBaseUrl}/tj-chapter-book.js` };
    case 'pronunciation':
      return { tag: 'tj-pronunciation', script: `${cleanBaseUrl}/tj-pronunciation.js` };
    case 'quiz-element':
      return { tag: 'tj-quiz-element', script: `${cleanBaseUrl}/tj-quiz-element.js` };
    case 'tj-test':
    case 'test':
      return { tag: 'tj-test', script: `${cleanBaseUrl}/tj-test.js` };
    default:
      return null;
  }
};

export const isExternalWebComponent = (lessonType?: string): boolean => {
  if (!lessonType) return false;
  return getComponentConfig(lessonType) !== null;
};

export type LessonComponentSource = 'wc' | 'internal';

export const getLessonComponentSource = (lessonType?: string): LessonComponentSource | null => {
  if (!lessonType) return null;
  return isExternalWebComponent(lessonType) ? 'wc' : 'internal';
};
