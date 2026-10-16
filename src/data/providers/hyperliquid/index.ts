// Public entry for the from-scratch Hyperliquid data provider, published as the
// `terminal-trading/providers/hyperliquid` subpath. No provider is bundled into the main
// entry — register this one explicitly:
//   import { HyperliquidProvider } from 'terminal-trading/providers/hyperliquid';
//   chart.data.registerProvider('hyperliquid', new HyperliquidProvider());
export { HyperliquidProvider } from './HyperliquidProvider';
export type { SymbolDescriptor, ProviderInfo, DataProvider } from '../../../core/ports/DataProvider';
