import { DetectedContent } from '../utils/contentFormat';
import { 
  WorksheetsLanguageOptions, 
  WorksheetsLevelOptions, 
  WorksheetsTagsOptions, 
  WorksheetsLessonTypeOptions 
} from '../pocketbase-types';

export interface MediaState {
  imageFile: File | null;
  audioFile: File | null;
  audioPreviewUrl: string | null;
  imagePreview: string | null;
}

export interface MetadataState {
  seo: string;
  html: string;
  teacherCode: string;
  startCode: string;
  passThreshold: string;
  submissionUrl?: string;
  customConfig: Record<string, any>;
  testMode: boolean;
}

export interface UIState {
  showVisualEditor: boolean;
  validationMessage: { ok: boolean; text: string } | null;
  error: string | null;
}

export interface LessonFormState {
  title: string;
  language: string;
  level: string;
  selectedTags: string[];
  videoUrl: string;
  isVideoLesson: boolean;
  notForBlog: boolean;
  lessonType: string;
  media: MediaState;
  metadata: MetadataState;
  ui: UIState;
}

export interface LessonFormActions {
  setTitle: (title: string) => void;
  setLanguage: (language: string) => void;
  setLevel: (level: string) => void;
  setSelectedTags: (tags: string[]) => void;
  setVideoUrl: (url: string) => void;
  setIsVideoLesson: (isVideo: boolean) => void;
  setNotForBlog: (notForBlog: boolean) => void;
  setLessonType: (type: string) => void;
  setMedia: (media: Partial<MediaState>) => void;
  setMetadata: (metadata: Partial<MetadataState>) => void;
  setUI: (ui: Partial<UIState>) => void;
}

export interface ParsedContentResult {
  detected: DetectedContent;
  parsedContent: any;
  isValid: boolean;
  isJson: boolean;
  error: string | null;
}

export interface LessonObjectData {
  id?: string;
  title: string;
  language: string;
  level: string;
  tags: string[];
  videoUrl: string;
  isVideoLesson: boolean;
  notForBlog?: boolean;
  lessonType: string;
  seo: string;
  html: string;
  teacherCode: string;
  startCode?: string;
  passThreshold?: string;
  submissionUrl?: string;
  customConfig: Record<string, any>;
  content: any;
  imageUrl?: string;
  audioFileUrl?: string;
  created?: string;
  updated?: string;
  isStandalone?: boolean;
  creatorId?: string;
}

export interface FileUploadConstraints {
  image: {
    maxSize: number;
    acceptedTypes: string[];
  };
  audio: {
    maxSize: number;
    acceptedTypes: string[];
  };
}

export interface ValidationMessage {
  ok: boolean;
  text: string;
}

export interface FormValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface ContentValidationResult {
  isValid: boolean;
  format: 'json' | 'html' | 'invalid';
  error?: string;
  tagName?: string;
}