import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import ReadingItem from '../components/readings/ReadingItem';
import { EmptyState } from '../components/common';

describe('Frontend Component: ReadingList & EmptyState', () => {
  it('6. should render empty state when no readings are recorded', () => {
    render(
      <EmptyState
        title="No glucose readings recorded yet"
        description="Log your daily blood glucose readings to view your history."
      />
    );

    expect(screen.getByText('No glucose readings recorded yet')).toBeInTheDocument();
    expect(
      screen.getByText('Log your daily blood glucose readings to view your history.')
    ).toBeInTheDocument();
  });

  it('should render reading item with slot label, mg/dL value, and action handlers', async () => {
    const user = userEvent.setup();
    const handleEdit = vi.fn();
    const handleDelete = vi.fn();

    const sampleReading = {
      id: 'test-uuid-1',
      reading_date: '2026-03-25',
      time_slot: 'morning',
      value: 98
    };

    render(
      <ReadingItem
        reading={sampleReading}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    );

    expect(screen.getByText('Morning')).toBeInTheDocument();
    expect(screen.getByText('98')).toBeInTheDocument();
    expect(screen.getByText('mg/dL')).toBeInTheDocument();
    expect(screen.getByText('2026-03-25')).toBeInTheDocument();

    const editBtn = screen.getByRole('button', { name: /Edit Morning reading/i });
    const deleteBtn = screen.getByRole('button', { name: /Delete Morning reading/i });

    await user.click(editBtn);
    expect(handleEdit).toHaveBeenCalledWith(sampleReading);

    await user.click(deleteBtn);
    expect(handleDelete).toHaveBeenCalledWith(sampleReading);
  });
});
