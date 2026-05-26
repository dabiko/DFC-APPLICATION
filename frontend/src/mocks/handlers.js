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
exports.handlers = void 0;
var msw_1 = require("msw");
// Define your API mock handlers here
// Example handlers for the DFC application
// Track failed login attempts per email
var loginAttempts = new Map();
var MAX_ATTEMPTS = 5;
var LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
// Mock users database
var mockUsers = [
    {
        id: '1',
        username: 'admin',
        email: 'admin@cccplc.net',
        password: 'password',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        department: 'IT',
        mfaEnabled: false,
    },
    {
        id: '2',
        username: 'editor',
        email: 'editor@cccplc.net',
        password: 'password',
        firstName: 'John',
        lastName: 'Editor',
        role: 'editor',
        department: 'Accounting',
        mfaEnabled: false,
    },
    {
        id: '3',
        username: 'viewer',
        email: 'viewer@cccplc.net',
        password: 'password',
        firstName: 'Jane',
        lastName: 'Viewer',
        role: 'viewer',
        department: 'Compliance',
        mfaEnabled: false,
    },
];
exports.handlers = [
    // Authentication endpoints
    msw_1.http.post('/api/v1/auth/login/', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var _c, email, password, emailDomain, attempts, remainingTime, user, currentAttempts, remaining, currentAttempts, remaining;
        var request = _b.request;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0: return [4 /*yield*/, request.json()];
                case 1:
                    _c = (_d.sent()), email = _c.email, password = _c.password;
                    emailDomain = email.split('@')[1];
                    if (emailDomain !== 'cccplc.net') {
                        return [2 /*return*/, msw_1.HttpResponse.json({
                                success: false,
                                message: 'Access denied. Only CCC PLC email addresses (@cccplc.net) are allowed to access this system.',
                                error: 'INVALID_DOMAIN',
                            }, { status: 403 })];
                    }
                    attempts = loginAttempts.get(email);
                    if ((attempts === null || attempts === void 0 ? void 0 : attempts.lockedUntil) && Date.now() < attempts.lockedUntil) {
                        remainingTime = Math.ceil((attempts.lockedUntil - Date.now()) / 60000);
                        return [2 /*return*/, msw_1.HttpResponse.json({
                                success: false,
                                message: "Account temporarily locked due to multiple failed login attempts. Please try again in ".concat(remainingTime, " minutes."),
                                error: 'ACCOUNT_LOCKED',
                                lockedUntil: attempts.lockedUntil,
                            }, { status: 423 })];
                    }
                    user = mockUsers.find(function (u) { return u.email === email; });
                    if (!user) {
                        currentAttempts = loginAttempts.get(email) || { count: 0 };
                        currentAttempts.count += 1;
                        loginAttempts.set(email, currentAttempts);
                        remaining = MAX_ATTEMPTS - currentAttempts.count;
                        if (remaining <= 0) {
                            // Lock the account
                            currentAttempts.lockedUntil = Date.now() + LOCKOUT_DURATION;
                            loginAttempts.set(email, currentAttempts);
                            return [2 /*return*/, msw_1.HttpResponse.json({
                                    success: false,
                                    message: "Account locked due to ".concat(MAX_ATTEMPTS, " failed login attempts. Please try again in 15 minutes."),
                                    error: 'ACCOUNT_LOCKED',
                                    remainingAttempts: 0,
                                }, { status: 423 })];
                        }
                        return [2 /*return*/, msw_1.HttpResponse.json({
                                success: false,
                                message: "Invalid email or password. ".concat(remaining, " attempt").concat(remaining !== 1 ? 's' : '', " remaining."),
                                error: 'INVALID_CREDENTIALS',
                                remainingAttempts: remaining,
                            }, { status: 401 })];
                    }
                    // Check password
                    if (user.password !== password) {
                        currentAttempts = loginAttempts.get(email) || { count: 0 };
                        currentAttempts.count += 1;
                        loginAttempts.set(email, currentAttempts);
                        remaining = MAX_ATTEMPTS - currentAttempts.count;
                        if (remaining <= 0) {
                            // Lock the account
                            currentAttempts.lockedUntil = Date.now() + LOCKOUT_DURATION;
                            loginAttempts.set(email, currentAttempts);
                            return [2 /*return*/, msw_1.HttpResponse.json({
                                    success: false,
                                    message: "Account locked due to ".concat(MAX_ATTEMPTS, " failed login attempts. Please try again in 15 minutes."),
                                    error: 'ACCOUNT_LOCKED',
                                    remainingAttempts: 0,
                                }, { status: 423 })];
                        }
                        return [2 /*return*/, msw_1.HttpResponse.json({
                                success: false,
                                message: "Invalid email or password. ".concat(remaining, " attempt").concat(remaining !== 1 ? 's' : '', " remaining."),
                                error: 'INVALID_CREDENTIALS',
                                remainingAttempts: remaining,
                            }, { status: 401 })];
                    }
                    // Successful login - reset attempts
                    loginAttempts.delete(email);
                    return [2 /*return*/, msw_1.HttpResponse.json({
                            success: true,
                            data: {
                                access: 'mock-access-token-' + Date.now(),
                                refresh: 'mock-refresh-token-' + Date.now(),
                                user: {
                                    id: user.id,
                                    username: user.username,
                                    email: user.email,
                                    firstName: user.firstName,
                                    lastName: user.lastName,
                                    role: user.role,
                                    department: user.department,
                                    mfaEnabled: user.mfaEnabled,
                                },
                            },
                        })];
            }
        });
    }); }),
    // Logout endpoint
    msw_1.http.post('/api/v1/auth/logout/', function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, msw_1.HttpResponse.json({
                    success: true,
                    message: 'Logged out successfully',
                })];
        });
    }); }),
    // Token refresh endpoint
    msw_1.http.post('/api/v1/auth/refresh/', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var refresh;
        var request = _b.request;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, request.json()];
                case 1:
                    refresh = (_c.sent()).refresh;
                    if (refresh && refresh.startsWith('mock-refresh-token')) {
                        return [2 /*return*/, msw_1.HttpResponse.json({
                                success: true,
                                data: {
                                    access: 'mock-access-token-refreshed-' + Date.now(),
                                },
                            })];
                    }
                    return [2 /*return*/, msw_1.HttpResponse.json({
                            success: false,
                            message: 'Invalid refresh token',
                        }, { status: 401 })];
            }
        });
    }); }),
    // Get current user profile
    msw_1.http.get('/api/v1/auth/profile/', function (_a) {
        var request = _a.request;
        var authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return msw_1.HttpResponse.json({
                success: false,
                message: 'Authentication required',
            }, { status: 401 });
        }
        return msw_1.HttpResponse.json({
            success: true,
            data: {
                id: '1',
                username: 'admin',
                email: 'admin@cccplc.net',
                firstName: 'Admin',
                lastName: 'User',
                role: 'admin',
                department: 'IT',
                mfaEnabled: false,
            },
        });
    }),
    // Example: Get documents
    msw_1.http.get('/api/v1/documents', function () {
        return msw_1.HttpResponse.json({
            success: true,
            data: [
                {
                    id: '1',
                    title: 'Sample Document',
                    fileName: 'sample.pdf',
                    fileType: 'application/pdf',
                    fileSize: 1024000,
                    documentType: 'invoice',
                    folderId: 'folder-1',
                    createdBy: 'admin',
                    modifiedBy: 'admin',
                    createdAt: '2025-01-01T00:00:00Z',
                    modifiedAt: '2025-01-01T00:00:00Z',
                    confidentialityLevel: 'internal',
                    tags: ['important', 'finance'],
                    versionNumber: 1,
                    isOnLegalHold: false,
                },
            ],
            total: 1,
            page: 1,
            pageSize: 20,
            hasMore: false,
        });
    }),
    // Billing endpoints
    msw_1.http.get('/api/v1/billing/subscription/', function () {
        return msw_1.HttpResponse.json({
            id: 'sub_123',
            userId: 'user_123',
            planId: 'professional',
            plan: {
                id: 'professional',
                name: 'Professional',
                price: 29.99,
                billingCycle: 'monthly',
                features: ['50 users', '1TB storage', 'Priority support'],
            },
            status: 'active',
            billingCycle: 'monthly',
            currentPeriodStart: '2025-11-01T00:00:00Z',
            currentPeriodEnd: '2025-12-01T00:00:00Z',
            cancelAtPeriodEnd: false,
            autoRenew: true,
            usage: {
                users: { current: 18, limit: 50 },
                storage: { currentGB: 425, limitGB: 1000, percentage: 42.5 },
                documents: { current: 8500, limit: 100000, percentage: 8.5 },
                folders: { current: 342, limit: 1000 },
                apiCalls: { currentMonth: 75000, limit: 1000000, percentage: 7.5 },
            },
            createdAt: '2025-01-15T00:00:00Z',
            updatedAt: '2025-11-01T00:00:00Z',
        });
    }),
    msw_1.http.get('/api/v1/billing/plans/', function () {
        return msw_1.HttpResponse.json([
            {
                id: 'starter',
                name: 'Starter',
                price: 9.99,
                billingCycle: 'monthly',
                features: ['5 users', '10GB storage'],
            },
            {
                id: 'professional',
                name: 'Professional',
                price: 29.99,
                billingCycle: 'monthly',
                features: ['50 users', '1TB storage'],
            },
            {
                id: 'enterprise',
                name: 'Enterprise',
                price: 99.99,
                billingCycle: 'monthly',
                features: ['Unlimited users', '10TB storage'],
            },
        ]);
    }),
    msw_1.http.get('/api/v1/billing/payment-methods/', function () {
        return msw_1.HttpResponse.json([
            {
                id: 'pm_1',
                type: 'card',
                isDefault: true,
                card: {
                    brand: 'visa',
                    last4: '4242',
                    expiryMonth: 12,
                    expiryYear: 2026,
                    holderName: 'Admin User',
                },
                createdAt: '2025-01-15T00:00:00Z',
            },
        ]);
    }),
    msw_1.http.get('/api/v1/billing/invoices/', function () {
        return msw_1.HttpResponse.json({
            results: [
                {
                    id: 'inv_1',
                    invoiceNumber: 'INV-2025-11-001',
                    status: 'paid',
                    amount: 29.99,
                    currency: 'USD',
                    description: 'Professional Plan - November 2025',
                    dueDate: '2025-11-01T00:00:00Z',
                    paidAt: '2025-11-01T00:00:00Z',
                    createdAt: '2025-11-01T00:00:00Z',
                },
            ],
            count: 1,
        });
    }),
    msw_1.http.get('/api/v1/billing/usage/', function () {
        return msw_1.HttpResponse.json({
            users: { current: 18, limit: 50 },
            storage: { currentGB: 425, limitGB: 1000, percentage: 42.5 },
            documents: { current: 8500, limit: 100000, percentage: 8.5 },
        });
    }),
    msw_1.http.get('/api/v1/billing/usage/alerts/', function () {
        return msw_1.HttpResponse.json([]);
    }),
    // Document stats endpoints
    msw_1.http.get('/api/v1/documents/my-documents/stats/', function () {
        return msw_1.HttpResponse.json({ count: 150, size: 1024000000 });
    }),
    msw_1.http.get('/api/v1/shared-with-me/stats/', function () {
        return msw_1.HttpResponse.json({ count: 25, size: 256000000 });
    }),
    msw_1.http.get('/api/v1/documents/recent/stats/', function () {
        return msw_1.HttpResponse.json({ count: 10 });
    }),
    msw_1.http.get('/api/v1/folders/trash/', function () {
        return msw_1.HttpResponse.json({ count: 5, folders: [], documents: [] });
    }),
    // Department navigation
    msw_1.http.get('/api/v1/departments/navigation/', function () {
        return msw_1.HttpResponse.json([
            {
                department: { id: 1, name: 'IT', code: 'IT' },
                accessType: 'own',
                folderCount: 10,
            },
        ]);
    }),
    // Folders endpoint
    msw_1.http.get('/api/v1/folders/', function () {
        return msw_1.HttpResponse.json({
            results: [],
            count: 0,
        });
    }),
    // Add more handlers as needed for your API endpoints
];
