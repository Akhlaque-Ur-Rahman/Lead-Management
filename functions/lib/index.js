"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminDeleteUsersByCompany = exports.adminDeleteUser = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
admin.initializeApp();
const db = admin.firestore();
// Helper to ensure caller is allowed
function requireAdminRole(context) {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }
    const role = context.auth.token?.role;
    if (role !== 'super_admin' && role !== 'platform_admin') {
        throw new functions.https.HttpsError('permission-denied', 'Insufficient permissions');
    }
}
exports.adminDeleteUser = functions.https.onCall(async (data, context) => {
    requireAdminRole(context);
    const uid = data?.uid;
    if (!uid) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing uid');
    }
    try {
        // Delete from Auth (may throw if user not found)
        await admin.auth().deleteUser(uid);
    }
    catch (err) {
        // If user not found, continue to delete Firestore doc
        if (err.code !== 'auth/user-not-found') {
            throw new functions.https.HttpsError('internal', `Failed to delete auth user: ${err.message}`);
        }
    }
    try {
        await db.doc(`users/${uid}`).delete();
    }
    catch (err) {
        // If Firestore deletion fails, report error
        throw new functions.https.HttpsError('internal', `Failed to delete user doc: ${err.message}`);
    }
    return { success: true };
});
exports.adminDeleteUsersByCompany = functions.https.onCall(async (data, context) => {
    requireAdminRole(context);
    const companyId = data?.companyId;
    if (!companyId) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing companyId');
    }
    try {
        const usersQuery = await db.collection('users').where('companyId', '==', companyId).get();
        const deletions = [];
        usersQuery.forEach((doc) => {
            const uid = doc.id;
            deletions.push((async () => {
                try {
                    await admin.auth().deleteUser(uid);
                }
                catch (e) { /* ignore if not found */ }
                try {
                    await db.doc(`users/${uid}`).delete();
                }
                catch (e) { /* log but continue */ }
            })());
        });
        await Promise.all(deletions);
        return { success: true };
    }
    catch (err) {
        throw new functions.https.HttpsError('internal', err.message || 'Bulk deletion failed');
    }
});
