// src/services/auth.js

import { supabase } from './supabaseClient';
import {
  createEncryptionProfile,
} from './crypto';

/* =========================================================
   CURRENT USER
========================================================= */

export const getCurrentUser = async () => {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error('Get current user error:', error);
    return null;
  }

  return user;
};

/* =========================================================
   PASSWORD STRENGTH
========================================================= */

export const passwordStrength = (password = '') => {
  if (!password) {
    return 0;
  }

  let score = 0;

  if (password.length >= 8) {
    score += 1;
  }

  if (password.length >= 12) {
    score += 1;
  }

  if (/[a-z]/.test(password)) {
    score += 1;
  }

  if (/[A-Z]/.test(password)) {
    score += 1;
  }

  if (/[0-9]/.test(password)) {
    score += 1;
  }

  if (/[^A-Za-z0-9]/.test(password)) {
    score += 1;
  }

  return Math.min(score, 5);
};

/* =========================================================
   SIGNUP
========================================================= */

export const signup = async ({
  email,
  password,
  fullName = '',
}) => {
  if (!email || !password) {
    throw new Error(
      'Email and password are required.',
    );
  }

  /*
   * Create encryption profile locally.
   *
   * The DEK is generated in the browser.
   * Plaintext DEK is never sent to Supabase.
   */
  const encryptionProfile =
    await createEncryptionProfile(password);

  /*
   * Create Supabase Auth account.
   */
  const {
    data,
    error,
  } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      data: {
        full_name: fullName.trim(),
      },
    },
  });

  if (error) {
    console.error(
      'Supabase signup error:',
      error,
    );

    throw error;
  }

  /*
   * If email confirmation is disabled and we
   * immediately receive a session, save the
   * encryption profile now.
   */
  if (data?.session && data?.user) {
    await saveEncryptionProfile(
      data.user.id,
      encryptionProfile,
    );
  }

  return {
    success: true,
    user: data?.user || null,
    session: data?.session || null,
    emailConfirmationRequired: !data?.session,
  };
};

/* =========================================================
   SAVE ENCRYPTION PROFILE
========================================================= */

export const saveEncryptionProfile = async (
  userId,
  encryptionProfile,
) => {
  if (!userId) {
    throw new Error(
      'User ID is required.',
    );
  }

  if (!encryptionProfile) {
    throw new Error(
      'Encryption profile is required.',
    );
  }

  /*
   * Remove plaintext DEK before database operation.
   */
  const {
    dek,
    ...safeProfile
  } = encryptionProfile;

  /*
   * IMPORTANT:
   *
   * `dek` is intentionally NOT sent to Supabase.
   *
   * Only:
   * - salt
   * - wrapped DEK
   * - crypto metadata
   *
   * are stored.
   */
  const {
    error,
  } = await supabase
    .from('user_encryption_keys')
    .upsert(
      {
        user_id: userId,

        version:
          safeProfile.version || 1,

        salt:
          safeProfile.salt,

        wrapped_dek:
          safeProfile.wrappedDek,

        kdf_algorithm:
          safeProfile.kdf?.algorithm ||
          'PBKDF2-HMAC-SHA256',

        kdf_iterations:
          safeProfile.kdf?.iterations ||
          600000,

        cipher_algorithm:
          safeProfile.cipher?.algorithm ||
          'AES-256-GCM',

        updated_at:
          new Date().toISOString(),
      },
      {
        onConflict: 'user_id',
      },
    );

  if (error) {
    console.error(
      'Save encryption profile error:',
      error,
    );

    throw error;
  }

  return true;
};

/* =========================================================
   GET ENCRYPTION PROFILE
========================================================= */

export const getEncryptionProfile = async (
  userId,
) => {
  if (!userId) {
    throw new Error(
      'User ID is required.',
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from('user_encryption_keys')
    .select(
      `
        version,
        salt,
        wrapped_dek,
        kdf_algorithm,
        kdf_iterations,
        cipher_algorithm,
        created_at,
        updated_at
      `,
    )
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error(
      'Get encryption profile error:',
      error,
    );

    throw error;
  }

  if (!data) {
    return null;
  }

  return {
    version:
      data.version,

    salt:
      data.salt,

    wrappedDek:
      data.wrapped_dek,

    kdf: {
      algorithm:
        data.kdf_algorithm,

      iterations:
        data.kdf_iterations,
    },

    cipher: {
      algorithm:
        data.cipher_algorithm,
    },

    createdAt:
      data.created_at,

    updatedAt:
      data.updated_at,
  };
};

/* =========================================================
   LOGIN
========================================================= */

export const login = async ({
  email,
  password,
}) => {
  if (!email || !password) {
    throw new Error(
      'Email and password are required.',
    );
  }

  const {
    data,
    error,
  } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error) {
    console.error(
      'Login error:',
      error,
    );

    throw error;
  }

  return {
    success: true,
    user: data.user,
    session: data.session,
  };
};

/* =========================================================
   LOGOUT
========================================================= */

export const logout = async () => {
  const { error } =
    await supabase.auth.signOut();

  if (error) {
    console.error(
      'Logout error:',
      error,
    );

    throw error;
  }

  return true;
};

/* =========================================================
   GET SESSION
========================================================= */

export const getSession = async () => {
  const {
    data,
    error,
  } = await supabase.auth.getSession();

  if (error) {
    console.error(
      'Get session error:',
      error,
    );

    return null;
  }

  return data.session || null;
};

/* =========================================================
   AUTH STATE CHANGE
========================================================= */

export const onAuthStateChange = (
  callback,
) => {
  const {
    data: { subscription },
  } =
    supabase.auth.onAuthStateChange(
      (event, session) => {
        callback(event, session);
      },
    );

  return subscription;
};

/* =========================================================
   PASSWORD RESET
========================================================= */

export const requestPasswordReset = async (
  email,
) => {
  if (!email) {
    throw new Error(
      'Email is required.',
    );
  }

  const { error } =
    await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      {
        redirectTo:
          `${window.location.origin}/login`,
      },
    );

  if (error) {
    console.error(
      'Password reset error:',
      error,
    );

    throw error;
  }

  return true;
};