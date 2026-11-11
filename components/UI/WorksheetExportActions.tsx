import React, { useState } from 'react';
import { Printer, Copy, Check } from 'lucide-react';
import { ParsedLesson, StandardLessonContent } from '../../types';
import { seededShuffle, getSentenceWords } from '../../utils/textUtils';

interface WorksheetExportActionsProps {
  lesson: ParsedLesson & { content: StandardLessonContent };
  displayTitle: string;
  studentName: string;
  studentId: string;
  homeroom: string;
}

export const WorksheetExportActions: React.FC<WorksheetExportActionsProps> = ({
  lesson,
  displayTitle,
  studentName,
  studentId,
  homeroom,
}) => {
  const [copySuccess, setCopySuccess] = useState(false);
  const standardContent = lesson.content;

  const handleCopyForGoogleDocs = async () => {
    const getOriginalImageUrl = () => {
      const img = lesson.image || lesson.imageUrl || '';
      if (!img) return '';
      if (img.startsWith('http') && !img.includes('teacherjake.com')) {
        return img;
      }
      const last = img.split('/').pop() || '';
      let filename = last;
      if (last.endsWith('.webp')) {
        const parts = last.split('.');
        if (parts.length >= 3) {
          const base = parts.slice(0, parts.length - 2).join('.');
          const ext = base.startsWith('pasted_image') ? 'png' : 'jpg';
          filename = `${base}.${ext}`;
        }
      }
      return `https://files.teacherjake.com/${lesson.collectionId || lesson.collectionName}/${lesson.id}/${filename}`;
    };

    const originalImageUrl = getOriginalImageUrl();

    const vocabItems = seededShuffle([...standardContent.activities.vocabulary.items], `${lesson.id}-print-vocab`);
    const scrambledItems = (standardContent.activities?.scrambled || []).map((item, idx) => {
      const words = getSentenceWords(item.answer, lesson.language);
      const shuffled = seededShuffle([...words], `${lesson.id}-print-scramble-${idx}`);
      return { ...item, scrambledText: shuffled.join(' / ') };
    });

    const html = `
<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:750px;margin:0 auto;padding:16px;font-size:13px">
<div style="text-align:right;font-size:13px;margin-bottom:16px;color:#333;">
Name <u>&nbsp;&nbsp;&nbsp;&nbsp;${studentName || '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'}&nbsp;&nbsp;&nbsp;&nbsp;</u>
&nbsp;&nbsp;&nbsp;&nbsp;ID: <u>&nbsp;&nbsp;&nbsp;&nbsp;${studentId || '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'}&nbsp;&nbsp;&nbsp;&nbsp;</u>
&nbsp;&nbsp;&nbsp;&nbsp;Homeroom: <u>&nbsp;&nbsp;&nbsp;&nbsp;${homeroom || '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'}&nbsp;&nbsp;&nbsp;&nbsp;_</u>
</div>
<h1 style="font-size:18px;font-weight:bold;margin:0 0 4px 0">${displayTitle}</h1>
<p style="color:#666;margin:0 0 16px 0;font-size:11px">Language: ${lesson.language} | Level: ${lesson.level}</p>

${originalImageUrl ? `<div style="text-align:center;margin:16px 0"><img src="${originalImageUrl}" alt="Lesson image" style="max-width:100%;height:auto;border-radius:6px" /></div>` : ''}

<h2 style="font-size:13px;font-weight:bold;background:#f3f4f6;padding:4px 6px;margin:8px 0 4px">Reading Passage</h2>
<p style="font-size:12px;line-height:1.6;margin:0">${standardContent.readingText.replace(/\n/g, '<br>')}</p>

<h2 style="font-size:13px;font-weight:bold;background:#f3f4f6;padding:4px 6px;margin:10px 0 4px">1. Vocabulary Matching</h2>
<table style="width:100%;border-collapse:collapse">
<tr>
<td style="width:50%;vertical-align:top;padding-right:12px">
${vocabItems.map((item) => `<p style="margin:3px 0;font-size:12px">____ &nbsp; ${item.label}</p>`).join('')}
</td>
<td style="width:50%;vertical-align:top">
${standardContent.activities.vocabulary.definitions.map((def, i) => `<p style="margin:3px 0;font-size:12px"><strong>${String.fromCharCode(97 + i)}.</strong> ${def.text}</p>`).join('')}
</td>
</tr>
</table>

<h2 style="font-size:13px;font-weight:bold;background:#f3f4f6;padding:4px 6px;margin:10px 0 4px">2. Fill in the Blanks</h2>
${standardContent.activities.fillInTheBlanks.map((item, i) => `<p style="margin:4px 0;font-size:12px">${i + 1}. ${item.before} _________________ ${item.after}</p>`).join('')}

<h2 style="font-size:13px;font-weight:bold;background:#f3f4f6;padding:4px 6px;margin:10px 0 4px">3. Reading Comprehension</h2>
${standardContent.activities.comprehension.questions.map((q, i) => `<p style="margin:4px 0;font-size:12px">${i + 1}. ${q.text} &nbsp;&nbsp; <strong>True</strong> &nbsp; <strong>False</strong></p>`).join('')}

<h2 style="font-size:13px;font-weight:bold;background:#f3f4f6;padding:4px 6px;margin:10px 0 4px">4. Scrambled Sentences</h2>
${scrambledItems.map((item) => `<p style="color:#555;font-style:italic;margin:2px 0;font-size:12px">(${item.scrambledText})</p><p style="border-bottom:1px solid #ddd;margin:0 0 8px 0">&nbsp;</p>`).join('')}

<h2 style="font-size:13px;font-weight:bold;background:#f3f4f6;padding:4px 6px;margin:10px 0 4px">5. Written Expression</h2>
${standardContent.activities.writtenExpression.questions.map((q, i) => `<p style="font-size:12px;font-weight:medium;margin:4px 0 2px">${i + 1}. ${q.text}</p><p style="border-bottom:1px solid #ccc;margin:3px 0 10px">&nbsp;</p>`).join('')}

</body></html>`;

    try {
      await navigator.clipboard.write([
        new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }) })
      ]);
    } catch {
      try { await navigator.clipboard.writeText(html); } catch { /* ignore */ }
    }
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 6000);
  };

  const btnClass = 'inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm';

  return (
    <div className="max-w-4xl mx-auto mb-4 print:hidden">
      <div className="flex gap-3 justify-center">
        <button onClick={handleCopyForGoogleDocs} className={btnClass}>
          {copySuccess ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
          {copySuccess ? 'Copied!' : 'Copy'}
        </button>
        <button onClick={() => window.print()} className={btnClass}>
          <Printer className="w-4 h-4" />
          Print
        </button>
      </div>
      {copySuccess && (
        <div className="mt-2 flex items-start gap-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-800 animate-fade-in">
          <Check className="w-4 h-4 mt-0.5 text-green-600 shrink-0" />
          <div className="flex-1">
            <span className="font-semibold">Worksheet copied!</span>{' '}
            Paste it into a Google Doc to get started.
          </div>
          <a
            href="https://docs.new"
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 inline-flex items-center gap-1 bg-green-700 text-white text-xs font-semibold px-3 py-1.5 rounded-md hover:bg-green-800 transition-colors"
          >
            Open Google Docs →
          </a>
        </div>
      )}
    </div>
  );
};
