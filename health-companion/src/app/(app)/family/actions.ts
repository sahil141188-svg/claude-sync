'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

async function assertCaregiver() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profile?.role !== 'caregiver') throw new Error('Only the caregiver can manage family members');
}

export interface AddFamilyResult {
  ok: boolean;
  message: string;
}

/**
 * Add a family member (alert recipient). If email+password are given, also
 * creates a view-only login for them (role: family).
 */
export async function addFamilyMember(formData: FormData): Promise<AddFamilyResult> {
  await assertCaregiver();

  const name = String(formData.get('name') || '').trim();
  const phone = String(formData.get('phone') || '').replace(/\D/g, '');
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const password = String(formData.get('password') || '');

  if (!name || phone.length < 10) {
    return { ok: false, message: 'नाम और सही phone number (country code के साथ) ज़रूरी है' };
  }
  if (email && password.length < 6) {
    return { ok: false, message: 'Login बनाने के लिए password कम से कम 6 अक्षर का हो' };
  }

  const admin = createAdminClient();
  let authUserId: string | null = null;
  let loginNote = '';

  if (email) {
    const { data: created, error: authErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (authErr) {
      return { ok: false, message: `Login नहीं बन पाया: ${authErr.message}` };
    }
    authUserId = created.user.id;
    const { error: profErr } = await admin
      .from('profiles')
      .upsert({ id: authUserId, full_name: name, role: 'family', phone });
    if (profErr) {
      return { ok: false, message: `Profile नहीं बन पाई: ${profErr.message}` };
    }
    loginNote = ' Login भी बन गया ✅';
  }

  const { error } = await admin.from('family_members').insert({
    name,
    phone,
    email: email || null,
    auth_user_id: authUserId,
  });
  if (error) return { ok: false, message: error.message };

  revalidatePath('/family');
  return { ok: true, message: `${name} जुड़ गए — अब alerts इन्हें भी जाएँगे।${loginNote}` };
}

/**
 * Update a family member: name/phone, access level (admin = caregiver role,
 * view-only = family role), optional password reset, or create a login for a
 * member that has none.
 */
export async function updateFamilyMember(id: string, formData: FormData): Promise<AddFamilyResult> {
  await assertCaregiver();

  const name = String(formData.get('name') || '').trim();
  const phone = String(formData.get('phone') || '').replace(/\D/g, '');
  const access = String(formData.get('access') || 'family') === 'caregiver' ? 'caregiver' : 'family';
  const newPassword = String(formData.get('new_password') || '');
  const email = String(formData.get('email') || '').trim().toLowerCase();

  if (!name || phone.length < 10) {
    return { ok: false, message: 'नाम और सही phone number ज़रूरी है' };
  }
  if (newPassword && newPassword.length < 6) {
    return { ok: false, message: 'Password कम से कम 6 अक्षर का हो' };
  }

  const admin = createAdminClient();
  const { data: member } = await admin.from('family_members').select('*').eq('id', id).single();
  if (!member) return { ok: false, message: 'Member नहीं मिला' };

  let authUserId: string | null = member.auth_user_id;
  let note = '';

  if (!authUserId && email) {
    if (newPassword.length < 6) {
      return { ok: false, message: 'नया login बनाने के लिए password (6+ अक्षर) डालें' };
    }
    const { data: created, error: authErr } = await admin.auth.admin.createUser({
      email,
      password: newPassword,
      email_confirm: true,
    });
    if (authErr) return { ok: false, message: `Login नहीं बन पाया: ${authErr.message}` };
    authUserId = created.user.id;
    note = ' Login बन गया ✅';
  } else if (authUserId && newPassword) {
    const { error: pwErr } = await admin.auth.admin.updateUserById(authUserId, {
      password: newPassword,
    });
    if (pwErr) return { ok: false, message: `Password नहीं बदला: ${pwErr.message}` };
    note = ' नया password set हो गया ✅';
  }

  if (authUserId) {
    const { error: profErr } = await admin
      .from('profiles')
      .upsert({ id: authUserId, full_name: name, role: access, phone });
    if (profErr) return { ok: false, message: `Access update नहीं हुआ: ${profErr.message}` };
  }

  const { error } = await admin
    .from('family_members')
    .update({ name, phone, email: email || member.email, auth_user_id: authUserId })
    .eq('id', id);
  if (error) return { ok: false, message: error.message };

  revalidatePath('/family');
  return {
    ok: true,
    message: `${name} update हो गए — access: ${access === 'caregiver' ? 'Admin' : 'View-only'}.${note}`,
  };
}

export async function deleteFamilyMember(id: string) {
  await assertCaregiver();
  const admin = createAdminClient();

  const { data: member } = await admin
    .from('family_members')
    .select('auth_user_id')
    .eq('id', id)
    .single();

  const { error } = await admin.from('family_members').delete().eq('id', id);
  if (error) throw new Error(error.message);

  // Also remove their login (and profiles row via cascade) if one was created.
  if (member?.auth_user_id) {
    await admin.auth.admin.deleteUser(member.auth_user_id);
  }
  revalidatePath('/family');
}
