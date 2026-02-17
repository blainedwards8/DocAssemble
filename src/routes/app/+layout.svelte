<script>
    import TopNav from "$lib/components/TopNav.svelte";
    import { goto } from "$app/navigation";
    import { auth } from "$lib/pocketbase.svelte.js";
    let { children, data } = $props();

    $effect(() => {
        if (!auth.user) {
            goto("/login");
        }
    });
</script>

<TopNav />
{@render children()}
