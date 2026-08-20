import { getComponentConfig } from './componentMapper';
import { parseContent, CustomElementAttribute } from './contentFormat';

const escapeHtml = (str: string): string => {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
};

const escapeAttr = (str: string): string => {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;');
};

interface AutoAttrs {
  name: string;
  value: string | null;
  boolean?: boolean;
}

const buildCustomElementHtml = (
  tagName: string,
  attrs: CustomElementAttribute[],
  innerHtml: string,
  autoAttrs: AutoAttrs[]
): string => {
  const autoAttrMap = new Map<string, AutoAttrs>();
  for (const a of autoAttrs) {
    autoAttrMap.set(a.name.toLowerCase(), a);
  }

  const processedAttrNames = new Set<string>();
  const attrParts: string[] = [];
  const isTest = tagName.toLowerCase() === 'tj-test' || tagName.toLowerCase() === 'tj-quiz-element';

  // 1. Process user-provided attributes in order, replacing with autoAttrs if matched or updating test aliases
  for (const attr of attrs) {
    const lowerName = attr.name.toLowerCase();
    processedAttrNames.add(lowerName);

    if (isTest) {
      if (['start-code', 'start_code', 'start-quiz-code'].includes(lowerName)) {
        processedAttrNames.add('start-code');
        const auto = autoAttrMap.get('start-code');
        if (auto && auto.value) {
          attrParts.push(`start-code="${escapeAttr(auto.value)}"`);
        }
        continue;
      }
      if (['teacher-code', 'teacher_code', 'submit-code', 'submit_code', 'reset-code', 'reset_code'].includes(lowerName)) {
        processedAttrNames.add('teacher-code');
        const auto = autoAttrMap.get('teacher-code');
        if (auto && auto.value) {
          attrParts.push(`teacher-code="${escapeAttr(auto.value)}"`);
        }
        continue;
      }
      if (['pass-threshold', 'pass_threshold'].includes(lowerName)) {
        processedAttrNames.add('pass-threshold');
        const auto = autoAttrMap.get('pass-threshold');
        if (auto && auto.value) {
          attrParts.push(`pass-threshold="${escapeAttr(auto.value)}"`);
        }
        continue;
      }
      if (['test-mode', 'practice-mode'].includes(lowerName)) {
        processedAttrNames.add('test-mode');
        const auto = autoAttrMap.get('test-mode');
        if (auto && auto.boolean) {
          attrParts.push('test-mode');
        }
        continue;
      }
    }

    if (autoAttrMap.has(lowerName)) {
      const auto = autoAttrMap.get(lowerName)!;
      if (auto.boolean) {
        if (auto.value === '' || auto.value === 'true' || auto.value === '1') {
          attrParts.push(auto.name);
        }
      } else if (auto.value != null && auto.value !== '') {
        attrParts.push(`${auto.name}="${escapeAttr(auto.value)}"`);
      }
    } else {
      attrParts.push(`${attr.name}="${escapeAttr(attr.value)}"`);
    }
  }

  // 2. Append auto-attrs that were not already in attrs
  for (const attr of autoAttrs) {
    const lowerName = attr.name.toLowerCase();
    if (processedAttrNames.has(lowerName)) continue;
    if (attr.boolean) {
      if (attr.value === '' || attr.value === 'true' || attr.value === '1') {
        attrParts.push(attr.name);
      }
    } else if (attr.value != null && attr.value !== '') {
      attrParts.push(`${attr.name}="${escapeAttr(attr.value)}"`);
    }
  }

  const attrString = attrParts.length ? ' ' + attrParts.join(' ') : '';

  // 3. Overwrite embedded JSON inside innerHtml if present for test types
  let finalInnerHtml = innerHtml;
  if (isTest) {
    const startCodeVal = autoAttrMap.get('start-code')?.value;
    const teacherCodeVal = autoAttrMap.get('teacher-code')?.value;
    const passThresholdVal = autoAttrMap.get('pass-threshold')?.value;
    const testModeVal = Boolean(autoAttrMap.get('test-mode')?.boolean);

    finalInnerHtml = finalInnerHtml.replace(
      /(<script\b[^>]*type=["']application\/json["'][^>]*>)([\s\S]*?)(<\/script>)/i,
      (_, openTag, jsonStr, closeTag) => {
        try {
          const parsed = JSON.parse(jsonStr);
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            if (startCodeVal) {
              parsed.startCode = startCodeVal;
              if ('start-code' in parsed) parsed['start-code'] = startCodeVal;
              if ('start_code' in parsed) parsed['start_code'] = startCodeVal;
            }
            if (teacherCodeVal) {
              parsed.teacherCode = teacherCodeVal;
              if ('teacher-code' in parsed) parsed['teacher-code'] = teacherCodeVal;
              if ('teacher_code' in parsed) parsed['teacher_code'] = teacherCodeVal;
            }
            if (passThresholdVal) {
              parsed.passThreshold = passThresholdVal;
              if ('pass-threshold' in parsed) parsed['pass-threshold'] = passThresholdVal;
              if ('pass_threshold' in parsed) parsed['pass_threshold'] = passThresholdVal;
            }
            parsed.testMode = testModeVal;
            if ('test-mode' in parsed) parsed['test-mode'] = testModeVal;
            if ('test_mode' in parsed) parsed['test_mode'] = testModeVal;

            return `${openTag}\n${JSON.stringify(parsed, null, 2)}\n  ${closeTag}`;
          }
        } catch {
          // ignore parsing error
        }
        return `${openTag}${jsonStr}${closeTag}`;
      }
    );
  }

  return `<${tagName}${attrString}>\n  ${finalInnerHtml}\n</${tagName}>`;
};

export const compileLessonHtml = (lesson: any, rawHtml: string, overrideSubmissionUrl?: string): string => {
  const componentConfig = getComponentConfig(lesson.lessonType);
  const title = lesson.title || 'Interactive Worksheet';
  const description = lesson.seo || '';
  const language = lesson.language || '';
  const isTest = ['tj-test', 'test', 'quiz-element'].includes(lesson.lessonType);
  const startCode = lesson.startCode || lesson.customConfig?.startCode || (isTest ? '6767' : '');
  const teacherCode = lesson.teacherCode || (isTest ? '7676' : '6767');
  const passThreshold = lesson.passThreshold || lesson.customConfig?.passThreshold || (isTest ? '75%' : '');
  const testMode = Boolean(lesson.customConfig?.testMode ?? lesson.testMode);

  const submissionUrl = 
    overrideSubmissionUrl || 
    lesson.submissionUrl || 
    lesson.customConfig?.submissionUrl || 
    (typeof process !== 'undefined' ? (process.env.VITE_GAS_SUBMISSION_URL || process.env.VITE_SUBMISSION_URL) : '') || 
    '';

  // 1. Build the interactive component HTML
  let elementHtml = '';
  if (componentConfig) {
    const autoAttrs: AutoAttrs[] = [];
    if (isTest) {
      if (startCode) {
        autoAttrs.push({ name: 'start-code', value: startCode });
      }
      if (teacherCode) {
        autoAttrs.push({ name: 'teacher-code', value: teacherCode });
      }
      if (passThreshold) {
        autoAttrs.push({ name: 'pass-threshold', value: passThreshold });
      }
    } else {
      if (teacherCode) {
        autoAttrs.push({ name: 'code', value: teacherCode });
      }
    }

    if (submissionUrl) {
      autoAttrs.push({ name: 'submission-url', value: submissionUrl });
    }

    if (lesson.lessonType === 'lbl-reader') {
      autoAttrs.push({ name: 'lang-original', value: language });
      autoAttrs.push({ name: 'lang-translation', value: 'Thai' });
      autoAttrs.push({ name: 'story-title', value: title });
    } else if (lesson.lessonType === 'listening' && lesson.audioFileUrl) {
      autoAttrs.push({ name: 'audio-listening', value: lesson.audioFileUrl });
    }

    if (testMode) {
      autoAttrs.push({ name: 'test-mode', value: '', boolean: true });
    }

    // Detect content format. Strings starting with '<' are user-authored
    // custom web components; everything else is treated as JSON (object) or
    // legacy markdown (string that doesn't start with '<').
    let contentMode: 'json' | 'html' | 'markdown' = 'json';
    let parsedElement: { tagName: string; attrs: CustomElementAttribute[]; innerHtml: string } | null = null;

    if (typeof lesson.content === 'string') {
      const detected = parseContent(lesson.content);
      if (detected.format === 'html') {
        contentMode = 'html';
        parsedElement = detected.value;
      } else {
        contentMode = 'markdown';
      }
    }

    if (contentMode === 'html' && parsedElement) {
      const userElement = buildCustomElementHtml(
        parsedElement.tagName,
        parsedElement.attrs,
        parsedElement.innerHtml,
        autoAttrs
      );
      elementHtml = `<!-- TJ ${parsedElement.tagName} Component (user-authored) -->
${userElement}

<script src="${componentConfig.script}" type="module" defer></script>`;
    } else if (contentMode === 'markdown' && typeof lesson.content === 'string') {
      elementHtml = `<!-- TJ ${componentConfig.tag} Component -->
<${componentConfig.tag} ${autoAttrs.filter(a => !a.boolean).map(a => `${a.name}="${escapeHtml(a.value ?? '')}"`).join(' ')}${autoAttrs.some(a => a.boolean) ? ' ' + autoAttrs.filter(a => a.boolean).map(a => a.name).join(' ') : ''}>
  <script type="text/markdown">
${lesson.content}
  </script>
</${componentConfig.tag}>

<script src="${componentConfig.script}" type="module" defer></script>`;
    } else {
      let finalJsonContent = lesson.content;
      if (finalJsonContent && typeof finalJsonContent === 'object' && !Array.isArray(finalJsonContent)) {
        finalJsonContent = { ...finalJsonContent };
        if (isTest) {
          finalJsonContent.startCode = startCode;
          finalJsonContent.teacherCode = teacherCode;
          finalJsonContent.testMode = testMode;
          if (passThreshold) finalJsonContent.passThreshold = passThreshold;
          if ('start-code' in finalJsonContent) finalJsonContent['start-code'] = startCode;
          if ('start_code' in finalJsonContent) finalJsonContent['start_code'] = startCode;
          if ('teacher-code' in finalJsonContent) finalJsonContent['teacher-code'] = teacherCode;
          if ('teacher_code' in finalJsonContent) finalJsonContent['teacher_code'] = teacherCode;
          if ('test-mode' in finalJsonContent) finalJsonContent['test-mode'] = testMode;
          if ('test_mode' in finalJsonContent) finalJsonContent['test_mode'] = testMode;
          if ('pass-threshold' in finalJsonContent) finalJsonContent['pass-threshold'] = passThreshold;
          if ('pass_threshold' in finalJsonContent) finalJsonContent['pass_threshold'] = passThreshold;
        }
      }

      elementHtml = `<!-- TJ ${componentConfig.tag} Component -->
<${componentConfig.tag} ${autoAttrs.filter(a => !a.boolean).map(a => `${a.name}="${escapeHtml(a.value ?? '')}"`).join(' ')}${autoAttrs.some(a => a.boolean) ? ' ' + autoAttrs.filter(a => a.boolean).map(a => a.name).join(' ') : ''}>
  <script type="application/json">
${JSON.stringify(finalJsonContent, null, 2)}
  </script>
</${componentConfig.tag}>

<script src="${componentConfig.script}" type="module" defer></script>`;
    }
  } else {
    // Fallback standard worksheet
    const embedData = JSON.stringify({
      id: lesson.id,
      title: lesson.title,
      level: lesson.level,
      language: lesson.language,
      tags: lesson.tags,
      created: lesson.created,
      updated: lesson.updated,
      imageUrl: lesson.imageUrl,
      audioFileUrl: lesson.audioFileUrl,
      isVideoLesson: lesson.isVideoLesson,
      videoUrl: lesson.videoUrl,
      content: lesson.content,
      lessonType: lesson.lessonType,
      creatorId: lesson.creatorId,
      seo: lesson.seo,
      html: rawHtml,
      customConfig: lesson.customConfig
    }, null, 2);

    const codeAttr = teacherCode ? ` code="${escapeHtml(teacherCode)}"` : '';

    elementHtml = `<!-- TJ PocketBase Worksheet Web Component -->
<tj-pocketbase-worksheet${codeAttr}>
  <script type="application/json">
${embedData}
  </script>
</tj-pocketbase-worksheet>

<script src="https://worksheets.teacherjake.com/wc/tj-pocketbase-worksheet.es.js" type="module" defer></script>`;
  }

  // 2. Locate or append the element inside the raw user HTML
  const placeholderRegex = /<(?:lesson-component|web-component)\b[^>]*>(?:<\/(?:lesson-component|web-component)>)?|<(?:lesson-component|web-component)\b[^>]*\/>/i;
  let bodyHtml = '';
  if (placeholderRegex.test(rawHtml)) {
    bodyHtml = rawHtml.replace(placeholderRegex, elementHtml);
  } else {
    bodyHtml = `${rawHtml}\n${elementHtml}`;
  }

  const isSelfHeaderComponent = !componentConfig || componentConfig.tag === 'tj-chapter-book' || componentConfig.tag === 'tj-pocketbase-worksheet';
  const headerHtml = isSelfHeaderComponent ? '' : `\n  <header class="tj-worksheet-header mb-6 text-center">
    <h1 class="text-3xl font-black text-green-900 tracking-tight mb-2">${escapeHtml(title)}</h1>
    ${description ? `<p class="text-sm text-gray-500 font-medium italic mt-1">${escapeHtml(description)}</p>` : ''}
  </header>`;

  return `<!-- TJ Language Learning Worksheet (Pre-compiled) -->
<link rel="stylesheet" href="https://worksheets.teacherjake.com/wc/language-learning-worksheets.css">

<article class="tj-worksheet-compiled prose mx-auto p-4 sm:p-6">${headerHtml}
  
  <div class="tj-worksheet-body">
    ${bodyHtml}
  </div>
</article>`.trim();
};

/**
 * Helper used by LessonView / WebComponentPreview to render the interactive
 * element for live preview. Mirrors the wrapping logic of compileLessonHtml
 * but returns just the element HTML (no script tag, no outer article).
 */
export const buildPreviewElementHtml = (
  lesson: any,
  overrideSubmissionUrl?: string
): { elementHtml: string; contentMode: 'json' | 'html' | 'markdown' } => {
  const componentConfig = getComponentConfig(lesson.lessonType);
  if (!componentConfig) {
    return { elementHtml: '', contentMode: 'json' };
  }

  const isTest = ['tj-test', 'test', 'quiz-element'].includes(lesson.lessonType);
  const startCode = lesson.startCode || lesson.customConfig?.startCode || (isTest ? '6767' : '');
  const teacherCode = lesson.teacherCode || (isTest ? '7676' : '6767');
  const passThreshold = lesson.passThreshold || lesson.customConfig?.passThreshold || (isTest ? '75%' : '');
  const testMode = Boolean(lesson.customConfig?.testMode ?? lesson.testMode);
  const language = lesson.language || '';
  const submissionUrl = 
    overrideSubmissionUrl || 
    lesson.submissionUrl || 
    lesson.customConfig?.submissionUrl || 
    (typeof process !== 'undefined' ? (process.env.VITE_GAS_SUBMISSION_URL || process.env.VITE_SUBMISSION_URL) : '') || 
    '';

  const autoAttrs: AutoAttrs[] = [];
  if (isTest) {
    if (startCode) {
      autoAttrs.push({ name: 'start-code', value: startCode });
    }
    if (teacherCode) {
      autoAttrs.push({ name: 'teacher-code', value: teacherCode });
    }
    if (passThreshold) {
      autoAttrs.push({ name: 'pass-threshold', value: passThreshold });
    }
  } else {
    if (teacherCode) {
      autoAttrs.push({ name: 'code', value: teacherCode });
    }
  }

  if (submissionUrl) {
    autoAttrs.push({ name: 'submission-url', value: submissionUrl });
  }
  if (lesson.lessonType === 'lbl-reader') {
    autoAttrs.push({ name: 'lang-original', value: language });
    autoAttrs.push({ name: 'lang-translation', value: 'Thai' });
    autoAttrs.push({ name: 'story-title', value: lesson.title || '' });
  } else if (lesson.lessonType === 'listening' && lesson.audioFileUrl) {
    autoAttrs.push({ name: 'audio-listening', value: lesson.audioFileUrl });
  }
  if (testMode) {
    autoAttrs.push({ name: 'test-mode', value: '', boolean: true });
  }

  const boolAttrs = autoAttrs.filter(a => a.boolean);
  const stringAttrs = autoAttrs.filter(a => !a.boolean);
  const stringAttrString = stringAttrs
    .map(a => `${a.name}="${escapeHtml(a.value ?? '')}"`)
    .join(' ');
  const boolAttrString = boolAttrs.map(a => a.name).join(' ');
  const baseAttrString = [stringAttrString, boolAttrString].filter(Boolean).join(' ');

  if (typeof lesson.content === 'string') {
    const detected = parseContent(lesson.content);
    if (detected.format === 'html') {
      const userElement = buildCustomElementHtml(
        detected.value.tagName,
        detected.value.attrs,
        detected.value.innerHtml,
        autoAttrs
      );
      return { elementHtml: userElement, contentMode: 'html' };
    }
    return {
      elementHtml: `<${componentConfig.tag}${baseAttrString ? ' ' + baseAttrString : ''}>
  <script type="text/markdown">${lesson.content}</script>
</${componentConfig.tag}>`,
      contentMode: 'markdown',
    };
  }

  let finalJsonContent = lesson.content;
  if (finalJsonContent && typeof finalJsonContent === 'object' && !Array.isArray(finalJsonContent)) {
    finalJsonContent = { ...finalJsonContent };
    if (isTest) {
      finalJsonContent.startCode = startCode;
      finalJsonContent.teacherCode = teacherCode;
      finalJsonContent.testMode = testMode;
      if (passThreshold) finalJsonContent.passThreshold = passThreshold;
      if ('start-code' in finalJsonContent) finalJsonContent['start-code'] = startCode;
      if ('start_code' in finalJsonContent) finalJsonContent['start_code'] = startCode;
      if ('teacher-code' in finalJsonContent) finalJsonContent['teacher-code'] = teacherCode;
      if ('teacher_code' in finalJsonContent) finalJsonContent['teacher_code'] = teacherCode;
      if ('test-mode' in finalJsonContent) finalJsonContent['test-mode'] = testMode;
      if ('test_mode' in finalJsonContent) finalJsonContent['test_mode'] = testMode;
      if ('pass-threshold' in finalJsonContent) finalJsonContent['pass-threshold'] = passThreshold;
      if ('pass_threshold' in finalJsonContent) finalJsonContent['pass_threshold'] = passThreshold;
    }
  }

  return {
    elementHtml: `<${componentConfig.tag}${baseAttrString ? ' ' + baseAttrString : ''}>
  <script type="application/json">
${JSON.stringify(finalJsonContent, null, 2)}
  </script>
</${componentConfig.tag}>`,
    contentMode: 'json',
  };
};
