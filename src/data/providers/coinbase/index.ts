// Public entry for the from-scratch Coinbase data provider, published as the
// `terminal-trading/providers/coinbase` subpath. No provider is bundled into the main
// entry — register this one explicitly:
//   import { CoinbaseProvider } from 'terminal-trading/providers/coinbase';
//   chart.data.registerProvider('coinbase', new CoinbaseProvider());
export { CoinbaseProvider } from './CoinbaseProvider';
export type { SymbolDescriptor, ProviderInfo, DataProvider } from '../../../core/ports/DataProvider';
