import { useId, useState, type FormEvent } from 'react';
import { ArrowRight, Search } from 'lucide-react';
import { navigateHash } from '../../../shared/navigation/articleRoutes';
import './workspaceSidebar.css';

export function CollectionSearch({ authenticated = true }: { authenticated?: boolean }) {
  const [query, setQuery] = useState(''), id = useId();
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const target = `#/dashboard/browse?${new URLSearchParams({ q: query.trim(), offset: '0' })}`;
    navigateHash(authenticated ? target : `#/signin?${new URLSearchParams({ next: target })}`);
  };
  return <form onSubmit={submit} className="visitor-search" aria-label="Search the news collection">
    <label htmlFor={id}>What story are you looking into?</label>
    <div className="visitor-search-field"><Search size={20} aria-hidden="true" /><input id={id} value={query} onChange={event => setQuery(event.target.value)} placeholder="A name, place, or words from a headline" aria-describedby={`${id}-hint`} maxLength={120} /><button type="submit">Find articles <ArrowRight size={16} aria-hidden="true" /></button></div>
    <p id={`${id}-hint`}>Searches saved headlines and authors in this collection.{!authenticated && ' Sign in to open the results; your search will be kept.'}</p>
  </form>;
}
