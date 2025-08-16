import { Server } from 'socket.io';
interface ImportJob {
    id?: number;
    job_id: string;
    filename: string;
    file_path?: string;
    object_type: string;
    status: string;
    total_records: number;
    processed_records: number;
    success_records: number;
    error_records: number;
    error_log?: string;
    mapping_config?: any;
    created_by_id?: number;
}
export declare class ImportService {
    private static instance;
    private dbService;
    private io;
    private activeJobs;
    private constructor();
    static getInstance(io?: Server): ImportService;
    initialize(): Promise<void>;
    createJob(data: Partial<ImportJob>): Promise<ImportJob>;
    processJob(jobId: string): Promise<void>;
    private readFile;
    private processBatch;
    private updateJob;
    private updateJobStatus;
    private emitProgress;
    getJobs(filters?: any): Promise<ImportJob[]>;
    getJob(jobId: string): Promise<ImportJob | null>;
    cancelJob(jobId: string): Promise<void>;
    retryJob(jobId: string): Promise<void>;
    getStatistics(): Promise<any>;
}
export {};
//# sourceMappingURL=ImportService.d.ts.map