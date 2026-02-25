import mongoose from 'mongoose';

/**
 * Drops stale/orphaned indexes that may exist from previous schemas.
 * This prevents E11000 duplicate key errors on fields we no longer use.
 */
export const cleanupStaleIndexes = async () => {
    try {
        const db = mongoose.connection.db;
        if (!db) return;

        const usersCollection = db.collection('users');
        const indexes = await usersCollection.indexes();

        // List of index names from old schemas that should be removed
        const staleIndexes = ['uniqueLoginId_1'];

        for (const idx of indexes) {
            if (idx.name && staleIndexes.includes(idx.name)) {
                await usersCollection.dropIndex(idx.name);
                console.log(`🗑️  Dropped stale index: ${idx.name}`);
            }
        }
    } catch (err: any) {
        // Collection may not exist yet — that's fine
        if (err.code !== 26) { // 26 = NamespaceNotFound
            console.warn('Index cleanup warning:', err.message);
        }
    }
};
