import React from 'react';
import { Globe, Layers, Layout, Tag as TagIcon, Check } from 'lucide-react';
import { SearchableSelect } from '../../UI/SearchableSelect';
import { LANGUAGE_OPTIONS, LEVEL_OPTIONS, TAG_OPTIONS, LESSON_TYPE_OPTIONS, formatLessonType } from '../../../types';

interface BasicInfoSectionProps {
  title: string;
  language: string;
  level: string;
  selectedTags: string[];
  lessonType: string;
  isPublicCreator: boolean;
  onTitleChange: (title: string) => void;
  onLanguageChange: (language: string) => void;
  onLevelChange: (level: string) => void;
  onTagsChange: (tags: string[]) => void;
  onLessonTypeChange: (type: string) => void;
}

export const BasicInfoSection: React.FC<BasicInfoSectionProps> = ({
  title,
  language,
  level,
  selectedTags,
  lessonType,
  isPublicCreator,
  onTitleChange,
  onLanguageChange,
  onLevelChange,
  onTagsChange,
  onLessonTypeChange
}) => {
  const handleTagToggle = (tag: string) => {
    onTagsChange(
      selectedTags.includes(tag)
        ? selectedTags.filter(t => t !== tag)
        : [...selectedTags, tag]
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-black text-gray-700 mb-2 ml-1 uppercase tracking-wider">Lesson Title</label>
        <input
          type="text"
          required
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
          placeholder="Gemini will fill this in..."
        />
      </div>

      {!isPublicCreator && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-black text-gray-700 mb-2 ml-1 uppercase tracking-wider">Language</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none z-10">
                <Globe className="h-4 w-4 text-gray-400" />
              </div>
              <SearchableSelect
                value={language}
                onChange={onLanguageChange}
                options={LANGUAGE_OPTIONS}
                placeholder="Select language..."
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none hover:border-gray-300 transition-colors"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-black text-gray-700 mb-2 ml-1 uppercase tracking-wider">Level</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Layers className="h-4 w-4 text-gray-400" />
              </div>
              <select
                value={level}
                onChange={(e) => onLevelChange(e.target.value)}
                required={!isPublicCreator}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none appearance-none"
              >
                <option value="" disabled>Select level...</option>
                {LEVEL_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-black text-gray-700 mb-2 ml-1 uppercase tracking-wider">Lesson Type</label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Layout className="h-4 w-4 text-gray-400" />
          </div>
          <select
            value={lessonType}
            onChange={(e) => onLessonTypeChange(e.target.value)}
            required
            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none appearance-none"
          >
            <option value="" disabled>Select lesson type...</option>
            {LESSON_TYPE_OPTIONS.map(opt => (
              <option key={opt} value={opt}>{formatLessonType(opt)}</option>
            ))}
          </select>
        </div>
      </div>

      {!isPublicCreator && (
        <div>
          <label className="block text-sm font-black text-gray-700 mb-2 ml-1 uppercase tracking-wider">Tags</label>
          <div className="flex flex-wrap gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl min-h-[50px]">
            {TAG_OPTIONS.map(tag => (
              <button
                key={tag}
                type="button"
                onClick={() => handleTagToggle(tag)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                  selectedTags.includes(tag)
                    ? 'bg-green-600 border-green-700 text-white shadow-sm'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-green-300 hover:bg-green-50'
                }`}
              >
                <TagIcon className="w-4 h-4" />
                {tag}
                {selectedTags.includes(tag) && <Check className="w-3 h-3" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};