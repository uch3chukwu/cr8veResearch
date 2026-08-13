import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

function ReferenceDetail({ reference, onBack }) {
  const [media, setMedia] = useState([])
  const [sources, setSources] = useState([])

  const [loading, setLoading] = useState(true)

  const [mediaType, setMediaType] = useState('link')
  const [mediaTitle, setMediaTitle] = useState('')
  const [mediaUrl, setMediaUrl] = useState('')

  const [sourceTitle, setSourceTitle] = useState('')
  const [sourceType, setSourceType] = useState('website')
  const [sourceCreator, setSourceCreator] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [sourceDescription, setSourceDescription] = useState('')

  const [message, setMessage] = useState('')

  useEffect(function () {
    loadReferenceData()
  }, [reference.id])

  async function loadReferenceData() {
    setLoading(true)
    setMessage('')

    const mediaResult = await supabase
      .from('reference_media')
      .select('*')
      .eq('reference_id', reference.id)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true })

    if (mediaResult.error) {
      setMessage(mediaResult.error.message)
    } else {
      setMedia(mediaResult.data)
    }

    const sourceResult = await supabase
      .from('reference_sources')
      .select(`
        source_id,
        sources (
          id,
          title,
          source_type,
          creator,
          url,
          description
        )
      `)
      .eq('reference_id', reference.id)
      .order('created_at', { ascending: true })

    if (sourceResult.error) {
      setMessage(sourceResult.error.message)
    } else {
      setSources(sourceResult.data)
    }

    setLoading(false)
  }

  async function createMedia(event) {
    event.preventDefault()
    setMessage('')

    if (!mediaTitle.trim()) {
      setMessage('media title is required')
      return
    }

    if (!mediaUrl.trim()) {
      setMessage('media URL is required')
      return
    }

    const { data, error } = await supabase
      .from('reference_media')
      .insert({
        reference_id: reference.id,
        media_type: mediaType,
        title: mediaTitle.trim(),
        url: mediaUrl.trim(),
        position: media.length
      })
      .select()
      .single()

    if (error) {
      setMessage(error.message)
      return
    }

    setMedia(function (currentMedia) {
      return [...currentMedia, data]
    })

    setMediaTitle('')
    setMediaUrl('')
    setMediaType('link')
  }

  async function deleteMedia(mediaId) {
    setMessage('')

    const { error } = await supabase
      .from('reference_media')
      .delete()
      .eq('id', mediaId)

    if (error) {
      setMessage(error.message)
      return
    }

    setMedia(function (currentMedia) {
      return currentMedia.filter(function (item) {
        return item.id !== mediaId
      })
    })
  }

  async function createSource(event) {
    event.preventDefault()
    setMessage('')

    if (!sourceTitle.trim()) {
      setMessage('source title is required')
      return
    }

    const { data: source, error: sourceError } = await supabase
      .from('sources')
      .insert({
        user_id: reference.user_id,
        title: sourceTitle.trim(),
        source_type: sourceType,
        creator: sourceCreator.trim(),
        url: sourceUrl.trim(),
        description: sourceDescription.trim()
      })
      .select()
      .single()

    if (sourceError) {
      setMessage(sourceError.message)
      return
    }

    const { error: relationError } = await supabase
      .from('reference_sources')
      .insert({
        reference_id: reference.id,
        source_id: source.id
      })

    if (relationError) {
      setMessage(relationError.message)
      return
    }

    setSources(function (currentSources) {
      return [
        {
          source_id: source.id,
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

  async function removeSource(sourceId) {
    setMessage('')

    const { error } = await supabase
      .from('reference_sources')
      .delete()
      .eq('reference_id', reference.id)
      .eq('source_id', sourceId)

    if (error) {
      setMessage(error.message)
      return
    }

    setSources(function (currentSources) {
      return currentSources.filter(function (item) {
        return item.source_id !== sourceId
      })
    })
  }

  if (loading) {
    return <p>loading reference...</p>
  }

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
      >
        BACK TO REFERENCES
      </button>

      <hr />

      <h1>{reference.title}</h1>

      {reference.description && (
        <p>{reference.description}</p>
      )}

      {message && <p>{message}</p>}

      <hr />

      <h2>MEDIA</h2>

      <form onSubmit={createMedia}>
        <select
          value={mediaType}
          onChange={function (event) {
            setMediaType(event.target.value)
          }}
        >
          <option value="link">link</option>
          <option value="image">image</option>
          <option value="audio">audio</option>
          <option value="video">video</option>
          <option value="text">text</option>
          <option value="document">document</option>
        </select>

        <input
          type="text"
          placeholder="media title"
          value={mediaTitle}
          onChange={function (event) {
            setMediaTitle(event.target.value)
          }}
        />

        <input
          type="text"
          placeholder="media URL"
          value={mediaUrl}
          onChange={function (event) {
            setMediaUrl(event.target.value)
          }}
        />

        <button type="submit">
          ADD MEDIA
        </button>
      </form>

      <hr />

      {media.length === 0 ? (
        <p>no media yet</p>
      ) : (
        media.map(function (item) {
          return (
            <div key={item.id}>
              <h3>{item.title}</h3>

              <p>
                type: {item.media_type}
              </p>

              <p>{item.url}</p>

              <button
                type="button"
                onClick={function () {
                  deleteMedia(item.id)
                }}
              >
                DELETE
              </button>

              <hr />
            </div>
          )
        })
      )}

      <h2>SOURCES</h2>

      <form onSubmit={createSource}>
        <input
          type="text"
          placeholder="source title"
          value={sourceTitle}
          onChange={function (event) {
            setSourceTitle(event.target.value)
          }}
        />

        <select
          value={sourceType}
          onChange={function (event) {
            setSourceType(event.target.value)
          }}
        >
          <option value="website">website</option>
          <option value="book">book</option>
          <option value="album">album</option>
          <option value="publication">publication</option>
          <option value="archive">archive</option>
          <option value="museum">museum</option>
          <option value="person">person</option>
          <option value="film">film</option>
          <option value="personal">personal</option>
          <option value="other">other</option>
        </select>

        <input
          type="text"
          placeholder="creator"
          value={sourceCreator}
          onChange={function (event) {
            setSourceCreator(event.target.value)
          }}
        />

        <input
          type="text"
          placeholder="source URL"
          value={sourceUrl}
          onChange={function (event) {
            setSourceUrl(event.target.value)
          }}
        />

        <textarea
          placeholder="source description"
          value={sourceDescription}
          onChange={function (event) {
            setSourceDescription(event.target.value)
          }}
        />

        <button type="submit">
          ADD SOURCE
        </button>
      </form>

      <hr />

      {sources.length === 0 ? (
        <p>no sources yet</p>
      ) : (
        sources.map(function (item) {
          return (
            <div key={item.source_id}>
              <h3>{item.sources.title}</h3>

              <p>
                type: {item.sources.source_type}
              </p>

              {item.sources.creator && (
                <p>
                  creator: {item.sources.creator}
                </p>
              )}

              {item.sources.url && (
                <p>
                  {item.sources.url}
                </p>
              )}

              {item.sources.description && (
                <p>
                  {item.sources.description}
                </p>
              )}

              <button
                type="button"
                onClick={function () {
                  removeSource(item.source_id)
                }}
              >
                REMOVE FROM REFERENCE
              </button>

              <hr />
            </div>
          )
        })
      )}

      <h2>CREATORS</h2>
      <p>creators will go here</p>

      <h2>SUBJECTS</h2>
      <p>subjects will go here</p>

      <h2>NOTES</h2>
      <p>notes will go here</p>

      <h2>RELATIONSHIPS</h2>
      <p>relationships will go here</p>
    </div>
  )
}

export default ReferenceDetail