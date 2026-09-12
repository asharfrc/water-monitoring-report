const SUPERVISOR_STORAGE_KEY = 'water_monitoring_supervisors_v2';

// Sole Super User / Administrator email (strictly confidential, only one administrator)
export const SUPER_USER_EMAIL = 'asharfrc2@gmail.com';
export const PRIMARY_ADMIN_EMAIL = SUPER_USER_EMAIL;

const DEFAULT_SUPERVISOR_EMAILS: string[] = [
  SUPER_USER_EMAIL,
  'asharfrc@gmail.com',
  'supervisor.plant1@company.com',
  'supervisor.plant2@company.com',
];

/**
 * Validates if the given email belongs to the sole Super User / Administrator.
 * Only asharfrc2@gmail.com is granted this status.
 */
export function isSuperUser(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === SUPER_USER_EMAIL.toLowerCase();
}

/**
 * Returns all registered supervisor emails.
 */
export function getSupervisorEmails(): string[] {
  try {
    const raw = localStorage.getItem(SUPERVISOR_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(SUPERVISOR_STORAGE_KEY, JSON.stringify(DEFAULT_SUPERVISOR_EMAILS));
      return [...DEFAULT_SUPERVISOR_EMAILS];
    }
    const list = JSON.parse(raw);
    if (Array.isArray(list)) {
      const normalized = list.map((e) => String(e).trim().toLowerCase());
      let modified = false;
      if (!normalized.includes(SUPER_USER_EMAIL.toLowerCase())) {
        normalized.unshift(SUPER_USER_EMAIL.toLowerCase());
        modified = true;
      }
      if (!normalized.includes('asharfrc@gmail.com')) {
        normalized.push('asharfrc@gmail.com');
        modified = true;
      }
      if (modified) {
        localStorage.setItem(SUPERVISOR_STORAGE_KEY, JSON.stringify(normalized));
      }
      return normalized;
    }
    return [...DEFAULT_SUPERVISOR_EMAILS];
  } catch (err) {
    console.error('Failed to get supervisor emails:', err);
    return [...DEFAULT_SUPERVISOR_EMAILS];
  }
}

/**
 * Checks if the given email has supervisor permissions.
 * Super User automatically has supervisor permissions.
 */
export function isSupervisor(email: string | null | undefined): boolean {
  if (!email) return false;
  const cleanEmail = email.trim().toLowerCase();
  if (isSuperUser(cleanEmail)) return true;
  if (cleanEmail === 'asharfrc@gmail.com') return true;
  const list = getSupervisorEmails();
  return list.some((s) => s.toLowerCase() === cleanEmail);
}

/**
 * Adds a new supervisor email.
 * Strictly restricted to the sole Super User.
 */
export function addSupervisorEmail(
  email: string,
  requestingUserEmail?: string | null
): { success: boolean; error?: string } {
  // Enforce Super User restriction
  if (!isSuperUser(requestingUserEmail)) {
    return {
      success: false,
      error: 'Akses ditolak: Hanya Super User / Administrator yang berhak menambah supervisor.',
    };
  }

  const clean = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(clean)) {
    return { success: false, error: 'Format email tidak valid.' };
  }

  if (clean === SUPER_USER_EMAIL.toLowerCase()) {
    return { success: false, error: 'Email ini adalah akun Super User.' };
  }

  const list = getSupervisorEmails();
  if (list.includes(clean)) {
    return { success: false, error: 'Email ini sudah terdaftar sebagai Supervisor.' };
  }

  const updated = [...list, clean];
  localStorage.setItem(SUPERVISOR_STORAGE_KEY, JSON.stringify(updated));
  return { success: true };
}

/**
 * Removes a supervisor email.
 * Strictly restricted to the sole Super User.
 */
export function removeSupervisorEmail(
  emailToRemove: string,
  requestingUserEmail?: string | null
): { success: boolean; error?: string } {
  // Enforce Super User restriction
  if (!isSuperUser(requestingUserEmail)) {
    return {
      success: false,
      error: 'Akses ditolak: Hanya Super User / Administrator yang berhak menghapus supervisor.',
    };
  }

  const clean = emailToRemove.trim().toLowerCase();

  // Prevent removing the super user
  if (clean === SUPER_USER_EMAIL.toLowerCase()) {
    return { success: false, error: 'Akun Super User tidak dapat dihapus.' };
  }

  // Prevent removing own email
  if (requestingUserEmail && clean === requestingUserEmail.trim().toLowerCase()) {
    return { success: false, error: 'Anda tidak dapat menghapus akun Anda sendiri.' };
  }

  const list = getSupervisorEmails();
  const updated = list.filter((e) => e !== clean);
  localStorage.setItem(SUPERVISOR_STORAGE_KEY, JSON.stringify(updated));
  return { success: true };
}

