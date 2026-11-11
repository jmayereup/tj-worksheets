import React, { useState, useMemo, useEffect } from 'react';
import { FocusedReaderContent, ChapterBookContent, ParsedLesson, VocabWord, ScrambledItem, FillInBlankItem } from '../../types';
import { getSentenceWords } from '../../utils/textUtils';
import { Scrambled } from '../Activities/Scrambled';
import { FillInBlanks } from '../Activities/FillInBlanks';
import { WordBlasterGame } from '../Activities/WordBlasterGame';
import { X, Gamepad2, Trophy, Zap } from 'lucide-react';

interface Props {
  lesson: ParsedLesson & { content: FocusedReaderContent | ChapterBookContent };
  gameType: 'scramble' | 'fill' | 'wordblaster' | null;
  onClose: () => void;
  toggleTTS: (rate: number, overrideText?: string) => void;
  ttsState: { status: 'playing' | 'paused' | 'stopped', rate: number };
  selectedVoiceName: string | null;
}

const escapeRegExp = (string: string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

export const PracticeGamesModal: React.FC<Props> = ({
  lesson,
  gameType,
  onClose,
  toggleTTS,
  ttsState,
  selectedVoiceName
}) => {
  const [scrambleAnswers, setScrambleAnswers] = useState<Record<number, string>>({});
  const [fillAnswers, setFillAnswers] = useState<Record<number, string>>({});

  const [highScore, setHighScore] = useState(0);
  const [newHighScore, setNewHighScore] = useState(false);
  const HIGHSCORE_KEY = 'word_blaster_highscore_v1';

  // Load high score
  useEffect(() => {
    const savedScore = localStorage.getItem(HIGHSCORE_KEY);
    if (savedScore) {
      setHighScore(parseInt(savedScore, 10));
    }
  }, []);

  const handleWordBlasterFinish = (score: number) => {
    if (score > highScore) {
      setHighScore(score);
      setNewHighScore(true);
      localStorage.setItem(HIGHSCORE_KEY, score.toString());
      
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
          const ctx = new AudioContext();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'square';
          osc.frequency.setValueAtTime(523.25, ctx.currentTime);
          osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);
          osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2);
          osc.frequency.setValueAtTime(1046.50, ctx.currentTime + 0.3);
          gain.gain.setValueAtTime(0.2, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.5);
        }
      } catch (e) {}
    }
  };

  // Reset state when gameType changes
  useEffect(() => {
    setScrambleAnswers({});
    setFillAnswers({});
    setNewHighScore(false);
  }, [gameType]);

  const vocabWords = useMemo(() => {
    const words: VocabWord[] = [];
    const content = lesson.content;
    
    if ('parts' in content) {
      content.parts.forEach(part => {
        if (part.vocabulary_explanations) {
          Object.entries(part.vocabulary_explanations).forEach(([word, def]) => {
            words.push({ word, definition: def, sourceLessonId: lesson.id });
          });
        }
      });
    }
    // ChapterBookContent doesn't have explicit vocabulary_explanations in the current model
    
    return words;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson.id, lesson.content]);

  const scrambleItems = useMemo(() => {
    const content = lesson.content;
    if (!Array.isArray(content) && 'activities' in content && (content as any).activities?.scrambled && (content as any).activities.scrambled.length > 0) {
      return (content as any).activities.scrambled;
    }
    
    let allText = '';
    if ('parts' in content) {
      allText = content.parts.map(p => p.text).join(' ');
    } else if ('chapters' in content) {
      allText = content.chapters.map(c => c.content.join(' ')).join(' ');
    }

    if (!allText) return [];
    
    // Split by punctuation (sentences and clauses) to get short phrases
    const phrases = allText.split(/[,;:!?。！？\n]+|\.\s+/g) || ([] as string[]);
    
    const validPhrases = phrases
      .map(s => s.trim())
      .filter(s => {
        // filter out empty or very short strings
        if (s.length < 10) return false;
        const wordCount = getSentenceWords(s, lesson.language).length;
        // Limit word count to make it a short phrase/sentence (e.g. 3 to 12 words)
        return wordCount >= 3 && wordCount <= 12;
      });
      
    // Remove duplicates
    const uniquePhrases = Array.from(new Set(validPhrases));
      
    const selected = uniquePhrases.sort(() => 0.5 - Math.random()).slice(0, 5);
    
    // Ensure it ends with a period for consistency
    return selected.map(s => {
        const answer = s.endsWith('.') ? s : s + '.';
        return { text: '', answer };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fillItems = useMemo(() => {
    const content = lesson.content;
    if (!Array.isArray(content) && 'activities' in content && (content as any).activities?.fillInTheBlanks && (content as any).activities.fillInTheBlanks.length > 0) {
      return (content as any).activities.fillInTheBlanks;
    }
    
    const items: FillInBlankItem[] = [];
    let allText = '';
    if ('parts' in content) {
      allText = content.parts.map(p => p.text).join(' ');
    } else if ('chapters' in content) {
      allText = content.chapters.map(c => c.content.join(' ')).join(' ');
    }
    const sentences = allText.match(/[^.!?。！？]+[.!?。！？]+/g) || ([] as string[]);
    
    const vocabList = vocabWords.map(vw => vw.word).filter(w => w.length > 1);
    const usedSentences = new Set<string>();
    const isAsianLanguage = ['Chinese', 'Japanese', 'Korean', 'Thai'].includes(lesson.language);
    
    sentences.forEach(s => {
      if (items.length >= 5) return;
      const sentence = s.trim();
      if (usedSentences.has(sentence)) return;
      
      for (const vw of vocabList) {
        const regexStr = isAsianLanguage 
          ? escapeRegExp(vw) 
          : `\\b${escapeRegExp(vw)}\\b`;
          
        const regex = new RegExp(regexStr, 'i');
        const match = sentence.match(regex);
        if (match) {
          const wordStart = match.index!;
          const wordEnd = wordStart + match[0].length;
          
          items.push({
            before: sentence.substring(0, wordStart),
            answer: match[0],
            after: sentence.substring(wordEnd)
          });
          usedSentences.add(sentence);
          break;
        }
      }
    });
    
    if (items.length < 5) {
       const unused = sentences.map(s => s.trim()).filter(s => !usedSentences.has(s) && s.length > 20);
       unused.sort(() => 0.5 - Math.random());
       
       for (const sentence of unused) {
         if (items.length >= 5) break;
         
         const words = sentence.split(/[\s]+/).filter(w => w.length >= 4);
         
         if (words.length > 0) {
           const targetWordRaw = words[Math.floor(Math.random() * words.length)];
           // strip basic punctuation
           const targetWord = targetWordRaw.replace(/^[.,;:!?(){}\[\]"']+|[.,;:!?(){}\[\]"']+$/g, '');
           
           if (targetWord.length < 3) continue;

           const regexStr = isAsianLanguage 
             ? escapeRegExp(targetWord) 
             : `\\b${escapeRegExp(targetWord)}\\b`;
             
           const regex = new RegExp(regexStr, 'i');
           const match = sentence.match(regex);
           
           if (match) {
             const wordStart = match.index!;
             const wordEnd = wordStart + match[0].length;
             
             items.push({
               before: sentence.substring(0, wordStart),
               answer: match[0], // Keep exact match case
               after: sentence.substring(wordEnd)
             });
             usedSentences.add(sentence);
           }
         }
       }
    }
    
    return items.slice(0, 5);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!gameType) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4 animate-in fade-in duration-200 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col pointer-events-auto border border-gray-200">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-100 sticky top-0 bg-white/95 backdrop-blur-md z-10 rounded-t-3xl">
          <div className="flex items-center gap-3 text-indigo-900">
            <div className="p-2 sm:p-3 bg-indigo-100 rounded-xl text-indigo-600 shadow-inner">
              <Gamepad2 className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black capitalize tracking-tight">
                {gameType === 'fill' ? 'Fill in the Blanks' : gameType} Practice
              </h2>
              <p className="text-xs sm:text-sm font-medium text-indigo-400">Practice mode • Scores are not recorded</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors self-start sm:self-center"
          >
            <X className="w-6 h-6 sm:w-8 sm:h-8" />
          </button>
        </div>

        <div className="p-4 sm:p-6 flex-1 bg-gray-50/50">
          {gameType === 'scramble' && (
            scrambleItems.length > 0 ? (
              <Scrambled
                data={scrambleItems}
                level={lesson.level}
                language={lesson.language}
                onChange={setScrambleAnswers}
                savedAnswers={scrambleAnswers}
                voiceName={selectedVoiceName}
                toggleTTS={toggleTTS}
                ttsState={ttsState}
                lessonId={`${lesson.id}-practice-scramble`}
                defaultMode="scramble"
              />
            ) : (
              <div className="p-12 text-center text-gray-500 font-medium bg-white rounded-2xl shadow-sm border border-gray-100">
                Not enough text to generate scrambles. Keep reading!
              </div>
            )
          )}

          {gameType === 'fill' && (
            fillItems.length > 0 ? (
              <FillInBlanks
                data={fillItems}
                vocabItems={[]}
                level={lesson.level}
                language={lesson.language}
                onChange={setFillAnswers}
                savedAnswers={fillAnswers}
                voiceName={selectedVoiceName}
                toggleTTS={toggleTTS}
                ttsState={ttsState}
                lessonId={`${lesson.id}-practice-fill`}
              />
            ) : (
              <div className="p-12 text-center text-gray-500 font-medium bg-white rounded-2xl shadow-sm border border-gray-100">
                Not enough text to generate fill-in-the-blanks. Check back later!
              </div>
            )
          )}

          {gameType === 'wordblaster' && (
             <div className="max-w-4xl mx-auto w-full">
               {highScore > 0 && (
                 <div className={`mb-4 md:mb-8 max-w-md mx-auto transition-transform duration-500 ${newHighScore ? 'scale-110 drop-shadow-lg' : ''}`}>
                    <div className={`bg-linear-to-r ${newHighScore ? 'from-green-100 to-emerald-100 border-emerald-400 animate-pulse' : 'from-amber-100 to-yellow-100 border-yellow-200'} rounded-2xl p-3 md:p-4 flex items-center justify-between shadow-sm border`}>
                       <div className="flex items-center gap-3">
                         <div className={`p-2 rounded-xl ${newHighScore ? 'bg-emerald-400 text-emerald-900' : 'bg-yellow-400 text-yellow-900'}`}>
                           <Trophy className="w-5 h-5 md:w-6 md:h-6" />
                         </div>
                         <span className={`font-bold text-sm tracking-wide uppercase ${newHighScore ? 'text-emerald-900' : 'text-yellow-900'}`}>
                           {newHighScore ? 'NEW HIGH SCORE!!' : 'All-Time High'}
                         </span>
                       </div>
                       <span className={`text-2xl md:text-3xl font-black drop-shadow-sm ${newHighScore ? 'text-emerald-600' : 'text-yellow-600'}`}>{highScore}</span>
                    </div>
                 </div>
               )}
               <WordBlasterGame
                  words={vocabWords}
                  onFinish={handleWordBlasterFinish}
               />
             </div>
          )}
        </div>
      </div>
    </div>
  );
};
