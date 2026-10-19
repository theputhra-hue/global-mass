import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Dialog } from '../src/shared/ui/Dialog';

function NestedDialogs() {
  const [outer, setOuter] = useState(true);
  const [inner, setInner] = useState(false);
  return <>
    {outer && <Dialog labelledBy="outer-title" onClose={() => setOuter(false)}>
      <h2 id="outer-title">Outer</h2>
      <button onClick={() => setInner(true)}>Open inner</button>
      <button onClick={() => setOuter(false)}>Close outer</button>
    </Dialog>}
    {inner && <Dialog labelledBy="inner-title" onClose={() => setInner(false)}>
      <h2 id="inner-title">Inner</h2>
      <button>First inner control</button>
      <input aria-label="Hidden control" hidden />
      <button>Last inner control</button>
    </Dialog>}
  </>;
}

describe('dialog focus and lifecycle', () => {
  it('handles Escape and focus trapping only in the top dialog', () => {
    render(<NestedDialogs />);
    const opener = screen.getByRole('button', { name: 'Open inner' });
    opener.focus();
    fireEvent.click(opener);
    const inner = screen.getByRole('dialog', { name: 'Inner' });
    fireEvent.keyDown(inner, { key: 'Tab' });
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'First inner control' }));
    fireEvent.keyDown(document.activeElement!, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Last inner control' }));
    fireEvent.keyDown(inner, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Inner' })).toBeNull();
    expect(screen.getByRole('dialog', { name: 'Outer' })).toBeTruthy();
    expect(document.activeElement).toBe(opener);
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('keeps scrolling locked when a lower dialog closes first', () => {
    document.body.style.overflow = 'auto';
    render(<NestedDialogs />);
    fireEvent.click(screen.getByRole('button', { name: 'Open inner' }));
    const inner = screen.getByRole('dialog', { name: 'Inner' });
    fireEvent.click(screen.getByRole('button', { name: 'Close outer' }));
    expect(document.body.style.overflow).toBe('hidden');
    expect(document.activeElement).toBe(inner);
    fireEvent.keyDown(inner, { key: 'Escape' });
    expect(document.body.style.overflow).toBe('auto');
    document.body.style.overflow = '';
  });
});
