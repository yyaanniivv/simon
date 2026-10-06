import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

it('renders without crashing', () => {
  render(<App />);
  expect(screen.getByText('Score 0')).toBeInTheDocument();
  expect(screen.getByText('High Score: 0')).toBeInTheDocument();
});
