import { Server } from 'socket.io';
interface RfidEvent {
    tag_id: string;
    reader_id: string;
    signal_strength: number;
    event_type: 'detected' | 'lost' | 'moved';
    location_id: number;
    timestamp: Date;
}
export declare class RfidService {
    private static instance;
    private io;
    private dbService;
    private eventQueue;
    private processingInterval;
    private simulationMode;
    private constructor();
    static getInstance(io?: Server): RfidService;
    initialize(): Promise<void>;
    addEvent(event: RfidEvent): Promise<void>;
    private processEventBatch;
    private startSimulation;
    getReaderStatus(): Promise<any[]>;
    registerReader(readerData: any): Promise<any>;
    simulateEvent(data: any): Promise<void>;
    shutdown(): Promise<void>;
}
export {};
//# sourceMappingURL=RfidService.d.ts.map