<script>
    import ProvisionEditorModal from "$lib/components/ProvisionEditorModal.svelte";
    import Icon from "$lib/components/Icon.svelte";
    import { pb } from "$lib/pocketbase.svelte";
    import { extractStructureMetadata } from "$lib/utils/utils";

    let {
        initialStructure,
        snippets,
        onUpdateSnippets,
        onSave,
        onBack,
        activeDocumentId,
        variables,
        slotValues,
        tierStyles,
        continuousNumbering,
        onContentChange,
        onTitleChange,
        variableConfigs = {},
        onUpdateVariableConfigs,
    } = $props();

    let title = $state("");
    let content = $state("");

    $effect(() => {
        if (initialStructure) {
            title = initialStructure.title || "New Structure";
            content = initialStructure.content || "";
        }
    });

    let isSaving = $state(false);
    let isCheatSheetOpen = $state(false);
    let selectedSection = $state(null);
    let isProvisionModalOpen = $state(false);
    let editingProvision = $state(null);
    let provisionSearch = $state("");
    let configuringVariable = $state(null);

    let metadata = $derived(extractStructureMetadata(content));

    // ... (rest of the script)

    function openProvisionModal(provision = null) {
        editingProvision = provision
            ? { ...provision }
            : { category: "", title: "", content: "" };
        isProvisionModalOpen = true;
    }

    async function handleSaveProvision(provision) {
        try {
            if (provision.id) {
                await pb
                    .collection("provisions")
                    .update(provision.id, provision);
                onUpdateSnippets(
                    snippets.map((s) =>
                        s.id === provision.id ? provision : s,
                    ),
                );
            } else {
                const rec = await pb.collection("provisions").create(provision);
                onUpdateSnippets([...snippets, rec]);
            }
        } catch (err) {
            console.error("Failed to save provision", err);
            alert("Failed to save provision");
        }
    }
    function toggleSection(s) {
        selectedSection = selectedSection?.title === s.title ? null : s;
    }
</script>

<ProvisionEditorModal
    bind:isOpen={isProvisionModalOpen}
    provision={editingProvision}
    onSave={handleSaveProvision}
/>

{#if configuringVariable}
    <div
        class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[110] p-6 animate-in fade-in duration-200"
    >
        <div
            class="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200"
        >
            <header
                class="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-indigo-50/30"
            >
                <div>
                    <h2
                        class="text-lg font-black text-slate-800 tracking-tight uppercase"
                    >
                        Variable Settings
                    </h2>
                    <p
                        class="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mt-1"
                    >
                        {"{" + configuringVariable + "}"}
                    </p>
                </div>
                <button
                    onclick={() => (configuringVariable = null)}
                    class="p-2 hover:bg-slate-200/50 rounded-xl transition-all border-none bg-transparent cursor-pointer"
                >
                    <Icon name="X" />
                </button>
            </header>
            <div class="p-8 space-y-6">
                <div class="grid grid-cols-3 gap-2">
                    {#each ["text", "date", "select"] as type}
                        <button
                            onclick={() =>
                                onUpdateVariableConfigs({
                                    ...variableConfigs,
                                    [configuringVariable]: {
                                        ...variableConfigs[configuringVariable],
                                        type,
                                    },
                                })}
                            class="py-3 rounded-xl border-2 text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer
                                {(variableConfigs[configuringVariable]?.type ||
                                'text') === type
                                ? 'bg-indigo-600 border-indigo-700 text-white shadow-md'
                                : 'bg-white border-slate-100 text-slate-400 hover:border-indigo-100 hover:text-indigo-400'}"
                        >
                            {type}
                        </button>
                    {/each}
                </div>
                {#if variableConfigs[configuringVariable]?.type === "select"}
                    <textarea
                        rows="4"
                        value={variableConfigs[
                            configuringVariable
                        ]?.options?.join("\n") || ""}
                        oninput={(e) =>
                            onUpdateVariableConfigs({
                                ...variableConfigs,
                                [configuringVariable]: {
                                    ...variableConfigs[configuringVariable],
                                    options: e.target.value
                                        .split("\n")
                                        .filter((o) => o.trim()),
                                },
                            })}
                        class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                        placeholder="Option 1\nOption 2"
                    ></textarea>
                {/if}
            </div>
            <footer
                class="p-6 bg-slate-50 border-t border-slate-100 flex justify-end"
            >
                <button
                    onclick={() => (configuringVariable = null)}
                    class="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-100 transition-all border-none cursor-pointer"
                >
                    Done
                </button>
            </footer>
        </div>
    </div>
{/if}
