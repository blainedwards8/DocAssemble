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

    let lastSaved = $state(null);
    let searchTerm = $state("");
    let activeTab = $state(null);
    let editingVariable = $state(null);
    let dragOverSlotId = $state(null);
    let modalConfig = $state({ isOpen: false, mode: "" });
    let loading = $state(true);

    onMount(async () => {
        const id = $page.params.id;
        if (id) {
            await loadDocument(id);
        }
        loading = false;
    });

    async function loadDocument(id) {
        try {
            const doc = await pb.collection("documents").getOne(id);
            const stateData = doc.state || doc.description;
            if (
                stateData &&
                (stateData.startsWith("{") || stateData.startsWith("["))
            ) {
                const state = JSON.parse(stateData);
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
                activeDocumentId.set(doc.id);
                viewMode.set("assemble");
            }
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
                const parts = slotMatch[1].split("|");
                if (parts.length >= 2) {
                    if (currentStatic.length > 0) {
                        result.push({
                            id: `static-${result.length}`,
                            type: "static",
                            content: currentStatic.join("\n"),
                        });
                        currentStatic = [];
                    }
                    const label = parts[0].trim();
                    const category = parts[1].trim();
                    const tag = parts[2] ? parts[2].trim() : null;
                    const baseKey =
                        `slot-${label}-${category}-${tag || "default"}`
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
                } else currentStatic.push(line);
            } else currentStatic.push(line);
        });
        if (currentStatic.length > 0)
            result.push({
                id: `static-${result.length}`,
                type: "static",
                content: currentStatic.join("\n"),
            });
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
    });

    // --- Handlers ---
    function handleVariableClick(path, rect) {
        const currentVal = getNestedValue($variables, path) || "";
        editingVariable = { path, value: currentVal, rect };
    }

    function saveVariableEdit() {
        if (!editingVariable) return;
        variables.update((v) =>
            setNestedValue(v, editingVariable.path, editingVariable.value),
        );
        editingVariable = null;
    }

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

    async function saveToCloud() {
        if (!$activeMatter) return alert("Select a Matter first.");
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
            const formData = new FormData();
            formData.append("matter", $activeMatter.id);
            formData.append("state", JSON.stringify(state));
            formData.append("description", JSON.stringify(state));

            if ($activeDocumentId) {
                await pb
                    .collection("documents")
                    .update($activeDocumentId, formData);
                alert("Saved!");
            }
        } catch (e) {
            console.error(e);
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
                {#if lastSaved}
                    <span
                        class="text-[10px] uppercase font-bold text-slate-300 mr-4"
                    >
                        Last Saved {lastSaved.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                        })}
                    </span>
                {/if}
                <button
                    onclick={() => handleExport("docx")}
                    class="px-4 py-2 bg-white border border-slate-200 rounded-lg text-[10px] font-black uppercase text-slate-600 border-none cursor-pointer"
                    >DOCX</button
                >
                <button
                    onclick={() => handleExport("pdf")}
                    class="px-4 py-2 bg-white border border-slate-200 rounded-lg text-[10px] font-black uppercase text-slate-600 border-none cursor-pointer"
                    >PDF</button
                >
                <button
                    onclick={saveToCloud}
                    class="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg border-none cursor-pointer"
                    >Save to Matter</button
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
                        {#each activeCategories() as cat}
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
                                            draggable="true"
                                            ondragstart={(e) =>
                                                onDragStart(e, snippet)}
                                            class="bg-white border border-slate-200 rounded-lg p-3 hover:border-indigo-400 hover:shadow-md cursor-grab text-[11px] font-bold text-slate-700 transition-all"
                                        >
                                            {snippet.title}
                                        </div>
                                    {/each}
                                </div>
                            </div>
                        {/each}
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
                                    ondragover={(e) => {
                                        e.preventDefault();
                                        dragOverSlotId = item.id;
                                    }}
                                    ondragleave={() => (dragOverSlotId = null)}
                                    ondrop={(e) => onDrop(e, item)}
                                    class={`relative min-h-[40px] rounded-2xl transition-all border-2 flex flex-col items-center justify-center mb-4 cursor-pointer ${item.value ? "border-transparent bg-indigo-50/30 border-indigo-100" : "border-dashed border-slate-200 bg-slate-50/50"} ${dragOverSlotId === item.id ? "ring-2 ring-indigo-500" : ""}`}
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
                                        <div class="w-full p-2">
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
        <input
            autofocus
            class="px-2 py-0.5 rounded font-bold border-2 border-indigo-500 bg-white shadow-xl outline-none"
            bind:value={editingVariable.value}
            onblur={saveVariableEdit}
            onkeydown={(e) => e.key === "Enter" && e.target.blur()}
        />
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
                <h3
                    class="font-black text-slate-800 uppercase tracking-widest text-xs"
                >
                    Variables Workstation
                </h3>
                <button
                    onclick={() => (modalConfig.isOpen = false)}
                    class="border-none bg-transparent cursor-pointer"
                    ><Icon name="X" /></button
                >
            </div>
            <div
                class="grid grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto p-1"
            >
                {#each detectedVariables() as v}
                    <div class="space-y-1">
                        <label
                            class="text-[9px] font-black text-slate-400 uppercase tracking-widest"
                            >{v}</label
                        >
                        <input
                            type="text"
                            bind:value={$variables[v]}
                            class="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
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
