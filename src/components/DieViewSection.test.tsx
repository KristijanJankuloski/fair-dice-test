import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { DieViewSection } from './DieViewSection';
import { faceStatistics, fairnessResult } from '../services/statistics';
import type { DiceType } from '../types/dice';

const setup = (sides: DiceType, rolls: number[]) =>
  render(<DieViewSection sides={sides} faces={faceStatistics(rolls, sides)} fairness={fairnessResult(rolls, sides)} />);

describe('DieViewSection', () => {
  it('says the die is not coloured yet when there is too little data', () => {
    setup(6, [1, 2, 3]);
    expect(screen.getByRole('status')).toHaveTextContent(/not enough data to colour the die yet \(needs 30 rolls for a D6\)/i);
  });

  it('explains the missing arrow when the test sees no evidence', () => {
    setup(6, Array.from({ length: 60 }, (_, i) => (i % 6) + 1));
    expect(screen.getByRole('status')).toHaveTextContent(/no arrow/i);
  });

  it('labels the arrow as an estimate when there is evidence of bias', () => {
    setup(6, [...Array(80).fill(6), 1, 2, 3, 4, 5]);
    expect(screen.getByRole('status')).toHaveTextContent(/estimated weight direction.*an estimate.*not a measurement/i);
  });

  it('flags the default layout on dice whose neighbours are unverified, not on the D6', () => {
    const { unmount } = setup(12, []);
    expect(screen.getByText(/default layout — edit to match your die/i)).toBeInTheDocument();
    unmount();
    setup(6, []);
    expect(screen.getByText(/standard d6 layout/i)).toBeInTheDocument();
  });

  it('says the D20 and D10 defaults were copied from real dice', () => {
    const { unmount } = setup(20, []);
    expect(screen.getByText(/default layout copied from a real d20/i)).toBeInTheDocument();
    unmount();
    setup(10, []);
    expect(screen.getByText(/default layout copied from a real d10/i)).toBeInTheDocument();
  });

  it('swapping two numbers marks the layout as edited, and reset restores it', async () => {
    const user = userEvent.setup();
    setup(20, []);
    await user.selectOptions(screen.getByLabelText(/swap number/i), '3');
    await user.selectOptions(screen.getByLabelText(/^with/i), '17');
    await user.click(screen.getByRole('button', { name: 'Swap' }));
    expect(screen.getByText(/edited layout/i)).toBeInTheDocument();
    expect(screen.getByText(/opposite faces no longer sum to 21/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /reset layout/i }));
    expect(screen.getByText(/default layout copied from a real d20/i)).toBeInTheDocument();
  });

  it('D10 offers numbers 0-9', () => {
    setup(10, []);
    const opts = Array.from((screen.getByLabelText(/swap number/i) as HTMLSelectElement).options).map((o) => o.value).filter(Boolean);
    expect(opts).toEqual(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']);
  });

  it('falls back to a text list when WebGL is unavailable (jsdom has none)', async () => {
    const user = userEvent.setup();
    setup(6, [6, 6, 6, 1, 2, 3]);
    await user.click(screen.getByRole('button', { name: /load 3d die/i }));
    await waitFor(() => expect(screen.getByRole('note')).toHaveTextContent(/3D isn't available/i));
    expect(screen.getByRole('note')).toHaveTextContent(/Face 6: \+/);
  });
});
