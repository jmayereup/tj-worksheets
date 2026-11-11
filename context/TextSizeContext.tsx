import React, { createContext, useContext, useState } from 'react';

interface TextSizeContextType {
  textSizeLevel: number;
  setTextSizeLevel: (level: number) => void;
  decreaseTextSize: () => void;
  increaseTextSize: () => void;
}

const TextSizeContext = createContext<TextSizeContextType>({
  textSizeLevel: 1,
  setTextSizeLevel: () => {},
  decreaseTextSize: () => {},
  increaseTextSize: () => {},
});

export const useTextSize = () => useContext(TextSizeContext);

export const TextSizeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [textSizeLevel, setTextSizeLevelState] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('tj-reading-text-size-level');
        if (saved !== null) {
          const parsed = parseInt(saved, 10);
          if (!isNaN(parsed) && parsed >= 0 && parsed <= 3) {
            return parsed;
          }
        }
      } catch (e) {
        // Ignore localStorage error
      }
    }
    return 1; // Default: Level 1 (Normal)
  });

  const setTextSizeLevel = (level: number) => {
    const clamped = Math.max(0, Math.min(3, level));
    setTextSizeLevelState(clamped);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('tj-reading-text-size-level', clamped.toString());
      } catch (e) {
        // Ignore
      }
    }
  };

  const decreaseTextSize = () => setTextSizeLevel(textSizeLevel - 1);
  const increaseTextSize = () => setTextSizeLevel(textSizeLevel + 1);

  return (
    <TextSizeContext.Provider value={{ textSizeLevel, setTextSizeLevel, decreaseTextSize, increaseTextSize }}>
      {children}
    </TextSizeContext.Provider>
  );
};

