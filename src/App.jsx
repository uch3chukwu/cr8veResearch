import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import AgentView from './components/AgentView'
import Auth from './components/Auth'
import ResearchSpaces from './components/ResearchSpaces'
import References from './components/References'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedSpace, setSelectedSpace] = useState(null)
  const [activeView, setActiveView] = useState('research')

  useEffect(function () {
    let isActive = true

    async function restoreUser() {
      const { data } = await supabase.auth.getUser()

      if (isActive) {
        setUser(data.user)
        setLoading(false)
      }
    }

    restoreUser()

    const { data } = supabase.auth.onAuthStateChange(
      function (event, session) {
        setUser(session?.user ?? null)

        if (!session) {
          setSelectedSpace(null)
          setActiveView('research')
        }
      }
    )

    return function () {
      isActive = false
      data.subscription.unsubscribe()
    }
  }, [])

  async function signOut() {
    const { error } = await supabase.auth.signOut()
  
    if (error) {
      console.error('Error signing out:', error)
      return
    }
  
    setSelectedSpace(null)
    setActiveView('research')
  }

  if (loading) {
    return <p>loading...</p>
  }

  if (!user) {
    return <Auth />
  }

  let content

  if (activeView === 'agent') {
    content = <AgentView />
  } else if (selectedSpace) {
    content = (
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
  } else {
    content = (
      <ResearchSpaces
        user={user}
        onSelectSpace={setSelectedSpace}
      />
    )
  }

  return (
    <div className="app-shell">
      <nav className="app-navigation" aria-label="Primary navigation">
        <button
          type="button"
          className={activeView === 'research' ? 'is-active' : ''}
          aria-current={activeView === 'research' ? 'page' : undefined}
          onClick={function () {
            setActiveView('research')
            setSelectedSpace(null)
          }}
        >
          RESEARCH
        </button>

        <button
          type="button"
          className={activeView === 'agent' ? 'is-active' : ''}
          aria-current={activeView === 'agent' ? 'page' : undefined}
          onClick={function () {
            setActiveView('agent')
          }}
        >
          AGENT
        </button>

        <button type="button" className="app-sign-out" onClick={signOut}>
          LOG OUT
        </button>
      </nav>

      {content}
    </div>
  )}

export default App
