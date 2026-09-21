import { supabase } from './supabaseClient.js'

function formatUser(user) {
  if (!user) return null

  return {
    userId: user.id,
    name: user.user_metadata?.name || '',
    email: user.email || '',
  }
}

export function passwordStrength(password) {
  let score = 0

  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  const level = [
    'Too short',
    'Weak',
    'Fair',
    'Good',
    'Strong',
    'Excellent',
  ][score]

  return {
    score,
    level,
    max: 5,
  }
}

export async function signUp({
  name,
  email,
  password,
  confirmPassword,
}) {
  if (!name?.trim()) {
    throw new Error('Enter your full name.')
  }

  if (!email?.trim()) {
    throw new Error('Enter your email address.')
  }

  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters.')
  }

  if (password !== confirmPassword) {
    throw new Error('Passwords do not match.')
  }

  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      data: {
        name: name.trim(),
      },
    },
  })

  if (error) {
    throw new Error(error.message)
  }

  // If email confirmation is enabled,
  // Supabase returns a user but no active session.
  if (!data.session) {
    return null
  }

  return formatUser(data.user)
}

export async function signIn({ email, password }) {
  const { data, error } =
    await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })

  if (error) {
    throw new Error(error.message)
  }

  return formatUser(data.user)
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()

  if (error) {
    throw new Error(error.message)
  }
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession()

  if (error) {
    throw new Error(error.message)
  }

  return formatUser(data.session?.user)
}

export async function updateProfile(userId, updates) {
  if (!userId) {
    throw new Error('User is not logged in.')
  }

  const { data, error } = await supabase.auth.updateUser({
    data: updates,
  })

  if (error) {
    throw new Error(error.message)
  }

  return formatUser(data.user)
}

export async function requestPasswordReset(email) {
  const { error } =
    await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      {
        redirectTo: `${window.location.origin}/reset-password`,
      }
    )

  if (error) {
    throw new Error(error.message)
  }

  return { requested: true }
}