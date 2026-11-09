import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import ReadingForm from '../components/readings/ReadingForm';

describe('Frontend Component: ReadingForm', () => {
  it('1. should render all reading form fields and controls', () => {
    render(<ReadingForm onSave={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByRole('heading', { name: /Log Blood Glucose Reading/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Reading Date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Blood Glucose Level/i)).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: /Time Slot/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save Reading/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
  });

  it('2. should show exact message "Please enter a glucose value." when value is empty', async () => {
    const user = userEvent.setup();
    const handleSave = vi.fn();
    render(<ReadingForm onSave={handleSave} onCancel={vi.fn()} />);

    const saveButton = screen.getByRole('button', { name: /Save Reading/i });
    await user.click(saveButton);

    expect(screen.getByText('Please enter a glucose value.')).toBeInTheDocument();
    expect(handleSave).not.toHaveBeenCalled();
  });

  it('3. should show exact message "Value must be between 40 and 600 mg/dl." for values outside bounds', async () => {
    const user = userEvent.setup();
    const handleSave = vi.fn();
    render(<ReadingForm onSave={handleSave} onCancel={vi.fn()} />);

    const input = screen.getByLabelText(/Blood Glucose Level/i);
    const saveButton = screen.getByRole('button', { name: /Save Reading/i });

    // Below 40 (e.g. 35)
    await user.type(input, '35');
    await user.click(saveButton);
    expect(screen.getByText('Value must be between 40 and 600 mg/dl.')).toBeInTheDocument();
    expect(handleSave).not.toHaveBeenCalled();

    // Above 600 (e.g. 650)
    await user.clear(input);
    await user.type(input, '650');
    await user.click(saveButton);
    expect(screen.getByText('Value must be between 40 and 600 mg/dl.')).toBeInTheDocument();
    expect(handleSave).not.toHaveBeenCalled();
  });

  it('4. should select time slot and submit valid payload', async () => {
    const user = userEvent.setup();
    const handleSave = vi.fn();
    render(<ReadingForm onSave={handleSave} onCancel={vi.fn()} />);

    // Select 'After lunch'
    const afterLunchBtn = screen.getByRole('radio', { name: /After lunch/i });
    await user.click(afterLunchBtn);
    expect(afterLunchBtn).toHaveAttribute('aria-checked', 'true');

    // Enter valid value
    const input = screen.getByLabelText(/Blood Glucose Level/i);
    await user.type(input, '125');

    // Submit
    const saveButton = screen.getByRole('button', { name: /Save Reading/i });
    await user.click(saveButton);

    expect(handleSave).toHaveBeenCalledWith(
      expect.objectContaining({
        time_slot: 'after_lunch',
        value: 125
      })
    );
  });

  it('5. should display backend validation error in Alert banner', () => {
    const errorMessage = 'You already have an After lunch reading for this date.';
    render(
      <ReadingForm
        onSave={vi.fn()}
        onCancel={vi.fn()}
        serverError={errorMessage}
      />
    );

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });
});
