<script>
    import { onMount, tick } from "svelte";
    import { page } from "$app/stores";
    import { pb } from "$lib/pocketbase";
    import Icon from "$lib/components/Icon.svelte";
    import MarkdownRenderer from "$lib/components/MarkdownRenderer.svelte";
    import TopNav from "$lib/components/TopNav.svelte";
    import {
        resolveVariables,
        parseMarkdown,
        triggerSave,
        getNestedValue,
        setNestedValue,
        extractStructureMetadata,
    } from "$lib/utils/utils.js";
    import {
        generateDocx,
        generatePdf,
        generateRtf,
    } from "$lib/utils/exportUtils.js";
    import {
        user,
        activeMatter,
        viewMode,
        rawTemplate,
        snippets,
        structures,
        variables,
        variableConfigs,
        slotValues,
        disabledSlots,
        activeDocumentId,
        structureId,
        structureTitle,
        tierStyles,
        continuousNumbering,
    } from "$lib/stores/app.js";

    import ProvisionEditorModal from "$lib/components/ProvisionEditorModal.svelte";

    // ... (previous imports)

    let lastSaved = $state(null);
    let searchTerm = $state("");
    let activeTab = $state(null);
    let editingVariable = $state(null);
    let dragOverSlotId = $state(null);
    let modalConfig = $state({ isOpen: false, mode: "" });
    let loading = $state(true);
    let saveStatus = $state("idle"); // idle, saving, saved, error
    let saveTimeout = null;
    let selectedSlotId = $state(null);

    // Provision Editing Logic
    let isProvisionModalOpen = $state(false);
    let editingProvisionFromSlot = $state(null);

    let selectedCategory = $derived(() => {
        if (!selectedSlotId) return null;
        const slot = parsedTemplate().find(
            (/** @type {any} */ s) => s.id === selectedSlotId,
        );
        return slot ? slot.category : null;
    });

    onMount(async () => {
        const id = $page.params.id;
        if (id) {
            await loadDocument(id);
        }
        loading = false;
    });

    /** @param {string} id */
    async function loadDocument(id) {
        try {
            const doc = await pb
                .collection("documents")
                .getOne(id, { expand: "matter" });

            if (doc.expand?.matter) {
                activeMatter.set(doc.expand.matter);
            }

            let stateData = doc.state || doc.description;
            if (stateData) {
                let state;
                if (
                    typeof stateData === "string" &&
                    (stateData.startsWith("{") || stateData.startsWith("["))
                ) {
                    state = JSON.parse(stateData);
                } else if (typeof stateData === "object") {
                    state = stateData;
                }

                if (state) {
                    rawTemplate.set(state.rawTemplate || "");
                    structureTitle.set(state.structureTitle || doc.title);
                    structureId.set(state.structureId || null);
                    variables.set(state.variables || {});
                    slotValues.set(state.slotValues || {});
                    tierStyles.set(
                        state.tierStyles || [
                            "decimal",
                            "lower-alpha",
                            "lower-roman",
                        ],
                    );
                    continuousNumbering.set(
                        state.continuousNumbering !== undefined
                            ? state.continuousNumbering
                            : true,
                    );
                    variableConfigs.set(state.variableConfigs || {});
                }
            }
            activeDocumentId.set(doc.id);
            viewMode.set("assemble");
        } catch (err) {
            console.error("Failed to load document", err);
        }
    }

    // --- Derived Logic (Mirrored from +page.svelte) ---
    let parsedTemplate = $derived(() => {
        const lines = $rawTemplate.split("\n");
        const result = [];
        let currentStatic = [];
        const seenIds = new Map();

        lines.forEach((line) => {
            const slotMatch = line.match(/^\[\[(.*)\]\]$/);
            if (slotMatch) {
                if (currentStatic.length > 0) {
                    result.push({
                        id: `static-${result.length}`,
                        type: "static",
                        content: currentStatic.join("\n"),
                    });
                    currentStatic = [];
                }
                const parts = slotMatch[1].split("|");
                const label = parts[0] ? parts[0].trim() : "Untitled";
                const category = parts[1] ? parts[1].trim() : "General";
                const tag = parts[2] ? parts[2].trim() : null;
                const baseKey = `slot-${label}-${category}-${tag || "default"}`
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-");
                const count = seenIds.get(baseKey) || 0;
                seenIds.set(baseKey, count + 1);
                const slotId = `${baseKey}-${count}`;
                result.push({
                    id: slotId,
                    type: "slot",
                    label,
                    category,
                    tag,
                    value: $slotValues[slotId] || null,
                });
            } else {
                currentStatic.push(line);
            }
        });
        if (currentStatic.length > 0) {
            result.push({
                id: `static-${result.length}`,
                type: "static",
                content: currentStatic.join("\n"),
            });
        }
        return result;
    });

    let activeCategories = $derived(() => {
        const categories = new Set();
        parsedTemplate().forEach((item) => {
            if (item.type === "slot") categories.add(item.category);
        });
        return Array.from(categories);
    });

    let sectionListOffsets = $derived(() => {
        let currentCount = 1;
        const offsets = {};
        parsedTemplate().forEach((item) => {
            offsets[item.id] = currentCount;
            const content =
                item.type === "static"
                    ? item.content
                    : item.value?.content || "";
            const matches = content.match(/^(\d+)\. (.*$)/gm);
            if (matches && $continuousNumbering) currentCount += matches.length;
        });
        return offsets;
    });

    let detectedVariables = $derived(() => {
        const simpleVars = new Set();
        const scan = (text) => {
            if (!text) return;
            const varRegex =
                /\{([a-zA-Z0-9_-]+)(?:\|([a-zA-Z0-9_-]+))?(?:\[(.*?)\])?\}/g;
            let match;
            while ((match = varRegex.exec(text)) !== null) {
                simpleVars.add(match[1]);
            }
        };
        parsedTemplate().forEach((item) => {
            if (item.type === "static") scan(item.content);
            if (item.value) scan(item.value.content);
        });
        return Array.from(simpleVars).sort();
    });

    // --- Persistence ---
    $effect(() => {
        const state = {
            rawTemplate: $rawTemplate,
            variables: $variables,
            slotValues: $slotValues,
            tierStyles: $tierStyles,
            continuousNumbering: $continuousNumbering,
            variableConfigs: $variableConfigs,
        };
        localStorage.setItem("DOCASSEMBLE_AUTOSAVE_V1", JSON.stringify(state));
        lastSaved = new Date();

        // Trigger Cloud Autosave
        if ($activeDocumentId && !loading) {
            triggerAutosave();
        }
    });

    function triggerAutosave() {
        if (saveTimeout) clearTimeout(saveTimeout);
        saveStatus = "saving";
        saveTimeout = setTimeout(async () => {
            try {
                await saveToCloud(true);
                saveStatus = "saved";
            } catch (err) {
                saveStatus = "error";
            }
        }, 1500);
    }

    // --- Handlers ---
    function handleVariableClick(path, rect) {
        const currentVal = getNestedValue($variables, path) || "";

        // Get metadata from template
        const meta = extractStructureMetadata($rawTemplate);
        const metaConfigs = meta.variableMeta || {};

        // Try full path config, then leaf name config (from store or meta)
        const leafName = path
            .split(/[.\[\]]+/)
            .filter(Boolean)
            .pop();
        const config = $variableConfigs[path] ||
            $variableConfigs[leafName] ||
            metaConfigs[leafName] || { type: "text" };

        editingVariable = { path, value: currentVal, rect, config };
    }

    // Dismiss editor when clicking elsewhere
    onMount(() => {
        const handleGlobalClick = (e) => {
            // If we're clicking inside the editor, don't dismiss
            if (e.target.closest(".variable-editor-input")) return;

            if (editingVariable) {
                saveVariableEdit();
            }
        };
        window.addEventListener("mousedown", handleGlobalClick);
        return () => window.removeEventListener("mousedown", handleGlobalClick);
    });

    function saveVariableEdit() {
        if (!editingVariable) return;
        variables.update((v) =>
            setNestedValue(v, editingVariable.path, editingVariable.value),
        );
        editingVariable = null;
    }

    $effect(() => {
        if ($activeDocumentId && !loading) {
            // Force tracking of all relevant stores
            const _ = {
                t: $rawTemplate,
                v: $variables,
                s: $slotValues,
                ts: $tierStyles,
                cn: $continuousNumbering,
                vc: $variableConfigs,
            };
            triggerAutosave();
        }
    });

    async function handleExport(format) {
        let blob;
        const filename = `${$structureTitle || "Document"}_${Date.now()}`;
        try {
            if (format === "docx") {
                blob = await generateDocx(
                    parsedTemplate(),
                    $variables,
                    sectionListOffsets(),
                    $continuousNumbering,
                    $tierStyles,
                    $disabledSlots,
                );
                await triggerSave(
                    blob,
                    `${filename}.docx`,
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                );
            } else if (format === "pdf") {
                blob = generatePdf(
                    parsedTemplate(),
                    $variables,
                    sectionListOffsets(),
                    $continuousNumbering,
                    $tierStyles,
                    $disabledSlots,
                );
                await triggerSave(blob, `${filename}.pdf`, "application/pdf");
            }
        } catch (e) {
            console.error("Export failed", e);
        }
    }

    async function saveToCloud(isAutosave = false) {
        if (!$activeMatter || !$activeDocumentId) {
            console.warn("Missing matter or document ID, skipping cloud save");
            return false;
        }

        try {
            const state = {
                rawTemplate: $rawTemplate,
                structureId: $structureId,
                structureTitle: $structureTitle,
                variables: $variables,
                slotValues: $slotValues,
                tierStyles: $tierStyles,
                continuousNumbering: $continuousNumbering,
                variableConfigs: $variableConfigs,
            };

            const payload = {
                matter: $activeMatter.id,
                state: JSON.stringify(state),
                description: JSON.stringify(state),
            };

            await pb.collection("documents").update($activeDocumentId, payload);
            if (!isAutosave) alert("Saved!");
            return true;
        } catch (e) {
            console.error("Cloud save failed:", e);
            if (isAutosave) throw e;
            return false;
        }
    }

    async function syncVariableConfigs() {
        if (!$structureId) return;
        try {
            const template = await pb
                .collection("templates")
                .getOne($structureId);
            if (template.state) {
                const parsed = JSON.parse(template.state);
                if (parsed.variableConfigs) {
                    variableConfigs.set(parsed.variableConfigs);
                    saveToCloud(true);
                    alert("Merged latest configurations from blueprint!");
                }
            } else {
                alert("Blueprint has no stored configurations.");
            }
        } catch (e) {
            console.error("Sync failed", e);
            alert("Failed to sync with blueprint.");
        }
    }

    function onDragStart(e, snippet) {
        e.dataTransfer.setData("snippetId", snippet.id);
    }

    function onDrop(e, item) {
        e.preventDefault();
        dragOverSlotId = null;
        const snippetId = e.dataTransfer.getData("snippetId");
        const snippet = $snippets.find((s) => s.id === snippetId);
        if (snippet && snippet.category === item.category) {
            slotValues.update((prev) => ({
                ...prev,
                [item.id]: { ...snippet },
            }));
        }
    }

    // --- New Provision Handlers ---
    /** @param {string} slotId */
    function removeSlotValue(slotId) {
        slotValues.update((prev) => {
            const next = { ...prev };
            delete next[slotId];
            return next;
        });
    }

    /** @param {any} provision */
    function openEditProvisionModal(provision) {
        editingProvisionFromSlot = { ...provision };
        isProvisionModalOpen = true;
    }

    /** @param {any} updatedProvision */
    async function handleSaveProvision(updatedProvision) {
        try {
            let savedRecord = updatedProvision;

            if (updatedProvision.id) {
                // Update global library
                savedRecord = await pb
                    .collection("templates")
                    .update(updatedProvision.id, updatedProvision);
                snippets.update((s) =>
                    s.map((item) =>
                        item.id === savedRecord.id ? savedRecord : item,
                    ),
                );
            } else {
                console.warn("Editing provision without ID");
            }

            // Update local slot values that match this provision
            slotValues.update((prev) => {
                const next = { ...prev };
                Object.keys(next).forEach((key) => {
                    if (next[key].id === savedRecord.id) {
                        next[key] = { ...savedRecord };
                    }
                });
                return next;
            });

            isProvisionModalOpen = false;
        } catch (err) {
            console.error("Failed to save provision", err);
            alert("Failed to update provision.");
        }
    }

    /** @param {string} id */
    function selectSlot(id) {
        selectedSlotId = id;
    }
</script>

<div class="h-screen flex flex-col bg-slate-50 overflow-hidden">
    <TopNav />

    {#if loading}
        <div class="flex-1 flex items-center justify-center">
            <p class="text-slate-400 font-bold animate-pulse">
                Loading workspace...
            </p>
        </div>
    {:else}
        <!-- Toolbar -->
        <div
            class="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-40 relative"
        >
            <div class="flex items-center gap-4">
                <div
                    class="flex bg-slate-100 p-1 rounded-lg border border-slate-200/50"
                >
                    {#each ["assemble", "preview"] as m}
                        <button
                            onclick={() => viewMode.set(m)}
                            class={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${$viewMode === m ? "bg-white text-indigo-600 shadow-sm border border-slate-100" : "text-slate-400 hover:text-slate-600"}`}
                        >
                            {m}
                        </button>
                    {/each}
                </div>
                <button
                    onclick={() =>
                        (modalConfig = { isOpen: true, mode: "variables" })}
                    class="px-4 py-2 bg-white border border-slate-200 rounded-lg text-[10px] font-black uppercase text-slate-600 shadow-sm flex items-center gap-2 hover:bg-slate-50 transition-all border-none cursor-pointer"
                >
                    <Icon name="Database" size={14} class="text-indigo-500" /> Variables
                </button>
            </div>

            <div class="flex items-center gap-3">
                <div class="flex items-center gap-2 mr-4">
                    {#if saveStatus === "saving"}
                        <Icon
                            name="Loader2"
                            size={14}
                            class="text-indigo-500 animate-spin"
                        />
                        <span
                            class="text-[10px] uppercase font-black text-indigo-500 tracking-widest"
                            >Saving...</span
                        >
                    {:else if saveStatus === "saved"}
                        <Icon name="Check" size={14} class="text-emerald-500" />
                        <span
                            class="text-[10px] uppercase font-black text-emerald-500 tracking-widest"
                            >Saved</span
                        >
                    {:else if saveStatus === "error"}
                        <Icon
                            name="AlertCircle"
                            size={14}
                            class="text-red-500"
                        />
                        <span
                            class="text-[10px] uppercase font-black text-red-500 tracking-widest"
                            >Save Failed</span
                        >
                    {:else if lastSaved}
                        <span
                            class="text-[10px] uppercase font-bold text-slate-300"
                        >
                            Last Sync {lastSaved.toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                            })}
                        </span>
                    {/if}
                </div>

                <button
                    onclick={() => handleExport("docx")}
                    class="px-4 py-2 bg-white border border-slate-200 rounded-lg text-[10px] font-black uppercase text-slate-600 border-none cursor-pointer hover:bg-slate-50 transition-all font-sans"
                    >DOCX</button
                >
                <button
                    onclick={() => handleExport("pdf")}
                    class="px-4 py-2 bg-white border border-slate-200 rounded-lg text-[10px] font-black uppercase text-slate-600 border-none cursor-pointer hover:bg-slate-50 transition-all font-sans"
                    >PDF</button
                >
            </div>
        </div>

        <div class="flex-1 flex overflow-hidden">
            {#if $viewMode === "assemble"}
                <aside
                    class="w-80 border-r border-slate-200 bg-white flex flex-col shrink-0 shadow-sm overflow-hidden z-10"
                >
                    <div class="p-4 border-b border-slate-100 bg-slate-50/50">
                        <h2
                            class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2"
                        >
                            Provisions Library
                        </h2>
                        {#if selectedCategory()}
                            <div
                                class="flex items-center gap-2 mb-3 bg-indigo-50 px-3 py-2 rounded-lg border border-indigo-100"
                            >
                                <Icon
                                    name="Filter"
                                    size={12}
                                    class="text-indigo-600"
                                />
                                <span
                                    class="text-[10px] font-black text-indigo-700 uppercase tracking-wider"
                                    >{selectedCategory()}</span
                                >
                                <button
                                    onclick={() => (selectedSlotId = null)}
                                    class="ml-auto p-1 hover:bg-indigo-100 rounded transition-colors border-none bg-transparent cursor-pointer"
                                    title="Show all categories"
                                >
                                    <Icon
                                        name="X"
                                        size={10}
                                        class="text-indigo-400"
                                    />
                                </button>
                            </div>
                        {/if}
                        <input
                            type="text"
                            bind:value={searchTerm}
                            placeholder="Search..."
                            class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold outline-none"
                        />
                    </div>
                    <div
                        class="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar"
                    >
                        {#if !selectedCategory() && $snippets.length > 0}
                            <div class="text-center py-12 px-6">
                                <div
                                    class="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-200"
                                >
                                    <Icon name="MousePointer2" size={24} />
                                </div>
                                <p
                                    class="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-loose"
                                >
                                    Select a slot in the document to see
                                    relevant provisions
                                </p>
                            </div>
                        {:else}
                            {#each activeCategories().filter((cat) => !selectedCategory() || cat === selectedCategory()) as cat}
                                <div class="mb-4">
                                    <h3
                                        class="text-[9px] font-black text-slate-300 uppercase mb-2"
                                    >
                                        {cat}
                                    </h3>
                                    <div class="space-y-2">
                                        {#each $snippets.filter((s) => s.category === cat && (!searchTerm || s.title
                                                        .toLowerCase()
                                                        .includes(searchTerm.toLowerCase()))) as snippet}
                                            <div
                                                role="listitem"
                                                draggable="true"
                                                ondragstart={(e) =>
                                                    onDragStart(e, snippet)}
                                                class="bg-white border border-slate-200 rounded-lg p-3 hover:border-indigo-400 hover:shadow-md cursor-grab text-[11px] font-bold text-slate-700 transition-all font-sans"
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

            <section
                class="flex-1 overflow-y-auto p-12 bg-slate-50/50 scroll-smooth custom-scrollbar"
            >
                <div
                    class={`mx-auto bg-white shadow-2xl min-h-[1056px] w-full max-w-[816px] p-16 lg:p-24 border border-slate-200 transition-all duration-500 ${$viewMode === "preview" ? "rounded-none shadow-xl" : "rounded-2xl"}`}
                >
                    <div class="space-y-2">
                        {#each parsedTemplate() as item}
                            {@const offset = sectionListOffsets()[item.id] || 1}
                            {#if item.type === "static"}
                                <MarkdownRenderer
                                    content={item.content}
                                    variables={$variables}
                                    startOffset={offset}
                                    continuous={$continuousNumbering}
                                    tierStyles={$tierStyles}
                                    onVariableClick={handleVariableClick}
                                />
                            {:else}
                                <div
                                    role="button"
                                    tabindex="0"
                                    onclick={() => selectSlot(item.id)}
                                    onkeydown={(e) =>
                                        e.key === "Enter" &&
                                        selectSlot(item.id)}
                                    ondragover={(e) => {
                                        e.preventDefault();
                                        dragOverSlotId = item.id;
                                    }}
                                    ondragleave={() => (dragOverSlotId = null)}
                                    ondrop={(e) => onDrop(e, item)}
                                    class={`relative group min-h-[40px] rounded-2xl transition-all border-2 flex flex-col items-center justify-center mb-4 cursor-pointer ${item.value ? (selectedSlotId === item.id ? "bg-indigo-50 border-indigo-200 shadow-sm" : "border-transparent bg-indigo-50/30") : selectedSlotId === item.id ? "border-indigo-300 bg-indigo-50/50" : "border-dashed border-slate-200 bg-slate-50/50"} ${dragOverSlotId === item.id ? "ring-2 ring-indigo-500" : ""}`}
                                >
                                    {#if !item.value}
                                        <div
                                            class="py-6 text-center text-slate-300"
                                        >
                                            <Icon
                                                name="PlusCircle"
                                                size={20}
                                                class="mx-auto mb-2 opacity-30"
                                            />
                                            <span
                                                class="text-[10px] font-black uppercase tracking-widest"
                                                >{item.label}</span
                                            >
                                        </div>
                                    {:else}
                                        <div class="w-full p-2 relative">
                                            <div
                                                class="absolute -top-5 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none group-hover:pointer-events-auto"
                                            >
                                                <button
                                                    onclick={(e) => {
                                                        e.stopPropagation();
                                                        openEditProvisionModal(
                                                            item.value,
                                                        );
                                                    }}
                                                    title="Edit Provision"
                                                    class="p-1.5 bg-white text-indigo-600 rounded-full shadow-sm hover:bg-indigo-50 border border-indigo-100 cursor-pointer"
                                                >
                                                    <Icon
                                                        name="Edit3"
                                                        size={12}
                                                    />
                                                </button>
                                                <button
                                                    onclick={(e) => {
                                                        e.stopPropagation();
                                                        removeSlotValue(
                                                            item.id,
                                                        );
                                                    }}
                                                    title="Remove Provision"
                                                    class="p-1.5 bg-white text-rose-500 rounded-full shadow-sm hover:bg-rose-50 border border-rose-100 cursor-pointer"
                                                >
                                                    <Icon name="X" size={12} />
                                                </button>
                                            </div>
                                            <MarkdownRenderer
                                                content={item.value.content}
                                                variables={$variables}
                                                startOffset={offset}
                                                continuous={$continuousNumbering}
                                                tierStyles={$tierStyles}
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
    {/if}
</div>

{#if editingVariable}
    <div
        style="position: fixed; top: {editingVariable.rect
            .top}px; left: {editingVariable.rect.left}px; z-index: 100"
    >
        {#if editingVariable.config?.type === "date"}
            <input
                type="date"
                class="variable-editor-input px-2 py-0.5 rounded font-bold border-2 border-indigo-500 bg-white shadow-xl outline-none"
                bind:value={editingVariable.value}
                onblur={saveVariableEdit}
                onkeydown={(e) => e.key === "Enter" && e.target.blur()}
            />
        {:else if editingVariable.config?.type === "select"}
            <select
                class="variable-editor-input px-2 py-0.5 pr-8 rounded font-bold border-2 border-indigo-500 bg-white shadow-xl outline-none"
                bind:value={editingVariable.value}
                onchange={saveVariableEdit}
            >
                <option value="">Select...</option>
                {#each editingVariable.config.options || [] as option}
                    <option value={option}>{option}</option>
                {/each}
            </select>
        {:else}
            <input
                type="text"
                class="variable-editor-input px-2 py-0.5 rounded font-bold border-2 border-indigo-500 bg-white shadow-xl outline-none"
                bind:value={editingVariable.value}
                onblur={saveVariableEdit}
                onkeydown={(e) => e.key === "Enter" && e.target.blur()}
            />
        {/if}
    </div>
{/if}

{#if modalConfig.isOpen && modalConfig.mode === "variables"}
    <div
        class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100]"
    >
        <div
            class="bg-white rounded-3xl shadow-2xl w-full max-w-xl p-8 flex flex-col"
        >
            <div class="flex justify-between items-center mb-6">
                <div class="flex items-center gap-4">
                    <h3
                        class="font-black text-slate-800 uppercase tracking-widest text-xs"
                    >
                        Variables Workstation
                    </h3>
                    <button
                        onclick={syncVariableConfigs}
                        class="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg transition-all border border-indigo-100 cursor-pointer text-[9px] font-black uppercase tracking-widest"
                        title="Pull latest types and dropdown options from the original blueprint"
                    >
                        <Icon name="RefreshCw" size={10} /> Sync with Blueprint
                    </button>
                </div>
                <button
                    onclick={() => (modalConfig.isOpen = false)}
                    class="border-none bg-transparent cursor-pointer text-slate-400 hover:text-slate-600"
                    ><Icon name="X" /></button
                >
            </div>
            <div
                class="grid grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto p-1"
            >
                {#each detectedVariables() as v}
                    {@const config = $variableConfigs[v] || { type: "text" }}
                    <div class="space-y-1">
                        <label
                            for="var-{v}"
                            class="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1"
                            >{v}
                            <span class="text-indigo-300">({config.type})</span
                            ></label
                        >
                        {#if config.type === "date"}
                            <input
                                id="var-{v}"
                                type="date"
                                bind:value={$variables[v]}
                                class="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                            />
                        {:else if config.type === "select"}
                            <select
                                id="var-{v}"
                                bind:value={$variables[v]}
                                class="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white"
                            >
                                <option value="">Select option...</option>
                                {#each config.options || [] as option}
                                    <option value={option}>{option}</option>
                                {/each}
                            </select>
                        {:else}
                            <input
                                type="text"
                                bind:value={$variables[v]}
                                class="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                            />
                        {/if}
                    </div>
                {/each}
            </div>
            <button
                onclick={() => (modalConfig.isOpen = false)}
                class="mt-8 py-3 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase border-none cursor-pointer"
                >Done</button
            >
        </div>
    </div>
{/if}

<ProvisionEditorModal
    bind:isOpen={isProvisionModalOpen}
    provision={editingProvisionFromSlot}
    onSave={handleSaveProvision}
/>
