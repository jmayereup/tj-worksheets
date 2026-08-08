import React from 'react';
import { Video, ImageIcon, Music, ClipboardPaste, Info, EyeOff } from 'lucide-react';
import { Button } from '../../UI/Button';
import { MediaState } from '../../../types/lessonEditor';

interface MediaSectionProps {
  videoUrl: string;
  teacherCode: string;
  lessonType: string;
  testMode: boolean;
  isVideoLesson: boolean;
  notForBlog?: boolean;
  isPublicCreator: boolean;
  media: MediaState;
  existingAudioFile?: string;
  existingAudioFileUrl?: string;
  onVideoUrlChange: (url: string) => void;
  onTeacherCodeChange: (code: string) => void;
  onTestModeChange: (enabled: boolean) => void;
  onIsVideoLessonChange: (isVideo: boolean) => void;
  onNotForBlogChange?: (notForBlog: boolean) => void;
  onImageFileChange: (file: File | null) => void;
  onAudioFileChange: (file: File | null) => void;
  onPasteImageFromClipboard: () => void;
  onRemoveNewAudio: () => void;
}

export const MediaSection: React.FC<MediaSectionProps> = ({
  videoUrl,
  teacherCode,
  lessonType,
  testMode,
  isVideoLesson,
  notForBlog = false,
  isPublicCreator,
  media,
  existingAudioFile,
  existingAudioFileUrl,
  onVideoUrlChange,
  onTeacherCodeChange,
  onTestModeChange,
  onIsVideoLessonChange,
  onNotForBlogChange,
  onImageFileChange,
  onAudioFileChange,
  onPasteImageFromClipboard,
  onRemoveNewAudio
}) => {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-black text-gray-700 mb-2 ml-1 uppercase tracking-wider">YouTube URL</label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Video className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            value={videoUrl}
            onChange={(e) => onVideoUrlChange(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
            placeholder="https://www.youtube.com/watch?v=..."
          />
        </div>
      </div>

      <div className={lessonType === 'quiz-element' ? "grid grid-cols-1 md:grid-cols-2 gap-4" : ""}>
        <div>
          <label className="block text-sm font-black text-gray-700 mb-2 ml-1 uppercase tracking-wider">Teacher Code</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <span className="text-gray-400 font-bold text-sm">#</span>
            </div>
            <input
              type="text"
              value={teacherCode}
              onChange={(e) => onTeacherCodeChange(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
              placeholder="6767 (Default)"
            />
          </div>
        </div>

        {lessonType === 'quiz-element' && (
          <div>
            <label className="block text-sm font-black text-gray-700 mb-2 ml-1 uppercase tracking-wider">Quiz Settings</label>
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl min-h-[50px]">
              <div className="flex flex-col">
                <span className="text-sm font-bold text-gray-800">Test Mode</span>
                <span className="text-xs text-gray-400">Lock quiz behind Teacher Code</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={testMode} 
                  onChange={(e) => onTestModeChange(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
              </label>
            </div>
          </div>
        )}
      </div>

      {!isPublicCreator && (
        <>
          <div>
            <label className="block text-sm font-black text-gray-700 mb-2 ml-1 uppercase tracking-wider">Worksheet Image</label>
            <div className="flex flex-col gap-3">
              {media.imagePreview && (
                <div className="w-full aspect-video rounded-xl bg-gray-100 overflow-hidden border border-gray-200">
                  <img src={media.imagePreview} alt="Preview" className="w-full h-full object-contain" />
                </div>
              )}
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => onImageFileChange(e.target.files?.[0] || null)}
                  className="hidden"
                  id="image-upload"
                />
                <div className="flex gap-2">
                  <label
                    htmlFor="image-upload"
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-dashed border-gray-300 rounded-xl hover:border-green-500 hover:bg-green-50 cursor-pointer transition-all text-gray-600 font-bold text-sm"
                  >
                    <ImageIcon className="w-4 h-4" />
                    <span className="truncate">{media.imageFile ? media.imageFile.name : 'Upload Image (JPG/PNG)'}</span>
                  </label>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={onPasteImageFromClipboard}
                    className="px-4 py-3 h-auto"
                    title="Paste image from clipboard"
                  >
                    <ClipboardPaste className="w-5 h-5 shrink-0" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-black text-gray-700 mb-2 ml-1 uppercase tracking-wider">Audio File (MP3)</label>
            <div className="flex flex-col gap-3">
              {media.audioFile && (
                <div className="flex flex-col gap-2 p-3 bg-blue-50/50 rounded-xl border border-blue-200">
                  <div className="flex items-center gap-2 text-sm text-blue-700 font-medium">
                    <Music className="w-4 h-4 text-blue-500 shrink-0" />
                    <span className="font-bold text-blue-800 shrink-0">New:</span>
                    <span className="truncate" title={media.audioFile.name}>{media.audioFile.name}</span>
                    <button 
                      type="button" 
                      onClick={onRemoveNewAudio}
                      className="ml-auto text-xs text-red-500 hover:text-red-700 font-bold"
                    >
                      Remove
                    </button>
                  </div>
                  {media.audioPreviewUrl && (
                    <audio 
                      src={media.audioPreviewUrl} 
                      controls 
                      className="w-full h-8 text-xs" 
                    />
                  )}
                </div>
              )}

              {!media.audioFile && existingAudioFile && (
                <div className="flex flex-col gap-2 p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="flex items-center gap-2 text-sm text-gray-600 font-medium">
                    <Music className="w-4 h-4 text-blue-500 shrink-0" />
                    <span className="font-bold text-gray-800 shrink-0">Current:</span>
                    <span className="truncate" title={existingAudioFile}>{existingAudioFile}</span>
                  </div>
                  {existingAudioFileUrl && (
                    <audio 
                      src={existingAudioFileUrl} 
                      controls 
                      className="w-full h-8 text-xs" 
                    />
                  )}
                </div>
              )}

              <div className="relative">
                <input
                  type="file"
                  accept="audio/mpeg,audio/mp3"
                  onChange={(e) => onAudioFileChange(e.target.files?.[0] || null)}
                  className="hidden"
                  id="audio-upload"
                />
                <label
                  htmlFor="audio-upload"
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-white border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-all text-gray-600600 font-bold text-sm"
                >
                  <Music className="w-4 h-4" />
                  {media.audioFile ? 'Change New Audio' : (existingAudioFile ? 'Replace Audio (MP3)' : 'Upload Audio (MP3)')}
                </label>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
          <div className="flex items-center h-5">
            <input
              type="checkbox"
              id="isVideoLesson"
              checked={isVideoLesson}
              onChange={(e) => onIsVideoLessonChange(e.target.checked)}
              className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500 cursor-pointer"
            />
          </div>
          <label htmlFor="isVideoLesson" className="text-sm font-bold text-gray-700 cursor-pointer flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-500" /> Mark as Video Lesson
          </label>
        </div>

        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
          <div className="flex items-center h-5">
            <input
              type="checkbox"
              id="notForBlog"
              checked={notForBlog}
              onChange={(e) => onNotForBlogChange && onNotForBlogChange(e.target.checked)}
              className="w-5 h-5 text-amber-600 border-gray-300 rounded focus:ring-amber-500 cursor-pointer"
            />
          </div>
          <label htmlFor="notForBlog" className="text-sm font-bold text-gray-700 cursor-pointer flex items-center gap-2">
            <EyeOff className="w-4 h-4 text-amber-500" /> Exclude from Blog
          </label>
        </div>
      </div>
    </div>
  );
};