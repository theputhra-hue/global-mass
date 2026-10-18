import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AdvancedTabGuide } from '../src/components/AdvancedTabGuide';

describe('advanced workspace guidance', () => {
  it('explains Project Lab controls without presenting them as scientific accuracy', () => {
    render(<AdvancedTabGuide tab="project" />);
    expect(screen.getByRole('heading', { name: 'Analyzer examples' })).toBeTruthy();
    expect(screen.getByText(/Passing them is not scientific accuracy/)).toBeTruthy();
    fireEvent.click(screen.getByText('How to use this tool & interpret results'));
    expect(screen.getByRole('link', { name: 'All tools & guides' }).getAttribute('href')).toBe('#/dashboard/tools');
  });
  it('explains that Casebook reviews preserve the original analysis snapshot', () => {
    render(<AdvancedTabGuide tab="casebook" />);
    expect(screen.getByRole('heading', { name: 'My investigations' })).toBeTruthy();
    expect(screen.getByText(/Notes and review status can change; a saved snapshot is not proof/)).toBeTruthy();
  });
});
