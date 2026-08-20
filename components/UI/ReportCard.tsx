import React, { useState } from 'react';
import { ReportData } from '../../types';
import { Button } from './Button';
import { CheckCircle, AlertCircle, Loader, X } from 'lucide-react';
import { useTeacherSubmission } from '../../hooks/useTeacherSubmission';

interface Props {
  data: ReportData;
  onClose: () => void;
  onReset?: () => void;
  teacherCode?: string;
}

const ScorePill = ({ label, score, total }: { label: string, score: number, total: number }) => (
  <div className="bg-white border border-gray-200 rounded p-2 flex justify-between items-center shadow-sm">
    <span className="text-xs text-gray-600 font-medium truncate mr-2">{label}</span>
    <span className="text-sm font-bold text-green-600">
      {score}/{total}
    </span>
  </div>
);

export const ReportCard: React.FC<Props> = ({ data, onClose, onReset, teacherCode = '6767' }) => {
  const {
    isSubmitting,
    submissionStatus,
    submissionMessage,
    submitScore
  } = useTeacherSubmission();

  const [enteredCode, setEnteredCode] = useState('');

  const handleSubmitScore = async () => {
    if (isSubmitting) return;
    const targetCode = (teacherCode || '6767').trim();
    if (enteredCode.trim() !== targetCode) {
      alert('Incorrect Teacher Code. Please take a screenshot of your report card and show it to your teacher.');
      return;
    }

    const writtenAnswers = data.writtenResponses && data.writtenResponses.length > 0
      ? data.writtenResponses
          .map((res, i) => `Q${i + 1}: ${res.question}\nA: ${res.answer}`)
          .join('\n\n')
      : '';

    await submitScore({
      nickname: data.nickname,
      homeroom: data.homeroom,
      studentId: data.studentId,
      quizName: data.title,
      score: data.totalScore,
      total: data.maxScore,
      writtenAnswers
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in overflow-y-auto">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl border-t-8 border-green-600 my-auto relative transform animate-bounce-in">
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute -top-12 right-0 bg-white/20 hover:bg-white/40 p-2 rounded-full text-white transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="p-6">
          <div className="flex justify-between items-start mb-4 pb-3 border-b border-gray-100">
            <div className="pr-4">
              <h2 className="text-2xl font-black text-green-900 leading-tight">Report Card</h2>
              <div className="text-xs text-gray-400 mt-1 uppercase tracking-widest font-bold">{data.title}</div>
            </div>
            <div className="text-right whitespace-nowrap">
              <div className="text-4xl font-black text-green-600 leading-none">
                {data.totalScore}<span className="text-xl text-gray-300">/{data.maxScore}</span>
              </div>
              <div className="text-[10px] text-gray-400 uppercase tracking-widest font-black mt-2">Final Score</div>
            </div>
          </div>

          <div className="bg-green-50 rounded-xl p-4 mb-4 grid grid-cols-2 gap-y-3 gap-x-4 border border-green-100">
            <div>
              <div className="text-[10px] text-green-600 uppercase font-black tracking-widest">Student</div>
              <div className="font-bold text-gray-800 truncate">{data.nickname || 'Anonymous'}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-green-600 uppercase font-black tracking-widest">Student ID</div>
              <div className="font-bold text-gray-800">{data.studentId || '-'}</div>
            </div>
            <div>
              <div className="text-[10px] text-green-600 uppercase font-black tracking-widest">Homeroom</div>
              <div className="font-bold text-gray-800">{data.homeroom || '-'}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-green-600 uppercase font-black tracking-widest">Completed At</div>
              <div className="font-bold text-gray-800 text-xs">{data.finishTime}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-4">
            {data.pills.map((pill, idx) => (
              <ScorePill key={idx} label={pill.label} score={pill.score} total={pill.total} />
            ))}
          </div>

          {data.writtenResponses && data.writtenResponses.length > 0 && (
            <div className="border-t border-gray-100 pt-3 mb-4">
              <h3 className="font-black text-gray-400 text-[10px] uppercase mb-3 tracking-widest">Written Responses</h3>
              <div className="space-y-3 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                {data.writtenResponses.map((res, i) => (
                  <div key={i} className="text-sm">
                    <p className="font-bold text-green-800 text-xs mb-1 leading-tight">{i + 1}. {res.question}</p>
                    <p className="text-gray-600 text-xs pl-3 border-l-2 border-green-200 italic bg-gray-50 p-2 rounded-r leading-relaxed">
                      {res.answer || 'No answer provided'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6">
            <h3 className="font-bold text-gray-800 text-sm mb-3">Submit to Teacher</h3>
            
            {submissionStatus === 'success' ? (
              <div className="flex items-center gap-2 text-green-700 bg-green-50 p-3 rounded-lg border border-green-200 animate-fade-in">
                <CheckCircle className="w-5 h-5 shrink-0" />
                <p className="text-sm font-bold">{submissionMessage}</p>
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Enter Teacher Code"
                  value={enteredCode}
                  onChange={(e) => setEnteredCode(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-400 focus:outline-none text-sm transition-all"
                />

                {submissionStatus === 'error' && (
                  <div className="flex items-start gap-2 text-red-700 text-xs bg-red-50 p-3 rounded-lg border border-red-100">
                     <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <p className="font-medium">{submissionMessage}</p>
                  </div>
                )}

                <Button
                  onClick={handleSubmitScore}
                  disabled={isSubmitting || !enteredCode.trim()}
                  className="w-full py-4 font-black shadow-lg"
                >
                  {isSubmitting ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin mr-2" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Results'
                  )}
                </Button>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-[11px] text-gray-400 italic text-center leading-snug font-medium">
              Take a screenshot as backup before closing.
            </p>
            <Button variant="secondary" onClick={onClose} className="w-full font-bold">
              Return to Lesson
            </Button>
            {onReset && (
              <button
                type="button"
                onClick={onReset}
                className="w-full py-2.5 px-4 text-xs font-bold text-red-600 hover:text-red-700 bg-red-50/60 hover:bg-red-100/80 border border-red-200 rounded-xl transition-all flex items-center justify-center gap-1.5"
              >
                🔄 Clear Cache & Start Again
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
