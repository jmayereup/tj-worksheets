import React, { useState } from 'react';
import { Printer, Copy, Check } from 'lucide-react';
import { ParsedLesson, InformationGapContent } from '../../types';

interface InformationGapExportActionsProps {
  lesson: ParsedLesson & { content: InformationGapContent };
  displayTitle: string;
  studentName: string;
  studentId: string;
  homeroom: string;
}

export const InformationGapExportActions: React.FC<InformationGapExportActionsProps> = ({
  lesson,
  displayTitle,
  studentName,
  studentId,
  homeroom,
}) => {
  const [copySuccess, setCopySuccess] = useState(false);
  const content = lesson.content;

  const activities: any[] = Array.isArray(content) 
    ? content 
    : (content.activities || (content.topic ? [{
        topic: content.topic,
        scenario_description: content.scenario_description || '',
        blocks: content.blocks || []
      }] : []));

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
    
    // Generate HTML for a specific player
    const getPlayerHtml = (playerNum: number) => {
      let playerHtml = '';
      
      activities.forEach((activity, aIndex) => {
        const myTextBlocks = activity.blocks.filter((b: any) => b.text_holder_id === playerNum);
        const myQuestions = activity.blocks.flatMap((b: any) => b.questions).filter((q: any) => q.asker_id === playerNum);
        
        const activityTitle = activities.length > 1 ? `Activity ${aIndex + 1}: ${activity.topic || ''}` : '';
        
        let textHtml = '';
        if (myTextBlocks.length > 0) {
          textHtml = `
<div style="background-color:#f4f4f5;padding:6px 12px;margin:8px 0;font-weight:bold;font-size:13px;border-top:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;">
  Your Secret Information
</div>
<p style="font-size:13px;line-height:1.5;margin:8px 0 16px 0">${myTextBlocks.map((b: any) => b.text).join('<br><br>')}</p>
`;
        }
        
        let questionsHtml = '';
        if (myQuestions.length > 0) {
          questionsHtml = `
<div style="background-color:#f4f4f5;padding:6px 12px;margin:8px 0;font-weight:bold;font-size:13px;border-top:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;">
  Questions to Ask Your Partner
</div>
<ol style="margin:8px 0 16px 0;padding-left:24px;">
${myQuestions.map((q: any) => `
<li style="font-weight:bold;margin:0 0 8px 0;font-size:13px">${q.question}</li>`).join('')}
</ol>`;
        }

        if (activityTitle) {
          playerHtml += `<h2 style="font-size:15px;font-weight:bold;margin:16px 0 8px 0;padding-bottom:4px;border-bottom:2px solid #e5e7eb">${activityTitle}</h2>`;
        }
        playerHtml += textHtml + questionsHtml;
      });
      
      const playerLabel = `Player ${String.fromCharCode(64 + playerNum)}`;
      return `
<div style="text-align:right;font-size:13px;margin-bottom:16px;color:#333;">
Name <u>&nbsp;&nbsp;&nbsp;&nbsp;${studentName || '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'}&nbsp;&nbsp;&nbsp;&nbsp;</u>
&nbsp;&nbsp;&nbsp;&nbsp;ID: <u>&nbsp;&nbsp;&nbsp;&nbsp;${studentId || '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'}&nbsp;&nbsp;&nbsp;&nbsp;</u>
&nbsp;&nbsp;&nbsp;&nbsp;Homeroom: <u>&nbsp;&nbsp;&nbsp;&nbsp;${homeroom || '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'}&nbsp;&nbsp;&nbsp;&nbsp;_</u>
</div>
<h1 style="font-size:18px;font-weight:bold;margin:0 0 4px 0">${displayTitle} - ${playerLabel}</h1>
<p style="color:#666;margin:0 0 16px 0;font-size:11px">Language: ${lesson.language} | Level: ${lesson.level} | Role: ${playerLabel}</p>

${originalImageUrl ? `<div style="text-align:center;margin:16px 0"><img src="${originalImageUrl}" alt="Lesson image" style="max-width:100%;height:auto;border-radius:6px" /></div>` : ''}

${playerHtml}
`;
    };

    const player1Html = getPlayerHtml(1);
    const player2Html = getPlayerHtml(2);

    const html = `
<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:750px;margin:0 auto;padding:16px;font-size:13px">
${player1Html}
<br style="page-break-before:always" />
<div style="page-break-before:always"></div>
${player2Html}
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
          Print Both Players
        </button>
      </div>
      {copySuccess && (
        <div className="mt-2 flex items-start gap-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-800 animate-fade-in">
          <Check className="w-4 h-4 mt-0.5 text-green-600 shrink-0" />
          <div className="flex-1">
            <span className="font-semibold">Information Gap copied!</span>{' '}
            Paste it into a Google Doc to print the sheets for both players.
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
