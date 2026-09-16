import React from 'react';
import { Button } from '../UI/Button';

interface SubmissionSectionProps {
  studentName: string;
  setStudentName: (name: string) => void;
  studentId: string;
  setStudentId: (id: string) => void;
  homeroom: string;
  setHomeroom: (homeroom: string) => void;
  isNameLocked: boolean;
  onFinish: () => void;
}

export const SubmissionSection: React.FC<SubmissionSectionProps> = ({
  studentName,
  setStudentName,
  studentId,
  setStudentId,
  homeroom,
  setHomeroom,
  isNameLocked,
  onFinish,
}) => {
  const containerClasses = "bg-green-800 p-4 rounded-xl shadow-lg text-white text-center";
  const inputBg = "bg-white";
  const inputBorder = "border-transparent";
  const labelClasses = "text-white";

  return (
    <section id="submission-section" className={`tj-submission-section ${containerClasses}`}>
      <h2 className="text-2xl font-bold mb-4">
        {isNameLocked ? 'Update Score' : 'Finished?'}
      </h2>
      <div className="max-w-xl mx-auto mb-6">
        {isNameLocked ? (
          <div className="w-full p-3 rounded-lg font-bold text-xl shadow-sm mb-4 bg-white text-blue-900">
            {studentName} • {studentId} • {homeroom}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={`block mb-2 text-xs font-semibold uppercase tracking-wider text-left ${labelClasses}`}>Nickname</label>
              <input
                type="text"
                className={`w-full p-3 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-blue-400 text-lg font-semibold ${inputBg} ${inputBorder}`}
                placeholder="Jake"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
              />
            </div>
            <div>
              <label className={`block mb-2 text-xs font-semibold uppercase tracking-wider text-left ${labelClasses}`}>Student ID</label>
              <input
                type="text"
                className={`w-full p-3 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-blue-400 text-lg font-semibold ${inputBg} ${inputBorder}`}
                placeholder="01"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
              />
            </div>
            <div>
              <label className={`block mb-2 text-xs font-semibold uppercase tracking-wider text-left ${labelClasses}`}>Homeroom</label>
              <input
                type="text"
                className={`w-full p-3 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-blue-400 text-lg font-semibold ${inputBg} ${inputBorder}`}
                placeholder="M1/1"
                value={homeroom}
                onChange={(e) => setHomeroom(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>
      <Button
        onClick={onFinish}
        disabled={!studentName.trim() || !studentId.trim() || !homeroom.trim()}
        variant="white"
        size="lg"
        className="px-4"
      >
        {isNameLocked ? 'See Updated Report Card' : 'See My Score'}
      </Button>
    </section>
  );
};
