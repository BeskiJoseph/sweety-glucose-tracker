import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import Pagination from '../components/readings/Pagination';

describe('Frontend Component: Pagination', () => {
  it('8. should render pagination controls, current page info, and handle page navigation', async () => {
    const user = userEvent.setup();
    const handlePageChange = vi.fn();

    render(
      <Pagination
        page={1}
        totalPages={4}
        total={35}
        onPageChange={handlePageChange}
      />
    );

    // Current page information
    expect(screen.getByText(/Showing Page/i)).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText(/35 total readings/i)).toBeInTheDocument();

    // Previous button should be disabled on page 1
    const prevBtn = screen.getByRole('button', { name: /Previous Page/i });
    expect(prevBtn).toBeDisabled();

    // Next button should be enabled
    const nextBtn = screen.getByRole('button', { name: /Next Page/i });
    expect(nextBtn).toBeEnabled();

    // Clicking Next should invoke onPageChange(2)
    await user.click(nextBtn);
    expect(handlePageChange).toHaveBeenCalledWith(2);
  });

  it('should disable Next button on the last page', () => {
    render(
      <Pagination
        page={4}
        totalPages={4}
        total={35}
        onPageChange={vi.fn()}
      />
    );

    const nextBtn = screen.getByRole('button', { name: /Next Page/i });
    expect(nextBtn).toBeDisabled();

    const prevBtn = screen.getByRole('button', { name: /Previous Page/i });
    expect(prevBtn).toBeEnabled();
  });

  it('should not render anything when total records is 0', () => {
    const { container } = render(
      <Pagination
        page={1}
        totalPages={1}
        total={0}
        onPageChange={vi.fn()}
      />
    );

    expect(container.firstChild).toBeNull();
  });
});
