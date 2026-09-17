import {
  useEffect,
  useState
} from 'react'

import { supabase } from '../lib/supabase'
import ReferenceViewNav from './ReferenceViewNav'

function ReferenceDetail({
  reference,
  onBack
}) {
  const [activeView, setActiveView] =
    useState('overview')

  const [media, setMedia] =
    useState([])

  const [sources, setSources] =
    useState([])

  const [notes, setNotes] =
    useState([])

  const [loading, setLoading] =
    useState(true)

  const [message, setMessage] =
    useState('')

  const [mediaType, setMediaType] =
    useState('link')

  const [mediaTitle, setMediaTitle] =
    useState('')

  const [mediaUrl, setMediaUrl] =
    useState('')

  const [mediaContent, setMediaContent] =
    useState('')

  const [sourceTitle, setSourceTitle] =
    useState('')

  const [sourceType, setSourceType] =
    useState('website')

  const [sourceCreator, setSourceCreator] =
    useState('')

  const [sourceUrl, setSourceUrl] =
    useState('')

  const [
    sourceDescription,
    setSourceDescription
  ] = useState('')

  const [
    noteContent,
    setNoteContent
  ] = useState('')

  const [
    noteKind,
    setNoteKind
  ] = useState('note')

  useEffect(function () {
    loadReferenceData()
  }, [reference.id])

  async function loadReferenceData() {
    setLoading(true)
    setMessage('')

    const [
      mediaResult,
      sourceResult,
      noteResult
    ] = await Promise.all([
      supabase
        .from('reference_media')
        .select('*')
        .eq(
          'reference_id',
          reference.id
        )
        .order('position', {
          ascending: true
        })
        .order('created_at', {
          ascending: true
        }),

      supabase
        .from('reference_sources')
        .select(`
          source_id,
          created_at,
          sources (
            id,
            user_id,
            title,
            source_type,
            creator,
            url,
            description
          )
        `)
        .eq(
          'reference_id',
          reference.id
        )
        .order('created_at', {
          ascending: true
        }),

      supabase
        .from('notes')
        .select('*')
        .eq(
          'reference_id',
          reference.id
        )
        .order('created_at', {
          ascending: false
        })
    ])

    const errors = [
      mediaResult.error,
      sourceResult.error,
      noteResult.error
    ].filter(Boolean)

    if (errors.length > 0) {
      setMessage(
        errors
          .map(function (error) {
            return error.message
          })
          .join(' | ')
      )
    }

    setMedia(
      mediaResult.data ?? []
    )

    setSources(
      sourceResult.data ?? []
    )

    setNotes(
      noteResult.data ?? []
    )

    setLoading(false)
  }

  async function createMedia(event) {
    event.preventDefault()
    setMessage('')

    if (!mediaTitle.trim()) {
      setMessage(
        'media title is required'
      )
      return
    }

    if (
      mediaType === 'text' &&
      !mediaContent.trim()
    ) {
      setMessage(
        'media content is required'
      )
      return
    }

    if (
      mediaType !== 'text' &&
      !mediaUrl.trim()
    ) {
      setMessage(
        'media URL is required'
      )
      return
    }

    const {
      data,
      error
    } = await supabase
      .from('reference_media')
      .insert({
        reference_id: reference.id,
        media_type: mediaType,
        title: mediaTitle.trim(),
        url:
          mediaType === 'text'
            ? null
            : mediaUrl.trim(),
        content:
          mediaType === 'text'
            ? mediaContent.trim()
            : null,
        position: media.length
      })
      .select()
      .single()

    if (error) {
      setMessage(error.message)
      return
    }

    setMedia(function (
      currentMedia
    ) {
      return [
        ...currentMedia,
        data
      ]
    })

    setMediaTitle('')
    setMediaUrl('')
    setMediaContent('')
    setMediaType('link')
  }

  async function deleteMedia(
    mediaId
  ) {
    setMessage('')

    const {
      error
    } = await supabase
      .from('reference_media')
      .delete()
      .eq('id', mediaId)

    if (error) {
      setMessage(error.message)
      return
    }

    setMedia(function (
      currentMedia
    ) {
      return currentMedia.filter(
        function (item) {
          return item.id !== mediaId
        }
      )
    })
  }

  async function createSource(
    event
  ) {
    event.preventDefault()
    setMessage('')

    if (!sourceTitle.trim()) {
      setMessage(
        'source title is required'
      )
      return
    }

    const {
      data: source,
      error: sourceError
    } = await supabase
      .from('sources')
      .insert({
        user_id: reference.user_id,
        title: sourceTitle.trim(),
        source_type: sourceType,
        creator:
          sourceCreator.trim(),
        url: sourceUrl.trim(),
        description:
          sourceDescription.trim()
      })
      .select()
      .single()

    if (sourceError) {
      setMessage(
        sourceError.message
      )
      return
    }

    const {
      error: relationError
    } = await supabase
      .from('reference_sources')
      .insert({
        reference_id: reference.id,
        source_id: source.id
      })

    if (relationError) {
      setMessage(
        relationError.message
      )
      return
    }

    setSources(function (
      currentSources
    ) {
      return [
        {
          source_id: source.id,
          created_at:
            new Date().toISOString(),
          sources: source
        },
        ...currentSources
      ]
    })

    setSourceTitle('')
    setSourceType('website')
    setSourceCreator('')
    setSourceUrl('')
    setSourceDescription('')
  }

  async function removeSource(
    sourceId
  ) {
    setMessage('')

    const {
      error
    } = await supabase
      .from('reference_sources')
      .delete()
      .eq(
        'reference_id',
        reference.id
      )
      .eq(
        'source_id',
        sourceId
      )

    if (error) {
      setMessage(error.message)
      return
    }

    setSources(function (
      currentSources
    ) {
      return currentSources.filter(
        function (item) {
          return (
            item.source_id !== sourceId
          )
        }
      )
    })
  }

  async function createNote(
    event
  ) {
    event.preventDefault()
    setMessage('')

    if (!noteContent.trim()) {
      setMessage(
        'note content is required'
      )
      return
    }

    const {
      data: userData,
      error: userError
    } = await supabase.auth.getUser()

    if (userError) {
      setMessage(
        userError.message
      )
      return
    }

    if (!userData.user) {
      setMessage(
        'you must be logged in to create a note'
      )
      return
    }

    const {
      data,
      error
    } = await supabase
      .from('notes')
      .insert({
        user_id:
          userData.user.id,
        reference_id:
          reference.id,
        content:
          noteContent.trim(),
        kind: noteKind
      })
      .select()
      .single()

    if (error) {
      setMessage(error.message)
      return
    }

    setNotes(function (
      currentNotes
    ) {
      return [
        data,
        ...currentNotes
      ]
    })

    setNoteContent('')
    setNoteKind('note')
  }

  async function deleteNote(
    noteId
  ) {
    setMessage('')

    const {
      error
    } = await supabase
      .from('notes')
      .delete()
      .eq('id', noteId)

    if (error) {
      setMessage(error.message)
      return
    }

    setNotes(function (
      currentNotes
    ) {
      return currentNotes.filter(
        function (item) {
          return item.id !== noteId
        }
      )
    })
  }

  function renderEmptyState(
    message
  ) {
    return (
      <div className="reference-empty">
        <p>{message}</p>
      </div>
    )
  }

  function renderOverview() {
    return (
      <section className="reference-overview">
        <div>
          <span>
            MEDIA
          </span>

          <strong>
            {media.length}
          </strong>

          <button
            type="button"
            onClick={function () {
              setActiveView('media')
            }}
          >
            VIEW MEDIA →
          </button>
        </div>

        <div>
          <span>
            SOURCES
          </span>

          <strong>
            {sources.length}
          </strong>

          <button
            type="button"
            onClick={function () {
              setActiveView('sources')
            }}
          >
            VIEW SOURCES →
          </button>
        </div>

        <div>
          <span>
            NOTES
          </span>

          <strong>
            {notes.length}
          </strong>

          <button
            type="button"
            onClick={function () {
              setActiveView('notes')
            }}
          >
            VIEW NOTES →
          </button>
        </div>

        <div>
          <span>
            CONNECTIONS
          </span>

          <strong>
            0
          </strong>

          <button
            type="button"
            onClick={function () {
              setActiveView(
                'connections'
              )
            }}
          >
            VIEW CONNECTIONS →
          </button>
        </div>
      </section>
    )
  }

  function renderMedia() {
    return (
      <section className="reference-view">
        <header>
          <h2>MEDIA</h2>

          <p>
            Material attached to this
            reference.
          </p>
        </header>

        <form
          onSubmit={createMedia}
          className="reference-form"
        >
          <select
            value={mediaType}
            onChange={function (
              event
            ) {
              setMediaType(
                event.target.value
              )
            }}
          >
            <option value="link">
              link
            </option>

            <option value="image">
              image
            </option>

            <option value="audio">
              audio
            </option>

            <option value="video">
              video
            </option>

            <option value="text">
              text
            </option>

            <option value="document">
              document
            </option>
          </select>

          <input
            type="text"
            placeholder="media title"
            value={mediaTitle}
            onChange={function (
              event
            ) {
              setMediaTitle(
                event.target.value
              )
            }}
          />

          {mediaType === 'text' ? (
            <textarea
              placeholder="media content"
              value={mediaContent}
              onChange={function (
                event
              ) {
                setMediaContent(
                  event.target.value
                )
              }}
            />
          ) : (
            <input
              type="text"
              placeholder="media URL"
              value={mediaUrl}
              onChange={function (
                event
              ) {
                setMediaUrl(
                  event.target.value
                )
              }}
            />
          )}

          <button type="submit">
            ADD MEDIA
          </button>
        </form>

        {media.length === 0
          ? renderEmptyState(
              'no media yet'
            )
          : (
            <div className="media-list">
              {media.map(function (
                item
              ) {
                return (
                  <article
                    key={item.id}
                    className="media-item"
                  >
                    <div>
                      <span>
                        {item.media_type}
                      </span>

                      <h3>
                        {item.title}
                      </h3>

                      {item.media_type ===
                      'text' ? (
                        <p className="media-text-content">
                          {item.content?.trim()
                            ? item.content
                            : 'Text content unavailable.'}
                        </p>
                      ) : item.media_type ===
                        'image' ? (
                        <img
                          src={item.url}
                          alt={item.title}
                        />
                      ) : (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {item.url}
                        </a>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={function () {
                        deleteMedia(
                          item.id
                        )
                      }}
                    >
                      DELETE
                    </button>
                  </article>
                )
              })}
            </div>
          )}
      </section>
    )
  }

  function renderSources() {
    return (
      <section className="reference-view">
        <header>
          <h2>SOURCES</h2>

          <p>
            Where this reference
            came from.
          </p>
        </header>

        <form
          onSubmit={createSource}
          className="reference-form"
        >
          <input
            type="text"
            placeholder="source title"
            value={sourceTitle}
            onChange={function (
              event
            ) {
              setSourceTitle(
                event.target.value
              )
            }}
          />

          <select
            value={sourceType}
            onChange={function (
              event
            ) {
              setSourceType(
                event.target.value
              )
            }}
          >
            <option value="website">
              website
            </option>

            <option value="book">
              book
            </option>

            <option value="album">
              album
            </option>

            <option value="publication">
              publication
            </option>

            <option value="archive">
              archive
            </option>

            <option value="museum">
              museum
            </option>

            <option value="person">
              person
            </option>

            <option value="film">
              film
            </option>

            <option value="personal">
              personal
            </option>

            <option value="other">
              other
            </option>
          </select>

          <input
            type="text"
            placeholder="creator"
            value={sourceCreator}
            onChange={function (
              event
            ) {
              setSourceCreator(
                event.target.value
              )
            }}
          />

          <input
            type="text"
            placeholder="source URL"
            value={sourceUrl}
            onChange={function (
              event
            ) {
              setSourceUrl(
                event.target.value
              )
            }}
          />

          <textarea
            placeholder="source description"
            value={
              sourceDescription
            }
            onChange={function (
              event
            ) {
              setSourceDescription(
                event.target.value
              )
            }}
          />

          <button type="submit">
            ADD SOURCE
          </button>
        </form>

        {sources.length === 0
          ? renderEmptyState(
              'no sources yet'
            )
          : (
            <div className="source-list">
              {sources.map(function (
                item
              ) {
                return (
                  <article
                    key={item.source_id}
                    className="source-item"
                  >
                    <div>
                      <span>
                        {
                          item.sources
                            .source_type
                        }
                      </span>

                      <h3>
                        {
                          item.sources
                            .title
                        }
                      </h3>

                      {item.sources
                        .creator && (
                        <p>
                          {
                            item.sources
                              .creator
                          }
                        </p>
                      )}

                      {item.sources
                        .url && (
                        <a
                          href={
                            item.sources
                              .url
                          }
                          target="_blank"
                          rel="noreferrer"
                        >
                          {
                            item.sources
                              .url
                          }
                        </a>
                      )}

                      {item.sources
                        .description && (
                        <p>
                          {
                            item.sources
                              .description
                          }
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={function () {
                        removeSource(
                          item.source_id
                        )
                      }}
                    >
                      REMOVE
                    </button>
                  </article>
                )
              })}
            </div>
          )}
      </section>
    )
  }

  function renderNotes() {
    return (
      <section className="reference-view">
        <header>
          <h2>NOTES</h2>

          <p>
            Your thinking around
            this reference.
          </p>
        </header>

        <form
          onSubmit={createNote}
          className="reference-form"
        >
          <select
            value={noteKind}
            onChange={function (
              event
            ) {
              setNoteKind(
                event.target.value
              )
            }}
          >
            <option value="note">
              note
            </option>

            <option value="observation">
              observation
            </option>

            <option value="question">
              question
            </option>

            <option value="annotation">
              annotation
            </option>
          </select>

          <textarea
            placeholder="write a note..."
            value={noteContent}
            onChange={function (
              event
            ) {
              setNoteContent(
                event.target.value
              )
            }}
          />

          <button type="submit">
            ADD NOTE
          </button>
        </form>

        {notes.length === 0
          ? renderEmptyState(
              'no notes yet'
            )
          : (
            <div className="note-list">
              {notes.map(function (
                note
              ) {
                return (
                  <article
                    key={note.id}
                    className="note-item"
                  >
                    <div>
                      <span>
                        {note.kind}
                      </span>

                      <p>
                        {note.content}
                      </p>

                      <small>
                        {new Date(
                          note.created_at
                        ).toLocaleString()}
                      </small>
                    </div>

                    <button
                      type="button"
                      onClick={function () {
                        deleteNote(
                          note.id
                        )
                      }}
                    >
                      DELETE
                    </button>
                  </article>
                )
              })}
            </div>
          )}
      </section>
    )
  }

  function renderConnections() {
    return (
      <section className="reference-view">
        <header>
          <h2>CONNECTIONS</h2>

          <p>
            Other references connected
            to this one.
          </p>
        </header>

        <div className="reference-empty">
          <p>
            relationship system coming
            next
          </p>
        </div>
      </section>
    )
  }

  function renderActiveView() {
    if (activeView === 'overview') {
      return renderOverview()
    }

    if (activeView === 'media') {
      return renderMedia()
    }

    if (activeView === 'sources') {
      return renderSources()
    }

    if (activeView === 'notes') {
      return renderNotes()
    }

    if (activeView === 'connections') {
      return renderConnections()
    }

    return renderOverview()
  }

  if (loading) {
    return (
      <div className="reference-detail">
        <p>
          loading reference...
        </p>
      </div>
    )
  }

  const counts = {
    overview: null,
    media: media.length,
    sources: sources.length,
    notes: notes.length,
    connections: 0
  }

  return (
    <div className="reference-detail">
      <header className="reference-header">
        <button
          type="button"
          onClick={onBack}
          className="reference-back"
        >
          ← BACK TO REFERENCES
        </button>

        <div className="reference-heading">
          <span>
            REFERENCE
          </span>

          <h1>
            {reference.title}
          </h1>

          {reference.description && (
            <p>
              {reference.description}
            </p>
          )}
        </div>

        <div className="reference-stats">
          <div>
            <span>MEDIA</span>
            <strong>
              {media.length}
            </strong>
          </div>

          <div>
            <span>SOURCES</span>
            <strong>
              {sources.length}
            </strong>
          </div>

          <div>
            <span>NOTES</span>
            <strong>
              {notes.length}
            </strong>
          </div>

          <div>
            <span>CONNECTIONS</span>
            <strong>0</strong>
          </div>
        </div>
      </header>

      {message && (
        <div className="reference-message">
          {message}
        </div>
      )}

      <ReferenceViewNav
        activeView={activeView}
        onChange={setActiveView}
        counts={counts}
      />

      <main className="reference-content">
        {renderActiveView()}
      </main>
    </div>
  )
}

export default ReferenceDetail
