import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import References from './References'

function ResearchSpaces({ user, onSelectSpace }) {
  const [spaces, setSpaces] = useState([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [message, setMessage] = useState('')

  useEffect(function () {
    loadSpaces()
  }, [])

  async function loadSpaces() {
    const { data, error } = await supabase
      .from('research_spaces')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      setMessage(error.message)
    } else {
      setSpaces(data)
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

    const { data, error } = await supabase
      .from('research_spaces')
      .insert({
        user_id: user.id,
        title: title.trim(),
        description: description.trim()
      })
      .select()
      .single()

    if (error) {
      setMessage(error.message)
      return
    }

    setSpaces(function (currentSpaces) {
      return [data, ...currentSpaces]
    })

    setTitle('')
    setDescription('')
  }

  if (loading) {
    return <p>loading research spaces...</p>
  }

  return (
    <div>
      <h2>RESEARCH SPACES</h2>

      <form onSubmit={createSpace}>
        <input
          type="text"
          placeholder="space title"
          value={title}
          onChange={function (event) {
            setTitle(event.target.value)
          }}
        />

        <textarea
          placeholder="description"
          value={description}
          onChange={function (event) {
            setDescription(event.target.value)
          }}
        />

        <button type="submit">
          CREATE SPACE
        </button>
      </form>

      {message && <p>{message}</p>}

      <hr />

      {spaces.length === 0 ? (
        <p>no research spaces yet</p>
      ) : (
        spaces.map(function (space) {
          return (
            <div
              key={space.id}
              onClick={function () {
                onSelectSpace(space)
              }}
              style={{ cursor: 'pointer' }}
            >
              <h3>{space.title}</h3>

              {space.description && (
                <p>{space.description}</p>
              )}

              <small>
                {space.visibility}
              </small>
            </div>)
        })
      )}
    </div>
  )
}

export default ResearchSpaces