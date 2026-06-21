import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import App from '../App';

describe('App component', () => {
  it('renders Carbon Coach header', () => {
    render(<App />);
    const headingElements = screen.getAllByText(/Carbon Coach/i);
    expect(headingElements.length).toBeGreaterThan(0);
  });
});
