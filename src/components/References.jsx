import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import ReferenceDetail from './ReferenceDetail'

function References({ user, space }) {
  const [references, setReferences] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedReference, setSelectedReference] = useState(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [message, setMessage] = useState('')

  useEffect(function () {
    loadReferences()
  }, [space.id])

  async function loadReferences() {
    const { data, error } = await supabase
      .from('references')
      .select(`
        id,
        title,
        description,
        created_at,
        reference_spaces!inner (
          research_space_id
        )
      `)
      .eq('reference_spaces.research_space_id', space.id)
      .order('created_at', { ascending: false })

    if (error) {
      setMessage(error.message)
    } else {
      setReferences(data)
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

    const { data, error } = await supabase
      .from('references')
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

    const { error: relationError } = await supabase
      .from('reference_spaces')
      .insert({
        reference_id: data.id,
        research_space_id: space.id
      })

    if (relationError) {
      setMessage(relationError.message)
      return
    }

    setReferences(function (currentReferences) {
      return [data, ...currentReferences]
    })

    setTitle('')
    setDescription('')
  }

  if (selectedReference) {
    return (
      <ReferenceDetail
        reference={selectedReference}
        onBack={function () {
          setSelectedReference(null)
        }}
      />
    )
  }

  if (loading) {
    return <p>loading references...</p>
  }

  return (
    <div>
      <h2>REFERENCES</h2>

      <form onSubmit={createReference}>
        <input
          type="text"
          placeholder="reference title"
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
          CREATE REFERENCE
        </button>
      </form>

      {message && <p>{message}</p>}

      <hr />

      {references.length === 0 ? (
        <p>no references yet</p>
      ) : (
        references.map(function (reference) {
          return (
            <div
              key={reference.id}
              onClick={function () {
                setSelectedReference(reference)
              }}
              style={{ cursor: 'pointer' }}
            >
              <h3>{reference.title}</h3>

              {reference.description && (
                <p>{reference.description}</p>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}

export default References