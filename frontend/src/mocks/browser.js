"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.worker = void 0;
var browser_1 = require("msw/browser");
var handlers_1 = require("./handlers");
// This configures a Service Worker with the given request handlers.
exports.worker = browser_1.setupWorker.apply(void 0, handlers_1.handlers);
