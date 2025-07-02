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
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const prisma_1 = require("../generated/prisma");
class DatabaseManager {
    static getInstance() {
        if (!DatabaseManager.instance) {
            DatabaseManager.instance = globalThis.prisma || new prisma_1.PrismaClient({
                log: process.env.NODE_ENV === 'development'
                    ? ['query', 'error', 'warn']
                    : ['error'],
                errorFormat: 'pretty',
            });
            if (process.env.NODE_ENV === 'development') {
                globalThis.prisma = DatabaseManager.instance;
            }
        }
        return DatabaseManager.instance;
    }
    static connect() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const client = DatabaseManager.getInstance();
                yield client.$connect();
                console.log('✅ Database connected successfully');
            }
            catch (error) {
                console.error('❌ Database connection failed:', error);
                process.exit(1);
            }
        });
    }
    static disconnect() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (DatabaseManager.instance) {
                    yield DatabaseManager.instance.$disconnect();
                    console.log('✅ Database disconnected successfully');
                }
            }
            catch (error) {
                console.error('❌ Database disconnection failed:', error);
            }
        });
    }
    static testConnection() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const client = DatabaseManager.getInstance();
                yield client.$queryRaw `SELECT 1`;
                return true;
            }
            catch (error) {
                console.error('❌ Database connection test failed:', error);
                return false;
            }
        });
    }
    static runHealthCheck() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const startTime = Date.now();
                const client = DatabaseManager.getInstance();
                yield client.$queryRaw `SELECT 1`;
                const latency = Date.now() - startTime;
                return {
                    database: 'healthy',
                    latency,
                };
            }
            catch (error) {
                return {
                    database: 'unhealthy',
                    error: error instanceof Error ? error.message : 'Unknown error',
                };
            }
        });
    }
}
// Export the singleton instance
exports.prisma = DatabaseManager.getInstance();
exports.default = DatabaseManager;
