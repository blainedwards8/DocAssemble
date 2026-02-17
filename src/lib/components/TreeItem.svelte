<script lang="ts">
    import Icon from "./Icon.svelte";

    let { component, insertAtCursor, onSelectSlot } = $props();

    let isExpanded = $state(true);

    function toggleExpand(e: MouseEvent) {
        e.stopPropagation();
        isExpanded = !isExpanded;
    }

    function insertSectionTag(e: MouseEvent) {
        e.stopPropagation();
        const tagOpen = `<section name="${component.name}">\n`;
        const tagClose = `\n</section>`;
        insertAtCursor(tagOpen, tagClose);
    }
</script>

<div class="mb-1">
    {#if component.type === "section"}
        <div
            class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-2"
        >
            <div
                class="w-full flex items-center gap-2 p-3 hover:bg-slate-50 transition-colors text-left border-none cursor-pointer group"
                onclick={toggleExpand}
                role="button"
                tabindex="0"
                onkeydown={(e) => e.key === "Enter" && toggleExpand(e as any)}
            >
                <div
                    class="transition-transform duration-200"
                    style="transform: rotate({isExpanded ? '0deg' : '-90deg'})"
                >
                    <Icon
                        name="ChevronDown"
                        size={12}
                        class="text-slate-400 group-hover:text-slate-600"
                    />
                </div>

                <Icon name="Layout" size={12} class="text-indigo-500" />
                <span
                    class="text-[11px] font-bold text-slate-700 uppercase tracking-tight flex-1 truncate"
                >
                    {component.name}
                </span>

                <button
                    onclick={insertSectionTag}
                    title="Insert section tags"
                    class="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-indigo-100 rounded text-indigo-400 hover:text-indigo-600 transition-all border-none cursor-pointer"
                >
                    <Icon name="Plus" size={12} />
                </button>
            </div>

            {#if isExpanded && component.children && component.children.length > 0}
                <div
                    class="p-2 pt-0 border-t border-slate-50 space-y-1 bg-slate-50/20"
                >
                    {#each component.children as child}
                        <svelte:self
                            component={child}
                            {insertAtCursor}
                            {onSelectSlot}
                        />
                    {/each}
                </div>
            {/if}
        </div>
    {:else if component.type === "slot"}
        <button
            onclick={() => onSelectSlot(component.name)}
            class="w-full flex items-center justify-between p-2 bg-indigo-50/30 rounded-lg border border-indigo-100/50 hover:border-indigo-300 transition-all text-left cursor-pointer group mb-1"
        >
            <div class="flex items-center gap-2">
                <Icon
                    name="Square"
                    size={10}
                    class="text-indigo-400 group-hover:text-indigo-600"
                />
                <span
                    class="text-[11px] font-mono text-indigo-700 font-medium truncate"
                    >{component.name}</span
                >
            </div>
            <div class="flex items-center gap-1">
                <span
                    class="text-[9px] font-bold text-indigo-300 uppercase opacity-0 group-hover:opacity-100 transition-opacity"
                    >Snippets</span
                >
                <Icon
                    name="Layers"
                    size={10}
                    class="text-indigo-200 group-hover:text-indigo-400"
                />
            </div>
        </button>
    {:else if component.type === "variable"}
        <button
            onclick={() => insertAtCursor(`{${component.name}}`)}
            class="w-full flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-100 hover:border-indigo-200 transition-all text-left cursor-pointer group mb-1"
        >
            <Icon
                name="Hash"
                size={10}
                class="text-slate-300 group-hover:text-indigo-400"
            />
            <span class="text-[10px] font-mono text-slate-600 truncate"
                >{component.name}</span
            >
        </button>
    {/if}
</div>
