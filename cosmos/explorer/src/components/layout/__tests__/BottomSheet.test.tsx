import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BottomSheet } from '../BottomSheet';

describe('BottomSheet', () => {
  it('renders an accessible named dialog and closes via Escape', () => {
    const onOpenChange = vi.fn();
    render(<BottomSheet open onOpenChange={onOpenChange} title="স্তর ও ফিল্টার"><p>body</p></BottomSheet>);
    expect(screen.getByRole('dialog', { name: 'স্তর ও ফিল্টার' })).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
  it('close button requests dismissal', () => {
    const onOpenChange = vi.fn();
    render(<BottomSheet open onOpenChange={onOpenChange} title="সময়"><p>body</p></BottomSheet>);
    fireEvent.click(screen.getByRole('button', { name: 'সময় বন্ধ করুন' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
