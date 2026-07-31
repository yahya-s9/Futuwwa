import { useState } from 'react';
import { supabase } from './lib/supabaseClient.js';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | sending | sent | error
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    setStatus('sending');
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) {
      setErrorMessage(error.message);
      setStatus('error');
    } else {
      setStatus('sent');
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h1 className="auth-title">Futuwwa</h1>
        <p className="auth-subtitle">Track your habits. Sign in with your email — no password needed.</p>

        {status === 'sent' ? (
          <p className="auth-sent">Check your inbox at <strong>{email}</strong> for a sign-in link.</p>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit}>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              aria-label="Email address"
            />
            <button type="submit" disabled={status === 'sending'}>
              {status === 'sending' ? 'Sending…' : 'Send magic link'}
            </button>
          </form>
        )}

        {status === 'error' && <p className="auth-error">{errorMessage}</p>}
      </div>
    </div>
  );
}
