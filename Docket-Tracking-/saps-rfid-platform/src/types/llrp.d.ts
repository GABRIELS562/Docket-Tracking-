/**
 * Type declarations for llrp module
 *
 * The llrp package doesn't have TypeScript types, so we declare them here.
 */
declare module 'llrp' {
  export interface LLRPOptions {
    ipaddress: string;
    port?: number;
    log?: boolean;
    isReaderConfigSet?: boolean;
    onTimeout?: () => void;
    onDisconnect?: () => void;
    onReaderNotification?: (message: unknown) => void;
    onROAccessReportMessage?: (message: unknown) => void;
  }

  export class Reader {
    constructor(options: LLRPOptions);
    connect(): void;
    disconnect(): void;
    on(event: string, callback: (...args: unknown[]) => void): void;
    enableRFTransmitter(): void;
    disableRFTransmitter(): void;
    startROSpec(callback?: (error: Error | null, data: unknown) => void): void;
    stopROSpec(callback?: (error: Error | null, data: unknown) => void): void;
    enableROSpec(callback?: (error: Error | null, data: unknown) => void): void;
    disableROSpec(callback?: (error: Error | null, data: unknown) => void): void;
    deleteROSpec(callback?: (error: Error | null, data: unknown) => void): void;
    getReaderCapabilities(callback?: (error: Error | null, data: unknown) => void): void;
    setReaderConfig(callback?: (error: Error | null, data: unknown) => void): void;
  }
}
