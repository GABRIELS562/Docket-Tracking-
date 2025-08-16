import winston from 'winston';
export declare const logger: winston.Logger;
export declare const logInfo: (message: string, meta?: any) => winston.Logger;
export declare const logError: (message: string, error?: any) => winston.Logger;
export declare const logWarn: (message: string, meta?: any) => winston.Logger;
export declare const logDebug: (message: string, meta?: any) => winston.Logger;
export default logger;
//# sourceMappingURL=logger.d.ts.map