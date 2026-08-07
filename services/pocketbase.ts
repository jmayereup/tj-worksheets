import PocketBase from 'pocketbase';
import { LessonRecord, ParsedLesson, LessonContent } from '../types';
import { compileLessonHtml } from '../utils/htmlCompiler';
import { normalizeContent } from '../utils/contentFormat';
import { config } from '../config';

// Initialize PocketBase
// Note: We use the URL provided in the original application
const PB_URL = (typeof process !== 'undefined' && process.env?.POCKETBASE_URL) || 'https://blog.teacherjake.com';
const FILES_BASE_URL = (typeof process !== 'undefined' && process.env?.FILES_BASE_URL) || 'https://files.teacherjake.com';

const createPB = () => {
  try {
    // Check if localStorage is available
    localStorage.getItem('test');
    return new PocketBase(PB_URL);
  } catch (e) {
    console.warn("localStorage not available, using memory store");
    // PocketBase automatically falls back to an internal memory store 
    // if it can't find a global localStorage or if it fails.
    // But we can be explicit or just handle the error.
    return new PocketBase(PB_URL);
  }
};

const pb = createPB();
pb.autoCancellation(false);

export const getFileUrl = (record: LessonRecord | { collectionId: string, id: string }, filename: string, _queryParams?: Record<string, any>) => {
  if (!filename) return '';
  const collection = (record as any).collectionId || (record as any).collectionName;
  const id = (record as any).id;
  
  if (collection && id) {
    return `${FILES_BASE_URL}/${collection}/${id}/${filename}`;
  }
  
  // Fallback to SDK if record is incomplete (though should be avoided for S3 direct access)
  return pb.files.getURL(record as any, filename);
};

// Auth methods
export const loginWithEmail = async (email: string, password: string) => {
  // Auth against the `users` collection. The worksheets rule
  // `@request.auth.isAdmin = true` checks the isAdmin boolean on the
  // authenticated user record, so we also verify that here and surface
  // a clear error if the account is not an admin.
  try {
    const auth = await pb.collection('users').authWithPassword(email, password);
    const record: any = pb.authStore.record;
    if (!record || record.isAdmin !== true) {
      pb.authStore.clear();
      throw new Error('This account does not have admin access.');
    }
    return auth;
  } catch (err: any) {
    if (err?.status === 400 || err?.status === 401) {
      throw new Error('Invalid email or password.');
    }
    throw err;
  }
};

export const logout = () => {
  pb.authStore.clear();
};

export const getCurrentUser = () => {
  return pb.authStore.record;
};

export const isAuthenticated = () => {
  return pb.authStore.isValid;
};

export const isAdmin = () => {
  const record: any = pb.authStore.record;
  return pb.authStore.isValid && record?.collectionName === 'users' && record?.isAdmin === true;
};

// Re-validates the current session by calling authRefresh, which re-fetches
// the user record and updates the JWT snapshot. This catches:
//   - tokens issued before isAdmin was set to true
//   - tokens whose user account has since had isAdmin revoked
//   - deleted user accounts
// Returns true if the refreshed session is still an admin, false otherwise
// (and clears the auth store in the non-admin case).
export const requireAdmin = async (): Promise<boolean> => {
  if (!pb.authStore.isValid) return false;
  const record: any = pb.authStore.record;
  if (record?.collectionName !== 'users') return false;

  try {
    await pb.collection('users').authRefresh();
  } catch (err: any) {
    if (err?.status === 401 || err?.status === 404) {
      pb.authStore.clear();
    }
    return false;
  }

  if (!isAdmin()) {
    pb.authStore.clear();
    return false;
  }
  return true;
};

const parseLessonContent = (content: string | LessonContent): LessonContent | string => {
  return normalizeContent(content);
};

const getYouTubeId = (url: string) => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url?.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

export const fetchLessons = async (language: string, level: string) => {
  try {
    let filter = `language = "${language}"`;
    if (level !== 'All') {
      filter += ` && level = "${level}"`;
    }

    const records = await pb.collection('worksheets').getFullList<LessonRecord>({
      filter: filter,
      sort: '-created',
    });

    return records.map(record => {
      const content = normalizeContent(record.content);
      const title = record.title || (content && typeof content === 'object' ? (content as any).title : null) || 'Untitled';

      // Extract a snippet for the description, removing the title if it's at the start
      let description = (content && typeof content === 'object' ? (content as any).readingText : '') || '';
      if (description.startsWith(title)) {
        description = description.substring(title.length).trim();
      }
      description = description.substring(0, 120) + (description.length > 120 ? '...' : '');

      let imageUrl = record.image ? getFileUrl(record, record.image) : undefined;

      // Fallback to YouTube thumbnail if no image uploaded
      if (!imageUrl && record.videoUrl) {
        const ytId = getYouTubeId(record.videoUrl);
        if (ytId) {
          imageUrl = `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`;
        }
      }

      return {
        ...record,
        title,
        content,
        imageUrl,
        description,
        collectionId: record.collectionId || '',
        collectionName: record.collectionName || ''
      };
    });
  } catch (error) {
    console.error("Error fetching lessons:", error);
    throw error;
  }
};

export const fetchLessonById = async (id: string): Promise<ParsedLesson> => {
  try {
    const record = await pb.collection('worksheets').getOne<LessonRecord>(id);
    const content = parseLessonContent(record.content);

    // If DB has a title, ensure it overrides the JSON content title
    if (record.title && content && typeof content === 'object' && 'title' in content) {
      (content as any).title = record.title;
    }

    return {
      ...record,
      content,
      imageUrl: record.image ? getFileUrl(record, record.image) : undefined,
      audioFileUrl: record.audioFile ? getFileUrl(record, record.audioFile) : undefined
    };
  } catch (error) {
    console.error(`Error fetching lesson ${id}:`, error);
    throw error;
  }
};

export const fetchAllLessons = async (creatorId?: string) => {
  try {
    const options: any = {
      sort: '-created',
    };

    if (creatorId) {
      options.filter = `creatorId = "${creatorId}"`;
    }

    const records = await pb.collection('worksheets').getFullList<LessonRecord>(options);

    return records.map(record => {
      const content = normalizeContent(record.content);
      const title = record.title || (content && typeof content === 'object' ? (content as any).title : null) || 'Untitled';
      
      let imageUrl = record.image ? getFileUrl(record, record.image) : undefined;
      if (!imageUrl && record.videoUrl) {
        const ytId = getYouTubeId(record.videoUrl);
        if (ytId) imageUrl = `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`;
      }

      return {
        ...record,
        title,
        content,
        imageUrl,
        collectionId: record.collectionId || '',
        collectionName: record.collectionName || ''
      };
    });
  } catch (error) {
    console.error("Error fetching all lessons:", error);
    throw error;
  }
};

export interface PaginatedLessonsResponse {
  page: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
  items: any[];
}

export const fetchPaginatedLessons = async (
  page: number = 1,
  perPage: number = 20,
  searchQuery?: string,
  creatorId?: string,
  language?: string,
  lessonType?: string
): Promise<PaginatedLessonsResponse> => {
  try {
    const options: any = {
      sort: '-created',
      fields: 'id,collectionId,collectionName,title,level,language,lessonType,created,image,videoUrl,creatorId,seo:excerpt(150,true)'
    };

    const filters: string[] = [];
    if (creatorId) {
      filters.push(pb.filter('creatorId = {:creatorId}', { creatorId }));
    }
    if (searchQuery) {
      filters.push(pb.filter('title ~ {:search} || seo ~ {:search}', { search: searchQuery }));
    }
    if (language && language !== 'All') {
      filters.push(pb.filter('language = {:language}', { language }));
    }
    if (lessonType && lessonType !== 'All') {
      filters.push(pb.filter('lessonType = {:lessonType}', { lessonType }));
    }

    if (filters.length > 0) {
      options.filter = filters.join(' && ');
    }

    const unparsedResult = await pb.collection('worksheets').getList(page, perPage, options);

    const mappedItems = unparsedResult.items.map(record => {
      const title = record.title || 'Untitled';
      
      let imageUrl = record.image ? getFileUrl({ collectionId: record.collectionId, id: record.id }, record.image) : undefined;
      
      // Let's ensure getFileUrl works using the record even if partially populated.
      // Since 'image' is returned, we need collectionId/collectionName or just use id.
      if (!imageUrl && record.videoUrl) {
        const ytId = getYouTubeId(record.videoUrl);
        if (ytId) imageUrl = `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`;
      }

      return {
        ...record,
        title,
        imageUrl,
      };
    });

    return {
      page: unparsedResult.page,
      perPage: unparsedResult.perPage,
      totalItems: unparsedResult.totalItems,
      totalPages: unparsedResult.totalPages,
      items: mappedItems
    };
  } catch (error) {
    console.error("Error fetching paginated lessons:", error);
    throw error;
  }
};

// Helper to compile HTML for a saved record
const compileHtmlForRecord = (record: any): string => {
  const imageUrl = record.image ? getFileUrl(record, record.image) : undefined;
  const audioFileUrl = record.audioFile ? getFileUrl(record, record.audioFile) : undefined;

  const parseJSON = (val: any) => {
    if (typeof val === 'string') {
      try {
        return JSON.parse(val);
      } catch (e) {
        return val;
      }
    }
    return val;
  };

  const lessonForCompile = {
    id: record.id,
    title: record.title,
    level: record.level,
    language: record.language,
    tags: record.tags || [],
    isVideoLesson: record.isVideoLesson,
    videoUrl: record.videoUrl,
    lessonType: record.lessonType,
    seo: record.seo,
    teacherCode: record.teacherCode,
    customConfig: parseJSON(record.customConfig),
    content: normalizeContent(record.content),
    imageUrl,
    audioFileUrl,
    created: record.created,
    updated: record.updated
  };

  return compileLessonHtml(lessonForCompile, record.html || '');
};

// Detect whether a payload already carries a pre-computed htmlCompiled value
// derived from the caller's current input state. When present we trust it
// and skip the post-update recomputation.
const hasPreComputedHtmlCompiled = (data: any): boolean => {
  if (data == null) return false;
  if (typeof FormData !== 'undefined' && data instanceof FormData) {
    return data.has('htmlCompiled');
  }
  return Object.prototype.hasOwnProperty.call(data, 'htmlCompiled');
};

// Trigger Cloudflare Pages deploy hook for blog updates
export const triggerCloudflareRebuild = async (): Promise<boolean> => {
  try {
    const url = config.deployHookUrl;
    if (!url) return false;
    await fetch(url, { method: 'POST', mode: 'no-cors' });
    console.log('Triggered Cloudflare rebuild deploy hook');
    return true;
  } catch (err) {
    console.error('Failed to trigger Cloudflare rebuild deploy hook:', err);
    return false;
  }
};

// CRUD methods

export const createLesson = async (data: any) => {
  const user = getCurrentUser();
  let record: any;

  try {
    if (data instanceof FormData) {
      if (user?.id) {
        data.append('creatorId', user.id);
      }
      record = await pb.collection('worksheets').create(data);
    } else {
      const payload = {
        ...data,
        creatorId: user?.id
      };
      record = await pb.collection('worksheets').create(payload);
    }
  } catch (err: any) {
    const detail = err?.response?.data || err?.data;
    console.error('createLesson failed:', { status: err?.status, message: err?.message, data: detail });
    const e: any = new Error(detail?.message || err?.message || 'Failed to create worksheet.');
    e.status = err?.status;
    e.code = 'CREATE_FAILED';
    e.fieldErrors = detail?.data || null;
    e.original = err;
    throw e;
  }

  try {
    // Only recompute htmlCompiled if the caller did not already supply a
    // value derived from the current input state (e.g. the LessonEditor
    // computes it from form state and appends it to the same request).
    if (!hasPreComputedHtmlCompiled(data)) {
      const compiled = compileHtmlForRecord(record);
      record = await pb.collection('worksheets').update(record.id, { htmlCompiled: compiled });
    }
  } catch (err) {
    console.error('Failed to compile and save HTML block on create:', err);
  }

  // Trigger Cloudflare Pages rebuild
  triggerCloudflareRebuild();

  return record;
};

export const updateLesson = async (id: string, data: any) => {
  let record;
  try {
    record = await pb.collection('worksheets').update(id, data);
  } catch (err: any) {
    if (err?.status === 404) {
      const e: any = new Error(`Worksheet ${id} no longer exists on the server.`);
      e.status = 404;
      e.code = 'RECORD_NOT_FOUND';
      throw e;
    }
    // Surface the actual server validation message so we can see which field failed.
    const detail = err?.response?.data || err?.data;
    const msg = err?.message || 'Failed to update worksheet.';
    console.error('updateLesson failed: status=' + err?.status + ' message=' + (detail?.message || msg) + ' fieldErrors=' + JSON.stringify(detail?.data || null));
    const e: any = new Error(detail?.message || msg);
    e.status = err?.status;
    e.code = 'UPDATE_FAILED';
    e.fieldErrors = detail?.data || null;
    e.original = err;
    throw e;
  }

  try {
    // Only recompute htmlCompiled if the caller did not already supply a
    // value derived from the current input state (e.g. the LessonEditor
    // computes it from form state and appends it to the same request).
    if (!hasPreComputedHtmlCompiled(data)) {
      const compiled = compileHtmlForRecord(record);
      record = await pb.collection('worksheets').update(record.id, { htmlCompiled: compiled });
    }
  } catch (err) {
    console.error('Failed to compile and save HTML block on update:', err);
  }

  // Trigger Cloudflare Pages rebuild
  triggerCloudflareRebuild();

  return record;
};

export const deleteLesson = async (id: string) => {
  const res = await pb.collection('worksheets').delete(id);
  triggerCloudflareRebuild();
  return res;
};