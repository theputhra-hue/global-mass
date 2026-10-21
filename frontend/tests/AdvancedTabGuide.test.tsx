import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AdvancedTabGuide } from '../src/features/navigation/components/AdvancedTabGuide';

describe('advanced workspace guidance', () => {
  it('keeps interpretation help collapsed under a simple tool heading', () => {
    render(<AdvancedTabGuide tab="project" />);
    expect(screen.getByRole('heading', { name: 'Analyzer examples', level: 1 })).toBeTruthy();
    const help = screen.getByText('How to use this tool & interpret results');
    expect(help.closest('details')?.open).toBe(false);
    fireEvent.click(help);
    expect(screen.getByText(/Passing them is not scientific accuracy/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'All tools & guides' }).getAttribute('href')).toBe('#/dashboard/tools');
  });
  it('explains that Casebook reviews preserve the original analysis snapshot', () => {
    render(<AdvancedTabGuide tab="casebook" />);
    expect(screen.getByRole('heading', { name: 'My investigations' })).toBeTruthy();
    fireEvent.click(screen.getByText('How to use this tool & interpret results'));
    expect(screen.getByText(/Notes and review status can change; a saved snapshot is not proof/)).toBeTruthy();
  });
  it('includes the current story map without reverting the graph route', () => {
    render(<AdvancedTabGuide tab="atlas" />);
    expect(screen.getByRole('heading', { name: 'Story map' })).toBeTruthy();
    expect(screen.getByText(/Explore all articles in the saved topic map/)).toBeTruthy();
  });
});
