import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Auth from './components/Auth'
import ResearchSpaces from './components/ResearchSpaces'
import References from './components/References'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedSpace, setSelectedSpace] = useState(null)

  useEffect(function () {
    getUser()

    const { data } = supabase.auth.onAuthStateChange(
      function (event, session) {
        setUser(session?.user ?? null)
      }
    )

    return function () {
      data.subscription.unsubscribe()
    }
  }, [])

  async function getUser() {
    const { data } = await supabase.auth.getUser()

    setUser(data.user)
    setLoading(false)
  }

  if (loading) {
    return <p>loading...</p>
  }

  if (!user) {
    return <Auth />
  }

  if (selectedSpace) {
    return (
      <div>
        <button
          type="button"
          onClick={function () {
            setSelectedSpace(null)
          }}
        >
          BACK TO RESEARCH SPACES
        </button>

        <h1>{selectedSpace.title}</h1>

        {selectedSpace.description && (
          <p>{selectedSpace.description}</p>
        )}

        <hr />

        <References
          user={user}
          space={selectedSpace}
        />
      </div>
    )
  }

  return (
    <ResearchSpaces
      user={user}
      onSelectSpace={setSelectedSpace}
    />
  )
}

export default App