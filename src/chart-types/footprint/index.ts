import { registerChartType, type ChartTypeSettingsSection } from '../registry';
import { registerRendererLayer } from '../../renderers/native/layers';
import { createFootprintEngine } from './engine';
import { createFootprintLayer } from './layer';
import { FOOTPRINT_DEFAULTS, FOOTPRINT_ID } from './types';

const ICON =
    '<svg viewBox="0 0 16 16" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M8 1.5v13M3 4h3.5M9.5 4H13M2 7h4.5M9.5 7H14M3.5 10h3M9.5 10h4M4 13h2.5M9.5 13H12"/></svg>';

const SETTINGS: ChartTypeSettingsSection = {
    title: 'Footprint',
    rows: [
        { kind: 'number', key: 'tickSize', label: 'Row size (0 = auto)', defval: FOOTPRINT_DEFAULTS.tickSize, min: 0, step: 0.01 },
        { kind: 'number', key: 'historyBars', label: 'Bars with footprint', defval: FOOTPRINT_DEFAULTS.historyBars, min: 1, max: 200, step: 1 },
        { kind: 'heading', label: 'Display' },
        { kind: 'toggle', key: 'showText', label: 'Volume numbers', defval: FOOTPRINT_DEFAULTS.showText },
        {
            kind: 'toggle',
            key: 'showImbalance',
            label: 'Imbalances',
            defval: FOOTPRINT_DEFAULTS.showImbalance,
            number: { key: 'imbalanceRatio', label: 'Imbalance ratio', defval: FOOTPRINT_DEFAULTS.imbalanceRatio, min: 1.5, max: 20, step: 0.5 },
        },
        { kind: 'toggle', key: 'showPoc', label: 'Point of control', defval: FOOTPRINT_DEFAULTS.showPoc, colors: [{ key: 'pocColor', label: 'POC color', defval: FOOTPRINT_DEFAULTS.pocColor }] },
        {
            kind: 'toggle',
            key: 'showValueArea',
            label: 'Value area lines',
            defval: FOOTPRINT_DEFAULTS.showValueArea,
            number: { key: 'valueAreaPct', label: 'Value area (%)', defval: FOOTPRINT_DEFAULTS.valueAreaPct, min: 10, max: 100, step: 1 },
        },
        { kind: 'toggle', key: 'showDock', label: 'Docked volume ladder (right edge)', defval: FOOTPRINT_DEFAULTS.showDock },
        { kind: 'color', key: 'bidColor', label: 'Sell (bid) volume', defval: FOOTPRINT_DEFAULTS.bidColor },
        { kind: 'color', key: 'askColor', label: 'Buy (ask) volume', defval: FOOTPRINT_DEFAULTS.askColor },
    ],
};

/** Register the footprint chart type, its data engine and its renderer layer. Idempotent. */
export function registerFootprint(): void {
    registerRendererLayer({ id: FOOTPRINT_ID, placement: 'above-data', repaintOnCursor: true, create: createFootprintLayer });
    registerChartType({ id: FOOTPRINT_ID, label: 'Footprint', icon: ICON, basePainting: 'none', settings: SETTINGS, dataEngine: createFootprintEngine });
}
