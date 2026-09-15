import { useEffect, useState } from 'react'

import { supabase } from '../lib/supabase'
import ReferenceDetail from './ReferenceDetail'

function References({ user, space }) {
  const [references, setReferences] = useState([])

  const [loading, setLoading] = useState(true)

  const [selectedReference, setSelectedReference] =
    useState(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  const [search, setSearch] = useState('')

  const [message, setMessage] = useState('')

  const [showCreate, setShowCreate] =
    useState(false)

  useEffect(function () {
    loadReferences()
  }, [space.id])

  async function loadReferences() {
    setLoading(true)
    setMessage('')

    const {
      data,
      error
    } = await supabase
      .from('references')
      .select(`
        id,
        user_id,
        title,
        description,
        created_at,
        updated_at,
        reference_spaces!inner (
          research_space_id
        )
      `)
      .eq(
        'reference_spaces.research_space_id',
        space.id
      )
      .order('created_at', {
        ascending: false
      })

    if (error) {
      setMessage(error.message)
    } else {
      setReferences(data ?? [])
    }

    setLoading(false)
  }

  async function createReference(event) {
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
      .from('references')
      .insert({
        user_id: user.id,
        title: title.trim(),
        description:
          description.trim()
      })
      .select(`
        id,
        user_id,
        title,
        description,
        created_at,
        updated_at
      `)
      .single()

    if (error) {
      setMessage(error.message)
      return
    }

    const {
      error: relationError
    } = await supabase
      .from('reference_spaces')
      .insert({
        reference_id: data.id,
        research_space_id: space.id
      })

    if (relationError) {
      setMessage(
        relationError.message
      )
      return
    }

    const newReference = {
      ...data,
      reference_spaces: [
        {
          research_space_id:
            space.id
        }
      ]
    }

    setReferences(function (
      currentReferences
    ) {
      return [
        newReference,
        ...currentReferences
      ]
    })

    setTitle('')
    setDescription('')
    setShowCreate(false)

    setSelectedReference(
      newReference
    )
  }

  function openReference(reference) {
    setSelectedReference(reference)
  }

  function closeReference() {
    setSelectedReference(null)
  }

  function updateSearch(event) {
    setSearch(event.target.value)
  }

  const filteredReferences =
    references.filter(
      function (reference) {
        const query =
          search.trim().toLowerCase()

        if (!query) {
          return true
        }

        const titleMatch =
          reference.title
            .toLowerCase()
            .includes(query)

        const descriptionMatch =
          reference.description
            ?.toLowerCase()
            .includes(query)

        return (
          titleMatch ||
          descriptionMatch
        )
      }
    )

  if (selectedReference) {
    return (
      <ReferenceDetail
        reference={selectedReference}
        onBack={closeReference}
      />
    )
  }

  if (loading) {
    return (
      <main className="references-page">
        <div className="workspace-loading">
          LOADING REFERENCES...
        </div>
      </main>
    )
  }

  return (
    <main className="references-page">
      <header className="references-header">
        <div>
          <button
            type="button"
            className="references-back"
            onClick={function () {
              window.history.back()
            }}
          >
            ← RESEARCH SPACES
          </button>

          <span className="workspace-kicker">
            RESEARCH SPACE / INDEX
          </span>

          <h1>{space.title}</h1>

          {space.description && (
            <p>
              {space.description}
            </p>
          )}
        </div>

        <div className="references-total">
          <span>REFERENCES</span>

          <strong>
            {String(
              references.length
            ).padStart(2, '0')}
          </strong>
        </div>
      </header>

      <div className="references-toolbar">
        <div className="references-search">
          <span>SEARCH</span>

          <input
            type="search"
            placeholder="search references..."
            value={search}
            onChange={updateSearch}
            aria-label="Search references"
          />
        </div>

        <button
          type="button"
          className="create-reference-trigger"
          onClick={function () {
            setShowCreate(
              !showCreate
            )
            setMessage('')
          }}
        >
          {showCreate
            ? 'CLOSE ×'
            : 'NEW REFERENCE +'}
        </button>
      </div>

      {showCreate && (
        <section className="reference-creator">
          <div className="creator-heading">
            <span>
              NEW REFERENCE
            </span>

            <p>
              Add an object, work, person,
              idea or piece of material
              to this investigation.
            </p>
          </div>

          <form
            onSubmit={createReference}
            className="reference-create-form"
          >
            <div className="reference-field">
              <label htmlFor="reference-title">
                TITLE
              </label>

              <input
                id="reference-title"
                type="text"
                placeholder="e.g. Wassily Chair"
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

            <div className="reference-field">
              <label htmlFor="reference-description">
                DESCRIPTION
              </label>

              <textarea
                id="reference-description"
                placeholder="why is this relevant?"
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
              className="reference-submit"
            >
              CREATE REFERENCE →
            </button>
          </form>
        </section>
      )}

      {message && (
        <div className="workspace-message">
          {message}
        </div>
      )}

      <section className="references-index">
        <div className="references-index-heading">
          <span>INDEX</span>
          <span>REFERENCE</span>
          <span>ADDED</span>
          <span></span>
        </div>

        {filteredReferences.length === 0 ? (
          <div className="references-empty">
            <span>
              {references.length === 0
                ? '001'
                : '—'}
            </span>

            <div>
              <strong>
                {references.length === 0
                  ? 'Nothing here yet.'
                  : 'No matching references.'}
              </strong>

              <p>
                {references.length === 0
                  ? 'Begin the investigation by adding your first reference.'
                  : 'Try a different search term.'}
              </p>
            </div>

            {references.length === 0 && (
              <button
                type="button"
                onClick={function () {
                  setShowCreate(true)
                }}
              >
                CREATE ONE →
              </button>
            )}
          </div>
        ) : (
          filteredReferences.map(
            function (
              reference,
              index
            ) {
              return (
                <article
                  key={reference.id}
                  className="reference-row"
                  onClick={function () {
                    openReference(
                      reference
                    )
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={function (
                    event
                  ) {
                    if (
                      event.key ===
                        'Enter' ||
                      event.key ===
                        ' '
                    ) {
                      event.preventDefault()

                      openReference(
                        reference
                      )
                    }
                  }}
                >
                  <span className="reference-number">
                    {String(
                      references.indexOf(
                        reference
                      ) + 1
                    ).padStart(
                      3,
                      '0'
                    )}
                  </span>

                  <div className="reference-main">
                    <h2>
                      {reference.title}
                    </h2>

                    {reference.description && (
                      <p>
                        {
                          reference.description
                        }
                      </p>
                    )}
                  </div>

                  <time className="reference-date">
                    {new Date(
                      reference.created_at
                    ).toLocaleDateString(
                      undefined,
                      {
                        day: '2-digit',
                        month: 'short'
                      }
                    )}
                  </time>

                  <span className="reference-arrow">
                    ↗
                  </span>
                </article>
              )
            }
          )
        )}
      </section>

      {filteredReferences.length > 0 && (
        <footer className="references-footer">
          <span>
            SHOWING{' '}
            {String(
              filteredReferences.length
            ).padStart(2, '0')}
            {' / '}
            {String(
              references.length
            ).padStart(2, '0')}
          </span>

          <span>
            {search
              ? 'FILTER ACTIVE'
              : 'ALL REFERENCES'}
          </span>
        </footer>
      )}
    </main>
  )
}

export default References