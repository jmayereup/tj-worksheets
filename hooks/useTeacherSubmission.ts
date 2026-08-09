import { useState, useCallback } from 'react';
import { fetchTeacherSubmissionUrl } from '../services/pocketbase';

export interface SubmissionPayload {
  nickname: string;
  homeroom: string;
  studentId: string;
  quizName: string;
  score: number;
  total: number;
  writtenAnswers?: string;
}

export type SubmissionStatus = 'idle' | 'success' | 'error';

export const useTeacherSubmission = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<SubmissionStatus>('idle');
  const [submissionMessage, setSubmissionMessage] = useState('');

  const submitScore = useCallback(async (payload: SubmissionPayload) => {
    const submissionUrl = await fetchTeacherSubmissionUrl();
    
    if (!submissionUrl) {
      setSubmissionStatus('error');
      setSubmissionMessage('Teacher submission is not configured for this lesson.');
      return { success: false, message: 'Teacher submission is not configured for this lesson.' };
    }

    setIsSubmitting(true);
    setSubmissionStatus('idle');
    setSubmissionMessage('');

    try {
      console.log('Sending score submission payload:', payload);
      await fetch(submissionUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(payload)
      });
      
      setSubmissionStatus('success');
      setSubmissionMessage('Score sent to teacher! (Please take a screenshot as backup.)');
      setIsSubmitting(false);
      return { success: true };
    } catch (error) {
      console.error('Submission failed:', error);
      setSubmissionStatus('error');
      setSubmissionMessage('Failed to submit score. Please check your connection or take a screenshot.');
      setIsSubmitting(false);
      return { success: false, message: 'Network error or submission failed.' };
    }
  }, []);

  return {
    isSubmitting,
    submissionStatus,
    submissionMessage,
    submitScore,
    setSubmissionStatus
  };
};
