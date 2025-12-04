// Centralized service exports
export { WebSocketService, getWebSocketService, useWebSocket } from './websocket';
export type {
  TagReadEvent,
  ItemMovedEvent,
  ZoneOccupancyEvent,
  ReaderStatusEvent,
} from './websocket';

// Search API exports
export { SearchApiService, getSearchApi, useSearch } from './searchApi';
export type {
  SearchResultItem,
  SearchFilters,
  SearchAggregations,
  SearchResponse,
  AutocompleteResult,
  SearchRequest,
  UseSearchOptions,
  UseSearchReturn,
} from './searchApi';
