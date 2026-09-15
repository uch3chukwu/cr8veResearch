import { useEffect, useState } from 'react'

import { supabase } from '../lib/supabase'

function ResearchSpaces({ user, onSelectSpace }) {
  const [spaces, setSpaces] = useState([])

  const [loading, setLoading] = useState(true)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  const [message, setMessage] = useState('')

  const [showCreate, setShowCreate] =
    useState(false)

  useEffect(function () {
    loadSpaces()
  }, [user.id])

  async function loadSpaces() {
    setLoading(true)
    setMessage('')

    const {
      data,
      error
    } = await supabase
      .from('research_spaces')
      .select('*')
      .order('created_at', {
        ascending: false
      })

    if (error) {
      setMessage(error.message)
    } else {
      setSpaces(data ?? [])
    }

    setLoading(false)
  }

  async function createSpace(event) {
    event.preventDefault()
    setMessage('')

    if (!title.trim()) {
      setMessage('title is required')
      return
    }

    const {
      data,
      error
    } = await supabase
      .from('research_spaces')
      .insert({
        user_id: user.id,
        title: title.trim(),
        description:
          description.trim()
      })
      .select()
      .single()

    if (error) {
      setMessage(error.message)
      return
    }

    setSpaces(function (
      currentSpaces
    ) {
      return [
        data,
        ...currentSpaces
      ]
    })

    setTitle('')
    setDescription('')

    setShowCreate(false)
  }

  function openSpace(space) {
    onSelectSpace(space)
  }

  if (loading) {
    return (
      <main className="research-spaces">
        <div className="workspace-loading">
          LOADING RESEARCH SPACES...
        </div>
      </main>
    )
  }

  return (
    <main className="research-spaces">
      <header className="spaces-header">
        <div>
          <span className="workspace-kicker">
            CR8VERESEARCH / INDEX
          </span>

          <h1>Research Spaces</h1>

          <p>
            Bounded environments for
            investigation, collection and
            thought.
          </p>
        </div>

        <div className="spaces-meta">
          <span>SPACES</span>

          <strong>
            {String(spaces.length).padStart(
              2,
              '0'
            )}
          </strong>
        </div>
      </header>

      <div className="spaces-toolbar">
        <span>
          {spaces.length === 0
            ? 'NO ACTIVE SPACES'
            : `${spaces.length} ACTIVE ${
                spaces.length === 1
                  ? 'SPACE'
                  : 'SPACES'
              }`}
        </span>

        <button
          type="button"
          className="create-space-trigger"
          onClick={function () {
            setShowCreate(
              !showCreate
            )
            setMessage('')
          }}
        >
          {showCreate
            ? 'CLOSE ×'
            : 'NEW SPACE +'}
        </button>
      </div>

      {showCreate && (
        <section className="space-creator">
          <div className="creator-heading">
            <span>
              NEW RESEARCH SPACE
            </span>

            <p>
              Create a bounded context
              for a line of inquiry.
            </p>
          </div>

          <form
            onSubmit={createSpace}
            className="space-form"
          >
            <div className="space-field">
              <label htmlFor="space-title">
                TITLE
              </label>

              <input
                id="space-title"
                type="text"
                placeholder="e.g. fragmented identity"
                value={title}
                onChange={function (
                  event
                ) {
                  setTitle(
                    event.target.value
                  )
                }}
              />
            </div>

            <div className="space-field">
              <label htmlFor="space-description">
                DESCRIPTION
              </label>

              <textarea
                id="space-description"
                placeholder="what are you investigating?"
                value={description}
                onChange={function (
                  event
                ) {
                  setDescription(
                    event.target.value
                  )
                }}
              />
            </div>

            <button
              type="submit"
              className="space-submit"
            >
              CREATE SPACE →
            </button>
          </form>
        </section>
      )}

      {message && (
        <div className="workspace-message">
          {message}
        </div>
      )}

      <section className="spaces-index">
        <div className="spaces-index-heading">
          <span>INDEX</span>
          <span>NAME</span>
          <span>VISIBILITY</span>
          <span>CREATED</span>
        </div>

        {spaces.length === 0 ? (
          <div className="spaces-empty">
            <span>001</span>

            <div>
              <strong>
                Nothing here yet.
              </strong>

              <p>
                Your first research
                space starts with a
                question.
              </p>
            </div>

            <button
              type="button"
              onClick={function () {
                setShowCreate(true)
              }}
            >
              CREATE ONE →
            </button>
          </div>
        ) : (
          spaces.map(function (
            space,
            index
          ) {
            return (
              <article
                key={space.id}
                className="space-row"
                onClick={function () {
                  openSpace(space)
                }}
                role="button"
                tabIndex={0}
                onKeyDown={function (
                  event
                ) {
                  if (
                    event.key ===
                    'Enter'
                  ) {
                    openSpace(space)
                  }
                }}
              >
                <span className="space-number">
                  {String(
                    index + 1
                  ).padStart(3, '0')}
                </span>

                <div className="space-main">
                  <h2>
                    {space.title}
                  </h2>

                  {space.description && (
                    <p>
                      {
                        space.description
                      }
                    </p>
                  )}
                </div>

                <span className="space-visibility">
                  {space.visibility}
                </span>

                <time className="space-date">
                  {new Date(
                    space.created_at
                  ).toLocaleDateString(
                    undefined,
                    {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    }
                  )}
                </time>

                <span className="space-arrow">
                  ↗
                </span>
              </article>
            )
          })
        )}
      </section>
    </main>
  )
}

export default ResearchSpaces