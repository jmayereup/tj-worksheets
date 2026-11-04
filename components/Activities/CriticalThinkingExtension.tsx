import React from 'react';
import { Lightbulb } from 'lucide-react';
import { CriticalThinkingActivity } from '../../types';

interface Props {
  data: CriticalThinkingActivity;
  className?: string;
  savedAnswers?: Record<number, string>;
  onChange?: (answers: Record<number, string>) => void;
}

export const CriticalThinkingExtension: React.FC<Props> = ({
  data,
  className = '',
  savedAnswers = {},
  onChange
}) => {
  if (!data || !data.instructions || data.instructions.length === 0) return null;

  return (
    <section className={`bg-amber-50 p-4 sm:p-6 rounded-2xl border border-amber-200 mb-4 animate-fade-in ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-amber-100 p-2 rounded-xl">
          <Lightbulb className="w-6 h-6 text-amber-600" />
        </div>
        <h2 className="text-xl font-black text-amber-900 uppercase tracking-tight">
          {data.title || 'Critical Thinking & Discussion'}
        </h2>
      </div>

      <div className="space-y-6">
        {data.instructions.map((instruction, index) => (
          <div key={index} className="space-y-3">
            <div className="flex gap-4 items-start">
              <span className="shrink-0 w-8 h-8 bg-white border-2 border-amber-200 rounded-full flex items-center justify-center font-bold text-amber-700 shadow-sm text-sm">
                {index + 1}
              </span>
              <p className="text-amber-950 font-medium text-base sm:text-lg leading-relaxed pt-0.5">
                {instruction}
              </p>
            </div>
            {onChange && (
              <div className="pl-0 sm:pl-12">
                <textarea
                  className="w-full p-4 border border-amber-200 bg-white rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-transparent outline-none transition-all min-h-[100px] text-base sm:text-lg text-gray-800 placeholder-gray-400 shadow-sm"
                  placeholder="Write your answer here..."
                  value={savedAnswers[index] || ''}
                  onChange={(e) => {
                    const newAnswers = { ...savedAnswers, [index]: e.target.value };
                    onChange(newAnswers);
                  }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
      
      <div className="mt-6 pt-4 border-t border-amber-200/50 flex items-center gap-2 text-amber-700/80 text-sm font-medium italic">
        <Lightbulb className="w-4 h-4 shrink-0" />
        <span>
          {onChange 
            ? 'Write your responses in the boxes above. They will be included in your report card.' 
            : 'Use these questions for personal reflection or group discussion.'}
        </span>
      </div>
    </section>
  );
};

