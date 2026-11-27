import React, { useEffect, useRef, useState } from 'react';
import {
  Upload,
  Trash2,
  Loader2,
  Image as ImageIcon,
  AlertCircle,
  FolderOpen,
  X,
  Check,
} from 'lucide-react';
import {
  BUCKET_LIMITS,
  uploadFileToBucket,
  deleteFileFromBucket,
  getPublicStorageUrl,
  validateFileForBucket,
  listBucketFilesRecursive,
} from '../../lib/storage';

/**
 * Reusable Supabase Storage image/media upload field.
 *
 * Preferred mode (stage-on-save):
 *   Pass `pendingFile` + `onSelectPendingFile`. Selecting a file validates and previews it
 *   locally without uploading to Supabase Storage until the parent form is actually saved —
 *   preventing duplicate/orphaned uploads when users cancel, retry, or switch form options.
 *
 * Also supports picking an already-uploaded file from the same bucket ("Choose Existing")
 * so admins never need to upload a second copy of an existing asset.
 */
export default function ImageUploadField({
  label,
  bucket,
  folder = 'general',
  slugPrefix = '',
  valuePath = '',
  onChangePath,
  pendingFile = null,
  onSelectPendingFile = null,
  canEdit = true,
  helperText = '',
  accept,
}) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [localPreviewUrl, setLocalPreviewUrl] = useState('');

  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryFiles, setLibraryFiles] = useState([]);

  const isDeferredMode = typeof onSelectPendingFile === 'function';
  const rules = BUCKET_LIMITS[bucket];
  const resolvedAccept = accept || rules?.allowedTypes?.join(',') || 'image/*';

  useEffect(() => {
    if (!pendingFile) {
      setLocalPreviewUrl('');
      return undefined;
    }
    const objectUrl = URL.createObjectURL(pendingFile);
    setLocalPreviewUrl(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [pendingFile]);

  const savedPreviewUrl =
    valuePath && rules?.isPublic ? getPublicStorageUrl(bucket, valuePath) : '';
  const previewUrl = localPreviewUrl || savedPreviewUrl;

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

    // Stage-on-save mode: keep File in memory and upload only when the form is saved
    if (isDeferredMode) {
      onSelectPendingFile(file);
      setLibraryOpen(false);
      e.target.value = '';
      return;
    }

    // Immediate upload fallback for callers that do not pass onSelectPendingFile
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
    if (!canEdit) return;
    setError('');

    if (pendingFile && isDeferredMode) {
      onSelectPendingFile(null);
      return;
    }

    if (!valuePath) return;

    if (isDeferredMode) {
      onChangePath?.('');
      return;
    }

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

  const openLibraryPicker = async () => {
    if (!canEdit || !rules?.isPublic) return;
    if (libraryOpen) {
      setLibraryOpen(false);
      return;
    }
    setError('');
    setLibraryOpen(true);
    setLibraryLoading(true);
    try {
      const list = await listBucketFilesRecursive(bucket);
      const imageFiles = list.filter((f) =>
        /\.(jpe?g|png|webp|avif)$/i.test(f.name || '')
      );
      setLibraryFiles(imageFiles);
    } catch (err) {
      setError(err.message || `Could not load files from ${bucket}.`);
      setLibraryFiles([]);
    } finally {
      setLibraryLoading(false);
    }
  };

  const handlePickExisting = (fullPath) => {
    if (isDeferredMode) {
      onSelectPendingFile(null);
    }
    onChangePath?.(fullPath);
    setLibraryOpen(false);
    setError('');
  };

  const hasSelection = Boolean(pendingFile || valuePath);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-light">
          {label}
        </label>
        <span className="text-[11px] text-paper/50">Bucket: {bucket}</span>
      </div>

      <div className="space-y-4 rounded-xl border border-line/20 bg-navy-deep p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
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
            {pendingFile ? (
              <div className="flex flex-wrap items-center gap-2 rounded-md border border-gold/40 bg-navy-dark/80 px-3 py-1.5 text-xs">
                <span className="rounded-sm bg-gold/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gold-light">
                  Uploads on Save
                </span>
                <span className="truncate font-mono text-paper/85" title={pendingFile.name}>
                  {pendingFile.name} ({Math.max(1, Math.round(pendingFile.size / 1024))} KB)
                </span>
              </div>
            ) : valuePath ? (
              <p
                className="truncate rounded-md bg-navy-dark/70 px-3 py-1.5 font-mono text-xs text-paper/80"
                title={valuePath}
              >
                {valuePath}
              </p>
            ) : (
              <p className="text-xs text-paper/60">
                {helperText || 'No file selected yet. File uploads once when you click Save.'}
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
                    : hasSelection
                      ? 'Replace File'
                      : 'Choose File'}
                </span>
              </button>

              {canEdit && rules?.isPublic && (
                <button
                  type="button"
                  disabled={uploading || deleting}
                  onClick={openLibraryPicker}
                  className="inline-flex items-center gap-1.5 rounded-md border border-gold/35 bg-navy px-3 py-2 text-xs font-medium text-gold-light transition-colors hover:border-gold hover:bg-gold hover:text-navy-dark disabled:opacity-45"
                >
                  <FolderOpen className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{libraryOpen ? 'Close Library' : 'Choose Existing'}</span>
                </button>
              )}

              {hasSelection && canEdit && (
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
                  <span>{pendingFile ? 'Clear Selection' : 'Remove'}</span>
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

        {/* Inline Existing Media Library Picker */}
        {libraryOpen && (
          <div className="space-y-3 border-t border-line/15 pt-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-light">
                Reuse Existing Image in {bucket}
              </p>
              <button
                type="button"
                onClick={() => setLibraryOpen(false)}
                className="rounded p-1 text-paper/55 hover:text-paper"
                aria-label="Close library picker"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {libraryLoading ? (
              <div className="flex items-center gap-2 py-4 text-xs text-paper/65">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-gold" />
                <span>Loading existing files...</span>
              </div>
            ) : libraryFiles.length === 0 ? (
              <p className="py-3 text-xs text-paper/55">
                No existing images found in {bucket}.
              </p>
            ) : (
              <div className="grid max-h-56 grid-cols-2 gap-2.5 overflow-y-auto pr-1 sm:grid-cols-3 lg:grid-cols-4">
                {libraryFiles.map((file) => {
                  const isSelected = !pendingFile && valuePath === file.fullPath;
                  const url = getPublicStorageUrl(bucket, file.fullPath);
                  return (
                    <button
                      key={file.fullPath}
                      type="button"
                      onClick={() => handlePickExisting(file.fullPath)}
                      className={`group relative overflow-hidden rounded-lg border text-left transition-colors ${
                        isSelected
                          ? 'border-gold ring-1 ring-gold'
                          : 'border-line/20 hover:border-gold/60'
                      }`}
                    >
                      <div className="h-20 w-full overflow-hidden bg-navy-dark">
                        <img
                          src={url}
                          alt={file.name}
                          loading="lazy"
                          className="h-full w-full object-cover object-top"
                        />
                      </div>
                      <p
                        className="truncate bg-navy px-2 py-1 font-mono text-[10px] text-paper/80"
                        title={file.fullPath}
                      >
                        {file.name}
                      </p>
                      {isSelected && (
                        <span className="absolute top-1.5 right-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-gold text-navy-dark">
                          <Check className="h-3 w-3" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
