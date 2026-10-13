import { askResearchAgent } from '../lib/agent'
import { mergeAgentSession } from '../lib/agent-session'
import { getReferenceBackLabel } from '../lib/reference-navigation'
import { supabase } from '../lib/supabase'
import AgentResponse from './AgentResponse'
import ReferenceDetail from './ReferenceDetail'

function AgentView({ userId, session, setSession }) {
  const {
    question,
    exchanges,
    pendingQuestion,
    error,
    loading,
    selectedReference
  } = session

  function updateSession(changes) {
    setSession((currentSession) => (
      mergeAgentSession(currentSession, changes)
    ))
  }

  async function submitQuestion(event) {
    event.preventDefault()

    const submittedQuestion = question.trim()

    if (!submittedQuestion || loading) {
      return
    }

    updateSession({
      loading: true,
      pendingQuestion: submittedQuestion,
      error: ''
    })

    try {
      const { data, error: sessionError } = await supabase.auth.getSession()
      const accessToken = data.session?.access_token

      if (sessionError || !accessToken) {
        throw new Error('Your session has expired. Please log in again.')
      }

      const answer = await askResearchAgent({
        message: submittedQuestion,
        accessToken
      })

      setSession((currentSession) => mergeAgentSession(currentSession, {
        exchanges: [
          ...currentSession.exchanges,
          {
            id: globalThis.crypto.randomUUID(),
            question: submittedQuestion,
            answer
          }
        ],
        question: ''
      }))
    } catch (requestError) {
      updateSession({
        error: requestError instanceof Error
          ? requestError.message
          : 'Unable to reach the research agent.'
      })
    } finally {
      updateSession({
        loading: false,
        pendingQuestion: ''
      })
    }
  }

  function handleQuestionKeyDown(event) {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      submitQuestion(event)
    }
  }

  if (selectedReference) {
    return (
      <ReferenceDetail
        reference={selectedReference}
        backLabel={getReferenceBackLabel('agent')}
        onBack={() => updateSession({ selectedReference: null })}
      />
    )
  }

  return (
    <main className="agent-workspace">
      <header className="agent-header">
        <span className="workspace-kicker">RESEARCH AGENT / V1</span>
        <h1>Ask your research.</h1>
        <p>
          Explore patterns, tensions and connections in the material you have
          collected. The agent retrieves from your private research before
          answering.
        </p>
      </header>

      <div className="agent-independence-note">
        Each question is currently answered independently. Previous exchanges
        are displayed here for your reference, but are not remembered by the
        agent.
      </div>

      <section
        className="agent-conversation"
        aria-label="Research agent conversation"
        aria-live="polite"
      >
        {exchanges.length === 0 && !loading ? (
          <div className="agent-empty">
            <div>
              <span>BEGIN AN INQUIRY</span>
              <h2>Use your archive as a thinking surface.</h2>
              <p>
                Ask the agent to retrieve material related to a theme,
                reference, or open question in your research.
              </p>
            </div>

            <ul className="agent-empty-prompts" aria-label="Question examples">
              <li>Where does a particular idea recur?</li>
              <li>What have I collected around a subject?</li>
              <li>Which notes could deepen this question?</li>
            </ul>
          </div>
        ) : (
          exchanges.map((exchange, index) => (
            <article className="agent-exchange" key={exchange.id}>
              <div className="agent-question">
                <span>QUESTION {String(index + 1).padStart(2, '0')}</span>
                <p>{exchange.question}</p>
              </div>

              <div className="agent-answer">
                <AgentResponse
                  answer={exchange.answer}
                  onOpenReference={(reference) => {
                    updateSession({ selectedReference: reference })
                  }}
                  userId={userId}
                />
              </div>
            </article>
          ))
        )}

        {loading && (
          <article className="agent-exchange is-pending">
            <div className="agent-question">
              <span>QUESTION</span>
              <p>{pendingQuestion}</p>
            </div>

            <div className="agent-answer">
              <span>RESEARCH RESPONSE</span>
              <p>Researching...</p>
            </div>
          </article>
        )}
      </section>

      {error && (
        <div className="agent-error" role="alert">
          <span>REQUEST STATUS</span>
          <p>{error}</p>
        </div>
      )}

      <form className="agent-composer" onSubmit={submitQuestion}>
        <div className="agent-composer-heading">
          <div>
            <label htmlFor="agent-question">ASK THE ARCHIVE</label>
            <p id="agent-question-help">
              One focused question works best. Answers use your accessible
              research only.
            </p>
          </div>
          <span>{question.length} / 4000</span>
        </div>
        <textarea
          id="agent-question"
          aria-describedby="agent-question-help"
          value={question}
          maxLength={4000}
          placeholder="What connections have I found between..."
          onChange={(event) => updateSession({ question: event.target.value })}
          onKeyDown={handleQuestionKeyDown}
          disabled={loading}
        />

        <div className="agent-composer-footer">
          <span>CTRL / CMD + ENTER TO SUBMIT</span>
          <button
            type="submit"
            disabled={loading || question.trim() === ''}
          >
            {loading ? 'RESEARCHING...' : 'ASK RESEARCH →'}
          </button>
        </div>
      </form>
    </main>
  )
}

export default AgentView
