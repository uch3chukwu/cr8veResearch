import { useState } from 'react'
import { supabase } from '../lib/supabase'

function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setLoading(true)
    setMessage('')

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email: email,
        password: password
      })

      if (error) {
        setMessage(error.message)
      } else {
        setMessage('account created')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
      })

      if (error) {
        setMessage(error.message)
      }
    }

    setLoading(false)
  }

  return (
    <div>
      <h1>{isSignUp ? 'SIGN UP' : 'LOG IN'}</h1>

      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="email"
          value={email}
          onChange={function (event) {
            setEmail(event.target.value)
          }}
        />

        <input
          type="password"
          placeholder="password"
          value={password}
          onChange={function (event) {
            setPassword(event.target.value)
          }}
        />

        <button type="submit" disabled={loading}>
          {loading
            ? 'loading...'
            : isSignUp
              ? 'CREATE ACCOUNT'
              : 'LOG IN'}
        </button>
      </form>

      {message && <p>{message}</p>}

      <button
        type="button"
        onClick={function () {
          setIsSignUp(!isSignUp)
          setMessage('')
        }}
      >
        {isSignUp
          ? 'already have an account? log in'
          : 'need an account? sign up'}
      </button>
    </div>
  )
}

export default Auth