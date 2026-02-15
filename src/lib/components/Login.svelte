<script>
    import { pb } from "$lib/pocketbase";
    import Icon from "$lib/components/Icon.svelte";
    import { user } from "$lib/stores/app";

    /** @type {{ onLogin?: (record: any) => void }} */
    let { onLogin } = $props();

    let email = $state("");
    let password = $state("");
    let loading = $state(false);
    let error = $state(null);

    /** @param {SubmitEvent} e */
    async function handleSubmit(e) {
        e.preventDefault();
        loading = true;
        error = null;

        try {
            const authData = await pb
                .collection("users")
                .authWithPassword(email, password);
            user.set(authData.record);
            if (onLogin) onLogin(authData.record);
        } catch (err) {
            console.error("Login failed", err);
            error = "Invalid email or password.";
        } finally {
            loading = false;
        }
    }
</script>

<div class="min-h-screen flex items-center justify-center bg-slate-100">
    <div
        class="bg-white p-10 rounded-2xl shadow-xl w-full max-w-md border border-slate-200"
    >
        <div class="flex flex-col items-center mb-8 gap-4">
            <div class="bg-indigo-600 p-3 rounded-xl text-white shadow-lg">
                <Icon name="Layout" size={32} />
            </div>
            <h1
                class="text-2xl font-black text-slate-800 uppercase tracking-tight"
            >
                DocAssemble
            </h1>
        </div>

        <form onsubmit={handleSubmit} class="space-y-6">
            <div>
                <label
                    class="block text-xs font-black uppercase text-slate-400 mb-2 tracking-widest"
                    >Email</label
                >
                <input
                    type="email"
                    required
                    bind:value={email}
                    class="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all font-medium"
                    placeholder="attorney@firm.com"
                />
            </div>
            <div>
                <label
                    class="block text-xs font-black uppercase text-slate-400 mb-2 tracking-widest"
                    >Password</label
                >
                <input
                    type="password"
                    required
                    bind:value={password}
                    class="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all font-medium"
                    placeholder="••••••••"
                />
            </div>

            {#if error}
                <div
                    class="p-3 bg-red-50 text-red-600 text-xs font-bold rounded-lg flex items-center gap-2"
                >
                    <Icon name="AlertCircle" size={16} />
                    {error}
                </div>
            {/if}

            <button
                type="submit"
                disabled={loading}
                class="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-black uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
                {#if loading}
                    <Icon name="Loader2" class="animate-spin" />
                    <span>Signing In...</span>
                {:else}
                    <Icon name="LogIn" />
                    <span>Sign In</span>
                {/if}
            </button>
        </form>
    </div>
</div>
