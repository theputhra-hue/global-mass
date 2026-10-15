import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from '../src/App';
import { describe, it, expect } from 'vitest';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

describe('App Component', () => {
  it('opens with a clear introduction and sign-in action', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    );
    expect(screen.getByText('GMEE')).toBeDefined();
    expect(screen.getByRole('heading', { name: 'Find a story. Look closer.' })).toBeDefined();
    expect(screen.getByRole('link', { name: 'Sign in to explore' }).getAttribute('href')).toBe('#/signin');
  });
});
