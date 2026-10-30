import { fireEvent, render, screen, within } from '@testing-library/react';
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

describe('resume from counts', () => {
  const fill = async (user: ReturnType<typeof userEvent.setup>, counts: Record<number, string>) => {
    for (const [face, n] of Object.entries(counts)) await user.type(screen.getByLabelText(`Face ${face}`), n);
  };

  it('adds the entered counts to the session, then new rolls build on them', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Resume' }));
    await fill(user, { 1: '10', 2: '10', 3: '10', 4: '10', 5: '10', 6: '10' });
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(total()).toBe('60');
    expect(screen.getByText(/includes 60 rolls entered manually/i)).toBeInTheDocument();
    expect(box()).toHaveFocus();
    await user.type(box(), '6{Enter}');
    expect(total()).toBe('61');
  });

  it('is disabled once a count has started, and after resuming', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByRole('button', { name: 'Resume' })).toBeEnabled();
    await user.type(box(), '3{Enter}');
    expect(screen.getByRole('button', { name: 'Resume' })).toBeDisabled();
  });

  it('Undo only removes live rolls, never the starting counts', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Resume' }));
    await fill(user, { 2: '40' });
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByRole('button', { name: /undo/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Resume' })).toBeDisabled();
    await user.type(box(), '1{Enter}');
    await user.click(screen.getByRole('button', { name: /undo/i }));
    expect(total()).toBe('40');
  });

  it('rejects bad input inside the dialog without changing the session', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Resume' }));
    await fill(user, { 1: '-3' });
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(within(screen.getByRole('dialog')).getByRole('alert')).toHaveTextContent(/whole number/i);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(total()).toBe('0');
    expect(screen.getByRole('button', { name: 'Resume' })).toBeEnabled();
    expect(box()).toHaveFocus();
  });

  it('switching dice after resuming discards the starting counts', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Resume' }));
    await fill(user, { 1: '5' });
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await user.click(screen.getByRole('radio', { name: 'D8' }));
    await user.click(screen.getByRole('button', { name: /discard and switch/i }));
    expect(total()).toBe('0');
    expect(screen.queryByText(/entered manually/i)).toBeNull();
  });

  it('D10 dialog has faces 0-9', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('radio', { name: 'D10' }));
    await user.click(screen.getByRole('button', { name: 'Resume' }));
    await fill(user, { 0: '4' });
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(total()).toBe('4');
    const row = screen.getByRole('rowheader', { name: '0' }).closest('tr')!;
    expect(row).toHaveTextContent(/^0\s*4/);
  });
});

describe('insufficient-data message', () => {
  it('gives the minimum and the realistic roll counts', () => {
    render(<App />);
    expect(screen.getByText(/at least 30 rolls, but realistically closer to 120 rolls for a D6 \(an average of 5 per face\)/)).toBeInTheDocument();
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
