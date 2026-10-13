import {
  createReferenceNavigationTarget,
  parseAgentResponse
} from '../lib/agent-response'

function AgentResponse({ answer, onOpenReference, userId }) {
  const response = parseAgentResponse(answer)

  if (response.kind === 'interpretation') {
    return (
      <div className="agent-response-prose">
        <span>AGENT SYNTHESIS</span>
        <p>{response.summary}</p>
      </div>
    )
  }

  return (
    <div className={`agent-response-structured is-${response.kind}`}>
      <header>
        <span>
          {response.kind === 'empty'
            ? 'RETRIEVAL RESULT'
            : 'RETRIEVED EVIDENCE / MOCK'}
        </span>
        <p>{response.summary}</p>
      </header>

      {response.references.length > 0 && (
        <section className="agent-evidence-section">
          <h3>References</h3>
          <div className="agent-evidence-list">
            {response.references.map((reference) => (
              <button
                type="button"
                className="agent-reference-result"
                key={reference.id}
                onClick={() => {
                  const target = createReferenceNavigationTarget(
                    reference,
                    userId
                  )

                  if (target) {
                    onOpenReference(target)
                  }
                }}
              >
                <span>{reference.title}</span>
                {reference.context && <p>{reference.context}</p>}
                <small>OPEN REFERENCE ↗</small>
              </button>
            ))}
          </div>
        </section>
      )}

      {response.notes.length > 0 && (
        <section className="agent-evidence-section">
          <h3>Notes</h3>
          <div className="agent-evidence-list">
            {response.notes.map((note, index) => (
              <article className="agent-note-result" key={note.id ?? index}>
                <span>{note.kind}</span>
                <p>{note.content}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      {response.sources.length > 0 && (
        <section className="agent-evidence-section">
          <h3>Sources</h3>
          <div className="agent-evidence-list">
            {response.sources.map((source, index) => (
              <article className="agent-source-result" key={source.id ?? index}>
                <span>{source.title}</span>
                {source.creator && <small>{source.creator}</small>}
                {source.description && <p>{source.description}</p>}
                {source.url && (
                  <a href={source.url} target="_blank" rel="noreferrer">
                    OPEN SOURCE ↗
                  </a>
                )}
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

export default AgentResponse
