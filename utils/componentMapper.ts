export interface ComponentConfig {
  tag: string;
  script: string;
}

export const getComponentConfig = (lessonType: string): ComponentConfig | null => {
  switch (lessonType) {
    case 'lbl-reader':
      return { tag: 'lbl-reader', script: 'https://scripts.teacherjake.com/tj-reader.js' };
    case 'grammar-hearts':
      return { tag: 'tj-grammar-hearts', script: 'https://scripts.teacherjake.com/tj-grammar-hearts.js' };

    case 'listening':
      return { tag: 'tj-listening', script: 'https://scripts.teacherjake.com/tj-listening.js' };
    case 'speed-review':
      return { tag: 'tj-speed-review', script: 'https://scripts.teacherjake.com/tj-speed-review.js' };
    case 'chapter-book':
      return { tag: 'tj-chapter-book', script: 'https://scripts.teacherjake.com/tj-chapter-book.js' };
    case 'pronunciation':
      return { tag: 'tj-pronunciation', script: 'https://scripts.teacherjake.com/tj-pronunciation.js' };
    case 'quiz-element':
      return { tag: 'tj-quiz-element', script: 'https://scripts.teacherjake.com/tj-quiz-element.js' };
    case 'tj-test':
    case 'test':
      return { tag: 'tj-test', script: 'https://scripts.teacherjake.com/tj-test.js' };
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
