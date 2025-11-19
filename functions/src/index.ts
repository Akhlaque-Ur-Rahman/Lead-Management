import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();
const db = admin.firestore();

// Helper to ensure caller is allowed
function requireAdminRole(context: functions.https.CallableContext) {
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
  const uid = data?.uid;
  if (!uid) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing uid');
  }

  try {
    // Delete from Auth (may throw if user not found)
    await admin.auth().deleteUser(uid);
  } catch (err: any) {
    // If user not found, continue to delete Firestore doc
    if (err.code !== 'auth/user-not-found') {
      throw new functions.https.HttpsError('internal', `Failed to delete auth user: ${err.message}`);
    }
  }

  try {
    await db.doc(`users/${uid}`).delete();
  } catch (err: any) {
    // If Firestore deletion fails, report error
    throw new functions.https.HttpsError('internal', `Failed to delete user doc: ${err.message}`);
  }

  return { success: true };
});

export const adminDeleteUsersByCompany = functions.https.onCall(async (data, context) => {
  requireAdminRole(context);
  const companyId = data?.companyId;
  if (!companyId) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing companyId');
  }

  try {
    const usersQuery = await db.collection('users').where('companyId', '==', companyId).get();
    const deletions: Promise<any>[] = [];
    usersQuery.forEach((doc) => {
      const uid = doc.id;
      deletions.push((async () => {
        try { await admin.auth().deleteUser(uid); } catch (e: any) { /* ignore if not found */ }
        try { await db.doc(`users/${uid}`).delete(); } catch (e: any) { /* log but continue */ }
      })());
    });
    await Promise.all(deletions);
    return { success: true };
  } catch (err: any) {
    throw new functions.https.HttpsError('internal', err.message || 'Bulk deletion failed');
  }
});
