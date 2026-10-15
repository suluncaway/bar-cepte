/* Android origin migration: keep the legacy storage intact and preserve newer values. */
(function (root) {
    'use strict';
    function snapshot(storage) {
        const entries = [];
        for (let i = 0; i < storage.length; i++) {
            const key = storage.key(i);
            const value = storage.getItem(key);
            if (typeof key === 'string' && typeof value === 'string') entries.push([key, value]);
        }
        return {version: 1, entries};
    }
    function restore(storage, data) {
        if (!data || data.version !== 1 || !Array.isArray(data.entries)) throw new Error('Invalid storage snapshot');
        const inserted = [];
        try {
            for (const entry of data.entries) {
                if (!Array.isArray(entry) || entry.length !== 2 ||
                    typeof entry[0] !== 'string' || typeof entry[1] !== 'string') throw new Error('Invalid storage entry');
                if (storage.getItem(entry[0]) === null) {
                    storage.setItem(entry[0], entry[1]);
                    inserted.push(entry[0]);
                }
            }
        } catch (error) {
            for (const key of inserted) storage.removeItem(key);
            throw error;
        }
        return true;
    }
    const api = {snapshot, restore};
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.BarStorageMigration = api;
})(typeof window !== 'undefined' ? window : globalThis);
