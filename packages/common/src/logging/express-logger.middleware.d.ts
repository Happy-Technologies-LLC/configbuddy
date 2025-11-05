import { Request, Response, NextFunction } from 'express';
export declare const requestLoggerMiddleware: (req: Request, res: Response, next: NextFunction) => void;
export declare const errorLoggerMiddleware: (err: Error, req: Request, _res: Response, next: NextFunction) => void;
//# sourceMappingURL=express-logger.middleware.d.ts.map