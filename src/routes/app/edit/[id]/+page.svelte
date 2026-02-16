<script lang="ts">
    import { tick } from "svelte";
    import Icon from "$lib/components/Icon.svelte";
    import MarkdownRenderer from "$lib/components/MarkdownRenderer.svelte";
    import ProvisionEditorModal from "$lib/components/ProvisionEditorModal.svelte";
    import { DocumentWorkspace } from "./workspace.svelte";
    import { page } from "$app/state";
    import { pb } from "$lib/pocketbase.svelte";
    import {
        getNestedValue,
        extractStructureMetadata,
    } from "$lib/utils/utils.js";

    // --- Data and State Management ---
    let { data } = $props();
    
    // Initialize the Workspace class (Persistent State)
    const ws = new DocumentWorkspace(data);

    // Local UI State (Transient)
    let searchTerm = $state("");
    let editingVariable = $state(null);
    let dragOverSlotId = $state(null);
    let modalConfig = $state({ isOpen: false, mode: "" });
    let selectedSlotId = $state(null);
    let viewMode = $state<"assemble" | "preview">("assemble");
    
    // Provision Editing Logic
    let isProvisionModalOpen = $state(false);
    let editingProvisionFromSlot = $state(null);

    // The snippets library (assuming it's passed via data)
    let snippets = data.snippets || [];

    // --- Derived Logic ---
    let selectedCategory = $derived.by(() => {
        if (!selectedSlotId) return null;
        const slot = ws.parsedTemplate.find((s) => s.id === selectedSlotId);
        return slot ? slot.category : null;
    });

    // Extract unique categories for the sidebar
    let activeCategories = $derived.by(() => {
        const cats = new Set(ws.parsedTemplate.filter(i => i.type === 'slot').map(i => i.category));
        return Array.from(cats);
    });

    // --- Autosave Logic ---
    // This effect runs whenever document data changes
    let saveTimeout: any;
    $effect(() => {
        // Track the fields we want to trigger an autosave
        const _trigger = [ws.rawTemplate, ws.variables, ws.slotValues];
        
        if (saveTimeout) clearTimeout(saveTimeout);
        
        saveTimeout = setTimeout(async () => {
            // Only autosave if we aren't currently saving
            if (ws.saveStatus !== "saving") {
                await ws.saveToCloud(true);
            }
        }, 2000); // 2 second debounce

        return () => clearTimeout(saveTimeout);
    });

    // --- Handlers ---
    function handleVariableClick(path, rect) {
        const currentVal = getNestedValue(ws.variables, path) || "";
        const meta = extractStructureMetadata(ws.rawTemplate);
        const metaConfigs = meta.variableMeta || {};

        const leafName = path.split(/[.\[\]]+/).filter(Boolean).pop();
        const config = ws.variableConfigs[path] || 
                      ws.variableConfigs[leafName] || 
                      metaConfigs[leafName] || { type: "text" };

        editingVariable = { path, value: currentVal, rect, config };
    }

    // Save variable edit locally and sync to class
    function saveVariableEdit() {
        if (!editingVariable) return;
        ws.updateVariable(editingVariable.path, editingVariable.value);
        editingVariable = null;
    }

    // Dismiss variable editor on click outside
    $effect(() => {
        const handleGlobalClick = (e) => {
            if (e.target.closest(".variable-editor-input")) return;
            if (editingVariable) saveVariableEdit();
        };
        window.addEventListener("mousedown", handleGlobalClick);
        return () => window.removeEventListener("mousedown", handleGlobalClick);
    });

    function onDragStart(e, snippet) {
        e.dataTransfer.setData("snippetId", snippet.id);
    }

    function onDrop(e, item) {
        e.preventDefault();
        dragOverSlotId = null;
        const snippetId = e.dataTransfer.getData("snippetId");
        const snippet = snippets.find((s) => s.id === snippetId);
        
        if (snippet && snippet.category === item.category) {
            ws.slotValues[item.id] = { ...snippet };
        }
    }

    function removeSlotValue(slotId) {
        delete ws.slotValues[slotId];
    }

    function openEditProvisionModal(provision) {
        editingProvisionFromSlot = { ...provision };
        isProvisionModalOpen = true;
    }

    async function handleSaveProvision(updatedProvision) {
        try {
            let savedRecord = updatedProvision;
            if (updatedProvision.id) {
                savedRecord = await pb.collection("templates").update(updatedProvision.id, updatedProvision);
            }

            // Update all slots that contain this provision
            Object.keys(ws.slotValues).forEach((key) => {
                if (ws.slotValues[key].id === savedRecord.id) {
                    ws.slotValues[key] = { ...savedRecord };
                }
            });

            isProvisionModalOpen = false;
        } catch (err) {
            console.error("Failed to save provision", err);
        }
    }

    function selectSlot(id) {
        selectedSlotId = id;
    }
</script>

<div class="h-screen flex flex-col bg-slate-50 overflow-hidden">
    <!-- Secondary Header / Toolbar -->
    <div class="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-40 relative">
        <div class="flex items-center gap-4">
            <div class="flex bg-slate-100 p-1 rounded-lg border border-slate-200/50">
                {#each ["assemble", "preview"] as m}
                    <button
                        onclick={() => viewMode = m as any}
                        class="px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all border-none cursor-pointer {viewMode === m ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}"
                    >
                        {m}
                    </button>
                {/each}
            </div>
            <button
                onclick={() => (modalConfig = { isOpen: true, mode: "variables" })}
                class="px-4 py-2 bg-white border border-slate-200 rounded-lg text-[10px] font-black uppercase text-slate-600 shadow-sm flex items-center gap-2 hover:bg-slate-50 transition-all cursor-pointer"
            >
                <Icon name="Database" size={14} class="text-indigo-500" /> Variables
            </button>
        </div>

        <div class="flex items-center gap-3">
            <div class="flex items-center gap-2 mr-4">
                {#if ws.saveStatus === "saving"}
                    <Icon name="Loader2" size={14} class="text-indigo-500 animate-spin" />
                    <span class="text-[10px] uppercase font-black text-indigo-500 tracking-widest">Saving...</span>
                {:else if ws.saveStatus === "saved"}
                    <Icon name="Check" size={14} class="text-emerald-500" />
                    <span class="text-[10px] uppercase font-black text-emerald-500 tracking-widest">Saved</span>
                {:else if ws.saveStatus === "error"}
                    <Icon name="AlertCircle" size={14} class="text-red-500" />
                    <span class="text-[10px] uppercase font-black text-red-500 tracking-widest">Save Failed</span>
                {:else if ws.lastSaved}
                    <span class="text-[10px] uppercase font-bold text-slate-300">
                        Last Sync {ws.lastSaved.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                {/if}
            </div>

            <button onclick={() => ws.handleExport("docx")} class="px-4 py-2 bg-white border border-slate-200 rounded-lg text-[10px] font-black uppercase text-slate-600 cursor-pointer hover:bg-slate-50 transition-all">DOCX</button>
            <button onclick={() => ws.handleExport("pdf")} class="px-4 py-2 bg-white border border-slate-200 rounded-lg text-[10px] font-black uppercase text-slate-600 cursor-pointer hover:bg-slate-50 transition-all">PDF</button>
        </div>
    </div>

    <div class="flex-1 flex overflow-hidden">
        <!-- Sidebar (Assemble Mode Only) -->
        {#if viewMode === "assemble"}
            <aside class="w-80 border-r border-slate-200 bg-white flex flex-col shrink-0 shadow-sm overflow-hidden z-10">
                <div class="p-4 border-b border-slate-100 bg-slate-50/50">
                    <h2 class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Provisions Library</h2>
                    
                    {#if selectedCategory}
                        <div class="flex items-center gap-2 mb-3 bg-indigo-50 px-3 py-2 rounded-lg border border-indigo-100">
                            <Icon name="Filter" size={12} class="text-indigo-600" />
                            <span class="text-[10px] font-black text-indigo-700 uppercase tracking-wider">{selectedCategory}</span>
                            <button onclick={() => selectedSlotId = null} class="ml-auto p-1 hover:bg-indigo-100 rounded transition-colors border-none bg-transparent cursor-pointer">
                                <Icon name="X" size={10} class="text-indigo-400" />
                            </button>
                        </div>
                    {/if}
                    
                    <input type="text" bind:value={searchTerm} placeholder="Search provisions..." class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold outline-none" />
                </div>

                <div class="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                    {#if !selectedCategory && snippets.length > 0}
                        <div class="text-center py-12 px-6">
                            <div class="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-200">
                                <Icon name="MousePointer2" size={24} />
                            </div>
                            <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-loose">Select a slot to see relevant provisions</p>
                        </div>
                    {:else}
                        {#each activeCategories.filter(cat => !selectedCategory || cat === selectedCategory) as cat}
                            <div class="mb-4">
                                <h3 class="text-[9px] font-black text-slate-300 uppercase mb-2">{cat}</h3>
                                <div class="space-y-2">
                                    {#each snippets.filter(s => s.category === cat && (!searchTerm || s.title.toLowerCase().includes(searchTerm.toLowerCase()))) as snippet}
                                        <div
                                            role="listitem"
                                            draggable="true"
                                            ondragstart={(e) => onDragStart(e, snippet)}
                                            class="bg-white border border-slate-200 rounded-lg p-3 hover:border-indigo-400 hover:shadow-md cursor-grab text-[11px] font-bold text-slate-700 transition-all"
                                        >
                                            {snippet.title}
                                        </div>
                                    {/each}
                                </div>
                            </div>
                        {/each}
                    {/if}
                </div>
            </aside>
        {/if}

        <!-- Document Canvas -->
        <section class="flex-1 overflow-y-auto p-12 bg-slate-50/50 scroll-smooth custom-scrollbar">
            <div class="mx-auto bg-white shadow-2xl min-h-[1056px] w-full max-w-[816px] p-16 lg:p-24 border border-slate-200 transition-all duration-500 {viewMode === 'preview' ? 'rounded-none' : 'rounded-2xl'}">
                <div class="space-y-2">
                    {#each ws.parsedTemplate as item}
                        {#if item.type === "static"}
                            <MarkdownRenderer
                                content={item.content}
                                variables={ws.variables}
                                startOffset={1}
                                continuous={ws.continuousNumbering}
                                tierStyles={ws.tierStyles}
                                onVariableClick={handleVariableClick}
                            />
                        {:else}
                            <div
                                role="button"
                                tabindex="0"
                                onclick={() => selectSlot(item.id)}
                                ondragover={(e) => { e.preventDefault(); dragOverSlotId = item.id; }}
                                ondragleave={() => dragOverSlotId = null}
                                ondrop={(e) => onDrop(e, item)}
                                class="relative group min-h-[40px] rounded-2xl transition-all border-2 flex flex-col items-center justify-center mb-4 cursor-pointer {item.value ? (selectedSlotId === item.id ? 'bg-indigo-50 border-indigo-200' : 'border-transparent bg-indigo-50/30') : selectedSlotId === item.id ? 'border-indigo-300 bg-indigo-50/50' : 'border-dashed border-slate-200 bg-slate-50/50'} {dragOverSlotId === item.id ? 'ring-2 ring-indigo-500' : ''}"
                            >
                                {#if !item.value}
                                    <div class="py-6 text-center text-slate-300">
                                        <Icon name="PlusCircle" size={20} class="mx-auto mb-2 opacity-30" />
                                        <span class="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
                                    </div>
                                {:else}
                                    <div class="w-full p-2 relative">
                                        <div class="absolute -top-5 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none group-hover:pointer-events-auto">
                                            <button onclick={(e) => { e.stopPropagation(); openEditProvisionModal(item.value); }} title="Edit" class="p-1.5 bg-white text-indigo-600 rounded-full shadow-sm hover:bg-indigo-50 border border-indigo-100 cursor-pointer"><Icon name="Edit3" size={12} /></button>
                                            <button onclick={(e) => { e.stopPropagation(); removeSlotValue(item.id); }} title="Remove" class="p-1.5 bg-white text-rose-500 rounded-full shadow-sm hover:bg-rose-50 border border-rose-100 cursor-pointer"><Icon name="X" size={12} /></button>
                                        </div>
                                        <MarkdownRenderer
                                            content={item.value.content}
                                            variables={ws.variables}
                                            startOffset={1}
                                            continuous={ws.continuousNumbering}
                                            tierStyles={ws.tierStyles}
                                            onVariableClick={handleVariableClick}
                                        />
                                    </div>
                                {/if}
                            </div>
                        {/if}
                    {/each}
                </div>
            </div>
        </section>
    </div>
</div>

<!-- Inline Variable Editor (Portal) -->
{#if editingVariable}
    <div style="position: fixed; top: {editingVariable.rect.top}px; left: {editingVariable.rect.left}px; z-index: 100">
        {#if editingVariable.config?.type === "date"}
            <input type="date" class="variable-editor-input px-2 py-0.5 rounded font-bold border-2 border-indigo-500 bg-white shadow-xl outline-none" bind:value={editingVariable.value} onblur={saveVariableEdit} onkeydown={(e) => e.key === "Enter" && e.target.blur()} />
        {:else if editingVariable.config?.type === "select"}
            <select class="variable-editor-input px-2 py-0.5 pr-8 rounded font-bold border-2 border-indigo-500 bg-white shadow-xl outline-none" bind:value={editingVariable.value} onchange={saveVariableEdit}>
                <option value="">Select...</option>
                {#each editingVariable.config.options || [] as option}<option value={option}>{option}</option>{/each}
            </select>
        {:else}
            <input type="text" class="variable-editor-input px-2 py-0.5 rounded font-bold border-2 border-indigo-500 bg-white shadow-xl outline-none" bind:value={editingVariable.value} onblur={saveVariableEdit} onkeydown={(e) => e.key === "Enter" && e.target.blur()} />
        {/if}
    </div>
{/if}

<!-- Variables Modal -->
{#if modalConfig.isOpen && modalConfig.mode === "variables"}
    <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100]">
        <div class="bg-white rounded-3xl shadow-2xl w-full max-w-xl p-8 flex flex-col">
            <div class="flex justify-between items-center mb-6">
                <h3 class="font-black text-slate-800 uppercase tracking-widest text-xs">Variables Workstation</h3>
                <button onclick={() => (modalConfig.isOpen = false)} class="border-none bg-transparent cursor-pointer text-slate-400 hover:text-slate-600"><Icon name="X" /></button>
            </div>
            <div class="grid grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto p-1">
                {#each ws.detectedVariables as v}
                    {@const config = ws.variableConfigs[v] || { type: "text" }}
                    <div class="space-y-1">
                        <label for="var-{v}" class="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">{v} <span class="text-indigo-300">({config.type})</span></label>
                        {#if config.type === "date"}
                            <input id="var-{v}" type="date" bind:value={ws.variables[v]} class="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm outline-none" />
                        {:else if config.type === "select"}
                            <select id="var-{v}" bind:value={ws.variables[v]} class="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm outline-none bg-white">
                                <option value="">Select option...</option>
                                {#each config.options || [] as option}<option value={option}>{option}</option>{/each}
                            </select>
                        {:else}
                            <input type="text" bind:value={ws.variables[v]} class="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm outline-none" />
                        {/if}
                    </div>
                {/each}
            </div>
            <button onclick={() => (modalConfig.isOpen = false)} class="mt-8 py-3 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase border-none cursor-pointer">Done</button>
        </div>
    </div>
{/if}

<ProvisionEditorModal
    bind:isOpen={isProvisionModalOpen}
    provision={editingProvisionFromSlot}
    onSave={handleSaveProvision}
/>