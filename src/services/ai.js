// AI abstraction layer for "Ask Your Data".
//
// analyzeDataQuestion() is the single entry point the UI calls. It never
// pretends a real AI model answered when one isn't configured: it always
// tries the local deterministic query engine first (accurate, instant,
// works offline), and only calls out to a real LLM if VITE_AI_API_ENDPOINT
// is actually set, which requires wiring up your own backend — an API key
// can't be safely called directly from the browser.
//
// To connect a real model later:
//   1. Stand up a small backend endpoint that holds your LLM API key and
//      forwards { question, datasetSummary } to the model.
//   2. Set VITE_AI_API_ENDPOINT to that endpoint's URL in your .env file.
//   3. This module will start routing unanswered questions there
//      automatically — no changes needed elsewhere in the app.

import { answerLocally } from './queryEngine.js'

export function isRemoteAIConfigured() {
  return Boolean(import.meta.env.VITE_AI_API_ENDPOINT)
}

function buildDatasetSummary(columnProfiles, rowCount) {
  return {
    rowCount,
    columns: columnProfiles.map((c) => ({
      name: c.name,
      type: c.type,
      uniqueCount: c.uniqueCount,
      missingPct: Math.round(c.missingPct),
    })),
  }
}

async function callRemoteAI(question, datasetSummary) {
  const endpoint = import.meta.env.VITE_AI_API_ENDPOINT
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, dataset: datasetSummary }),
  })
  if (!response.ok) {
    throw new Error(`AI backend responded with status ${response.status}`)
  }
  return response.json()
}

/**
 * @param {string} question - plain-English question from the user
 * @param {{columns: string[], rows: object[]}} sheet - active sheet data
 * @param {object[]} columnProfiles - profile output from dataProfiler
 * @returns {Promise<{answer: string, value?: any, chart?: object, source: 'local'|'remote'}>}
 */
export async function analyzeDataQuestion(question, sheet, columnProfiles) {
  const local = answerLocally(question, sheet, columnProfiles)
  if (local) {
    return { ...local, source: 'local' }
  }

  if (isRemoteAIConfigured()) {
    try {
      const summary = buildDatasetSummary(columnProfiles, sheet.rows.length)
      const remote = await callRemoteAI(question, summary)
      return { ...remote, source: 'remote' }
    } catch (err) {
      return {
        answer:
          "I couldn't reach the connected AI service, and I don't have a local calculation for this exact question. Try rephrasing it around a specific column, e.g. \"total revenue\" or \"top 5 products by sales\".",
        source: 'error',
      }
    }
  }

  return {
    answer:
      "I don't have a built-in calculation for that exact question yet. Try asking about a total, average, top values, or a trend over time for a specific column — for example \"total revenue\", \"which region has the highest sales\", or \"show monthly revenue\".",
    source: 'unsupported',
  }
}
