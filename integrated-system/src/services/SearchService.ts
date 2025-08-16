/**
 * Advanced Search Service
 * Full-text search, filters, and intelligent suggestions
 */

import { query } from '../database/connection';
import { logger } from '../utils/logger';
import { EventEmitter } from 'events';

interface SearchQuery {
  text?: string;
  filters?: SearchFilters;
  sort?: SortOptions;
  pagination?: PaginationOptions;
  includeArchived?: boolean;
}

interface SearchFilters {
  dateRange?: {
    start: Date;
    end: Date;
  };
  departments?: string[];
  categories?: string[];
  status?: string[];
  tags?: string[];
  locations?: string[];
  users?: number[];
  customFields?: Record<string, any>;
}

interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

interface PaginationOptions {
  page: number;
  limit: number;
}

interface SearchResult {
  items: any[];
  total: number;
  page: number;
  pages: number;
  facets?: SearchFacets;
  suggestions?: string[];
  executionTime: number;
}

interface SearchFacets {
  departments: FacetItem[];
  categories: FacetItem[];
  status: FacetItem[];
  dateRanges: FacetItem[];
}

interface FacetItem {
  value: string;
  count: number;
  label?: string;
}

export class SearchService extends EventEmitter {
  private static instance: SearchService;
  private searchHistory: Map<string, SearchQuery> = new Map();
  private searchCache: Map<string, SearchResult> = new Map();
  private cacheTimeout: number = 5 * 60 * 1000; // 5 minutes

  private constructor() {
    super();
    this.initialize();
  }

  public static getInstance(): SearchService {
    if (!SearchService.instance) {
      SearchService.instance = new SearchService();
    }
    return SearchService.instance;
  }

  private async initialize() {
    // Create search indexes if they don't exist
    await this.createSearchIndexes();
    
    // Start cache cleanup
    this.startCacheCleanup();
    
    logger.info('Search service initialized');
  }

  /**
   * Create database indexes for search optimization
   */
  private async createSearchIndexes() {
    try {
      // Full-text search index on dockets
      await query(`
        CREATE INDEX IF NOT EXISTS idx_dockets_fulltext 
        ON dockets USING gin(to_tsvector('english', 
          coalesce(docket_code, '') || ' ' || 
          coalesce(title, '') || ' ' || 
          coalesce(description, '')
        ))
      `);

      // Index for common filters
      await query(`
        CREATE INDEX IF NOT EXISTS idx_dockets_filters 
        ON dockets(status, category, department_id, created_at)
      `);

      // Index for RFID searches
      await query(`
        CREATE INDEX IF NOT EXISTS idx_dockets_rfid_barcode 
        ON dockets(rfid_tag, barcode)
      `);

      logger.info('Search indexes created');
    } catch (error) {
      logger.error('Failed to create search indexes:', error);
    }
  }

  /**
   * Perform advanced search
   */
  async search(searchQuery: SearchQuery): Promise<SearchResult> {
    const startTime = Date.now();
    
    // Check cache
    const cacheKey = this.getCacheKey(searchQuery);
    const cached = this.searchCache.get(cacheKey);
    if (cached) {
      logger.info('Returning cached search results');
      return { ...cached, executionTime: Date.now() - startTime };
    }

    try {
      // Build SQL query
      const { sql, params } = this.buildSearchQuery(searchQuery);
      
      // Execute search
      const result = await query(sql, params);
      
      // Get total count
      const countResult = await this.getSearchCount(searchQuery);
      const total = countResult.rows[0]?.count || 0;
      
      // Calculate pagination
      const page = searchQuery.pagination?.page || 1;
      const limit = searchQuery.pagination?.limit || 50;
      const pages = Math.ceil(total / limit);
      
      // Get facets if requested
      const facets = await this.getSearchFacets(searchQuery);
      
      // Get suggestions
      const suggestions = await this.getSearchSuggestions(searchQuery.text);
      
      // Build result
      const searchResult: SearchResult = {
        items: result.rows,
        total,
        page,
        pages,
        facets,
        suggestions,
        executionTime: Date.now() - startTime,
      };
      
      // Cache result
      this.searchCache.set(cacheKey, searchResult);
      
      // Save to history
      this.saveSearchHistory(searchQuery);
      
      // Emit event
      this.emit('search_completed', {
        query: searchQuery,
        results: searchResult.items.length,
        executionTime: searchResult.executionTime,
      });
      
      return searchResult;
    } catch (error) {
      logger.error('Search failed:', error);
      throw error;
    }
  }

  /**
   * Build SQL query from search parameters
   */
  private buildSearchQuery(searchQuery: SearchQuery): { sql: string; params: any[] } {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    // Base query
    let sql = `
      SELECT 
        d.*,
        u.full_name as created_by_name,
        dept.name as department_name,
        sz.name as storage_zone_name,
        COUNT(rr.id) as retrieval_count,
        MAX(rr.requested_date) as last_retrieved
      FROM dockets d
      LEFT JOIN users u ON d.created_by = u.id
      LEFT JOIN departments dept ON d.department_id = dept.id
      LEFT JOIN storage_zones sz ON d.location = sz.code
      LEFT JOIN retrieval_requests rr ON d.id = rr.docket_id
    `;

    // Full-text search
    if (searchQuery.text) {
      conditions.push(`
        to_tsvector('english', 
          coalesce(d.docket_code, '') || ' ' || 
          coalesce(d.title, '') || ' ' || 
          coalesce(d.description, '')
        ) @@ plainto_tsquery('english', $${paramIndex})
      `);
      params.push(searchQuery.text);
      paramIndex++;
    }

    // Apply filters
    if (searchQuery.filters) {
      // Date range filter
      if (searchQuery.filters.dateRange) {
        conditions.push(`d.created_at BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
        params.push(searchQuery.filters.dateRange.start, searchQuery.filters.dateRange.end);
        paramIndex += 2;
      }

      // Department filter
      if (searchQuery.filters.departments?.length) {
        conditions.push(`dept.code = ANY($${paramIndex})`);
        params.push(searchQuery.filters.departments);
        paramIndex++;
      }

      // Category filter
      if (searchQuery.filters.categories?.length) {
        conditions.push(`d.category = ANY($${paramIndex})`);
        params.push(searchQuery.filters.categories);
        paramIndex++;
      }

      // Status filter
      if (searchQuery.filters.status?.length) {
        conditions.push(`d.status = ANY($${paramIndex})`);
        params.push(searchQuery.filters.status);
        paramIndex++;
      }

      // Location filter
      if (searchQuery.filters.locations?.length) {
        conditions.push(`d.location = ANY($${paramIndex})`);
        params.push(searchQuery.filters.locations);
        paramIndex++;
      }
    }

    // Exclude archived unless requested
    if (!searchQuery.includeArchived) {
      conditions.push(`d.status != 'archived'`);
    }

    // Add WHERE clause
    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    // Add GROUP BY
    sql += ` GROUP BY d.id, u.full_name, dept.name, sz.name`;

    // Add sorting
    if (searchQuery.sort) {
      const sortField = this.sanitizeSortField(searchQuery.sort.field);
      const sortDirection = searchQuery.sort.direction.toUpperCase();
      sql += ` ORDER BY ${sortField} ${sortDirection}`;
    } else {
      // Default sort by relevance for text search, otherwise by date
      if (searchQuery.text) {
        sql += ` ORDER BY ts_rank(to_tsvector('english', 
          coalesce(d.docket_code, '') || ' ' || 
          coalesce(d.title, '') || ' ' || 
          coalesce(d.description, '')
        ), plainto_tsquery('english', $1)) DESC`;
      } else {
        sql += ` ORDER BY d.created_at DESC`;
      }
    }

    // Add pagination
    if (searchQuery.pagination) {
      const offset = (searchQuery.pagination.page - 1) * searchQuery.pagination.limit;
      sql += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(searchQuery.pagination.limit, offset);
    }

    return { sql, params };
  }

  /**
   * Get total count for search results
   */
  private async getSearchCount(searchQuery: SearchQuery): Promise<any> {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    let sql = `
      SELECT COUNT(DISTINCT d.id) as count
      FROM dockets d
      LEFT JOIN departments dept ON d.department_id = dept.id
    `;

    // Apply same filters as main search
    if (searchQuery.text) {
      conditions.push(`
        to_tsvector('english', 
          coalesce(d.docket_code, '') || ' ' || 
          coalesce(d.title, '') || ' ' || 
          coalesce(d.description, '')
        ) @@ plainto_tsquery('english', $${paramIndex})
      `);
      params.push(searchQuery.text);
      paramIndex++;
    }

    if (searchQuery.filters) {
      if (searchQuery.filters.dateRange) {
        conditions.push(`d.created_at BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
        params.push(searchQuery.filters.dateRange.start, searchQuery.filters.dateRange.end);
        paramIndex += 2;
      }

      if (searchQuery.filters.departments?.length) {
        conditions.push(`dept.code = ANY($${paramIndex})`);
        params.push(searchQuery.filters.departments);
        paramIndex++;
      }

      if (searchQuery.filters.categories?.length) {
        conditions.push(`d.category = ANY($${paramIndex})`);
        params.push(searchQuery.filters.categories);
        paramIndex++;
      }

      if (searchQuery.filters.status?.length) {
        conditions.push(`d.status = ANY($${paramIndex})`);
        params.push(searchQuery.filters.status);
        paramIndex++;
      }
    }

    if (!searchQuery.includeArchived) {
      conditions.push(`d.status != 'archived'`);
    }

    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    return query(sql, params);
  }

  /**
   * Get search facets for filtering
   */
  private async getSearchFacets(searchQuery: SearchQuery): Promise<SearchFacets> {
    const facets: SearchFacets = {
      departments: [],
      categories: [],
      status: [],
      dateRanges: [],
    };

    // Get department facets
    const deptResult = await query(`
      SELECT dept.code as value, dept.name as label, COUNT(d.id) as count
      FROM dockets d
      JOIN departments dept ON d.department_id = dept.id
      WHERE d.status != 'archived'
      GROUP BY dept.code, dept.name
      ORDER BY count DESC
      LIMIT 10
    `);
    facets.departments = deptResult.rows;

    // Get category facets
    const catResult = await query(`
      SELECT category as value, category as label, COUNT(*) as count
      FROM dockets
      WHERE status != 'archived' AND category IS NOT NULL
      GROUP BY category
      ORDER BY count DESC
      LIMIT 10
    `);
    facets.categories = catResult.rows;

    // Get status facets
    const statusResult = await query(`
      SELECT status as value, status as label, COUNT(*) as count
      FROM dockets
      GROUP BY status
      ORDER BY count DESC
    `);
    facets.status = statusResult.rows;

    // Date range facets
    facets.dateRanges = [
      { value: 'today', label: 'Today', count: 0 },
      { value: 'week', label: 'This Week', count: 0 },
      { value: 'month', label: 'This Month', count: 0 },
      { value: 'year', label: 'This Year', count: 0 },
    ];

    return facets;
  }

  /**
   * Get search suggestions
   */
  private async getSearchSuggestions(text?: string): Promise<string[]> {
    if (!text || text.length < 2) {
      return [];
    }

    try {
      const result = await query(`
        SELECT DISTINCT 
          docket_code as suggestion
        FROM dockets
        WHERE docket_code ILIKE $1
        UNION
        SELECT DISTINCT 
          title as suggestion
        FROM dockets
        WHERE title ILIKE $1
        LIMIT 10
      `, [`%${text}%`]);

      return result.rows.map(r => r.suggestion).filter(Boolean);
    } catch (error) {
      logger.error('Failed to get suggestions:', error);
      return [];
    }
  }

  /**
   * Quick search (simplified)
   */
  async quickSearch(text: string): Promise<any[]> {
    const result = await this.search({
      text,
      pagination: { page: 1, limit: 10 },
    });
    return result.items;
  }

  /**
   * Search by RFID tag
   */
  async searchByRFID(tagId: string): Promise<any> {
    const result = await query(`
      SELECT d.*, dept.name as department_name
      FROM dockets d
      LEFT JOIN departments dept ON d.department_id = dept.id
      WHERE d.rfid_tag = $1
    `, [tagId]);

    return result.rows[0];
  }

  /**
   * Search by barcode
   */
  async searchByBarcode(barcode: string): Promise<any> {
    const result = await query(`
      SELECT d.*, dept.name as department_name
      FROM dockets d
      LEFT JOIN departments dept ON d.department_id = dept.id
      WHERE d.barcode = $1
    `, [barcode]);

    return result.rows[0];
  }

  /**
   * Get recent searches for user
   */
  async getRecentSearches(userId: number, limit: number = 10): Promise<SearchQuery[]> {
    // In production, this would be stored in database
    const searches = Array.from(this.searchHistory.values())
      .slice(-limit)
      .reverse();
    return searches;
  }

  /**
   * Get popular searches
   */
  async getPopularSearches(limit: number = 10): Promise<string[]> {
    // In production, track search frequency in database
    const result = await query(`
      SELECT text_query, COUNT(*) as count
      FROM search_history
      WHERE created_at > NOW() - INTERVAL '7 days'
      GROUP BY text_query
      ORDER BY count DESC
      LIMIT $1
    `, [limit]);

    return result.rows.map(r => r.text_query);
  }

  /**
   * Export search results
   */
  async exportSearchResults(searchQuery: SearchQuery, format: 'csv' | 'excel' | 'pdf'): Promise<Buffer> {
    // Get all results without pagination
    const fullQuery = { ...searchQuery, pagination: undefined };
    const results = await this.search(fullQuery);

    switch (format) {
      case 'csv':
        return this.exportToCSV(results.items);
      case 'excel':
        return this.exportToExcel(results.items);
      case 'pdf':
        return this.exportToPDF(results.items);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Export to CSV
   */
  private exportToCSV(items: any[]): Buffer {
    const headers = ['Docket Code', 'Title', 'Category', 'Status', 'Department', 'Created Date'];
    const rows = items.map(item => [
      item.docket_code,
      item.title,
      item.category,
      item.status,
      item.department_name,
      new Date(item.created_at).toLocaleDateString(),
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell || ''}"`).join(',')),
    ].join('\n');

    return Buffer.from(csv, 'utf-8');
  }

  /**
   * Export to Excel (simplified - would use xlsx library in production)
   */
  private exportToExcel(items: any[]): Buffer {
    // Simplified implementation - in production use xlsx library
    return this.exportToCSV(items);
  }

  /**
   * Export to PDF (simplified - would use pdf library in production)
   */
  private exportToPDF(items: any[]): Buffer {
    // Simplified implementation - in production use pdfkit or similar
    const content = items.map(item => 
      `${item.docket_code}: ${item.title} (${item.status})`
    ).join('\n');
    
    return Buffer.from(content, 'utf-8');
  }

  /**
   * Sanitize sort field to prevent SQL injection
   */
  private sanitizeSortField(field: string): string {
    const allowedFields = [
      'd.docket_code',
      'd.title',
      'd.created_at',
      'd.updated_at',
      'd.status',
      'd.category',
      'dept.name',
      'retrieval_count',
      'last_retrieved',
    ];

    const mapped = allowedFields.find(f => f.endsWith(field));
    return mapped || 'd.created_at';
  }

  /**
   * Get cache key for search query
   */
  private getCacheKey(searchQuery: SearchQuery): string {
    return JSON.stringify(searchQuery);
  }

  /**
   * Save search to history
   */
  private saveSearchHistory(searchQuery: SearchQuery): void {
    const key = `${Date.now()}_${Math.random()}`;
    this.searchHistory.set(key, searchQuery);
    
    // Limit history size
    if (this.searchHistory.size > 100) {
      const firstKey = this.searchHistory.keys().next().value;
      this.searchHistory.delete(firstKey);
    }
  }

  /**
   * Start cache cleanup interval
   */
  private startCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.searchCache.entries()) {
        if (now - value.executionTime > this.cacheTimeout) {
          this.searchCache.delete(key);
        }
      }
    }, this.cacheTimeout);
  }
}

export default SearchService;