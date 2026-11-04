import React, { useState } from 'react';
import { Printer, Copy, Check } from 'lucide-react';
import { ParsedLesson, FocusedReaderContent } from '../../types';
import { seededShuffle } from '../../utils/textUtils';
import { getFocusedReaderCriticalThinking } from '../../hooks/useFocusedReaderScores';

interface FocusedReaderExportActionsProps {
  lesson: ParsedLesson & { content: FocusedReaderContent };
  displayTitle: string;
  studentName: string;
  studentId: string;
  homeroom: string;
}

export const FocusedReaderExportActions: React.FC<FocusedReaderExportActionsProps> = ({
  lesson,
  displayTitle,
  studentName,
  studentId,
  homeroom,
}) => {
  const [copySuccess, setCopySuccess] = useState(false);
  const [copyVocabSuccess, setCopyVocabSuccess] = useState(false);
  const content = lesson.content;

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

    const partsHtml = content.parts.map((part, pIndex) => {
      const allVocabWords = Object.keys(part.vocabulary_explanations);
      let printWords: string[] = [];
      let printDefs: string[] = [];

      if (allVocabWords.length > 0) {
        const selectedWords = seededShuffle([...allVocabWords], `${lesson.id}-part-${pIndex}-vocab-subset-seed`).slice(0, 5);
        printWords = seededShuffle([...selectedWords], `${lesson.id}-print-vocab-${part.part_number}`);
        printDefs = selectedWords.map(w => part.vocabulary_explanations[w]).sort();
      }

      let vocabHtml = '';
      if (printWords.length > 0) {
        vocabHtml = `
<h3 style="font-size:13px;font-weight:bold;margin:10px 0 4px">Vocabulary</h3>
<table style="width:100%;border-collapse:collapse">
<tr>
<td style="width:40%;vertical-align:top;padding-right:12px">
${printWords.map((word) => `<p style="margin:3px 0;font-size:12px">____ &nbsp; ${word}</p>`).join('')}
</td>
<td style="width:60%;vertical-align:top">
${printDefs.map((def, i) => `<p style="margin:3px 0;font-size:12px"><strong>${String.fromCharCode(97 + i)}.</strong> ${def}</p>`).join('')}
</td>
</tr>
</table>`;
      }

      let questionsHtml = '';
      if (part.questions.length > 0) {
        questionsHtml = `
<h3 style="font-size:13px;font-weight:bold;margin:10px 0 4px">Questions</h3>
${part.questions.map((q, i) => {
  if (q.type === 'True/False') {
    return `<p style="margin:4px 0;font-size:12px">${i + 1}. ${q.question} &nbsp;&nbsp; <strong>True</strong> &nbsp; <strong>False</strong></p>`;
  } else if (q.type === 'Multiple Choice' && q.options && q.options.length > 0) {
    return `<div style="margin:6px 0;font-size:12px"><p style="margin:0 0 4px 0">${i + 1}. ${q.question}</p>` +
      `<div style="padding-left:16px">${q.options.map(opt => `<p style="margin:2px 0">☐ ${opt}</p>`).join('')}</div></div>`;
  } else {
    return `<p style="font-size:12px;font-weight:bold;margin:4px 0 2px">${i + 1}. ${q.question}</p><p style="border-bottom:1px solid #ccc;margin:3px 0 10px">&nbsp;</p>`;
  }
}).join('')}`;
      }

      return `
<h2 style="font-size:14px;font-weight:bold;background:#f3f4f6;padding:4px 6px;margin:12px 0 6px">Page ${part.part_number}</h2>
<p style="font-size:12px;line-height:1.6;margin:0 0 10px 0">${part.text.replace(/\n/g, '<br>')}</p>
${vocabHtml}
${questionsHtml}
`;
    }).join('<hr style="border:0;border-top:1px dashed #ccc;margin:16px 0">');

    const ct = getFocusedReaderCriticalThinking(content);
    let criticalThinkingHtml = '';
    if (ct && ct.instructions && ct.instructions.length > 0) {
      criticalThinkingHtml = `
<hr style="border:0;border-top:1px dashed #ccc;margin:16px 0">
<h2 style="font-size:14px;font-weight:bold;background:#f3f4f6;padding:4px 6px;margin:12px 0 6px">${ct.title || 'Critical Thinking & Discussion'}</h2>
${ct.instructions.map((instruction, i) => `
<div style="margin:8px 0">
<p style="font-size:12px;font-weight:bold;margin:4px 0 2px">${i + 1}. ${instruction}</p>
<p style="border-bottom:1px solid #ccc;margin:3px 0 10px">&nbsp;</p>
<p style="border-bottom:1px solid #ccc;margin:3px 0 10px">&nbsp;</p>
</div>
`).join('')}
`;
    }

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

${partsHtml}
${criticalThinkingHtml}

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

  const handleCopyAllVocabForGoogleDocs = async () => {
    const partsHtml = content.parts.map((part) => {
      const allVocabWords = Object.keys(part.vocabulary_explanations || {});
      let printWords: string[] = [];
      let printDefs: string[] = [];

      if (allVocabWords.length > 0) {
        printWords = seededShuffle([...allVocabWords], `${lesson.id}-print-all-vocab-${part.part_number}`);
        printDefs = allVocabWords.map(w => part.vocabulary_explanations[w]).sort();
      }

      let vocabHtml = '';
      if (printWords.length > 0) {
        vocabHtml = `
<h3 style="font-size:13px;font-weight:bold;margin:10px 0 4px">Vocabulary - Page ${part.part_number}</h3>
<table style="width:100%;border-collapse:collapse">
<tr>
<td style="width:40%;vertical-align:top;padding-right:12px">
${printWords.map((word) => `<p style="margin:3px 0;font-size:12px">____ &nbsp; ${word}</p>`).join('')}
</td>
<td style="width:60%;vertical-align:top">
${printDefs.map((def, i) => {
  const getLabel = (idx: number) => {
    if (idx < 26) return String.fromCharCode(97 + idx);
    return String.fromCharCode(97 + Math.floor(idx / 26) - 1) + String.fromCharCode(97 + (idx % 26));
  };
  return `<p style="margin:3px 0;font-size:12px"><strong>${getLabel(i)}.</strong> ${def}</p>`;
}).join('')}
</td>
</tr>
</table>`;
      }

      return vocabHtml;
    }).filter(html => html !== '').join('<hr style="border:0;border-top:1px dashed #ccc;margin:16px 0">');

    if (!partsHtml) return;

    const html = `
<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:750px;margin:0 auto;padding:16px;font-size:13px">
<div style="text-align:right;font-size:13px;margin-bottom:16px;color:#333;">
Name <u>&nbsp;&nbsp;&nbsp;&nbsp;${studentName || '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'}&nbsp;&nbsp;&nbsp;&nbsp;</u>
&nbsp;&nbsp;&nbsp;&nbsp;ID: <u>&nbsp;&nbsp;&nbsp;&nbsp;${studentId || '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'}&nbsp;&nbsp;&nbsp;&nbsp;</u>
&nbsp;&nbsp;&nbsp;&nbsp;Homeroom: <u>&nbsp;&nbsp;&nbsp;&nbsp;${homeroom || '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'}&nbsp;&nbsp;&nbsp;&nbsp;_</u>
</div>
<h1 style="font-size:18px;font-weight:bold;margin:0 0 4px 0">${displayTitle} - All Vocabulary</h1>
<p style="color:#666;margin:0 0 16px 0;font-size:11px">Language: ${lesson.language} | Level: ${lesson.level}</p>

${partsHtml}

</body></html>`;

    try {
      await navigator.clipboard.write([
        new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }) })
      ]);
    } catch {
      try { await navigator.clipboard.writeText(html); } catch { /* ignore */ }
    }
    setCopyVocabSuccess(true);
    setTimeout(() => setCopyVocabSuccess(false), 6000);
  };

  const btnClass = 'inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm';

  return (
    <div className="max-w-4xl mx-auto mb-4 print:hidden">
      <div className="flex gap-3 justify-center">
        <button onClick={handleCopyForGoogleDocs} className={btnClass}>
          {copySuccess ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
          {copySuccess ? 'Copied Worksheet!' : 'Copy Worksheet'}
        </button>
        <button onClick={handleCopyAllVocabForGoogleDocs} className={btnClass}>
          {copyVocabSuccess ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
          {copyVocabSuccess ? 'Copied Vocab!' : 'Copy Vocab'}
        </button>
        <button onClick={() => window.print()} className={btnClass}>
          <Printer className="w-4 h-4" />
          Print
        </button>
      </div>
      {(copySuccess || copyVocabSuccess) && (
        <div className="mt-2 flex items-start gap-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-800 animate-fade-in">
          <Check className="w-4 h-4 mt-0.5 text-green-600 shrink-0" />
          <div className="flex-1">
            <span className="font-semibold">{copyVocabSuccess ? 'Vocabulary copied!' : 'Worksheet copied!'}</span>{' '}
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
