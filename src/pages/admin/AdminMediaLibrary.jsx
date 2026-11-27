import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  FolderOpen,
  Upload,
  Trash2,
  Copy,
  Check,
  Lock,
  ExternalLink,
  Loader2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAdminAuth } from '../../context/AdminAuthContext';
import {
  STORAGE_BUCKETS,
  BUCKET_LIMITS,
  uploadFileToBucket,
  deleteFileFromBucket,
  getPublicStorageUrl,
  getPrivateSignedUrl,
  listBucketFilesRecursive,
} from '../../lib/storage';

const BUCKET_OPTIONS = [
  { id: STORAGE_BUCKETS.MEMBER_PHOTOS, label: 'member-photos', isPrivate: false },
  { id: STORAGE_BUCKETS.EVENT_MEDIA, label: 'event-media', isPrivate: false },
  { id: STORAGE_BUCKETS.VAULT_MEDIA, label: 'vault-media', isPrivate: false },
  { id: STORAGE_BUCKETS.PRIVATE_UPLOADS, label: 'private-uploads', isPrivate: true },
];

/**
 * Fetches all relative storage paths currently referenced by PostgreSQL rows
 * for a given public storage bucket so unused/duplicate uploads are clearly marked.
 */
async function fetchReferencedPathsForBucket(bucket) {
  if (!supabase) return new Set();
  const paths = new Set();

  if (bucket === STORAGE_BUCKETS.MEMBER_PHOTOS) {
    const [membersRes, clubMembersRes] = await Promise.all([
      supabase
        .from('members')
        .select('photo_url')
        .not('photo_url', 'is', null),
      supabase
        .from('club_members')
        .select('photo_url')
        .not('photo_url', 'is', null),
    ]);
    for (const row of membersRes.data || []) {
      if (row.photo_url) paths.add(row.photo_url);
    }
    for (const row of clubMembersRes.data || []) {
      if (row.photo_url) paths.add(row.photo_url);
    }
  } else if (bucket === STORAGE_BUCKETS.VAULT_MEDIA) {
    const { data } = await supabase
      .from('batches')
      .select('team_photo_url')
      .not('team_photo_url', 'is', null);
    for (const row of data || []) {
      if (row.team_photo_url) paths.add(row.team_photo_url);
    }
  } else if (bucket === STORAGE_BUCKETS.EVENT_MEDIA) {
    const [eventsRes, mediaRes, clubsRes, clubYearsRes, clubMediaRes] =
      await Promise.all([
        supabase
          .from('events')
          .select('cover_image_url')
          .not('cover_image_url', 'is', null),
        supabase
          .from('event_media')
          .select('url')
          .not('url', 'is', null),
        supabase.from('clubs').select('logo_url, cover_image_url'),
        supabase
          .from('club_academic_years')
          .select('team_photo_url')
          .not('team_photo_url', 'is', null),
        supabase
          .from('club_media')
          .select('url')
          .not('url', 'is', null),
      ]);
    for (const row of eventsRes.data || []) {
      if (row.cover_image_url) paths.add(row.cover_image_url);
    }
    for (const row of mediaRes.data || []) {
      if (row.url) paths.add(row.url);
    }
    for (const row of clubsRes.data || []) {
      if (row.logo_url) paths.add(row.logo_url);
      if (row.cover_image_url) paths.add(row.cover_image_url);
    }
    for (const row of clubYearsRes.data || []) {
      if (row.team_photo_url) paths.add(row.team_photo_url);
    }
    for (const row of clubMediaRes.data || []) {
      if (row.url) paths.add(row.url);
    }
  }

  return paths;
}

export default function AdminMediaLibrary() {
  const { canEdit } = useAdminAuth();
  const fileInputRef = useRef(null);

  const [activeBucket, setActiveBucket] = useState(STORAGE_BUCKETS.MEMBER_PHOTOS);
  const [uploadFolder, setUploadFolder] = useState('general');
  const [files, setFiles] = useState([]);
  const [referencedPaths, setReferencedPaths] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [cleaningUp, setCleaningUp] = useState(false);
  const [copiedPath, setCopiedPath] = useState('');
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  const isPrivateBucket = !BUCKET_LIMITS[activeBucket]?.isPublic;

  const loadFiles = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    setError('');
    try {
      const [list, refs] = await Promise.all([
        listBucketFilesRecursive(activeBucket),
        !BUCKET_LIMITS[activeBucket]?.isPublic
          ? Promise.resolve(new Set())
          : fetchReferencedPathsForBucket(activeBucket),
      ]);
      setFiles(list);
      setReferencedPaths(refs);
    } catch (err) {
      setError(err.message || `Failed to list files in ${activeBucket}.`);
      setFiles([]);
      setReferencedPaths(new Set());
    } finally {
      setLoading(false);
    }
  }, [activeBucket]);

  useEffect(() => {
    setFeedback('');
    loadFiles();
  }, [loadFiles]);

  const unusedFiles = isPrivateBucket
    ? []
    : files.filter((file) => !referencedPaths.has(file.fullPath));

  const handleUpload = async (e) => {
    const selected = Array.from(e.target.files || []);
    if (!selected.length || !canEdit) return;
    setError('');
    setFeedback('');
    setUploading(true);
    try {
      for (const file of selected) {
        await uploadFileToBucket({
          bucket: activeBucket,
          file,
          folder: uploadFolder || 'general',
        });
      }
      setFeedback(`Uploaded ${selected.length} file(s) to ${activeBucket}.`);
      await loadFiles();
    } catch (err) {
      setError(err.message || 'File upload failed.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (filePath) => {
    if (!canEdit) return;
    const isInUse = !isPrivateBucket && referencedPaths.has(filePath);
    const promptMsg = isInUse
      ? `"${filePath}" is currently linked to a live database record. Permanently delete it from ${activeBucket}?`
      : `Permanently delete unused file "${filePath}" from ${activeBucket}?`;

    if (!window.confirm(promptMsg)) {
      return;
    }
    setError('');
    setFeedback('');
    try {
      await deleteFileFromBucket(activeBucket, filePath);
      setFeedback(`Deleted "${filePath}".`);
      await loadFiles();
    } catch (err) {
      setError(err.message || 'Failed to delete file.');
    }
  };

  const handleCleanUpUnused = async () => {
    if (!canEdit || isPrivateBucket || unusedFiles.length === 0) return;
    const count = unusedFiles.length;
    const confirmed = window.confirm(
      `Delete all ${count} unused file(s) in "${activeBucket}"? Files currently linked to Members, Batches, or Events will NOT be touched.`
    );
    if (!confirmed) return;

    setError('');
    setFeedback('');
    setCleaningUp(true);
    try {
      const pathsToRemove = unusedFiles.map((f) => f.fullPath);
      const { error: rmErr } = await supabase.storage
        .from(activeBucket)
        .remove(pathsToRemove);
      if (rmErr) throw rmErr;

      setFeedback(`Removed ${count} unused duplicate/orphan file(s) from ${activeBucket}.`);
      await loadFiles();
    } catch (err) {
      setError(err.message || 'Failed to clean up unused files.');
    } finally {
      setCleaningUp(false);
    }
  };

  const handleOpenPrivateFile = async (filePath) => {
    setError('');
    try {
      const signedUrl = await getPrivateSignedUrl(filePath, 180);
      if (signedUrl) {
        window.open(signedUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      setError(err.message || 'Could not create signed URL.');
    }
  };

  const handleCopyPath = async (filePath) => {
    try {
      await navigator.clipboard.writeText(filePath);
      setCopiedPath(filePath);
      setTimeout(() => setCopiedPath(''), 1800);
    } catch {
      // Clipboard fallback omitted
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b border-line/15 pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold-light">
            Supabase Storage · 4 Buckets
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold text-paper">
            Media Library
          </h1>
          <p className="mt-1 text-sm text-paper/65">
            Browse stored assets, identify unused duplicate uploads, copy relative
            paths for PostgreSQL, and manage uploads across public and private buckets.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          {canEdit && !isPrivateBucket && unusedFiles.length > 0 && (
            <button
              type="button"
              onClick={handleCleanUpUnused}
              disabled={cleaningUp || loading}
              className="src-btn-outline-maroon inline-flex items-center gap-2 rounded-md bg-maroon/25 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] disabled:opacity-50"
            >
              {cleaningUp ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
              <span>
                {cleaningUp
                  ? 'Cleaning...'
                  : `Delete Unused (${unusedFiles.length})`}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={loadFiles}
            disabled={loading}
            className="src-btn-outline-gold inline-flex items-center gap-2 rounded-md bg-navy px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Bucket Tabs */}
      <div className="flex flex-wrap gap-2">
        {BUCKET_OPTIONS.map((b) => {
          const active = b.id === activeBucket;
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => setActiveBucket(b.id)}
              className={`inline-flex items-center gap-1.5 rounded-md px-4 py-2 font-mono text-xs font-semibold ${
                active
                  ? 'src-btn-maroon border border-gold'
                  : 'src-btn-navy border border-line/20 text-paper/75 hover:text-gold-light'
              }`}
            >
              {b.isPrivate && <Lock className="h-3.5 w-3.5 text-gold-light" />}
              <span>{b.label}</span>
            </button>
          );
        })}
      </div>

      {/* Upload Bar (Super Admin & Content Manager only) */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line/15 bg-navy p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs text-paper/70">
            Active bucket:{' '}
            <strong className="font-mono text-gold-light">{activeBucket}</strong>
            {isPrivateBucket
              ? ' (Private — signed URLs only)'
              : ` (Public read · ${files.length} file${files.length === 1 ? '' : 's'}, ${unusedFiles.length} unused)`}
          </span>
        </div>

        {canEdit ? (
          <div className="flex flex-wrap items-center gap-2.5">
            <input
              type="text"
              value={uploadFolder}
              onChange={(e) => setUploadFolder(e.target.value)}
              placeholder="folder name"
              aria-label="Upload subfolder"
              className="w-36 rounded-md border border-line/20 bg-navy-deep px-3 py-2 font-mono text-xs text-paper"
            />
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={BUCKET_LIMITS[activeBucket]?.allowedTypes?.join(',')}
              disabled={uploading}
              onChange={handleUpload}
              className="hidden"
            />
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="src-btn-maroon inline-flex items-center gap-2 rounded-md px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
              <span>{uploading ? 'Uploading...' : 'Upload Files'}</span>
            </button>
          </div>
        ) : (
          <span className="text-xs text-paper/50">
            Viewer role: read-only access
          </span>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-lg border border-maroon bg-maroon/25 p-3.5 text-xs text-paper"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-gold-light" />
          <span>{error}</span>
        </div>
      )}

      {feedback && (
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-lg border border-gold/40 bg-navy p-3.5 text-xs text-gold-light"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Files Grid */}
      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-line/15 bg-navy p-10 text-xs text-paper/65">
          <Loader2 className="h-4 w-4 animate-spin text-gold" />
          <span>Listing objects in {activeBucket}...</span>
        </div>
      ) : files.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-line/15 bg-navy p-12 text-center text-sm text-paper/60">
          <FolderOpen className="h-8 w-8 text-gold/60" />
          <p>No files currently stored in {activeBucket}.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {files.map((file) => {
            const isImage = /\.(jpe?g|png|webp|avif)$/i.test(file.name);
            const publicUrl = !isPrivateBucket
              ? getPublicStorageUrl(activeBucket, file.fullPath)
              : '';
            const sizeKb = file.metadata?.size
              ? `${Math.round(file.metadata.size / 1024)} KB`
              : '';
            const isInUse = !isPrivateBucket && referencedPaths.has(file.fullPath);

            return (
              <div
                key={file.fullPath}
                className="flex flex-col overflow-hidden rounded-xl border border-line/15 bg-navy"
              >
                <div className="relative flex h-44 items-center justify-center overflow-hidden bg-navy-dark">
                  {!isPrivateBucket && isImage ? (
                    <img
                      src={publicUrl}
                      alt={file.name}
                      loading="lazy"
                      className={`h-full w-full object-cover ${
                        activeBucket === STORAGE_BUCKETS.MEMBER_PHOTOS
                          ? 'object-top'
                          : 'object-center'
                      }`}
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-xs text-paper/55">
                      {isPrivateBucket ? (
                        <Lock className="h-6 w-6 text-gold" />
                      ) : (
                        <FolderOpen className="h-6 w-6 text-gold" />
                      )}
                      <span>
                        {isPrivateBucket ? 'Private Object' : file.name}
                      </span>
                    </div>
                  )}

                  {!isPrivateBucket && (
                    <span
                      className={`absolute top-2.5 right-2.5 rounded-sm px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] shadow ${
                        isInUse
                          ? 'bg-emerald-900/90 text-emerald-200 ring-1 ring-emerald-400/40'
                          : 'bg-navy-dark/90 text-gold-light ring-1 ring-gold/40'
                      }`}
                    >
                      {isInUse ? 'In Use' : 'Unused'}
                    </span>
                  )}
                </div>

                <div className="flex flex-1 flex-col justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p
                      className="truncate font-mono text-xs text-paper"
                      title={file.fullPath}
                    >
                      {file.fullPath}
                    </p>
                    {sizeKb && (
                      <p className="mt-0.5 text-[11px] text-paper/50">
                        {sizeKb}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleCopyPath(file.fullPath)}
                        className="src-btn-outline-subtle inline-flex items-center gap-1 rounded px-2.5 py-1 text-[11px]"
                      >
                        {copiedPath === file.fullPath ? (
                          <Check className="h-3 w-3 text-emerald-300" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                        <span>
                          {copiedPath === file.fullPath ? 'Copied' : 'Copy Path'}
                        </span>
                      </button>

                      {isPrivateBucket ? (
                        <button
                          type="button"
                          onClick={() => handleOpenPrivateFile(file.fullPath)}
                          className="src-btn-outline-gold inline-flex items-center gap-1 rounded px-2.5 py-1 text-[11px]"
                        >
                          <ExternalLink className="h-3 w-3" />
                          <span>Signed View</span>
                        </button>
                      ) : (
                        <a
                          href={publicUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="src-btn-outline-subtle inline-flex items-center gap-1 rounded px-2.5 py-1 text-[11px]"
                        >
                          <ExternalLink className="h-3 w-3" />
                          <span>Open</span>
                        </a>
                      )}
                    </div>

                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => handleDelete(file.fullPath)}
                        className="src-btn-outline-maroon rounded border-transparent p-1.5"
                        aria-label={`Delete ${file.fullPath}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
