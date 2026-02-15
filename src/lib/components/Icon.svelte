<script>
    import * as Lucide from "lucide-svelte";

    /** @type {{ name: string, size?: number, class?: string }} */
    let { name, size = 24, class: className = "" } = $props();

    const LucideIcon = $derived(Lucide[name]);
</script>

{#if LucideIcon}
    <LucideIcon {size} class={className} />
{/if}
