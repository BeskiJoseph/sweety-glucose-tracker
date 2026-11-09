import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ReportSummaryCard from '../components/reports/ReportSummaryCard';

describe('Frontend Component: Reports', () => {
  it('7. should render report empty state with dash placeholders for null values', () => {
    render(
      <ReportSummaryCard
        title="Daily Summary"
        subtitle="No records"
        count={0}
        highest={null}
        lowest={null}
        average={null}
      />
    );

    expect(screen.getByText('Daily Summary')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument(); // Count is 0

    // Average, Highest, Lowest should be displayed as dashes
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBe(3);
  });

  it('should render computed statistics with mg/dL units when data is present', () => {
    render(
      <ReportSummaryCard
        title="Month-to-Date (MTD)"
        subtitle="Current Month"
        count={12}
        highest={165}
        lowest={82}
        average={114.5}
      />
    );

    expect(screen.getByText('Month-to-Date (MTD)')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('114.5')).toBeInTheDocument();
    expect(screen.getByText('165')).toBeInTheDocument();
    expect(screen.getByText('82')).toBeInTheDocument();
    expect(screen.getAllByText('mg/dL').length).toBe(3);
  });
});
