import PocketBase from 'pocketbase';

export const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL || 'http://127.0.0.1:8090');

export const auth = $state({
    user: pb.authStore.model
});

pb.authStore.onChange((token, model) => {
    auth.user = model;
}, true)

// Optional: Auto-cancellation
pb.autoCancellation(false);
