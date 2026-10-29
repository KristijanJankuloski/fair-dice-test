import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it } from 'vitest';
import App from './App';

beforeAll(() => {
  // Recharts' ResponsiveContainer needs ResizeObserver, which jsdom lacks.
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

const total = () => screen.getByText(/total rolls/i).nextElementSibling!.textContent;
const box = () => screen.getByLabelText('Roll result') as HTMLInputElement;

describe('roll entry', () => {
  it('Enter records exactly one roll, clears the field and keeps focus', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(box(), '4{Enter}');
    expect(total()).toBe('1');
    expect(box().value).toBe('');
    expect(box()).toHaveFocus();
  });

  it('numpad Enter (key "Enter", code "NumpadEnter") submits once', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(box(), '3');
    fireEvent.keyDown(box(), { key: 'Enter', code: 'NumpadEnter' });
    expect(total()).toBe('1');
  });

  it('ignores held-key repeats', () => {
    render(<App />);
    const input = box();
    input.focus();
    // fireEvent-like repeat via a raw KeyboardEvent
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', repeat: true, bubbles: true }));
    expect(total()).toBe('0');
  });

  it.each(['', '0', '7', '1.5', '-2', 'abc'])('rejects %j without changing data and keeps focus', async (raw) => {
    const user = userEvent.setup();
    render(<App />); // D6 by default
    if (raw) await user.type(box(), raw);
    await user.keyboard('{Enter}');
    expect(total()).toBe('0');
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a number from 1 to 6');
    expect(box()).toHaveFocus();
  });

  it('accepts min and max of the die', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(box(), '1{Enter}6{Enter}');
    expect(total()).toBe('2');
  });

  it('Undo removes only the last roll', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(box(), '1{Enter}2{Enter}');
    await user.click(screen.getByRole('button', { name: /undo/i }));
    expect(total()).toBe('1');
    expect(box()).toHaveFocus();
  });
});

describe('D10 zero face', () => {
  it('D10 faces are labelled 0-9 and typing 0 records the 0 face', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('radio', { name: 'D10' }));
    await user.type(box(), '0{Enter}');
    expect(total()).toBe('1');
    expect(screen.queryByRole('rowheader', { name: '10' })).toBeNull();
    const faces = screen.getAllByRole('rowheader').map((h) => h.textContent);
    expect(faces).toEqual(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']);
    const row = screen.getByRole('rowheader', { name: '0' }).closest('tr')!;
    expect(row).toHaveTextContent(/^0\s*1/);
  });
});

describe('switching dice', () => {
  it('switches without a prompt when there is no data', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('radio', { name: 'D20' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(screen.getByRole('radio', { name: 'D20' })).toBeChecked();
  });

  it('confirms before discarding data, and cancel keeps it', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(box(), '5{Enter}');
    await user.click(screen.getByRole('radio', { name: 'D12' }));
    expect(screen.getByRole('alertdialog')).toHaveTextContent(/data will be lost/i);
    await user.click(screen.getByRole('button', { name: /keep rolling/i }));
    expect(total()).toBe('1');
    expect(screen.getByRole('radio', { name: 'D6' })).toBeChecked();
  });

  it('discarding wipes the session and focuses the input', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(box(), '5{Enter}');
    await user.click(screen.getByRole('radio', { name: 'D12' }));
    await user.click(screen.getByRole('button', { name: /discard and switch/i }));
    expect(total()).toBe('0');
    expect(screen.getByRole('radio', { name: 'D12' })).toBeChecked();
    expect(box()).toHaveFocus();
  });
});
