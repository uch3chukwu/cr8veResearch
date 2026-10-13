const DEFAULT_ERROR_MESSAGE = 'Unable to reach the research agent.'

export class AgentApiError extends Error {
  constructor(message, status = null) {
    super(message)
    this.name = 'AgentApiError'
    this.status = status
  }
}

function getErrorMessage(status) {
  if (status === 400) {
    return 'That question could not be submitted. Check it and try again.'
  }

  if (status === 401) {
    return 'Your session has expired. Please log in again.'
  }

  if (status === 503) {
    return 'The research agent is temporarily unavailable.'
  }

  return DEFAULT_ERROR_MESSAGE
}

export async function askResearchAgent({
  message,
  accessToken,
  baseUrl = import.meta.env.VITE_AGENT_API_URL,
  fetchImpl = globalThis.fetch
}) {
  if (typeof baseUrl !== 'string' || baseUrl.trim() === '') {
    throw new AgentApiError('The research agent is not configured.')
  }

  if (typeof accessToken !== 'string' || accessToken.trim() === '') {
    throw new AgentApiError(
      'Your session has expired. Please log in again.',
      401
    )
  }

  let response

  try {
    response = await fetchImpl(`${baseUrl.replace(/\/$/, '')}/agent`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message })
    })
  } catch {
    throw new AgentApiError(DEFAULT_ERROR_MESSAGE)
  }

  if (!response.ok) {
    throw new AgentApiError(getErrorMessage(response.status), response.status)
  }

  let data

  try {
    data = await response.json()
  } catch {
    throw new AgentApiError(DEFAULT_ERROR_MESSAGE)
  }

  if (typeof data.answer !== 'string' || data.answer.trim() === '') {
    throw new AgentApiError(DEFAULT_ERROR_MESSAGE)
  }

  return data.answer
}
