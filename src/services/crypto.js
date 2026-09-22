// src/services/crypto.js

/**
 * DataLens AI - Client Side Encryption
 *
 * Security model:
 * - AES-256-GCM for data encryption
 * - PBKDF2-HMAC-SHA256 for password-based key derivation
 * - Random 256-bit Data Encryption Key (DEK)
 * - DEK is never stored in plaintext
 * - Web Crypto API is used
 */

const CRYPTO_VERSION = 1;

const AES_KEY_LENGTH = 256;
const AES_GCM_IV_LENGTH = 12;
const AES_GCM_TAG_LENGTH = 128;

const PBKDF2_SALT_LENGTH = 16;
const PBKDF2_ITERATIONS = 600000;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

/* -------------------------------------------------------
   Basic helpers
------------------------------------------------------- */

const bytesToBase64 = (bytes) => {
  let binary = '';

  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(
      ...bytes.subarray(i, Math.min(i + chunkSize, bytes.length)),
    );
  }

  return btoa(binary);
};

const base64ToBytes = (base64) => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
};

const randomBytes = (length) => {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
};

/* -------------------------------------------------------
   Password validation
------------------------------------------------------- */

export const validateEncryptionPassword = (password) => {
  if (typeof password !== 'string') {
    throw new Error('Password must be a string.');
  }

  if (password.length < 8) {
    throw new Error('Password must contain at least 8 characters.');
  }

  return true;
};

/* -------------------------------------------------------
   Generate random Data Encryption Key (DEK)
------------------------------------------------------- */

export const generateDataEncryptionKey = async () => {
  return crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: AES_KEY_LENGTH,
    },
    true,
    ['encrypt', 'decrypt'],
  );
};

/* -------------------------------------------------------
   Generate random salt
------------------------------------------------------- */

export const generateSalt = () => {
  return randomBytes(PBKDF2_SALT_LENGTH);
};

/* -------------------------------------------------------
   Derive Key Encryption Key (KEK) from password
------------------------------------------------------- */

export const deriveKeyEncryptionKey = async (password, salt) => {
  validateEncryptionPassword(password);

  if (!(salt instanceof Uint8Array)) {
    throw new Error('Salt must be a Uint8Array.');
  }

  const passwordKey = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(password),
    {
      name: 'PBKDF2',
    },
    false,
    ['deriveKey'],
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    passwordKey,
    {
      name: 'AES-GCM',
      length: AES_KEY_LENGTH,
    },
    false,
    ['encrypt', 'decrypt'],
  );
};

/* -------------------------------------------------------
   Wrap / encrypt the DEK using password-derived KEK
------------------------------------------------------- */

export const wrapDataEncryptionKey = async (dek, kek) => {
  if (!dek || !kek) {
    throw new Error('DEK and KEK are required.');
  }

  const rawDek = await crypto.subtle.exportKey('raw', dek);

  const iv = randomBytes(AES_GCM_IV_LENGTH);

  const encryptedDek = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
      tagLength: AES_GCM_TAG_LENGTH,
    },
    kek,
    rawDek,
  );

  return {
    version: CRYPTO_VERSION,
    algorithm: 'AES-256-GCM',
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(encryptedDek)),
    kdf: 'PBKDF2-HMAC-SHA256',
    iterations: PBKDF2_ITERATIONS,
  };
};

/* -------------------------------------------------------
   Unwrap / decrypt the DEK using password-derived KEK
------------------------------------------------------- */

export const unwrapDataEncryptionKey = async (wrappedKey, kek) => {
  if (!wrappedKey || !kek) {
    throw new Error('Wrapped key and KEK are required.');
  }

  if (wrappedKey.version !== CRYPTO_VERSION) {
    throw new Error('Unsupported encryption version.');
  }

  const iv = base64ToBytes(wrappedKey.iv);
  const ciphertext = base64ToBytes(wrappedKey.ciphertext);

  let decryptedDek;

  try {
    decryptedDek = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv,
        tagLength: AES_GCM_TAG_LENGTH,
      },
      kek,
      ciphertext,
    );
  } catch {
    throw new Error(
      'Unable to unlock encryption key. The password may be incorrect.',
    );
  }

  return crypto.subtle.importKey(
    'raw',
    decryptedDek,
    {
      name: 'AES-GCM',
    },
    true,
    ['encrypt', 'decrypt'],
  );
};

/* -------------------------------------------------------
   Encrypt binary data
------------------------------------------------------- */

export const encryptBytes = async (data, encryptionKey) => {
  if (!data || !encryptionKey) {
    throw new Error('Data and encryption key are required.');
  }

  const input =
    data instanceof Uint8Array
      ? data
      : new Uint8Array(data);

  const iv = randomBytes(AES_GCM_IV_LENGTH);

  const encrypted = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
      tagLength: AES_GCM_TAG_LENGTH,
    },
    encryptionKey,
    input,
  );

  return {
    version: CRYPTO_VERSION,
    algorithm: 'AES-256-GCM',
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(encrypted)),
  };
};

/* -------------------------------------------------------
   Decrypt binary data
------------------------------------------------------- */

export const decryptBytes = async (encryptedData, encryptionKey) => {
  if (!encryptedData || !encryptionKey) {
    throw new Error('Encrypted data and encryption key are required.');
  }

  if (encryptedData.version !== CRYPTO_VERSION) {
    throw new Error('Unsupported encryption version.');
  }

  const iv = base64ToBytes(encryptedData.iv);
  const ciphertext = base64ToBytes(encryptedData.ciphertext);

  try {
    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv,
        tagLength: AES_GCM_TAG_LENGTH,
      },
      encryptionKey,
      ciphertext,
    );

    return new Uint8Array(decrypted);
  } catch {
    throw new Error(
      'Unable to decrypt data. The encryption key may be incorrect or the data may have been modified.',
    );
  }
};

/* -------------------------------------------------------
   Encrypt JSON
------------------------------------------------------- */

export const encryptJSON = async (data, encryptionKey) => {
  const json = JSON.stringify(data);
  const bytes = textEncoder.encode(json);

  return encryptBytes(bytes, encryptionKey);
};

/* -------------------------------------------------------
   Decrypt JSON
------------------------------------------------------- */

export const decryptJSON = async (encryptedData, encryptionKey) => {
  const bytes = await decryptBytes(encryptedData, encryptionKey);

  const json = textDecoder.decode(bytes);

  try {
    return JSON.parse(json);
  } catch {
    throw new Error('Decrypted data is not valid JSON.');
  }
};

/* -------------------------------------------------------
   Encrypt text
------------------------------------------------------- */

export const encryptText = async (text, encryptionKey) => {
  if (typeof text !== 'string') {
    throw new Error('Text must be a string.');
  }

  return encryptBytes(
    textEncoder.encode(text),
    encryptionKey,
  );
};

/* -------------------------------------------------------
   Decrypt text
------------------------------------------------------- */

export const decryptText = async (encryptedData, encryptionKey) => {
  const bytes = await decryptBytes(
    encryptedData,
    encryptionKey,
  );

  return textDecoder.decode(bytes);
};

/* -------------------------------------------------------
   Export encrypted key metadata
------------------------------------------------------- */

export const createEncryptionProfile = async (password) => {
  validateEncryptionPassword(password);

  const salt = generateSalt();

  const kek = await deriveKeyEncryptionKey(
    password,
    salt,
  );

  const dek = await generateDataEncryptionKey();

  const wrappedDek = await wrapDataEncryptionKey(
    dek,
    kek,
  );

  return {
    version: CRYPTO_VERSION,
    salt: bytesToBase64(salt),
    wrappedDek,
    kdf: {
      algorithm: 'PBKDF2-HMAC-SHA256',
      iterations: PBKDF2_ITERATIONS,
    },
    cipher: {
      algorithm: 'AES-256-GCM',
      tagLength: AES_GCM_TAG_LENGTH,
    },

    // IMPORTANT:
    // dek stays in browser memory.
    // It is NOT returned as plaintext.
    dek,
  };
};

/* -------------------------------------------------------
   Unlock existing encryption profile
------------------------------------------------------- */

export const unlockEncryptionProfile = async (
  password,
  profile,
) => {
  validateEncryptionPassword(password);

  if (!profile?.salt || !profile?.wrappedDek) {
    throw new Error(
      'Invalid encryption profile.',
    );
  }

  const salt = base64ToBytes(profile.salt);

  const kek = await deriveKeyEncryptionKey(
    password,
    salt,
  );

  const dek = await unwrapDataEncryptionKey(
    profile.wrappedDek,
    kek,
  );

  return dek;
};

/* -------------------------------------------------------
   Public crypto configuration
------------------------------------------------------- */

export const getCryptoConfig = () => ({
  version: CRYPTO_VERSION,
  encryption: 'AES-256-GCM',
  keyLength: AES_KEY_LENGTH,
  ivLength: AES_GCM_IV_LENGTH,
  tagLength: AES_GCM_TAG_LENGTH,
  kdf: 'PBKDF2-HMAC-SHA256',
  iterations: PBKDF2_ITERATIONS,
});

/* -------------------------------------------------------
   Development self-test
------------------------------------------------------- */

export const runCryptoSelfTest = async () => {
  const testPassword = 'DataLens-Test-Password-123!';

  const profile = await createEncryptionProfile(
    testPassword,
  );

  const testData = {
    message: 'DataLens encryption test',
    number: 12345,
    nested: {
      secure: true,
    },
  };

  const encrypted = await encryptJSON(
    testData,
    profile.dek,
  );

  const decrypted = await decryptJSON(
    encrypted,
    profile.dek,
  );

  const success =
    JSON.stringify(testData) ===
    JSON.stringify(decrypted);

  if (!success) {
    throw new Error(
      'DataLens crypto self-test failed.',
    );
  }

  const unlockedKey =
    await unlockEncryptionProfile(
      testPassword,
      {
        salt: profile.salt,
        wrappedDek: profile.wrappedDek,
      },
    );

  const encryptedAgain =
    await encryptJSON(
      testData,
      unlockedKey,
    );

  const decryptedAgain =
    await decryptJSON(
      encryptedAgain,
      unlockedKey,
    );

  const unlockSuccess =
    JSON.stringify(testData) ===
    JSON.stringify(decryptedAgain);

  if (!unlockSuccess) {
    throw new Error(
      'DataLens encryption unlock test failed.',
    );
  }

  return true;
};