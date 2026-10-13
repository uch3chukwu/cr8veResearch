export function createAgentSession() {
  return {
    question: '',
    exchanges: [],
    pendingQuestion: '',
    error: '',
    loading: false,
    selectedReference: null
  }
}

export function mergeAgentSession(session, changes) {
  return {
    ...session,
    ...changes
  }
}
