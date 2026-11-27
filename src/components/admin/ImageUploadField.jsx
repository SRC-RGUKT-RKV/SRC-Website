import React, { useRef, useState } from 'react';
import { Upload, Trash2, Loader2, Image as ImageIcon, AlertCircle } from 'lucide-react';
import {
  BUCKET_LIMITS,
  uploadFileToBucket,
  deleteFileFromBucket,
  getPublicStorageUrl,
  validateFileForBucket,
} from '../../lib/storage';

/**
 * Reusable Supabase Storage image/media upload field.
 * Uploads binary files to Supabase Storage and emits ONLY the relative file path
 * so PostgreSQL stores file paths instead of image binaries.
 */
export default function ImageUploadField({
  label,
  bucket,
  folder = 'general',
  slugPrefix = '',
  valuePath = '',
  onChangePath,
  canEdit = true,
  helperText = '',
  accept,
}) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const rules = BUCKET_LIMITS[bucket];
  const resolvedAccept = accept || rules?.allowedTypes?.join(',') || 'image/*';
  const previewUrl =
    valuePath && rules?.isPublic ? getPublicStorageUrl(bucket, valuePath) : '';

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !canEdit) return;

    setError('');
    const check = validateFileForBucket(bucket, file);
    if (!check.valid) {
      setError(check.error);
      e.target.value = '';
      return;
    }

    setUploading(true);
    try {
      const { path } = await uploadFileToBucket({
        bucket,
        file,
        folder,
        slugPrefix,
        replacePath: valuePath || null,
      });
      onChangePath?.(path);
    } catch (err) {
      setError(err.message || 'Upload failed.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleRemove = async () => {
    if (!canEdit || !valuePath) return;
    setError('');
    setDeleting(true);
    try {
      await deleteFileFromBucket(bucket, valuePath);
      onChangePath?.('');
    } catch (err) {
      setError(err.message || 'Failed to remove file.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-light">
          {label}
        </label>
        <span className="text-[11px] text-paper/50">Bucket: {bucket}</span>
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-line/20 bg-navy-deep p-4 sm:flex-row sm:items-center">
        {/* Preview Thumbnail */}
        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line/20 bg-navy-dark">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt={label}
              className="h-full w-full object-cover object-top"
            />
          ) : (
            <ImageIcon className="h-7 w-7 text-paper/30" aria-hidden="true" />
          )}
        </div>

        {/* Upload Controls & Stored Path */}
        <div className="min-w-0 flex-1 space-y-2.5">
          {valuePath ? (
            <p
              className="truncate rounded-md bg-navy-dark/70 px-3 py-1.5 font-mono text-xs text-paper/80"
              title={valuePath}
            >
              {valuePath}
            </p>
          ) : (
            <p className="text-xs text-paper/60">
              {helperText || 'No file uploaded yet. File path will be saved in PostgreSQL.'}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2.5">
            <input
              ref={inputRef}
              type="file"
              accept={resolvedAccept}
              disabled={!canEdit || uploading || deleting}
              onChange={handleFileSelect}
              className="hidden"
            />

            <button
              type="button"
              disabled={!canEdit || uploading || deleting}
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-md bg-maroon px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-paper transition-colors hover:bg-gold hover:text-navy-dark disabled:cursor-not-allowed disabled:opacity-45"
            >
              {uploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Upload className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span>
                {uploading
                  ? 'Uploading...'
                  : valuePath
                    ? 'Replace File'
                    : 'Upload File'}
              </span>
            </button>

            {valuePath && canEdit && (
              <button
                type="button"
                disabled={uploading || deleting}
                onClick={handleRemove}
                className="inline-flex items-center gap-1.5 rounded-md border border-line/25 px-3 py-2 text-xs font-medium text-paper/75 transition-colors hover:border-maroon hover:text-paper disabled:opacity-45"
              >
                {deleting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                <span>Remove</span>
              </button>
            )}
          </div>

          {!canEdit && (
            <p className="text-[11px] text-paper/50">
              Read-only mode: Viewers cannot upload or modify media files.
            </p>
          )}

          {error && (
            <p className="flex items-center gap-1.5 text-xs text-red-300" role="alert">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
