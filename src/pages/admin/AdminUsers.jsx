import React, { useEffect, useState, useCallback } from 'react';
import {
  Shield,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAdminAuth, ROLE_LABELS } from '../../context/AdminAuthContext';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Super Admin ONLY Administrator Account & Role Management.
 * Backed directly by public.admin_profiles RLS policies:
 *   - INSERT/UPDATE/DELETE allowed ONLY when public.is_super_admin() = true.
 */
export default function AdminUsers() {
  const { isSuperAdmin, user } = useAdminAuth();

  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  const [form, setForm] = useState({
    id: '',
    email: '',
    full_name: '',
    role: 'viewer',
    is_active: true,
  });

  const loadAdmins = useCallback(async () => {
    if (!supabase || !isSuperAdmin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data, error: err } = await supabase
        .from('admin_profiles')
        .select('id, email, full_name, role, is_active, created_at, updated_at')
        .order('created_at', { ascending: true });
      if (err) throw err;
      setAdmins(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load administrator accounts.');
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    loadAdmins();
  }, [loadAdmins]);

  if (!isSuperAdmin) {
    return (
      <div className="flex min-h-[50dvh] flex-col items-center justify-center rounded-xl border border-maroon/50 bg-navy p-8 text-center">
        <Lock className="h-8 w-8 text-gold" />
        <h1 className="mt-4 font-display text-2xl font-bold text-paper">
          Super Admin Access Required
        </h1>
        <p className="mt-2 max-w-md text-sm text-paper/70">
          Only active Super Admins can view and manage administrator accounts or
          roles. This restriction is enforced by PostgreSQL Row Level Security.
        </p>
      </div>
    );
  }

  const handleAddAdmin = async (e) => {
    e.preventDefault();
    if (!supabase) return;
    setError('');
    setFeedback('');

    const uid = form.id.trim();
    const email = form.email.trim();
    const fullName = form.full_name.trim();

    if (!UUID_REGEX.test(uid)) {
      setError('User UID must be a valid UUID copied from Supabase Auth → Users.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address matching the Auth user.');
      return;
    }
    if (!fullName) {
      setError('Full name is required.');
      return;
    }

    setSaving(true);
    try {
      const { error: insErr } = await supabase.from('admin_profiles').insert({
        id: uid,
        email,
        full_name: fullName,
        role: form.role,
        is_active: Boolean(form.is_active),
        created_by: user?.id || null,
      });
      if (insErr) throw insErr;

      setForm({
        id: '',
        email: '',
        full_name: '',
        role: 'viewer',
        is_active: true,
      });
      setFeedback(`Linked administrator "${fullName}" (${ROLE_LABELS[form.role]}).`);
      await loadAdmins();
    } catch (err) {
      setError(err.message || 'Failed to add administrator profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateAdmin = async (adminId, patch) => {
    if (!supabase) return;
    // Prevent self-demotion or self-deactivation lockout
    if (
      adminId === user?.id &&
      ((patch.role && patch.role !== 'super_admin') || patch.is_active === false)
    ) {
      setError('You cannot demote or deactivate your own active Super Admin account.');
      return;
    }

    setError('');
    setFeedback('');
    try {
      const { error: updErr } = await supabase
        .from('admin_profiles')
        .update(patch)
        .eq('id', adminId);
      if (updErr) throw updErr;

      setFeedback('Administrator permissions updated in PostgreSQL.');
      await loadAdmins();
    } catch (err) {
      setError(err.message || 'Failed to update administrator.');
    }
  };

  const handleDeleteAdmin = async (admin) => {
    if (!supabase) return;
    if (admin.id === user?.id) {
      setError('Self-deletion is prevented by RLS and UI safeguards.');
      return;
    }
    if (
      !window.confirm(
        `Remove admin access for "${admin.full_name}" (${admin.email})?`
      )
    ) {
      return;
    }

    setError('');
    setFeedback('');
    try {
      const { error: delErr } = await supabase
        .from('admin_profiles')
        .delete()
        .eq('id', admin.id);
      if (delErr) throw delErr;

      setFeedback(`Removed administrator profile for "${admin.full_name}".`);
      await loadAdmins();
    } catch (err) {
      setError(err.message || 'Failed to delete administrator profile.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-line/15 pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold-light">
          Super Admin Only · public.admin_profiles
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold text-paper">
          Admin Users &amp; Roles
        </h1>
        <p className="mt-1 text-sm text-paper/65">
          Create the user account first in Supabase Authentication → Users, then
          link their User UID here with an assigned role.
        </p>
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

      {/* Link Existing Auth User Form */}
      <form
        onSubmit={handleAddAdmin}
        className="space-y-4 rounded-xl border border-gold/30 bg-navy p-6"
      >
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-gold" />
          <h2 className="font-display text-lg font-bold text-paper">
            Link Supabase Auth User
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="space-y-1.5 text-xs">
            <span className="font-semibold uppercase tracking-[0.14em] text-gold-light">
              Auth User UID *
            </span>
            <input
              type="text"
              required
              placeholder="00000000-0000-..."
              value={form.id}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, id: e.target.value }))
              }
              className="w-full rounded-md border border-line/20 bg-navy-deep px-3 py-2 font-mono text-xs text-paper"
            />
          </label>

          <label className="space-y-1.5 text-xs">
            <span className="font-semibold uppercase tracking-[0.14em] text-gold-light">
              Email *
            </span>
            <input
              type="email"
              required
              placeholder="lead@rguktrkv.ac.in"
              value={form.email}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, email: e.target.value }))
              }
              className="w-full rounded-md border border-line/20 bg-navy-deep px-3 py-2 text-sm text-paper"
            />
          </label>

          <label className="space-y-1.5 text-xs">
            <span className="font-semibold uppercase tracking-[0.14em] text-gold-light">
              Full Name *
            </span>
            <input
              type="text"
              required
              placeholder="Full name"
              value={form.full_name}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, full_name: e.target.value }))
              }
              className="w-full rounded-md border border-line/20 bg-navy-deep px-3 py-2 text-sm text-paper"
            />
          </label>

          <label className="space-y-1.5 text-xs">
            <span className="font-semibold uppercase tracking-[0.14em] text-gold-light">
              Role *
            </span>
            <select
              value={form.role}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, role: e.target.value }))
              }
              className="w-full rounded-md border border-line/20 bg-navy-deep px-3 py-2 text-sm text-paper"
            >
              <option value="viewer">Viewer (Read-Only)</option>
              <option value="editor">Content Manager</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </label>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="src-btn-maroon inline-flex items-center gap-2 rounded-md px-5 py-2.5 text-xs font-bold uppercase tracking-[0.16em] disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          <span>{saving ? 'Linking...' : 'Add Administrator'}</span>
        </button>
      </form>

      {/* Administrators Table */}
      <div className="overflow-hidden rounded-xl border border-line/15 bg-navy">
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-xs text-paper/65">
            <Loader2 className="h-4 w-4 animate-spin text-gold" />
            <span>Loading administrator profiles...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line/15 bg-navy-deep text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-light">
                <tr>
                  <th className="px-5 py-3.5">Administrator</th>
                  <th className="px-5 py-3.5">Role</th>
                  <th className="px-5 py-3.5">Active Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/10">
                {admins.map((admin) => {
                  const isSelf = admin.id === user?.id;
                  return (
                    <tr key={admin.id} className="hover:bg-navy-deep/50">
                      <td className="px-5 py-4">
                        <p className="font-display font-bold text-paper">
                          {admin.full_name}{' '}
                          {isSelf && (
                            <span className="ml-1.5 rounded bg-gold/20 px-2 py-0.5 text-[10px] font-semibold uppercase text-gold-light">
                              You
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-paper/60">{admin.email}</p>
                      </td>
                      <td className="px-5 py-4">
                        <select
                          disabled={isSelf}
                          value={admin.role}
                          onChange={(e) =>
                            handleUpdateAdmin(admin.id, { role: e.target.value })
                          }
                          aria-label={`Role for ${admin.full_name}`}
                          className="rounded-md border border-line/20 bg-navy-deep px-3 py-1.5 text-xs text-paper disabled:opacity-55"
                        >
                          <option value="viewer">Viewer</option>
                          <option value="editor">Content Manager</option>
                          <option value="super_admin">Super Admin</option>
                        </select>
                      </td>
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          disabled={isSelf}
                          onClick={() =>
                            handleUpdateAdmin(admin.id, {
                              is_active: !admin.is_active,
                            })
                          }
                          className={`rounded-sm px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] disabled:opacity-55 ${
                            admin.is_active
                              ? 'src-btn-gold'
                              : 'src-btn-outline-maroon bg-maroon/25'
                          }`}
                        >
                          {admin.is_active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-5 py-4 text-right">
                        {!isSelf && (
                          <button
                            type="button"
                            onClick={() => handleDeleteAdmin(admin)}
                            className="src-btn-outline-maroon rounded-md p-2"
                            title="Remove administrator profile"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
