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
exports.verifyGoogleToken = verifyGoogleToken;
const errors_1 = require("./errors");
/**
 * Standalone utility function to verify Google access token
 */
function verifyGoogleToken(accessToken) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const response = yield fetch(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${accessToken}`);
            if (!response.ok) {
                throw new errors_1.AuthenticationError('Invalid Google access token');
            }
            const userData = yield response.json();
            if (!userData.email) {
                throw new errors_1.AuthenticationError('Google token does not contain email');
            }
            return userData;
        }
        catch (error) {
            if (error instanceof errors_1.AuthenticationError) {
                throw error;
            }
            console.error('Google token verification error:', error);
            throw new errors_1.AuthenticationError('Google token verification failed');
        }
    });
}
