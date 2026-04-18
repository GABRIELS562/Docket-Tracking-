/**
 * Index Export Tests
 *
 * Validates that all mappers are properly exported from the central index.
 */

import { ItemMapper, ZoneMapper, ReaderMapper, LocationHistoryMapper } from '@application/mappers';

describe('Mapper Index Exports', () => {
  it('should export ItemMapper', () => {
    expect(ItemMapper).toBeDefined();
    expect(typeof ItemMapper.toDTO).toBe('function');
    expect(typeof ItemMapper.toDTOArray).toBe('function');
    expect(typeof ItemMapper.fromCreateDTO).toBe('function');
    expect(typeof ItemMapper.mapStatusToDTO).toBe('function');
    expect(typeof ItemMapper.mapCategoryToDomain).toBe('function');
  });

  it('should export ZoneMapper', () => {
    expect(ZoneMapper).toBeDefined();
    expect(typeof ZoneMapper.toDTO).toBe('function');
    expect(typeof ZoneMapper.toDTOArray).toBe('function');
    expect(typeof ZoneMapper.fromCreateDTO).toBe('function');
  });

  it('should export ReaderMapper', () => {
    expect(ReaderMapper).toBeDefined();
    expect(typeof ReaderMapper.toDTO).toBe('function');
    expect(typeof ReaderMapper.toDTOArray).toBe('function');
    expect(typeof ReaderMapper.fromCreateDTO).toBe('function');
  });

  it('should export LocationHistoryMapper', () => {
    expect(LocationHistoryMapper).toBeDefined();
    expect(typeof LocationHistoryMapper.toDTO).toBe('function');
    expect(typeof LocationHistoryMapper.toDTOArray).toBe('function');
  });
});
