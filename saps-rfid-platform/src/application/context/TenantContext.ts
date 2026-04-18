import { AsyncLocalStorage } from 'async_hooks';

/**
 * Tenant context data stored per request
 */
export interface TenantContextData {
  /**
   * The tenant ID for the current request
   */
  readonly tenantId: string;

  /**
   * The tenant slug
   */
  readonly tenantSlug: string;

  /**
   * The authenticated user ID (if any)
   */
  readonly userId?: string;

  /**
   * User's role within the tenant
   */
  readonly userRole?: string;

  /**
   * Request ID for tracing
   */
  readonly requestId: string;

  /**
   * Timestamp when context was created
   */
  readonly createdAt: Date;
}

/**
 * TenantContext - Request-scoped tenant context using AsyncLocalStorage
 *
 * This provides a way to access tenant information throughout the
 * application without passing it through every function call.
 *
 * Usage:
 * ```typescript
 * // In middleware:
 * TenantContext.run({ tenantId: 'xxx', ... }, async () => {
 *   // All code in this callback has access to tenant context
 *   await next();
 * });
 *
 * // In repository/service:
 * const context = TenantContext.current();
 * if (context) {
 *   const tenantId = context.tenantId;
 * }
 * ```
 */
export class TenantContext {
  private static storage = new AsyncLocalStorage<TenantContextData>();

  /**
   * Runs a callback with the given tenant context
   *
   * @param context - The tenant context data
   * @param callback - The async function to run with the context
   * @returns The result of the callback
   */
  static run<T>(context: TenantContextData, callback: () => T): T {
    return this.storage.run(context, callback);
  }

  /**
   * Gets the current tenant context
   *
   * @returns The current context or undefined if not in a context
   */
  static current(): TenantContextData | undefined {
    return this.storage.getStore();
  }

  /**
   * Gets the current tenant context, throwing if not available
   *
   * @returns The current context
   * @throws Error if not in a tenant context
   */
  static require(): TenantContextData {
    const context = this.current();
    if (!context) {
      throw new Error('TenantContext required but not available. Ensure middleware is configured.');
    }
    return context;
  }

  /**
   * Gets the current tenant ID
   *
   * @returns The tenant ID or undefined
   */
  static getTenantId(): string | undefined {
    return this.current()?.tenantId;
  }

  /**
   * Gets the current tenant ID, throwing if not available
   *
   * @returns The tenant ID
   * @throws Error if not in a tenant context
   */
  static requireTenantId(): string {
    const tenantId = this.getTenantId();
    if (!tenantId) {
      throw new Error('Tenant ID required but not available');
    }
    return tenantId;
  }

  /**
   * Gets the current user ID
   *
   * @returns The user ID or undefined
   */
  static getUserId(): string | undefined {
    return this.current()?.userId;
  }

  /**
   * Gets the current request ID
   *
   * @returns The request ID or undefined
   */
  static getRequestId(): string | undefined {
    return this.current()?.requestId;
  }

  /**
   * Checks if we're currently in a tenant context
   *
   * @returns True if in a tenant context
   */
  static isInContext(): boolean {
    return this.current() !== undefined;
  }

  /**
   * Creates a child context with additional properties
   * Useful for adding user info after authentication
   *
   * @param additionalData - Additional context properties
   * @param callback - The async function to run with the context
   * @returns The result of the callback
   */
  static extend<T>(
    additionalData: Partial<
      Omit<TenantContextData, 'tenantId' | 'tenantSlug' | 'requestId' | 'createdAt'>
    >,
    callback: () => T
  ): T {
    const current = this.require();
    const extended: TenantContextData = {
      ...current,
      ...additionalData,
    };
    return this.storage.run(extended, callback);
  }
}

/**
 * Helper to create tenant context data
 */
export function createTenantContext(
  tenantId: string,
  tenantSlug: string,
  requestId?: string
): TenantContextData {
  return {
    tenantId,
    tenantSlug,
    requestId: requestId ?? crypto.randomUUID(),
    createdAt: new Date(),
  };
}
