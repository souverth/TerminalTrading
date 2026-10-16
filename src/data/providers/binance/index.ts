// Public entry for the from-scratch Binance data provider, published as the
// `terminal-trading/providers/binance` subpath. No provider is bundled into the main
// entry — register this one explicitly:
//   import { BinanceProvider } from 'terminal-trading/providers/binance';
//   chart.data.registerProvider('binance', new BinanceProvider());
export { BinanceProvider } from './BinanceProvider';
export type { SymbolDescriptor, ProviderInfo, DataProvider } from '../../../core/ports/DataProvider';
