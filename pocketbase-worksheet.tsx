import { createRoot } from 'react-dom/client';
import React from 'react';
import { LessonView } from './components/Lesson/LessonView';
import { ErrorBoundary } from './components/UI/ErrorBoundary';
import styles from './index.css?inline';

export class TJPocketBaseWorksheet extends HTMLElement {
  private root: any = null;
  private mountPoint: HTMLDivElement | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  static get observedAttributes() {
    return ['code', 'submission-url', 'submission_url'];
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if ((name === 'code' || name === 'submission-url' || name === 'submission_url') && oldValue !== newValue) {
      this.render();
    }
  }

  get code(): string {
    return this.getAttribute('code') || '';
  }

  set code(val: string) {
    if (val) {
      this.setAttribute('code', val);
    } else {
      this.removeAttribute('code');
    }
  }

  get submissionUrl(): string {
    return this.getAttribute('submission-url') || this.getAttribute('submission_url') || '';
  }

  set submissionUrl(val: string) {
    if (val) {
      this.setAttribute('submission-url', val);
    } else {
      this.removeAttribute('submission-url');
    }
  }

  connectedCallback() {
    this.classList.add('tj-printable-worksheet');
    this.injectGlobalPrintStyles();
    this.upgradeProperty('code');
    this.upgradeProperty('submissionUrl');
    this.render();
  }

  private upgradeProperty(prop: string) {
    if (this.hasOwnProperty(prop)) {
      const value = (this as any)[prop];
      delete (this as any)[prop];
      (this as any)[prop] = value;
    }
  }

  private injectGlobalPrintStyles() {
    // Check if styles already injected
    if (document.getElementById('tj-worksheet-print-isolation')) return;

    const style = document.createElement('style');
    style.id = 'tj-worksheet-print-isolation';
    style.textContent = `
      @media print {
        /* Explicitly hide common blog clutter on the host page */
        header, footer, nav, .sidebar, .comments-section, .nav-menu, .recommendations, .astro-header, .astro-footer {
          display: none !important;
        }
        
        /* Ensure the custom element itself is visible and full width */
        tj-pocketbase-worksheet {
          display: block !important;
          width: 100% !important;
        }

        /* Isolation logic */
        :root:has(.tj-printable-worksheet) body *:not(:has(.tj-printable-worksheet)):not(.tj-printable-worksheet):not(.tj-printable-worksheet *) {
          display: none !important;
        }
        :root:has(.tj-printable-worksheet) body :has(.tj-printable-worksheet) {
          background: transparent !important;
          border: none !important;
          margin: 0 !important;
          padding: 0 !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  render() {
    if (!this.shadowRoot) return;

    // Try to find a script tag first
    let jsonContent = '';
    // Check light DOM for the script tag
    const scriptTag = this.querySelector('script[type="application/json"]');
    
    if (scriptTag) {
      jsonContent = scriptTag.textContent || '';
    } else {
      // Fallback to text content of the element itself (light DOM)
      if (!this.mountPoint) {
        jsonContent = this.textContent || '';
      }
    }

    if (!jsonContent.trim() && !this.mountPoint) {
      return; // Do nothing if empty and not already rendered
    }

    try {
      let lessonData: any;
      const trimmedContent = jsonContent.trim();
      
      if (trimmedContent) {
        let rawData: any;
        try {
          rawData = JSON.parse(trimmedContent);
        } catch (parseError: any) {
          console.error('TJ Worksheet: JSON Parse Error', {
            error: parseError.message,
            contentSnippet: trimmedContent.substring(0, 100) + '...',
            length: trimmedContent.length
          });
          throw new Error(`Invalid JSON: ${parseError.message}`);
        }
        
        // Map PocketBase JSON structure to ParsedLesson
        lessonData = {
          id: rawData.id,
          title: rawData.title,
          level: rawData.level,
          language: rawData.language,
          tags: rawData.tags || [],
          created: rawData.created,
          updated: rawData.updated,
          imageUrl: rawData.image ? rawData.image : undefined,
          audioFileUrl: rawData.audioFile ? rawData.audioFile : undefined,
          isVideoLesson: rawData.isVideoLesson,
          videoUrl: rawData.videoUrl,
          content: rawData.content,
          image: rawData.image || '',
          collectionId: rawData.collectionId || '',
          collectionName: rawData.collectionName || '',
          lessonType: rawData.lessonType,
          creatorId: rawData.creatorId,
          seo: rawData.seo,
          html: rawData.html || '',
          teacherCode: rawData.teacherCode
        };
      }

      if (!this.mountPoint) {
        // Clear shadow root and inject styles
        this.shadowRoot.innerHTML = '';
        
        const styleElement = document.createElement('style');
        styleElement.textContent = `${styles}\n:host { display: block; width: 100%; }`;
        this.shadowRoot.appendChild(styleElement);
        
        // Create a mount point for React
        this.mountPoint = document.createElement('div');
        this.mountPoint.className = 'tj-worksheet-wrapper';
        this.shadowRoot.appendChild(this.mountPoint);
      }

      if (!this.root && this.mountPoint) {
        this.root = createRoot(this.mountPoint);
      }

      if (this.root) {
        this.root.render(
          <React.StrictMode>
            <ErrorBoundary>
              {lessonData && <LessonView lesson={lessonData} teacherCode={this.code} submissionUrl={this.submissionUrl} />}
            </ErrorBoundary>
          </React.StrictMode>
        );
      }
    } catch (e: any) {
      console.error('TJ Worksheet: Failed to render component', e);
      if (!this.mountPoint && this.shadowRoot) {
        this.shadowRoot.innerHTML = `
          <div style="color: #ef4444; padding: 1.5rem; border: 1px solid #fee2e2; border-radius: 0.75rem; background: #fef2f2; font-family: sans-serif;">
            <h3 style="margin-top: 0; font-weight: 800;">Worksheet Error</h3>
            <p style="font-size: 0.875rem;">${e.message || 'Failed to load worksheet data.'}</p>
            <p style="font-size: 0.75rem; color: #991b1b; margin-bottom: 0;">Check the browser console for more technical details.</p>
          </div>
        `;
      }
    }
  }
}

if (!customElements.get('tj-pocketbase-worksheet')) {
  customElements.define('tj-pocketbase-worksheet', TJPocketBaseWorksheet);
}
