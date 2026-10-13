import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import AgentView from './components/AgentView'
import Auth from './components/Auth'
import ResearchSpaces from './components/ResearchSpaces'
import References from './components/References'
import { createAgentSession } from './lib/agent-session'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedSpace, setSelectedSpace] = useState(null)
  const [activeView, setActiveView] = useState('research')
  const [agentSession, setAgentSession] = useState(createAgentSession)

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
          setAgentSession(createAgentSession())
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
    setAgentSession(createAgentSession())
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
    content = (
      <AgentView
        session={agentSession}
        setSession={setAgentSession}
        userId={user.id}
      />
    )
  } else if (selectedSpace) {
    content = (
      <References
        user={user}
        space={selectedSpace}
        onBack={function () {
          setSelectedSpace(null)
        }}
      />
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
