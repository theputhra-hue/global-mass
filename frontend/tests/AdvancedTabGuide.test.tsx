import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AdvancedTabGuide } from '../src/features/navigation/components/AdvancedTabGuide';

describe('advanced workspace guidance', () => {
  it('explains Project Lab controls without presenting them as scientific accuracy', () => {
    render(<AdvancedTabGuide tab="project" />);
    expect(screen.getByRole('heading', { name: 'Understanding Project Lab' })).toBeTruthy();
    expect(screen.getByText(/Passing them is not scientific accuracy/)).toBeTruthy();
    fireEvent.click(screen.getByText('Guide to all 12 tabs'));
    expect(screen.getByRole('link', { name: 'Casebook' }).getAttribute('href')).toBe('#/dashboard/casebook');
    expect(screen.getByRole('link', { name: 'Overview Vitals' }).getAttribute('href')).toBe('#/dashboard/overview');
  });
  it('explains that Casebook reviews preserve the original analysis snapshot', () => {
    render(<AdvancedTabGuide tab="casebook" />);
    expect(screen.getByRole('heading', { name: 'Understanding Casebook' })).toBeTruthy();
    expect(screen.getByText(/Notes and review status can change; a saved snapshot is not proof/)).toBeTruthy();
  });
});
