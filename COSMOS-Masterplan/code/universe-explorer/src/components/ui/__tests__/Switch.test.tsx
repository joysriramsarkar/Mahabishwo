import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { Switch } from '../Switch';

describe('Switch', () => {
  it('renders label and reflects checked state', () => {
    const onChange = vi.fn();
    const { getByRole } = render(
      <Switch checked={false} onCheckedChange={onChange} label="স্তর" />
    );
    const sw = getByRole('switch');
    expect(sw).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(sw);
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
