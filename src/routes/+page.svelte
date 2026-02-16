<script>
    import { goto } from "$app/navigation";
    import { auth } from "$lib/pocketbase.svelte";

    $effect(() => {
        if (auth.user) {
            goto("/app/matters");
        }
    });
</script>
