import { useMemo } from 'react';
import { 
  FocusedReaderContent, 
  UserAnswers, 
  ReportData, 
  ReportScorePill 
} from '../types';
import { seededShuffle } from '../utils/textUtils';

export const useFocusedReaderScores = (
  content: FocusedReaderContent, 
  answers: UserAnswers,
  currentPartIndex: number,
  lessonId: string
) => {
  const currentPart = content.parts?.[currentPartIndex];

  const vocabScore = useMemo(() => {
    if (!currentPart) return 0;
    let score = 0;
    const vocabExplanations = currentPart.vocabulary_explanations || {};
    const words = Object.keys(vocabExplanations);
    const wordIndices = words.map((_, i) => i);
    
    // Replicate subsetting logic from Vocabulary.tsx
    const partLessonId = `${lessonId}-part-${currentPartIndex}`;
    const allShuffledIndices = seededShuffle(wordIndices, `${partLessonId}-vocab-subset-seed`);
    const subsetIndices = allShuffledIndices.slice(0, 5);
    
    const vocabAnswers = answers.vocabulary || {};
    subsetIndices.forEach((index) => {
      const answerKey = `vocab_${currentPartIndex}_${index}`;
      const userAnswer = vocabAnswers[answerKey] || '';
      const correctChar = String.fromCharCode(97 + index);
      if (userAnswer.toLowerCase() === correctChar) score++;
    });
    return score;
  }, [currentPart, currentPartIndex, answers.vocabulary, lessonId]);

  const isVocabCompleted = useMemo(() => {
    if (!currentPart) return false;
    const vocabExplanations = currentPart.vocabulary_explanations || {};
    const words = Object.keys(vocabExplanations);
    const wordIndices = words.map((_, i) => i);
    
    // Replicate subsetting logic
    const partLessonId = `${lessonId}-part-${currentPartIndex}`;
    const allShuffledIndices = seededShuffle(wordIndices, `${partLessonId}-vocab-subset-seed`);
    const subsetIndices = allShuffledIndices.slice(0, 5);
    
    if (subsetIndices.length === 0) return false;
    
    const vocabAnswers = answers.vocabulary || {};
    let matchedCount = 0;
    subsetIndices.forEach((index) => {
      if (vocabAnswers[`vocab_${currentPartIndex}_${index}`]) matchedCount++;
    });
    return matchedCount === subsetIndices.length;
  }, [currentPart, currentPartIndex, answers.vocabulary, lessonId]);

  const comprehensionScore = useMemo(() => {
    if (!currentPart) return 0;
    let score = 0;
    const questions = currentPart.questions || [];
    const partAnswers = answers.focusedReader?.[currentPartIndex] || {};
    questions.forEach((q, i) => {
      if (partAnswers[i] === q.answer) score++;
    });
    return score;
  }, [currentPart, currentPartIndex, answers.focusedReader]);

  const isComprehensionCompleted = useMemo(() => {
    if (!currentPart) return false;
    const questions = currentPart.questions || [];
    if (questions.length === 0) return false;
    const partAnswers = answers.focusedReader?.[currentPartIndex] || {};
    return questions.every((_, i) => !!partAnswers[i]);
  }, [currentPart, currentPartIndex, answers.focusedReader]);

  const calculateReportData = (
    lessonTitle: string,
    studentName: string,
    studentId: string,
    homeroom: string
  ): ReportData => {
    const pills: ReportScorePill[] = [];
    let totalScore = 0;
    let maxOverallScore = 0;

    content.parts.forEach((part, pIdx) => {
      // Questions score
      let partScore = 0;
      const partAnswers = answers.focusedReader?.[pIdx] || {};
      part.questions.forEach((q, qIdx) => {
        if (partAnswers[qIdx] === q.answer) {
          partScore++;
        }
      });
      pills.push({
        label: `Part ${part.part_number} Questions`,
        score: partScore,
        total: part.questions.length
      });
      totalScore += partScore;
      maxOverallScore += part.questions.length;
    });

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    return {
      title: lessonTitle || content.title,
      nickname: studentName,
      studentId: studentId,
      homeroom: homeroom,
      finishTime: `${dateStr}, ${timeStr}`,
      totalScore,
      maxScore: maxOverallScore,
      pills,
    };
  };

  return {
    vocabScore,
    vocabTotal: currentPart?.vocabulary_explanations ? Math.min(5, Object.keys(currentPart.vocabulary_explanations).length) : 0,
    isVocabCompleted,
    comprehensionScore,
    comprehensionTotal: currentPart?.questions?.length || 0,
    isComprehensionCompleted,
    calculateReportData
  };
};
