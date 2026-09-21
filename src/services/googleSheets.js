// Google Sheets provider — INTEGRATION POINT, not a working connection.
//
// This file defines the shape a Google Sheets provider needs so it can feed
// the exact same analysis pipeline (dataProfiler -> dashboardGenerator ->
// insightEngine) as an uploaded file. Wiring it up for real requires:
//
//   1. A Google Cloud project with the Sheets API enabled.
//   2. An OAuth 2.0 client ID (web application type).
//   3. A backend or serverless function to exchange the OAuth code for a
//      token — the client ID/secret should never live in frontend code.
//   4. Setting VITE_GOOGLE_CLIENT_ID so isGoogleSheetsConfigured() below
//      returns true and the "Connect Google Sheets" button activates.
//
// Until those exist, the UI shows this as "requires configuration" rather
// than faking a successful connection.

export function isGoogleSheetsConfigured() {
  return Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID)
}

export async function startGoogleOAuthFlow() {
  if (!isGoogleSheetsConfigured()) {
    throw new Error(
      'Google Sheets isn\u2019t configured yet. Set VITE_GOOGLE_CLIENT_ID (and a token-exchange backend) to enable this.'
    )
  }
  // Real implementation would redirect to Google's OAuth consent screen here,
  // e.g. using @react-oauth/google or a hand-rolled redirect to
  // https://accounts.google.com/o/oauth2/v2/auth with the Sheets scope.
  throw new Error('OAuth flow not implemented in this environment.')
}

export async function listSpreadsheets(_accessToken) {
  throw new Error('Not implemented — requires a live Google OAuth session.')
}

export async function importSpreadsheet(_accessToken, _spreadsheetId) {
  throw new Error('Not implemented — requires a live Google OAuth session.')
}
