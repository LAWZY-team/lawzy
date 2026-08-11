import { mapWithConcurrency } from './bounded-concurrency';

describe('mapWithConcurrency', () => {
  it('preserves input order and never exceeds the concurrency bound', async () => {
    let active = 0;
    let maximumActive = 0;
    const result = await mapWithConcurrency(
      [1, 2, 3, 4, 5],
      2,
      async (item) => {
        active += 1;
        maximumActive = Math.max(maximumActive, active);
        await Promise.resolve();
        active -= 1;
        return item * 2;
      },
    );

    expect(result).toEqual([2, 4, 6, 8, 10]);
    expect(maximumActive).toBe(2);
  });

  it('rejects invalid concurrency', async () => {
    await expect(
      mapWithConcurrency([1], 0, (item) => Promise.resolve(item)),
    ).rejects.toThrow(RangeError);
  });
});
