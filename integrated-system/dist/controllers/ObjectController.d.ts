import { Request, Response } from 'express';
export declare class ObjectController {
    private db;
    private cache;
    constructor();
    listObjects(req: Request, res: Response): Promise<void>;
    getObject(req: Request, res: Response): Promise<void>;
    createObject(req: Request, res: Response): Promise<void>;
    updateObject(req: Request, res: Response): Promise<void>;
    deleteObject(req: Request, res: Response): Promise<void>;
    searchObjects(req: Request, res: Response): Promise<void>;
    assignObject(req: Request, res: Response): Promise<void>;
    moveObject(req: Request, res: Response): Promise<void>;
    tagObject(req: Request, res: Response): Promise<void>;
    getObjectHistory(req: Request, res: Response): Promise<void>;
    getChainOfCustody(req: Request, res: Response): Promise<void>;
    getObjectTypes(_req: Request, res: Response): Promise<void>;
    getObjectStats(_req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=ObjectController.d.ts.map