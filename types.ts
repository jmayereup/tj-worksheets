import React from 'react';
import { 
  WorksheetsLanguageOptions, 
  WorksheetsLevelOptions, 
  WorksheetsTagsOptions, 
  WorksheetsLessonTypeOptions 
} from './pocketbase-types';

export interface VocabWord {
  word: string;
  definition: string;
  sourceLessonId: string;
}

export interface WordBlasterContent {
  words: VocabWord[];
}

export interface VocabularyItem {
  label: string;
  answer: string; // references a definition ID
}

export interface Definition {
  id: string;
  text: string;
}

export interface VocabularyActivity {
  items: VocabularyItem[];
  definitions: Definition[];
}

export interface FillInBlankItem {
  before: string;
  after: string;
  answer: string;
}

export interface ComprehensionQuestion {
  text: string;
  answer: string; // "true" or "false" string
}

export interface ComprehensionActivity {
  questions: ComprehensionQuestion[];
}

export interface ScrambledItem {
  text: string; // The hint/display text (sometimes empty in this data model, derived from answer)
  answer: string; // The correct full sentence
}

export interface WritingQuestion {
  text: string;
}

export interface WritingActivity {
  questions: WritingQuestion[];
  examples: string; // HTML string
}

export interface CriticalThinkingActivity {
  title?: string;
  instructions: string[];
}

export interface InformationGapQuestion {
  asker_id: number;
  question: string;
  options: string[];
  correct_answer: string;
}

export interface InformationGapBlock {
  text_holder_id: number;
  text: string;
  questions: InformationGapQuestion[];
}

export interface InformationGapActivity {
  topic: string;
  scenario_description: string;
  blocks: InformationGapBlock[];
}

export interface InformationGapContent {
  topic?: string; // Optional for backward compatibility
  scenario_description?: string; // Optional for backward compatibility
  player_count: number;
  blocks?: InformationGapBlock[]; // Optional for backward compatibility
  activities?: InformationGapActivity[];
  seo_intro?: string; // Added for SEO automation
  references?: Record<string, string>;
}

export interface FocusedReaderQuestion {
  question: string;
  type: 'True/False' | 'Multiple Choice' | string;
  options: string[];
  answer: string;
}

export interface FocusedReaderPart {
  part_number: number;
  text: string;
  vocabulary_explanations: Record<string, string>;
  questions: FocusedReaderQuestion[];
}

export interface FocusedReaderContent {
  title: string;
  seo_intro: string;
  parts: FocusedReaderPart[];
  activities?: {
    vocabulary?: VocabularyActivity;
    fillInTheBlanks?: FillInBlankItem[];
    comprehension?: ComprehensionActivity;
    scrambled?: ScrambledItem[];
    writtenExpression?: WritingActivity;
  };
  criticalThinking?: CriticalThinkingActivity;
  references?: Record<string, string>;
}

export interface StandardLessonContent {
  title: string;
  readingText: string;
  seo_intro?: string; // Added for SEO automation
  activities: {
    vocabulary: VocabularyActivity;
    fillInTheBlanks: FillInBlankItem[];
    comprehension: ComprehensionActivity;
    scrambled: ScrambledItem[];
    writtenExpression: WritingActivity;
    criticalThinking?: CriticalThinkingActivity;
  };
  references?: Record<string, string>;
}

export interface ChapterQuizOption {
  text: string;
  value: 'correct' | 'wrong';
}

export interface ChapterQuizQuestion {
  question: string;
  options: ChapterQuizOption[];
}

export interface Chapter {
  id: string;
  title: string;
  content: string[];
  translation: string;
  translationLanguage?: string;
  quiz: ChapterQuizQuestion[];
}

export interface ChapterBookContent {
  title: string;
  language: string;
  translationLanguage?: string;
  subtitle?: string;
  chapters: Chapter[];
}

export interface LBLReaderItem {
  original: string;
  fullTranslation: string;
  translationOptions: string[];
  correctTranslationIndex: number;
  highlightIndex?: number;
}

export interface GrammarHeartsQuestion {
  type: 'multiple-choice' | 'fill-in-the-blank' | 'scramble';
  question: string;
  options?: string[];
  correctIndex?: number;
  answer?: string;
}

export interface GrammarHeartsContent {
  title: string;
  hearts?: number;
  roundSize?: number;
  hint?: { summary: string; content: string };
  questions: GrammarHeartsQuestion[];
}

export interface ListeningVocabItem {
  word: string;
  definition: string;
  example?: string;
}

export interface ListeningQuestion {
  question: string;
  options: string[];
  correct: string;
}

export interface ListeningContent {
  title: string;
  lang?: string;
  intro?: { text: string };
  vocab: ListeningVocabItem[];
  listening: {
    transcript: string;
    questions: ListeningQuestion[];
  };
}

export interface SpeedReviewQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

export interface SpeedReviewContent {
  title: string;
  questions: SpeedReviewQuestion[];
}

export interface PronunciationContent {
  title: string;
  phrases: string[];
}

export type LessonContent =
  | StandardLessonContent
  | InformationGapContent
  | InformationGapActivity[]
  | FocusedReaderContent
  | WordBlasterContent
  | ChapterBookContent
  | LBLReaderItem[]
  | GrammarHeartsContent
  | ListeningContent
  | SpeedReviewContent
  | PronunciationContent
  | string;

// Define extended language list manually
export const POCKETBASE_SUPPORTED_LANGUAGES = ['English', 'Spanish', 'French', 'Thai', 'German'] as const;

export const LANGUAGE_OPTIONS = [
  ...POCKETBASE_SUPPORTED_LANGUAGES,
  'Arabic',
  'Chinese',
  'Danish',
  'Dutch',
  'Finnish',
  'Greek',
  'Hindi',
  'Indonesian',
  'Italian',
  'Japanese',
  'Korean',
  'Norwegian',
  'Polish',
  'Portuguese',
  'Russian',
  'Swedish',
  'Turkish',
  'Vietnamese'
];

export const LEVEL_OPTIONS = Object.values(WorksheetsLevelOptions);
export const TAG_OPTIONS = Object.values(WorksheetsTagsOptions);
export const LESSON_TYPE_OPTIONS = Object.values(WorksheetsLessonTypeOptions);

export const formatLessonType = (type?: string): string => {
  if (!type) return '';
  if (type === 'quiz-element') return 'Quiz (Legacy)';
  if (type === 'tj-test' || type === 'test') return 'Test';
  return type.charAt(0).toUpperCase() + type.slice(1).replace(/-/g, ' ');
};

export interface LessonRecord {
  id: string;
  collectionId: string;
  collectionName: string;
  created: string;
  updated: string;
  language: WorksheetsLanguageOptions;
  level: WorksheetsLevelOptions;
  image: string;
  videoUrl: string;
  isVideoLesson: boolean;
  notForBlog?: boolean;
  lessonType: WorksheetsLessonTypeOptions;
  title?: string;
  tags?: WorksheetsTagsOptions[];
  content: LessonContent | string;
  audioFile?: string;
  creatorId?: string;
  seo?: string;
  description?: string;
  html?: string;
  htmlCompiled?: string;
  teacherCode?: string;
  customConfig?: any;
}

export interface ParsedLesson extends Omit<LessonRecord, 'content'> {
  content: LessonContent;
  imageUrl?: string;
  optimizedImageUrl?: string;
  audioFileUrl?: string;
}

// State for User Answers
export interface UserAnswers {
  vocabulary: Record<string, string>; // index -> definition letter (a, b, c)
  fillBlanks: Record<number, string>; // index -> word
  comprehension: Record<number, string>; // index -> "true"/"false"
  scrambled: Record<number, string>; // index -> user formed sentence
  writing: Record<number, string>; // index -> user text
  infoGap?: Record<number, { score: number, total: number }>; // activityIndex -> result
  focusedReader?: Record<number, Record<number, string>>; // partIndex -> questionIndex -> answer
  focusedReaderPage?: number; // current part/page index
  activeReadingLanguage?: 'original' | 'translation';
  completionStates?: Record<string, boolean>; // sectionKey -> boolean
}

export interface CompletionStates {
  vocabularyChecked: boolean;
  fillBlanksChecked: boolean;
  comprehensionCompleted: boolean;
  scrambledCompleted: boolean;
}

export interface ReportScorePill {
  label: string;
  score: number;
  total: number;
}

export interface ReportWrittenResponse {
  question: string;
  answer: string;
}

export interface ReportData {
  title: string;
  nickname: string;
  studentId: string;
  homeroom: string;
  finishTime: string;
  totalScore: number;
  maxScore: number;
  pills: ReportScorePill[];
  writtenResponses?: ReportWrittenResponse[];
}

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'tj-pocketbase-worksheet': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      'tj-chapter-book': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      'lbl-reader': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      'grammar-hearts': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      'tj-grammar-hearts': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      'tj-info-gap': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      'tj-listening': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      'tj-speed-review': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      'tj-pronunciation': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      'tj-quiz-element': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      'tj-test': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    }
  }
}
