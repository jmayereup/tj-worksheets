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
  const existingAttrNames = new Set(attrs.map(a => a.name.toLowerCase()));
  const attrParts: string[] = [];

  // Preserve user-provided attributes in their original order
  for (const attr of attrs) {
    attrParts.push(`${attr.name}="${escapeAttr(attr.value)}"`);
  }

  // Append auto-attrs that the user didn't provide (dedup, case-insensitive)
  for (const attr of autoAttrs) {
    if (existingAttrNames.has(attr.name.toLowerCase())) continue;
    if (attr.boolean) {
      if (attr.value === '' || attr.value === 'true' || attr.value === '1') {
        attrParts.push(attr.name);
      }
    } else if (attr.value != null && attr.value !== '') {
      attrParts.push(`${attr.name}="${escapeAttr(attr.value)}"`);
    }
  }

  const attrString = attrParts.length ? ' ' + attrParts.join(' ') : '';
  return `<${tagName}${attrString}>\n  ${innerHtml}\n</${tagName}>`;
};

export const compileLessonHtml = (lesson: any, rawHtml: string): string => {
  const componentConfig = getComponentConfig(lesson.lessonType);
  const title = lesson.title || 'Interactive Worksheet';
  const description = lesson.seo || '';
  const teacherCode = lesson.teacherCode || '';
  const language = lesson.language || '';

  // 1. Build the interactive component HTML
  let elementHtml = '';
  if (componentConfig) {
    const autoAttrs: AutoAttrs[] = [];
    if (teacherCode) {
      autoAttrs.push({ name: 'code', value: teacherCode });
    }

    if (lesson.lessonType === 'lbl-reader') {
      autoAttrs.push({ name: 'lang-original', value: language });
      autoAttrs.push({ name: 'lang-translation', value: 'Thai' });
      autoAttrs.push({ name: 'story-title', value: title });
    } else if (lesson.lessonType === 'listening' && lesson.audioFileUrl) {
      autoAttrs.push({ name: 'audio-listening', value: lesson.audioFileUrl });
    }

    if (lesson.customConfig?.testMode) {
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
      elementHtml = `<!-- TJ ${componentConfig.tag} Component -->
<${componentConfig.tag} ${autoAttrs.filter(a => !a.boolean).map(a => `${a.name}="${escapeHtml(a.value ?? '')}"`).join(' ')}${autoAttrs.some(a => a.boolean) ? ' ' + autoAttrs.filter(a => a.boolean).map(a => a.name).join(' ') : ''}>
  <script type="application/json">
${JSON.stringify(lesson.content, null, 2)}
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
      html: rawHtml, // Include raw instructions in the JSON payload
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
    // If no placeholder is found, append it at the end
    bodyHtml = `${rawHtml}\n${elementHtml}`;
  }

  // 3. Wrap it in a clean article wrapper that matches standard styling and links the stylesheet
  // Components that internally render their own header (such as tj-pocketbase-worksheet and tj-chapter-book)
  // do not need an external static header to avoid duplicate headers.
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
  lesson: any
): { elementHtml: string; contentMode: 'json' | 'html' | 'markdown' } => {
  const componentConfig = getComponentConfig(lesson.lessonType);
  if (!componentConfig) {
    return { elementHtml: '', contentMode: 'json' };
  }

  const teacherCode = lesson.teacherCode || '';
  const language = lesson.language || '';

  const autoAttrs: AutoAttrs[] = [];
  if (teacherCode) {
    autoAttrs.push({ name: 'code', value: teacherCode });
  }
  if (lesson.lessonType === 'lbl-reader') {
    autoAttrs.push({ name: 'lang-original', value: language });
    autoAttrs.push({ name: 'lang-translation', value: 'Thai' });
    autoAttrs.push({ name: 'story-title', value: lesson.title || '' });
  } else if (lesson.lessonType === 'listening' && lesson.audioFileUrl) {
    autoAttrs.push({ name: 'audio-listening', value: lesson.audioFileUrl });
  }
  if (lesson.customConfig?.testMode) {
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

  return {
    elementHtml: `<${componentConfig.tag}${baseAttrString ? ' ' + baseAttrString : ''}>
  ${JSON.stringify(lesson.content)}
</${componentConfig.tag}>`,
    contentMode: 'json',
  };
};
