import React, { ReactNode, useState, useRef, useEffect } from 'react';
import { HelpCircle, X, BookOpen, Volume2, Turtle, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import { AudioControls } from '../UI/AudioControls';
import { TranslateButton } from '../UI/TranslateButton';
import { Button } from '../UI/Button';
import { speakText } from '../../utils/textUtils';
import { WordLookupToast } from '../UI/WordLookupToast';

interface ReadingPassageProps {
  text: string;
  language: string;
  title?: string;
  vocabularyExplanations?: Record<string, string>;
  
  // Audio Controls Props
  onVoiceOpen?: () => void;
  onSlowToggle: () => void;
  onListenToggle: () => void;
  ttsStatus: 'playing' | 'paused' | 'stopped';
  currentRate: number;
  hasVoices: boolean;
  
  // Optional Translate
  onTranslate?: () => void;

  // Swipe callbacks
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  
  // Pagination Props
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  
  // UI Options
  showHighlightHelp?: boolean;
  className?: string;
  passageRef?: React.RefObject<HTMLDivElement>;
}

export const ReadingPassage: React.FC<ReadingPassageProps> = ({
  text,
  language,
  title = "Reading Passage",
  vocabularyExplanations = {},
  onVoiceOpen,
  onSlowToggle,
  onListenToggle,
  ttsStatus,
  currentRate,
  hasVoices,
  onTranslate,
  onSwipeLeft,
  onSwipeRight,
  currentPage,
  totalPages,
  onPageChange,
  showHighlightHelp = false,
  className = "",
  passageRef,
}) => {
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const selectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (onSwipeLeft || onSwipeRight) {
      setTouchStart(e.targetTouches[0].pageX);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart || (!onSwipeLeft && !onSwipeRight)) return;
    
    const touchEnd = e.changedTouches[0].pageX;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 100;
    const isRightSwipe = distance < -100;

    if (isLeftSwipe && onSwipeLeft) {
      onSwipeLeft();
    } else if (isRightSwipe && onSwipeRight) {
      onSwipeRight();
    }
    setTouchStart(null);
  };


  
  useEffect(() => {
    const handleSelectionChange = () => {
      if (selectionTimeoutRef.current) {
        clearTimeout(selectionTimeoutRef.current);
      }

      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) return;

      const selectedText = selection.toString().trim();
      if (selectedText && selectedText.split(/\s+/).length > 1) {
        // Only trigger for phrases (2+ words)
        selectionTimeoutRef.current = setTimeout(() => {
          const cleanPhrase = selectedText.replace(/^[.,!?;:"'()\[\]{}]+|[.,!?;:"'()\[\]{}]+$/g, '');
          if (cleanPhrase) {
            setSelectedWord(cleanPhrase);
          }
        }, 500);
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      if (selectionTimeoutRef.current) {
        clearTimeout(selectionTimeoutRef.current);
      }
    };
  }, [language]);

  const handleWordClick = (word: string) => {
    const cleanWord = word.replace(/^[.,!?;:"'()\[\]{}]+|[.,!?;:"'()\[\]{}]+$/g, '');
    if (cleanWord) {
      speakText(cleanWord, language, 0.7);
      setSelectedWord(cleanWord);
    }
  };

  const renderTextWithVocabulary = () => {
    if (!text) return null;

    // Normalize to NFC to ensure consistent character representation
    const normalizedText = text.normalize('NFC');
    const normalizedExplanations: Record<string, string> = {};
    Object.entries(vocabularyExplanations).forEach(([key, value]) => {
      normalizedExplanations[key.normalize('NFC').toLowerCase()] = value;
    });

    // For Thai, we pre-calculate word boundaries using Intl.Segmenter
    const breakPositions = new Set<number>([0, normalizedText.length]);
    if (language === 'Thai' && typeof (Intl as any).Segmenter === 'function') {
      const segmenter = new (Intl as any).Segmenter('th', { granularity: 'word' });
      const segments = Array.from(segmenter.segment(normalizedText));
      segments.forEach((s: any) => {
        breakPositions.add(s.index);
        breakPositions.add(s.index + s.segment.length);
      });
    }

    const sortedKeys = Object.keys(normalizedExplanations).sort((a, b) => b.length - a.length);
    
    // Function to render clickable segments for regular text
    const renderClickableSegments = (textSegment: string, segmentKeyPrefix: string) => {
      // Use Intl.Segmenter for Thai to handle word boundaries without spaces
      if (language === 'Thai' && typeof (Intl as any).Segmenter === 'function') {
        const segmenter = new (Intl as any).Segmenter('th', { granularity: 'word' });
        const segments = Array.from(segmenter.segment(textSegment));
        
        return segments.map((s: any, j: number) => {
          if (!s.isWordLike) return <span key={`${segmentKeyPrefix}-th-${j}`}>{s.segment}</span>;
          
          return (
            <span
              key={`${segmentKeyPrefix}-th-${j}`}
              onClick={() => handleWordClick(s.segment)}
              className="cursor-pointer hover:text-green-600 hover:bg-green-50 transition-colors"
            >
              {s.segment}
            </span>
          );
        });
      }

      const wordsAndSpaces = textSegment.split(/(\s+)/);
      return wordsAndSpaces.map((subPart, j) => {
        if (/^\s+$/.test(subPart)) return subPart;
        
        // Split by punctuation for sub-segments
        const subSegments = subPart.split(/([.,!?;:"'()\[\]{}]+)/).filter(Boolean);
        return (
          <React.Fragment key={`${segmentKeyPrefix}-${j}`}>
            {subSegments.map((sub, k) => {
              if (/^[.,!?;:"'()\[\]{}]+$/.test(sub)) {
                return <span key={k}>{sub}</span>;
              }
              return (
                <span
                  key={k}
                  onClick={() => handleWordClick(sub)}
                  className="cursor-pointer hover:text-green-600 hover:bg-green-50 transition-colors"
                >
                  {sub}
                </span>
              );
            })}
          </React.Fragment>
        );
      });
    };

    if (sortedKeys.length === 0) return renderClickableSegments(normalizedText, "plain");

    // Create regex for vocabulary words
    const escapedKeys = sortedKeys.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    const regex = new RegExp(`(${escapedKeys})`, 'gui');

    const result: ReactNode[] = [];
    let lastIndex = 0;
    
    let match;
    while ((match = regex.exec(normalizedText)) !== null) {
      const start = match.index;
      const word = match[0];
      const end = start + word.length;

      // Verify word boundaries
      let isWordBoundaryBefore = false;
      let isWordBoundaryAfter = false;

      if (language === 'Thai' && breakPositions.size > 2) {
        isWordBoundaryBefore = breakPositions.has(start);
        isWordBoundaryAfter = breakPositions.has(end);
      } else {
        const charBefore = start > 0 ? normalizedText[start - 1] : '';
        const charAfter = end < normalizedText.length ? normalizedText[end] : '';
        isWordBoundaryBefore = !charBefore || !/[\p{L}\p{N}]/u.test(charBefore);
        isWordBoundaryAfter = !charAfter || !/[\p{L}\p{N}]/u.test(charAfter);
      }

      if (isWordBoundaryBefore && isWordBoundaryAfter) {
        // Add preceding text as clickable segments
        if (start > lastIndex) {
          result.push(...(renderClickableSegments(normalizedText.substring(lastIndex, start), `text-${start}`) as ReactNode[]));
        }

        // Add highlighted vocabulary word
        result.push(
          <span key={`vocab-${start}`}>
            <span 
              onClick={() => handleWordClick(word)}
              className="cursor-pointer border-b-2 border-dotted font-semibold border-green-600 hover:bg-green-50 px-0 rounded transition-all"
            >
              {word}
            </span>
          </span>
        );
        lastIndex = end;
      }
    }

    // Add remaining text as clickable segments
    if (lastIndex < normalizedText.length) {
      result.push(...(renderClickableSegments(normalizedText.substring(lastIndex), `final`) as ReactNode[]));
    }

    return result;
  };

  return (
    <section 
      ref={passageRef}
      className={`bg-white p-1 sm:p-2 rounded-xl sm:shadow-sm sm:border sm:border-gray-100 mb-2 relative ${className}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top Pagination Dots */}
      {totalPages && totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 mb-6 mt-2">
          <button
            onClick={() => onPageChange?.(Math.max(0, (currentPage || 0) - 1))}
            disabled={currentPage === 0}
            className="p-1.5 rounded-full text-green-600 hover:bg-green-100 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
            title="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex flex-wrap justify-center gap-2">
            {[...Array(totalPages)].map((_, idx) => (
              <button
                key={idx}
                onClick={() => onPageChange?.(idx)}
                className={`h-3 rounded-full transition-all duration-300 ${
                  currentPage === idx ? 'w-8 bg-green-600' : 'w-3 bg-green-200 hover:bg-green-300'
                }`}
                title={`Go to Page ${idx + 1}`}
              />
            ))}
          </div>

          <button
            onClick={() => onPageChange?.(Math.min(totalPages - 1, (currentPage || 0) + 1))}
            disabled={currentPage === totalPages - 1}
            className="p-1.5 rounded-full text-green-600 hover:bg-green-100 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
            title="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-2 px-1">
        <div translate="no" className="min-w-0 flex-1">
          <h2 className="text-xl font-black text-green-900 uppercase tracking-tight wrap-break-word">{title}</h2>
        </div>
        
        <div className="flex gap-2 shrink-0 self-end sm:self-auto">
          {onTranslate && <TranslateButton onClick={onTranslate} />}
          <AudioControls 
            onVoiceOpen={onVoiceOpen}
            onSlowToggle={onSlowToggle}
            onListenToggle={onListenToggle}
            ttsStatus={ttsStatus}
            currentRate={currentRate}
            hasVoices={hasVoices}
          />
        </div>
      </div>

      <p className="text-gray-500 mb-4 text-xs sm:text-sm font-medium px-1">Read the text carefully. Tap any word to hear its pronunciation.</p>

      <div className="mx-0">
        <div
          className="max-w-none justify-baseline text-lg leading-8 text-gray-800 bg-transparent whitespace-pre-wrap select-text"
          translate="no"
        >
          {renderTextWithVocabulary()}
        </div>
        
        {showHighlightHelp && Object.keys(vocabularyExplanations).length > 0 && (
          <div className="prose mt-4 pt-4 border-t text-green-700 flex items-center gap-2 font-bold italic">
            <HelpCircle className="w-5 h-5" />
            <span>Underlined words are in the vocabulary activity below!</span>
          </div>
        )}
      </div>

      {/* Bottom Navigation Buttons */}
      {totalPages && totalPages > 1 && onPageChange && (
        <div className="mt-8 border-t pt-6">
          <div className="flex justify-between items-center bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
            <Button
              variant="secondary"
              onClick={() => onPageChange(Math.max(0, (currentPage || 0) - 1))}
              disabled={currentPage === 0}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="w-5 h-5" /> Previous
            </Button>

            <span className="text-sm font-black text-gray-400 uppercase tracking-widest text-center px-2">
              Page {(currentPage || 0) + 1} of {totalPages}
            </span>

            {currentPage < totalPages - 1 ? (
              <Button
                variant="primary"
                onClick={() => onPageChange((currentPage || 0) + 1)}
                className="flex items-center gap-2"
              >
                Next <ChevronRight className="w-5 h-5" />
              </Button>
            ) : (
              <div className="text-green-600 font-black flex items-center gap-2 animate-bounce">
                <CheckCircle2 className="w-6 h-6" /> All Pages Read!
              </div>
            )}
          </div>
        </div>
      )}

      {selectedWord && (
        <WordLookupToast 
          word={selectedWord}
          language={language}
          onClose={() => setSelectedWord(null)}
          ttsStatus={ttsStatus}
          currentRate={currentRate}
        />
      )}
    </section>
  );
};
