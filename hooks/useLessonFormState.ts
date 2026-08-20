import { useState, useEffect } from 'react';
import { LessonFormState, LessonFormActions, MediaState, MetadataState, UIState } from '../types/lessonEditor';

const initialMediaState: MediaState = {
  imageFile: null,
  audioFile: null,
  audioPreviewUrl: null,
  imagePreview: null
};

const isTestLessonType = (type: string) => ['tj-test', 'test', 'quiz-element'].includes(type);

const initialMetadataState: MetadataState = {
  seo: '',
  html: '',
  teacherCode: '',
  startCode: '',
  passThreshold: '75%',
  customConfig: {},
  testMode: false
};

const initialUIState: UIState = {
  showVisualEditor: false,
  validationMessage: null,
  error: null
};

export const useLessonFormState = (lesson: any, lessonId: string | null, initialData?: any) => {
  const [title, setTitle] = useState('');
  const [language, setLanguage] = useState('');
  const [level, setLevel] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState('');
  const [isVideoLesson, setIsVideoLesson] = useState(false);
  const [notForBlog, setNotForBlog] = useState(false);
  const [lessonType, setLessonTypeState] = useState('');
  
  const [media, setMediaState] = useState<MediaState>(initialMediaState);
  const [metadata, setMetadataState] = useState<MetadataState>(initialMetadataState);
  const [ui, setUIState] = useState<UIState>(initialUIState);

  const setMedia = (updates: Partial<MediaState>) => {
    setMediaState(prev => ({ ...prev, ...updates }));
  };

  const setMetadata = (updates: Partial<MetadataState>) => {
    setMetadataState(prev => ({ ...prev, ...updates }));
  };

  const setUI = (updates: Partial<UIState>) => {
    setUIState(prev => ({ ...prev, ...updates }));
  };

  const setLessonType = (newType: string) => {
    setLessonTypeState(newType);
    if (isTestLessonType(newType)) {
      setMetadataState(prev => ({
        ...prev,
        startCode: prev.startCode || '6767',
        teacherCode: (!prev.teacherCode || prev.teacherCode === '6767') ? '7676' : prev.teacherCode,
        passThreshold: prev.passThreshold || '75%'
      }));
    } else {
      setMetadataState(prev => ({
        ...prev,
        teacherCode: prev.teacherCode === '7676' ? '6767' : prev.teacherCode
      }));
    }
  };

  useEffect(() => {
    if (lesson) {
      const type = lesson.lessonType || 'worksheet';
      const isTest = isTestLessonType(type);
      setTitle(lesson.title || '');
      setLanguage(lesson.language);
      setLevel(lesson.level);
      setSelectedTags(lesson.tags || []);
      setVideoUrl(lesson.videoUrl || '');
      setIsVideoLesson(lesson.isVideoLesson || false);
      setNotForBlog(lesson.notForBlog || false);
      setLessonTypeState(type);
      
      setMetadata({
        seo: lesson.seo || '',
        html: lesson.html || '',
        teacherCode: lesson.teacherCode || (isTest ? '7676' : '6767'),
        startCode: lesson.startCode || lesson.customConfig?.startCode || (isTest ? '6767' : ''),
        passThreshold: lesson.passThreshold || lesson.customConfig?.passThreshold || (isTest ? '75%' : ''),
        customConfig: lesson.customConfig || {},
        testMode: (lesson.customConfig?.testMode) || false
      });
      
      setMedia({
        imagePreview: lesson.imageUrl || null,
        imageFile: null,
        audioFile: null,
        audioPreviewUrl: null
      });
    }
  }, [lesson]);

  useEffect(() => {
    if (!lessonId) {
      if (initialData) {
        try {
          const type = initialData.lessonType || '';
          const isTest = isTestLessonType(type);
          setTitle(initialData.title || '');
          setLessonTypeState(type);
          setNotForBlog(initialData.notForBlog || false);
          
          setMetadata({
            seo: initialData.seo || '',
            html: initialData.html || '',
            teacherCode: initialData.teacherCode || (isTest ? '7676' : '6767'),
            startCode: initialData.startCode || initialData.customConfig?.startCode || (isTest ? '6767' : ''),
            passThreshold: initialData.passThreshold || initialData.customConfig?.passThreshold || (isTest ? '75%' : ''),
            customConfig: initialData.customConfig || {},
            testMode: (initialData.customConfig?.testMode) || false
          });
          
          setSelectedTags([]);
          setVideoUrl('');
          setIsVideoLesson(false);
          setMedia(initialMediaState);
        } catch (e) {
          console.error("Failed to parse init data in useLessonFormState", e);
        }
      } else {
        setTitle('');
        setLessonTypeState('');
        setLanguage('');
        setLevel('');
        setSelectedTags([]);
        setVideoUrl('');
        setIsVideoLesson(false);
        setNotForBlog(false);
        setMetadata(initialMetadataState);
        setMedia(initialMediaState);
      }
    }
  }, [lessonId, initialData]);

  const resetForm = () => {
    setTitle('');
    setLanguage('');
    setLevel('');
    setSelectedTags([]);
    setVideoUrl('');
    setIsVideoLesson(false);
    setNotForBlog(false);
    setLessonTypeState('');
    setMetadata(initialMetadataState);
    setMedia(initialMediaState);
    setUI(initialUIState);
  };

  const formState: LessonFormState = {
    title,
    language,
    level,
    selectedTags,
    videoUrl,
    isVideoLesson,
    notForBlog,
    lessonType,
    media,
    metadata,
    ui
  };

  const actions: LessonFormActions = {
    setTitle,
    setLanguage,
    setLevel,
    setSelectedTags,
    setVideoUrl,
    setIsVideoLesson,
    setNotForBlog,
    setLessonType,
    setMedia,
    setMetadata,
    setUI
  };

  return {
    formState,
    actions,
    resetForm
  };
};