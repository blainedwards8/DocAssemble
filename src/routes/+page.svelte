<script>
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import { pb } from "$lib/pocketbase";
    import Login from "$lib/components/Login.svelte";
    import { user } from "$lib/stores/app";

    onMount(() => {
        if (pb.authStore.isValid) {
            goto("/matters");
        }
    });

    async function handleLogin() {
        // Data loading is handled by the layout subscription
        goto("/matters");
    }
</script>

{#if !$user}
    <Login onLogin={handleLogin} />
{:else}
    <div class="h-screen flex items-center justify-center bg-slate-50">
        <p
            class="text-slate-400 font-bold animate-pulse uppercase tracking-widest text-xs"
        >
            Redirecting to Dashboard...
        </p>
    </div>
{/if}
