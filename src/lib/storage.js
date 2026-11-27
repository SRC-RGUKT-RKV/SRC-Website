import { supabase, isSupabaseConfigured } from './supabaseClient';

export const STORAGE_BUCKETS = {
  MEMBER_PHOTOS: 'member-photos',
  EVENT_MEDIA: 'event-media',
  VAULT_MEDIA: 'vault-media',
  PRIVATE_UPLOADS: 'private-uploads',
};

export const BUCKET_LIMITS = {
  [STORAGE_BUCKETS.MEMBER_PHOTOS]: {
    maxBytes: 5 * 1024 * 1024,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
    isPublic: true,
  },
  [STORAGE_BUCKETS.EVENT_MEDIA]: {
    maxBytes: 25 * 1024 * 1024,
    allowedTypes: [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/avif',
      'video/mp4',
      'video/webm',
    ],
    isPublic: true,
  },
  [STORAGE_BUCKETS.VAULT_MEDIA]: {
    maxBytes: 10 * 1024 * 1024,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
    isPublic: true,
  },
  [STORAGE_BUCKETS.PRIVATE_UPLOADS]: {
    maxBytes: 25 * 1024 * 1024,
    allowedTypes: [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/avif',
      'application/pdf',
    ],
    isPublic: false,
  },
};

function sanitizeSegment(value = '') {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'file';
}

function getFileExtension(file) {
  const namePart = file?.name?.split('.').pop()?.toLowerCase();
  if (namePart && /^[a-z0-9]{2,5}$/.test(namePart)) {
    return namePart;
  }
  const mimeMap = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/avif': 'avif',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'application/pdf': 'pdf',
  };
  return mimeMap[file?.type] || 'bin';
}

/**
 * Validates file type and size against the target bucket rules before upload.
 */
export function validateFileForBucket(bucket, file) {
  const rules = BUCKET_LIMITS[bucket];
  if (!rules) {
    return { valid: false, error: `Unknown storage bucket: ${bucket}` };
  }
  if (!file) {
    return { valid: false, error: 'No file selected.' };
  }
  if (!rules.allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Unsupported file type (${file.type || 'unknown'}). Allowed: ${rules.allowedTypes.join(', ')}.`,
    };
  }
  if (file.size > rules.maxBytes) {
    const maxMb = Math.round(rules.maxBytes / (1024 * 1024));
    return {
      valid: false,
      error: `File exceeds the ${maxMb} MB limit for ${bucket}.`,
    };
  }
  return { valid: true, error: null };
}

/**
 * Uploads a File object to Supabase Storage and returns the relative storage path
 * to store in PostgreSQL (never store binary/base64 image data in PostgreSQL).
 */
export async function uploadFileToBucket({
  bucket,
  file,
  folder = 'general',
  slugPrefix = '',
  replacePath = null,
}) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase client is not configured.');
  }

  // Ensure an active authenticated admin session exists so uploads never fall back to anon
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.access_token) {
    throw new Error(
      'Active administrator session required to upload files. Please sign in again.'
    );
  }

  const validation = validateFileForBucket(bucket, file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const safeFolder = sanitizeSegment(folder);
  const baseName = slugPrefix
    ? sanitizeSegment(slugPrefix)
    : sanitizeSegment(file.name.replace(/\.[^/.]+$/, ''));
  const ext = getFileExtension(file);
  const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const storagePath = `${safeFolder}/${baseName}-${uniqueSuffix}.${ext}`;

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(storagePath, file, {
      cacheControl: '3600',
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    throw new Error(
      error.message || `Storage upload to "${bucket}" failed.`
    );
  }

  // Clean up previous storage object if replacing an existing stored path
  if (
    replacePath &&
    !replacePath.startsWith('http://') &&
    !replacePath.startsWith('https://') &&
    !replacePath.startsWith('/')
  ) {
    await supabase.storage.from(bucket).remove([replacePath]).catch(() => {});
  }

  const isPublic = BUCKET_LIMITS[bucket]?.isPublic;
  const publicUrl = isPublic ? getPublicStorageUrl(bucket, data.path) : null;

  return {
    path: data.path, // Save this relative path in PostgreSQL
    publicUrl,
  };
}

/**
 * Deletes an object from a Supabase Storage bucket by its stored relative path.
 */
export async function deleteFileFromBucket(bucket, storagePath) {
  if (!isSupabaseConfigured || !supabase || !storagePath) return;
  if (
    storagePath.startsWith('http://') ||
    storagePath.startsWith('https://') ||
    storagePath.startsWith('/')
  ) {
    return;
  }

  const { error } = await supabase.storage.from(bucket).remove([storagePath]);
  if (error) {
    throw new Error(error.message || 'Failed to delete storage object.');
  }
}

/**
 * Resolves a stored PostgreSQL path into a display URL.
 * Preserves legacy local (/images/...) and absolute http(s) URLs cleanly.
 */
export function getPublicStorageUrl(bucket, pathOrUrl) {
  if (!pathOrUrl) return '';
  if (
    pathOrUrl.startsWith('http://') ||
    pathOrUrl.startsWith('https://') ||
    pathOrUrl.startsWith('/')
  ) {
    return pathOrUrl;
  }
  if (!isSupabaseConfigured || !supabase) return '';
  const { data } = supabase.storage.from(bucket).getPublicUrl(pathOrUrl);
  return data?.publicUrl || '';
}

/**
 * Recursively lists files inside a Supabase Storage bucket (up to maxDepth folder levels).
 */
export async function listBucketFilesRecursive(bucket, prefix = '', depth = 0, maxDepth = 2) {
  if (!isSupabaseConfigured || !supabase) return [];
  const { data, error } = await supabase.storage.from(bucket).list(prefix, {
    limit: 100,
    sortBy: { column: 'created_at', order: 'desc' },
  });
  if (error) throw error;

  const files = [];
  for (const entry of data || []) {
    if (!entry.name || entry.name === '.emptyFolderPlaceholder') continue;
    const fullPath = prefix ? `${prefix}/${entry.name}` : entry.name;
    // Supabase Storage folders have id === null
    if (entry.id === null) {
      if (depth < maxDepth) {
        const nested = await listBucketFilesRecursive(bucket, fullPath, depth + 1, maxDepth);
        files.push(...nested);
      }
    } else {
      files.push({
        ...entry,
        fullPath,
      });
    }
  }
  return files;
}

/**
 * Generates a short-lived signed URL for objects in the private-uploads bucket.
 */
export async function getPrivateSignedUrl(storagePath, expiresInSeconds = 300) {
  if (!isSupabaseConfigured || !supabase || !storagePath) return null;
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKETS.PRIVATE_UPLOADS)
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error) {
    throw new Error(error.message || 'Could not generate signed URL.');
  }
  return data?.signedUrl || null;
}
