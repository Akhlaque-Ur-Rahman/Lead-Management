/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();
const db = admin.firestore();

function requireAdminRole(context: any) {
	if (!context.auth) {
		throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
	}
	const role = context.auth.token?.role;
	if (role !== 'super_admin' && role !== 'platform_admin') {
		throw new functions.https.HttpsError('permission-denied', 'Insufficient permissions');
	}
}

export const adminDeleteUser = functions.https.onCall(async (data, context) => {
	requireAdminRole(context);
	const uid = (data as any)?.uid;
	if (!uid) {
		throw new functions.https.HttpsError('invalid-argument', 'Missing uid');
	}

	try {
		await admin.auth().deleteUser(uid);
	} catch (err: any) {
		if (err.code !== 'auth/user-not-found') {
			throw new functions.https.HttpsError('internal', `Failed to delete auth user: ${err.message}`);
		}
	}

	try {
		await db.doc(`users/${uid}`).delete();
	} catch (err: any) {
		throw new functions.https.HttpsError('internal', `Failed to delete user doc: ${err.message}`);
	}

	return { success: true };
});

export const adminDeleteUsersByCompany = functions.https.onCall(async (data, context) => {
	requireAdminRole(context);
	const companyId = (data as any)?.companyId;
	if (!companyId) {
		throw new functions.https.HttpsError('invalid-argument', 'Missing companyId');
	}

	try {
		const usersQuery = await db.collection('users').where('companyId', '==', companyId).get();
		const deletions: Promise<any>[] = [];
		usersQuery.forEach((doc) => {
			const uid = doc.id;
			deletions.push((async () => {
				try { await admin.auth().deleteUser(uid); } catch (e: any) { }
				try { await db.doc(`users/${uid}`).delete(); } catch (e: any) { }
			})());
		});
		await Promise.all(deletions);
		return { success: true };
	} catch (err: any) {
		throw new functions.https.HttpsError('internal', err.message || 'Bulk deletion failed');
	}
});
