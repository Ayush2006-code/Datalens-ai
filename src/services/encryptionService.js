// src/services/encryptionService.js

import { supabase } from './supabaseClient';
import {
  createEncryptionProfile,
  unlockEncryptionProfile,
} from './crypto';

/**
 * Create and save encryption profile for a user.
 *
 * IMPORTANT:
 * Plaintext DEK is NEVER sent to Supabase.
 */
export const setupUserEncryption = async (
  userId,
  password,
) => {
  if (!userId) {
    throw new Error('User ID is required.');
  }

  if (!password) {
    throw new Error('Password is required.');
  }

  // Create encryption profile locally.
  const profile =
    await createEncryptionProfile(password);

  /*
   * Remove plaintext DEK before sending anything
   * to Supabase.
   */
  const {
    dek,
    ...safeProfile
  } = profile;

  const { error } = await supabase
    .from('user_encryption_keys')
    .upsert(
      {
        user_id: userId,
        version: safeProfile.version,
        salt: safeProfile.salt,
        wrapped_dek: safeProfile.wrappedDek,
        kdf_algorithm:
          safeProfile.kdf?.algorithm ||
          'PBKDF2-HMAC-SHA256',
        kdf_iterations:
          safeProfile.kdf?.iterations ||
          600000,
        cipher_algorithm:
          safeProfile.cipher?.algorithm ||
          'AES-256-GCM',
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id',
      },
    );

  if (error) {
    console.error(
      'Failed to save encryption profile:',
      error,
    );

    throw error;
  }

  /*
   * Return DEK only to the browser.
   *
   * It stays in memory and will later be kept
   * in React context.
   */
  return dek;
};

/**
 * Get encrypted profile belonging to current user.
 */
export const getUserEncryptionProfile =
  async (userId) => {
    if (!userId) {
      throw new Error('User ID is required.');
    }

    const { data, error } = await supabase
      .from('user_encryption_keys')
      .select(
        `
        version,
        salt,
        wrapped_dek,
        kdf_algorithm,
        kdf_iterations,
        cipher_algorithm
      `,
      )
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error(
        'Failed to get encryption profile:',
        error,
      );

      throw error;
    }

    if (!data) {
      return null;
    }

    return {
      version: data.version,
      salt: data.salt,
      wrappedDek: data.wrapped_dek,
      kdf: {
        algorithm: data.kdf_algorithm,
        iterations: data.kdf_iterations,
      },
      cipher: {
        algorithm: data.cipher_algorithm,
      },
    };
  };

/**
 * Unlock user's DEK using their password.
 *
 * The password is never stored.
 */
export const unlockUserEncryption =
  async (
    userId,
    password,
  ) => {
    if (!userId) {
      throw new Error('User ID is required.');
    }

    if (!password) {
      throw new Error('Password is required.');
    }

    const profile =
      await getUserEncryptionProfile(
        userId,
      );

    /*
     * Existing account may not have an
     * encryption profile yet.
     */
    if (!profile) {
      return setupUserEncryption(
        userId,
        password,
      );
    }

    /*
     * Derive KEK from password and unwrap
     * the encrypted DEK.
     */
    const dek =
      await unlockEncryptionProfile(
        password,
        profile,
      );

    return dek;
  };