// Auth service — LOCAL / DEMO implementation.
//
// This module is the ONLY place that knows how accounts are stored and
// verified. Swap this file for one that calls a real backend (Supabase,
// Firebase, your own Node/Express API, etc.) and nothing else in the app
// needs to change — every screen calls only the functions exported here.
//
// Security note: this demo mode has no server, so "secure" here means
// "as secure as is possible entirely in the browser": passwords are never
// stored in plaintext, they are salted and hashed with SubtleCrypto
// (PBKDF2-SHA256) before anything touches localStorage. That is still not
// a substitute for real server-side authentication — anyone with access to
// the browser's storage and enough time can brute-force a weak password.
// Do not treat this as production-grade auth.

const USERS_KEY = 'datalens.auth.users'
const SESSION_KEY = 'datalens.auth.session'
const PBKDF2_ITERATIONS = 120_000

function readUsers() {
  try {
    const raw = localStorage.getItem(USERS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function writeUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

function bufferToBase64(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
}

function base64ToBuffer(b64) {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes.buffer
}

async function hashPassword(password, saltB64) {
  const enc = new TextEncoder()
  const salt = saltB64 ? base64ToBuffer(saltB64) : crypto.getRandomValues(new Uint8Array(16))
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, [
    'deriveBits',
  ])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    256
  )
  return {
    hash: bufferToBase64(bits),
    salt: bufferToBase64(salt instanceof ArrayBuffer ? salt : salt.buffer),
  }
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function passwordStrength(password) {
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  const level = ['Too short', 'Weak', 'Fair', 'Good', 'Strong', 'Excellent'][score]
  return { score, level, max: 5 }
}

export async function signUp({ name, email, password, confirmPassword }) {
  if (!name?.trim()) throw new Error('Enter your full name.')
  if (!validateEmail(email)) throw new Error('Enter a valid email address.')
  if (password.length < 8) throw new Error('Password must be at least 8 characters.')
  if (password !== confirmPassword) throw new Error('Passwords do not match.')

  const users = readUsers()
  const normalizedEmail = email.trim().toLowerCase()
  if (users.some((u) => u.email === normalizedEmail)) {
    throw new Error('An account with this email already exists.')
  }

  const { hash, salt } = await hashPassword(password)
  const user = {
    id: `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: name.trim(),
    email: normalizedEmail,
    passwordHash: hash,
    passwordSalt: salt,
    createdAt: new Date().toISOString(),
  }
  users.push(user)
  writeUsers(users)

  const session = { userId: user.id, name: user.name, email: user.email }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  return session
}

export async function signIn({ email, password }) {
  const normalizedEmail = email.trim().toLowerCase()
  const users = readUsers()
  const user = users.find((u) => u.email === normalizedEmail)
  if (!user) throw new Error('No account found with this email.')

  const { hash } = await hashPassword(password, user.passwordSalt)
  if (hash !== user.passwordHash) throw new Error('Incorrect password.')

  const session = { userId: user.id, name: user.name, email: user.email }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  return session
}

export function signOut() {
  localStorage.removeItem(SESSION_KEY)
}

export function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function requestPasswordReset(email) {
  // Local demo mode has no email transport. Structured so a backend
  // implementation can slot in (send a reset link, issue a token, etc.).
  const users = readUsers()
  const exists = users.some((u) => u.email === email.trim().toLowerCase())
  return { requested: true, accountExists: exists }
}

export async function updateProfile(userId, updates) {
  const users = readUsers()
  const idx = users.findIndex((u) => u.id === userId)
  if (idx === -1) throw new Error('Account not found.')
  users[idx] = { ...users[idx], ...updates }
  writeUsers(users)
  const session = getSession()
  if (session && session.userId === userId) {
    const updatedSession = { ...session, name: users[idx].name, email: users[idx].email }
    localStorage.setItem(SESSION_KEY, JSON.stringify(updatedSession))
    return updatedSession
  }
  return session
}
