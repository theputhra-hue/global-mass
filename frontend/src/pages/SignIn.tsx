import { useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { authApi } from '../api/auth';
import { QueryError } from '../components/QueryError';

export function SignIn() {
  const [register, setRegister] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const values = new FormData(event.currentTarget);
    const input = { email: String(values.get('email')).trim(), password: String(values.get('password')) };
    setPending(true);
    setError(null);
    try {
      if (register) await authApi.register(input);
      else await authApi.login(input);
      window.location.hash = '/dashboard';
    } catch (failure) { setError(failure); }
    finally { setPending(false); }
  }
  return <main className="min-h-screen bg-hermes-ink text-hermes-bone font-mono relative isolate flex flex-col p-6 md:p-10">
    <div className="fixed inset-0 -z-10 pointer-events-none grain-overlay" aria-hidden="true" />
    <a href="#/" className="btn-outline-dark self-start"><ArrowLeft className="w-4 h-4" /> Back to GMEE</a>
    <div className="flex-1 flex items-center justify-center py-12">
      <section className="w-full max-w-lg card-brutal-dark p-6 md:p-10">
        <p className="font-mono text-xs tracking-widest text-hermes-red-bright mb-4">GMEE / RESEARCH WORKSPACE</p>
        <h1 className="text-4xl mb-3">{register ? 'Create your account' : 'Welcome back'}</h1>
        <p className="text-hermes-bone/65 text-sm mb-8">Sign in to explore the corpus, compare claims, and view the dashboard.</p>
        {error != null && <QueryError title="Unable to sign in" error={error} />}
        <form onSubmit={(event) => void submit(event)} className="space-y-5">
          <div><label htmlFor="signin-email" className="block font-mono text-xs font-bold uppercase tracking-wider mb-2">Email</label><input id="signin-email" name="email" type="email" autoComplete="username" required disabled={pending} className="field-brutal w-full" /></div>
          <div><label htmlFor="signin-password" className="block font-mono text-xs font-bold uppercase tracking-wider mb-2">Password</label><input id="signin-password" name="password" type="password" autoComplete={register ? 'new-password' : 'current-password'} minLength={register ? 10 : undefined} required disabled={pending} className="field-brutal w-full" />{register && <p className="text-xs mt-2 text-hermes-bone/60">At least 10 characters; cannot be entirely numeric.</p>}</div>
          <button type="submit" disabled={pending} className="btn-brutal w-full !py-3">{pending ? 'Please wait…' : register ? 'Create account' : 'Sign in'}<ArrowRight className="w-4 h-4" /></button>
        </form>
        <button type="button" disabled={pending} onClick={() => { setRegister(!register); setError(null); }} className="btn-outline-dark mt-6">{register ? 'Already have an account? Sign in' : 'New to GMEE? Create an account'}</button>
        <p className="mt-6 text-xs text-hermes-bone/65">For your privacy, refreshing or closing this page ends your local session.</p>
      </section>
    </div>
  </main>;
}
