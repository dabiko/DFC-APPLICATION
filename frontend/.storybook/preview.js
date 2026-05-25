"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var react_1 = require("react");
var react_redux_1 = require("react-redux");
var toolkit_1 = require("@reduxjs/toolkit");
var react_router_dom_1 = require("react-router-dom");
require("../src/index.css"); // Import Tailwind CSS
// Initialize MSW for Storybook
var browser_1 = require("../src/mocks/browser");
// Start MSW - this returns a promise but we don't need to await it
// The service worker will intercept requests once it's ready
browser_1.worker.start({
    onUnhandledRequest: 'bypass',
    quiet: true, // Reduce console noise
});
// Import reducers
var authSlice_1 = require("../src/store/slices/authSlice");
var folderSlice_1 = require("../src/store/slices/folderSlice");
var billingSlice_1 = require("../src/store/slices/billingSlice");
var departmentSlice_1 = require("../src/store/slices/departmentSlice");
// Import Contexts
var PermissionContext_1 = require("../src/contexts/PermissionContext");
var NetworkStatusContext_1 = require("../src/contexts/NetworkStatusContext");
// Create a mock store for Storybook
// Let reducers initialize their own states naturally from their initialState
var createMockStore = function () {
    return (0, toolkit_1.configureStore)({
        reducer: {
            auth: authSlice_1.default,
            folder: folderSlice_1.default,
            billing: billingSlice_1.default,
            department: departmentSlice_1.default,
        },
    });
};
// Mock network status values for Storybook
var mockNetworkStatusContextValue = {
    status: 'online',
    isOnline: true,
    isSlow: false,
    lastChecked: new Date(),
    retryCount: 0,
    retryIn: 0,
    effectiveType: '4g',
    downlink: 10,
    rtt: 50,
    retry: function () { },
    showBanner: false,
    dismissBanner: function () { },
    isDismissed: false,
};
// Mock permission values for Storybook
var mockPermissionContextValue = {
    permissionSummary: null,
    isLoading: false,
    error: null,
    hasGlobalPermission: function () { return true; },
    hasAnyGlobalPermission: function () { return true; },
    hasAllGlobalPermissions: function () { return true; },
    checkDocumentPermission: function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, ({
                    can_view: true,
                    can_edit: true,
                    can_delete: true,
                    can_share: true,
                    can_download: true,
                    can_manage_permissions: true,
                })];
        });
    }); },
    checkFolderPermission: function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, ({
                    can_view: true,
                    can_edit: true,
                    can_delete: true,
                    can_share: true,
                    can_upload: true,
                    can_manage_permissions: true,
                })];
        });
    }); },
    isAdminOrManager: true,
    isAdmin: true,
    refreshPermissions: function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
        return [2 /*return*/];
    }); }); },
    clearPermissionCache: function () { },
    syncStatus: 'connected',
    subscribeToResource: function () { return function () { }; },
    invalidateResourcePermission: function () { },
};
var preview = {
    parameters: {
        controls: {
            matchers: {
                color: /(background|color)$/i,
                date: /Date$/i,
            },
        },
        backgrounds: {
            disabled: true,
        },
    },
    globalTypes: {
        theme: {
            name: 'Theme',
            description: 'Global theme for components',
            defaultValue: 'light',
            toolbar: {
                icon: 'circlehollow',
                items: [
                    { value: 'light', icon: 'sun', title: 'Light mode' },
                    { value: 'dark', icon: 'moon', title: 'Dark mode' },
                ],
                dynamicTitle: true,
            },
        },
    },
    decorators: [
        function (Story, context) {
            var theme = context.globals.theme || 'light';
            // Apply theme to html element
            if (typeof window !== 'undefined') {
                var root = window.document.documentElement;
                root.classList.remove('light', 'dark');
                root.classList.add(theme);
            }
            return (<react_router_dom_1.MemoryRouter>
          <react_redux_1.Provider store={createMockStore()}>
            <NetworkStatusContext_1.default.Provider value={mockNetworkStatusContextValue}>
              <PermissionContext_1.default.Provider value={mockPermissionContextValue}>
                <Story />
              </PermissionContext_1.default.Provider>
            </NetworkStatusContext_1.default.Provider>
          </react_redux_1.Provider>
        </react_router_dom_1.MemoryRouter>);
        },
    ],
};
exports.default = preview;
