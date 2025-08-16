export declare class CacheService {
    private static instance;
    private client;
    private connected;
    private constructor();
    static getInstance(): CacheService;
    connect(): Promise<void>;
    get(key: string): Promise<string | null>;
    set(key: string, value: string, ttl?: number): Promise<void>;
    del(key: string): Promise<void>;
    flush(): Promise<void>;
    invalidatePattern(pattern: string): Promise<void>;
    disconnect(): Promise<void>;
    checkHealth(): Promise<boolean>;
}
//# sourceMappingURL=CacheService.d.ts.map