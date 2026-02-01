import { render, screen, fireEvent } from '@testing-library/react';
import { InputDialog } from './InputDialog';
import { describe, test, expect, vi } from 'vitest';
import React from 'react';

describe('InputDialog', () => {
  test('renders correctly', () => {
    render(
      <InputDialog
        isOpen={true}
        title="Enter Name"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );
    expect(screen.getByText('Enter Name')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  test('calls onConfirm with input value', () => {
    const onConfirm = vi.fn();
    render(
      <InputDialog
        isOpen={true}
        title="Test"
        onConfirm={onConfirm}
        onCancel={() => {}}
      />
    );

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'New Scene' } });
    fireEvent.click(screen.getByText('确认'));

    expect(onConfirm).toHaveBeenCalledWith('New Scene');
  });
});
