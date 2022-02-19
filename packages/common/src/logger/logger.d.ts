import Pino, { LevelWithSilent } from 'pino';
export interface LoggerOption {
    level?: string;
    filepath?: string;
    rotate?: boolean;
    nestedKey?: string;
    outputFormat?: 'json' | 'colored';
}
export declare class Logger {
    private pino;
    private childLoggers;
    constructor({ filepath, level: logLevel, nestedKey, outputFormat, rotate }: LoggerOption);
    getLogger(category: string): Pino.Logger;
    setLevel(level: LevelWithSilent): void;
}
