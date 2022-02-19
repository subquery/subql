"use strict";
// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
const path_1 = __importDefault(require("path"));
const flatted_1 = require("flatted");
const pino_1 = __importDefault(require("pino"));
const rotating_file_stream_1 = require("rotating-file-stream");
const colors_1 = require("./colors");
class Logger {
    constructor({ filepath, level: logLevel = 'info', nestedKey, outputFormat, rotate }) {
        this.childLoggers = {};
        const options = {
            messageKey: 'message',
            timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
            nestedKey,
            level: logLevel,
            formatters: {
                level(label, number) {
                    return { level: label };
                },
            },
            serializers: outputFormat === 'json'
                ? {
                    payload: (value) => {
                        if (value instanceof Error) {
                            return {
                                type: 'error',
                                name: value.name,
                                message: value.message,
                                stack: value.stack,
                            };
                        }
                        else {
                            return (0, flatted_1.stringify)(value);
                        }
                    },
                }
                : {},
            prettyPrint: outputFormat !== 'json',
            prettifier: function (options) {
                // `this` is bound to the pino instance
                // Deal with whatever options are supplied.
                return function prettifier(inputData) {
                    let logObject;
                    if (typeof inputData === 'string') {
                        logObject = JSON.parse(inputData);
                    }
                    else if (isObject(inputData)) {
                        logObject = inputData;
                    }
                    if (!logObject)
                        return inputData;
                    // implement prettification
                    const { category, level, message, payload, time } = logObject;
                    let error = '';
                    if (payload instanceof Error) {
                        if (['debug', 'trace'].includes(logLevel)) {
                            error = `\n${payload.stack}`;
                        }
                        else {
                            error = `${payload.name}: ${payload.message}`;
                        }
                    }
                    return `${time} <${colors_1.ctx.magentaBright(category)}> ${(0, colors_1.colorizeLevel)(level)} ${message} ${error}\n`;
                };
                function isObject(input) {
                    return Object.prototype.toString.apply(input) === '[object Object]';
                }
            },
        };
        if (filepath) {
            const baseName = path_1.default.basename(filepath);
            const dirName = path_1.default.dirname(path_1.default.resolve(filepath));
            const rotateOptions = {
                interval: '1d',
                maxFiles: 7,
                maxSize: '1G',
            };
            if (rotate) {
                this.pino = (0, pino_1.default)(options, (0, rotating_file_stream_1.createStream)(baseName, Object.assign({ path: dirName }, rotateOptions)));
            }
            else {
                this.pino = (0, pino_1.default)(options, (0, rotating_file_stream_1.createStream)(baseName, { path: dirName }));
            }
        }
        else {
            this.pino = (0, pino_1.default)(options);
        }
    }
    getLogger(category) {
        if (!this.childLoggers[category]) {
            this.childLoggers[category] = this.pino.child({ category });
        }
        return this.childLoggers[category];
    }
    setLevel(level) {
        this.pino.level = level;
    }
}
exports.Logger = Logger;
//# sourceMappingURL=logger.js.map