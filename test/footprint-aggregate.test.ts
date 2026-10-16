import { describe, expect, it } from 'vitest';
import { BarLedger, autoFootprintTick, barDelta, barIndexAt, imbalances, niceStep, pocIndex, valueArea } from '../src/chart-types/footprint/aggregate';
import { compactVolume } from '../src/chart-types/footprint/layer';
import type { Trade } from '../src/chart-types/footprint/types';

const trade = (id: number, price: number, qty: number, sell: boolean): Trade => ({ id, time: 1000 + id, price, qty, sell });

describe('footprint aggregation', () => {
    it('splits volume per level by aggressor side', () => {
        const ledger = new BarLedger(1000);
        ledger.add(trade(1, 100.2, 2, false), 1); // buyer-aggressor, level 100
        ledger.add(trade(2, 100.9, 3, true), 1); // seller-aggressor, level 100
        ledger.add(trade(3, 101.0, 6, false), 1); // level 101
        const bar = ledger.snapshot();
        expect(bar.levels).toEqual([
            { level: 100, bid: 3, ask: 2 },
            { level: 101, bid: 0, ask: 6 },
        ]);
        expect(barDelta(bar)).toBe(2 + 6 - 3);
        expect(pocIndex(bar)).toBe(1); // level 101 trades 6, level 100 trades 5
    });

    it('rounds nice steps up to 1, 2, 2.5 or 5 times a power of ten', () => {
        expect(niceStep(0.13)).toBe(0.2);
        expect(niceStep(3)).toBe(5);
        expect(niceStep(21)).toBe(25);
    });

    it('reports a truncated bar', () => {
        const ledger = new BarLedger(1);
        ledger.truncated = true;
        ledger.add(trade(1, 1, 1, false), 1);
        expect(ledger.snapshot().truncated).toBe(true);
    });

    it('flags diagonal imbalances', () => {
        const ledger = new BarLedger(1);
        // ask@101 = 9 against bid@100 = 2 → 4.5x ≥ 3 → ask imbalance at level 101
        ledger.add(trade(1, 100, 2, true), 1);
        ledger.add(trade(2, 101, 9, false), 1);
        const { ask, bid } = imbalances(ledger.snapshot(), 3);
        expect([...ask]).toEqual([101]);
        expect([...bid]).toEqual([]);
    });

    it('bounds the value area around the POC', () => {
        const ledger = new BarLedger(1);
        // volume per level 100..105: 1, 2, 10, 4, 1, 2 (total 20, POC at 102)
        [1, 2, 10, 4, 1, 2].forEach((v, i) => ledger.add(trade(i, 100 + i, v, false), 1));
        const bar = ledger.snapshot();
        expect(valueArea(bar, 0.5)).toEqual({ low: 102, high: 102 }); // the POC alone is already 50%
        expect(valueArea(bar, 0.6)).toEqual({ low: 102, high: 104 }); // 5 above (4+1) beats 3 below (2+1)
        const all = valueArea(bar, 1)!;
        expect([all.low, all.high]).toEqual([100, 105]);
        expect(valueArea(new BarLedger(2).snapshot(), 0.7)).toBeNull();
    });

    it('finds the bar containing a time and picks a nice tick', () => {
        expect(barIndexAt([0, 60, 120], 59)).toBe(0);
        expect(barIndexAt([0, 60, 120], 60)).toBe(1);
        expect(barIndexAt([60, 120], 10)).toBe(-1);
        expect(autoFootprintTick([50, 60, 70, 80, 90], 80_000)).toBe(10); // median 70 / 10 rows → 7 → nice 10
    });

    it('formats volumes compactly', () => {
        expect(compactVolume(0)).toBe('0');
        expect(compactVolume(0.456)).toBe('0.46');
        expect(compactVolume(12.34)).toBe('12.3');
        expect(compactVolume(999)).toBe('999');
        expect(compactVolume(1500)).toBe('1.5k');
        expect(compactVolume(2_500_000)).toBe('2.5M');
    });
});
