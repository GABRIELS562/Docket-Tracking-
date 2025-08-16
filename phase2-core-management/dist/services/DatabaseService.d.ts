import { PoolClient } from 'pg';
export declare class DatabaseService {
    private static instance;
    private pool;
    private constructor();
    static getInstance(): DatabaseService;
    initialize(): Promise<void>;
    runMigrations(): Promise<void>;
    query(text: string, params?: any[]): Promise<any>;
    execute(text: string, params?: any[]): Promise<any>;
    transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T>;
    getClient(): Promise<PoolClient>;
    end(): Promise<void>;
}
//# sourceMappingURL=DatabaseService.d.ts.map