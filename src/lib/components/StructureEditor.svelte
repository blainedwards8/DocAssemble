<script>
    import Icon from "$lib/components/Icon.svelte";
    import { extractStructureMetadata } from "$lib/utils/utils.js";
    import { pb } from "$lib/pocketbase.js";

    /** @type {{
     * initialStructure: any,
     * snippets: any[],
     * onUpdateSnippets: (snippets: any[]) => void,
     * onSave?: (rec: any) => void,
     * onBack: () => void,
     * activeDocumentId?: string,
     * variables?: any,
     * slotValues?: any,
     * tierStyles?: any[],
     * continuousNumbering?: boolean,
     * onContentChange?: (content: string) => void,
     * onTitleChange?: (title: string) => void,
     * variableConfigs?: any,
     * onUpdateVariableConfigs: (configs: any) => void
     * }} */
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

    let title = $state(initialStructure?.title || "New Structure");
    let content = $state(initialStructure?.content || "");
    let isSaving = $state(false);
    let isCheatSheetOpen = $state(false);
    let selectedSection = $state(null);
    let isProvisionModalOpen = $state(false);
    let editingProvision = $state(null);
    let provisionSearch = $state("");
    let configuringVariable = $state(null);

    let metadata = $derived(extractStructureMetadata(content));

    $effect(() => {
        onContentChange?.(content);
    });

    $effect(() => {
        onTitleChange?.(title);
    });

    // Auto-save logic
    let saveTimeout;
    $effect(() => {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            if (
                content !== (initialStructure?.content || "") ||
                title !== (initialStructure?.title || "")
            ) {
                handleSave();
            }
        }, 2000);
        return () => clearTimeout(saveTimeout);
    });

    async function handleSave() {
        isSaving = true;
        try {
            if (activeDocumentId) {
                const state = {
                    rawTemplate: content,
                    structureId: initialStructure?.id,
                    structureTitle: title,
                    variables: variables || {},
                    slotValues: slotValues || {},
                    tierStyles: tierStyles || [
                        "decimal",
                        "lower-alpha",
                        "lower-roman",
                    ],
                    continuousNumbering:
                        continuousNumbering !== undefined
                            ? continuousNumbering
                            : true,
                    variableConfigs,
                };
                const jsonState = JSON.stringify(state);
                await pb.collection("documents").update(activeDocumentId, {
                    description: jsonState,
                    state: jsonState,
                });
                return;
            }

            const data = {
                title,
                content,
                category: "Structure",
                tags: [],
            };

            if (initialStructure?.id) {
                const templateData = {
                    ...data,
                    state: JSON.stringify({ variableConfigs }),
                };
                const rec = await pb
                    .collection("templates")
                    .update(initialStructure.id, templateData);
                if (onSave) onSave(rec);
            } else {
                const templateData = {
                    ...data,
                    state: JSON.stringify({ variableConfigs }),
                };
                const rec = await pb
                    .collection("templates")
                    .create(templateData);
                if (onSave) onSave(rec);
            }
        } catch (err) {
            console.error("Save failed:", err);
        } finally {
            isSaving = false;
        }
    }

    async function handleSaveProvision(e) {
        e.preventDefault();
        const tag = editingProvision.tag?.trim();
        const category = selectedSection?.category || "Uncategorized";
        const payload = {
            title: editingProvision.title,
            content: editingProvision.content,
            category: category,
            tags: tag ? [tag] : [],
        };

        try {
            if (editingProvision.id) {
                const rec = await pb
                    .collection("templates")
                    .update(editingProvision.id, payload);
                onUpdateSnippets(
                    snippets.map((s) =>
                        s.id === rec.id
                            ? { ...rec, tag: rec.tags?.[0] || "" }
                            : s,
                    ),
                );
            } else {
                const rec = await pb.collection("templates").create(payload);
                onUpdateSnippets([
                    ...snippets,
                    { ...rec, tag: rec.tags?.[0] || "" },
                ]);
            }
            isProvisionModalOpen = false;
        } catch (err) {
            console.error("Failed to save provision", err);
            alert("Failed to save provision. Please check your connection.");
        }
    }

    async function handleDeleteProvision(id) {
        if (!confirm("Are you sure you want to delete this provision?")) return;
        try {
            await pb.collection("templates").delete(id);
            onUpdateSnippets(snippets.filter((s) => s.id !== id));
        } catch (err) {
            console.error("Failed to delete provision", err);
        }
    }

    let filteredProvisions = $derived(() => {
        let result = snippets;
        if (selectedSection) {
            const category = selectedSection.category || "Uncategorized";
            result = result.filter(
                (s) => (s.category || "Uncategorized") === category,
            );
        }
        if (provisionSearch) {
            const lower = provisionSearch.toLowerCase();
            result = result.filter(
                (s) =>
                    (s.title && s.title.toLowerCase().includes(lower)) ||
                    (s.content && s.content.toLowerCase().includes(lower)) ||
                    (s.tag && s.tag.toLowerCase().includes(lower)),
            );
        }
        return result;
    });

    function toggleSection(s) {
        selectedSection = selectedSection?.title === s.title ? null : s;
    }
</script>

<div class="flex-1 flex flex-col bg-slate-50 overflow-hidden h-full">
    <!-- Header -->
    <header
        class="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-10 shadow-sm"
    >
        <div class="flex items-center gap-4 flex-1">
            <button
                onclick={onBack}
                class="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-all border-none bg-transparent cursor-pointer"
            >
                <Icon name="ArrowLeft" size={20} />
            </button>
            <input
                type="text"
                bind:value={title}
                class="bg-transparent border-none text-lg font-black text-slate-800 focus:ring-0 w-full max-w-md placeholder:text-slate-200 outline-none"
                placeholder="Untitled Structure"
            />
        </div>
        <div class="flex items-center gap-3">
            <div
                class="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-300 mr-4"
            >
                {#if isSaving}
                    <Icon
                        name="Loader2"
                        size={12}
                        class="animate-spin text-indigo-500"
                    /> <span>Saving...</span>
                {:else}
                    <Icon name="Check" size={12} class="text-emerald-500" />
                    <span>Saved to Cloud</span>
                {/if}
            </div>
            <button
                onclick={() => (isCheatSheetOpen = true)}
                class="p-2.5 bg-slate-50 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-xl transition-all border border-slate-200 hover:border-indigo-100 shadow-sm cursor-pointer"
                title="Syntax Cheat Sheet"
            >
                <Icon name="HelpCircle" size={20} />
            </button>
            <button
                onclick={handleSave}
                class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-100 transition-all border-none cursor-pointer"
            >
                Save Now
            </button>
        </div>
    </header>

    <!-- Main Editor Area -->
    <div class="flex-1 flex overflow-hidden">
        <!-- Editor -->
        <div
            class="flex-1 flex flex-col bg-white border-r border-slate-200 shadow-inner overflow-hidden"
        >
            <div class="h-full relative font-mono">
                <textarea
                    bind:value={content}
                    class="absolute inset-0 w-full h-full p-8 text-sm text-slate-700 leading-relaxed resize-none focus:outline-none custom-scrollbar selection:bg-indigo-100 selection:text-indigo-700 border-none"
                    placeholder="# Document Title\n\nUse &#123;variable_name&#125; for variables.\nUse [[Section Name|Category]] for document sections/structural elements.\nUse &#123;#foreach list&#125;...&#123;/foreach&#125; for loops.\n\nNormal # Markdown Headers are supported."
                    spellcheck="false"
                ></textarea>
            </div>
        </div>

        <!-- Dynamic Sidebar -->
        <div
            class="flex bg-slate-50 overflow-hidden shrink-0 transition-all duration-300 {selectedSection
                ? 'w-[640px]'
                : 'w-80'}"
        >
            <!-- Column 1: Sections -->
            <div
                class="w-80 border-r border-slate-200 p-6 overflow-y-auto custom-scrollbar space-y-8 flex flex-col"
            >
                <div>
                    <div class="flex items-center justify-between mb-4">
                        <div class="flex items-center gap-2">
                            <Icon
                                name="Layers"
                                size={16}
                                class="text-indigo-500"
                            />
                            <h3
                                class="text-xs font-black uppercase tracking-widest text-slate-400"
                            >
                                Sections
                            </h3>
                        </div>
                        <button
                            onclick={() => (selectedSection = null)}
                            class="text-[10px] font-black uppercase px-2 py-1 rounded-md transition-all border-none cursor-pointer {!selectedSection
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600'}"
                        >
                            Library
                        </button>
                    </div>
                    <div class="space-y-2">
                        {#if metadata.sections.length > 0}
                            {#each metadata.sections as s, i}
                                <button
                                    onclick={() => toggleSection(s)}
                                    class="w-full text-left text-xs p-3 rounded-xl border transition-all flex justify-between items-center group cursor-pointer
                                        {selectedSection?.title === s.title
                                        ? 'bg-indigo-600 border-indigo-700 text-white shadow-md'
                                        : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:bg-indigo-50/30'}"
                                >
                                    <div class="flex flex-col">
                                        <span
                                            class="font-black uppercase tracking-tight"
                                            >{s.title}</span
                                        >
                                        <span
                                            class="text-[9px] uppercase tracking-widest font-black mt-1 {selectedSection?.title ===
                                            s.title
                                                ? 'text-indigo-200'
                                                : 'text-slate-300'}"
                                        >
                                            {s.category || "No Category"}
                                        </span>
                                    </div>
                                    <Icon
                                        name="ChevronRight"
                                        size={14}
                                        class="transition-transform {selectedSection?.title ===
                                        s.title
                                            ? 'translate-x-1'
                                            : 'opacity-0 group-hover:opacity-100'}"
                                    />
                                </button>
                            {/each}
                        {:else}
                            <div class="text-[10px] italic text-slate-300">
                                No sections found
                            </div>
                        {/if}
                    </div>
                </div>

                <!-- Variables Area -->
                <div>
                    <div class="flex items-center gap-2 mb-4">
                        <Icon
                            name="Brackets"
                            size={16}
                            class="text-emerald-500"
                        />
                        <h3
                            class="text-xs font-black uppercase tracking-widest text-slate-400"
                        >
                            Variables
                        </h3>
                    </div>
                    <div class="flex flex-wrap gap-2">
                        {#if metadata.variables.length > 0}
                            {#each metadata.variables as v}
                                {@const config = variableConfigs[v] || {
                                    type: "text",
                                }}
                                <button
                                    onclick={() => (configuringVariable = v)}
                                    class="text-[10px] font-black px-2 py-1 bg-white border rounded-md shadow-sm transition-all flex items-center gap-1.5 group cursor-pointer
                                        {config.type === 'text'
                                        ? 'border-slate-200 text-emerald-600 hover:border-emerald-300'
                                        : config.type === 'date'
                                          ? 'border-indigo-200 text-indigo-600 hover:border-indigo-400'
                                          : 'border-amber-200 text-amber-600 hover:border-amber-400'}"
                                >
                                    <div class="flex items-center gap-1">
                                        {#if config.type === "date"}
                                            <Icon name="Calendar" size={10} />
                                        {:else if config.type === "select"}
                                            <Icon name="List" size={10} />
                                        {/if}
                                        {v}
                                    </div>
                                    <Icon
                                        name="Settings"
                                        size={10}
                                        class="opacity-0 group-hover:opacity-100 transition-opacity"
                                    />
                                </button>
                            {/each}
                        {:else}
                            <div
                                class="text-[10px] italic text-slate-300 w-full"
                            >
                                No variables found
                            </div>
                        {/if}
                    </div>
                </div>

                <div class="mt-auto pt-8 border-t border-slate-200">
                    <p
                        class="text-[10px] text-slate-300 font-medium uppercase tracking-[0.1em]"
                    >
                        DocAssemble Structure Editor v1.2. Manage provisions by
                        selecting a section.
                    </p>
                </div>
            </div>

            <!-- Column 2: Provisions -->
            <div
                class="w-80 bg-white p-6 overflow-y-auto custom-scrollbar flex flex-col border-r border-slate-200"
            >
                <div class="flex items-center justify-between mb-2">
                    <div>
                        <h3
                            class="text-xs font-black uppercase tracking-widest text-slate-400 mb-1"
                        >
                            {selectedSection
                                ? "Category Provisions"
                                : "All Provisions"}
                        </h3>
                        {#if selectedSection}
                            <p
                                class="text-[10px] font-bold text-indigo-500 uppercase"
                            >
                                {selectedSection.category}
                            </p>
                        {/if}
                    </div>
                    <button
                        onclick={() => {
                            editingProvision = { title: "", content: "" };
                            isProvisionModalOpen = true;
                        }}
                        class="p-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-lg transition-all border-none cursor-pointer"
                        title="New Provision"
                    >
                        <Icon name="Plus" size={16} />
                    </button>
                </div>

                <div class="mb-4 relative">
                    <input
                        type="text"
                        bind:value={provisionSearch}
                        placeholder="Search clauses..."
                        class="w-full pl-8 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                    />
                    <Icon
                        name="Search"
                        size={12}
                        class="absolute left-2.5 top-2.5 text-slate-400"
                    />
                    {#if provisionSearch}
                        <button
                            onclick={() => (provisionSearch = "")}
                            class="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer"
                        >
                            <Icon name="X" size={12} />
                        </button>
                    {/if}
                </div>

                <div class="space-y-3">
                    {#each filteredProvisions() as p (p.id)}
                        <div
                            role="button"
                            tabindex="0"
                            onclick={() => {
                                editingProvision = p;
                                isProvisionModalOpen = true;
                            }}
                            onkeydown={(e) =>
                                e.key === "Enter" &&
                                (() => {
                                    editingProvision = p;
                                    isProvisionModalOpen = true;
                                })()}
                            class="group p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-indigo-200 hover:shadow-md transition-all cursor-pointer relative text-left w-full border-none"
                        >
                            <div class="flex justify-between items-start mb-2">
                                <div class="flex-1">
                                    <h4
                                        class="text-[11px] font-black text-slate-800 line-clamp-2 leading-tight group-hover:text-indigo-600 transition-colors uppercase tracking-tight"
                                    >
                                        {p.title}
                                    </h4>
                                    {#if p.tag}
                                        <span
                                            class="inline-block mt-1 px-1.5 py-0.5 bg-indigo-50 text-indigo-500 text-[8px] font-black uppercase tracking-widest rounded border border-indigo-100"
                                        >
                                            {p.tag}
                                        </span>
                                    {/if}
                                </div>
                                <div
                                    class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                >
                                    <button
                                        onclick={(e) => {
                                            e.stopPropagation();
                                            editingProvision = p;
                                            isProvisionModalOpen = true;
                                        }}
                                        class="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-all border-none cursor-pointer bg-transparent"
                                        title="Edit"
                                    >
                                        <Icon name="Edit3" size={14} />
                                    </button>
                                    <button
                                        onclick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteProvision(p.id);
                                        }}
                                        class="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all border-none cursor-pointer bg-transparent"
                                        title="Delete"
                                    >
                                        <Icon name="Trash2" size={14} />
                                    </button>
                                </div>
                            </div>
                            <p
                                class="text-[10px] text-slate-400 font-medium line-clamp-2 italic tracking-tighter leading-tight"
                            >
                                {p.content.substring(0, 100)}...
                            </p>
                        </div>
                    {:else}
                        <div
                            class="text-center py-10 bg-slate-50/50 rounded-xl border border-dashed border-slate-200"
                        >
                            <p
                                class="text-[10px] font-black uppercase tracking-widest text-slate-300"
                            >
                                {provisionSearch
                                    ? "No matches"
                                    : "No Provisions"}
                            </p>
                        </div>
                    {/each}
                </div>
            </div>
        </div>
    </div>
</div>

{#if isProvisionModalOpen}
    <div
        class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-6 animate-in fade-in duration-200"
    >
        <form
            onsubmit={handleSaveProvision}
            class="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200"
        >
            <header
                class="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-indigo-50/30"
            >
                <div>
                    <h2
                        class="text-lg font-black text-slate-800 tracking-tight uppercase"
                    >
                        {editingProvision?.id
                            ? "Edit Provision"
                            : "New Provision"}
                    </h2>
                    <p
                        class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1"
                    >
                        Category: {selectedSection?.category || "General"}
                    </p>
                </div>
                <button
                    type="button"
                    onclick={() => (isProvisionModalOpen = false)}
                    class="p-2 hover:bg-slate-200/50 rounded-xl transition-all border-none bg-transparent cursor-pointer"
                >
                    <Icon name="X" />
                </button>
            </header>
            <div class="p-8 space-y-6">
                <div class="space-y-2">
                    <label
                        for="prov-title"
                        class="text-[10px] font-black uppercase tracking-widest text-slate-400"
                        >Title</label
                    >
                    <input
                        id="prov-title"
                        required
                        type="text"
                        bind:value={editingProvision.title}
                        class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                    />
                </div>
                <div class="space-y-2">
                    <label
                        for="prov-content"
                        class="text-[10px] font-black uppercase tracking-widest text-slate-400"
                        >Content</label
                    >
                    <textarea
                        id="prov-content"
                        required
                        rows="8"
                        bind:value={editingProvision.content}
                        class="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none"
                    ></textarea>
                </div>
            </div>
            <footer
                class="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3"
            >
                <button
                    type="button"
                    onclick={() => (isProvisionModalOpen = false)}
                    class="px-6 py-2.5 text-slate-400 font-bold hover:text-slate-600 transition-colors border-none bg-transparent cursor-pointer uppercase text-xs"
                    >Cancel</button
                >
                <button
                    type="submit"
                    class="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-100 transition-all border-none cursor-pointer"
                >
                    {editingProvision?.id ? "Update" : "Create"}
                </button>
            </footer>
        </form>
    </div>
{/if}

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
