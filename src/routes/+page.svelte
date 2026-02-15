<script>
    import { onMount, tick } from "svelte";
    import { pb } from "$lib/pocketbase";
    import Login from "$lib/components/Login.svelte";
    import Icon from "$lib/components/Icon.svelte";
    import MarkdownRenderer from "$lib/components/MarkdownRenderer.svelte";
    import MattersDashboard from "$lib/components/MattersDashboard.svelte";
    import StructuresDashboard from "$lib/components/StructuresDashboard.svelte";
    import StructureEditor from "$lib/components/StructureEditor.svelte";
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
        INITIAL_SNIPPETS,
        INITIAL_RAW_TEMPLATE,
    } from "$lib/utils/constants.js";
    import {
        user,
        matters,
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
    let editingStructure = $state(null);
    let postLoadAction = $state(null);
    let modalConfig = $state({
        isOpen: false,
        mode: "create",
        targetId: null,
        title: "",
        content: "",
        category: null,
        tag: "",
    });
    let editingVariable = $state(null);
    let dragOverSlotId = $state(null);

    let fileInput;
    let libraryInput;
    let structureInput;

    onMount(() => {
        // Sync user state from PB AuthStore
        if (pb.authStore.isValid) {
            user.set(pb.authStore.record);
        }

        const unsubscribe = pb.authStore.onChange((token, model) => {
            user.set(model);
        });

        loadPersistedState();

        return () => {
            unsubscribe();
        };
    });

    function loadPersistedState() {
        try {
            const item = localStorage.getItem("DOCASSEMBLE_AUTOSAVE_V1");
            if (item) {
                const data = JSON.parse(item);
                if (data.rawTemplate) rawTemplate.set(data.rawTemplate);
                if (data.variables) variables.set(data.variables);
                if (data.slotValues) slotValues.set(data.slotValues);
                if (data.tierStyles) tierStyles.set(data.tierStyles);
                if (data.continuousNumbering !== undefined)
                    continuousNumbering.set(data.continuousNumbering);
                if (data.variableConfigs)
                    variableConfigs.set(data.variableConfigs);
            }
        } catch (e) {
            console.error("Failed to load autosave", e);
        }
    }

    $effect(() => {
        if ($user) {
            loadData();
        }
    });

    /** @param {boolean} [silent] */
    async function loadData(silent = false) {
        try {
            const templatesRecs = await pb
                .collection("templates")
                .getFullList({ sort: "title" });
            if (templatesRecs.length > 0) {
                const allItems = templatesRecs.map((t) => ({
                    id: t.id,
                    category: t.category,
                    title: t.title,
                    content: t.content,
                    state: t.state || t.description,
                    tag: Array.isArray(t.tags) ? t.tags[0] || "" : t.tags || "",
                }));

                structures.set(
                    allItems.filter((i) => i.category === "Structure"),
                );
                snippets.set(
                    allItems.filter((i) => i.category !== "Structure"),
                );
            }

            const matterList = await pb
                .collection("matters")
                .getFullList({ sort: "-created" });
            matters.set(matterList);
        } catch (err) {
            console.error("Error loading PB data", err);
        }
    }

    // --- Derived Logic ---
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

    $effect(() => {
        const cats = activeCategories();
        if (!activeTab && cats.length > 0) activeTab = cats[0];
        else if (activeTab && !cats.includes(activeTab))
            activeTab = cats[0] || null;
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
        const variableMetaMap = {};
        const loopsMap = new Map();
        const scan = (text) => {
            if (!text) return;
            const loopRegex =
                /\{#foreach\s+([a-zA-Z0-9_-]+)\}([\s\S]*?)\{\/foreach\}/g;
            let match;
            while ((match = loopRegex.exec(text)) !== null) {
                const key = match[1];
                const subContent = match[2];
                if (!loopsMap.has(key)) loopsMap.set(key, new Set());
                const subMatchRegex =
                    /\{([a-zA-Z0-9_-]+)(?:\|([a-zA-Z0-9_-]+))?(?:\[(.*?)\])?\}/g;
                let subMatch;
                while ((subMatch = subMatchRegex.exec(subContent)) !== null) {
                    const vName = subMatch[1];
                    const vType = subMatch[2];
                    const vOpts = subMatch[3];
                    loopsMap.get(key).add(vName);
                    if (vType || vOpts) {
                        variableMetaMap[vName] = {
                            type: vType || (vOpts ? "select" : "text"),
                            options: vOpts
                                ? vOpts.split(",").map((o) => o.trim())
                                : undefined,
                        };
                    }
                }
            }
            const cleanText = text.replace(loopRegex, "");
            const varRegex =
                /\{([a-zA-Z0-9_-]+)(?:\|([a-zA-Z0-9_-]+))?(?:\[(.*?)\])?\}/g;
            while ((match = varRegex.exec(cleanText)) !== null) {
                const vName = match[1];
                const vType = match[2];
                const vOpts = match[3];
                simpleVars.add(vName);
                if (vType || vOpts) {
                    variableMetaMap[vName] = {
                        type: vType || (vOpts ? "select" : "text"),
                        options: vOpts
                            ? vOpts.split(",").map((o) => o.trim())
                            : undefined,
                    };
                }
            }
        };
        parsedTemplate().forEach((item) => {
            scan(item.content);
            if (item.value) scan(item.value.content);
        });
        return {
            simple: Array.from(simpleVars).sort(),
            variableMeta: variableMetaMap,
            loops: Array.from(loopsMap.entries()).map(([name, fields]) => ({
                name,
                fields: Array.from(fields).sort(),
            })),
        };
    });

    // Auto-sync variable configs
    $effect(() => {
        const meta = detectedVariables().variableMeta;
        if (Object.keys(meta).length > 0) {
            variableConfigs.update((prev) => {
                const next = { ...prev };
                let changed = false;
                Object.entries(meta).forEach(([name, m]) => {
                    if (
                        !next[name] ||
                        next[name].type !== m.type ||
                        JSON.stringify(next[name].options) !==
                            JSON.stringify(m.options)
                    ) {
                        next[name] = m;
                        changed = true;
                    }
                });
                return changed ? next : prev;
            });
        }
    });

    // Persistence Effect
    $effect(() => {
        const state = {
            rawTemplate: $rawTemplate,
            variables: $variables,
            tierStyles: $tierStyles,
            continuousNumbering: $continuousNumbering,
            slotValues: $slotValues,
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

    function saveVariableEdit(e) {
        if (!editingVariable) return;
        variables.update((v) =>
            setNestedValue(v, editingVariable.path, editingVariable.value),
        );
        editingVariable = null;
    }

    async function handleExport(format) {
        let blob;
        const filename = `Document_${Date.now()}`;
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
            } else if (format === "rtf") {
                blob = generateRtf(
                    parsedTemplate(),
                    $variables,
                    sectionListOffsets(),
                    $continuousNumbering,
                    $tierStyles,
                    $disabledSlots,
                );
                await triggerSave(blob, `${filename}.rtf`, "application/rtf");
            }
        } catch (e) {
            console.error("Export failed", e);
            alert("Export failed: " + e.message);
        }
    }

    async function saveDocumentToCloud() {
        if (!$activeMatter) {
            alert("Please select a Matter first.");
            return;
        }

        try {
            const filename = `Generated_${Date.now()}.pdf`;
            const blob = generatePdf(
                parsedTemplate(),
                $variables,
                sectionListOffsets(),
                $continuousNumbering,
                $tierStyles,
                $disabledSlots,
            );

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
            if (!$activeDocumentId) {
                const name = prompt(
                    "Enter Document Name:",
                    $structureTitle || "New Document",
                );
                if (!name) return;
                formData.append("title", name);
            }

            formData.append("matter", $activeMatter.id);
            formData.append("file", blob, filename);
            const jsonState = JSON.stringify(state);
            formData.append("description", jsonState);
            formData.append("state", jsonState);

            if ($activeDocumentId) {
                await pb
                    .collection("documents")
                    .update($activeDocumentId, formData);
                alert("Document updated successfully!");
            } else {
                const rec = await pb.collection("documents").create(formData);
                activeDocumentId.set(rec.id);
                alert("Document created and saved to Matter!");
            }
        } catch (e) {
            console.error("Cloud Save Failed", e);
            alert("Failed to save to cloud: " + e.message);
        }
    }

    async function createMatter(data) {
        try {
            const record = await pb.collection("matters").create(data);
            matters.update((prev) => [record, ...prev]);
        } catch (err) {
            console.error("Failed to create matter:", err);
            alert("Failed to create matter.");
        }
    }

    function openDocument(doc, action = "edit") {
        try {
            let state = {};
            const sourceData = doc.state || doc.description;

            if (
                sourceData &&
                (sourceData.startsWith("{") || sourceData.startsWith("["))
            ) {
                state = JSON.parse(sourceData);
            } else {
                alert(`This document cannot be edited. Source missing.`);
                if (doc.file) {
                    const url = pb.files.getUrl(doc, doc.file);
                    window.open(url, "_blank");
                }
                return;
            }

            rawTemplate.set(state.rawTemplate || "");
            structureTitle.set(state.structureTitle || doc.title);
            structureId.set(state.structureId || null);
            variables.set(state.variables || {});
            slotValues.set(state.slotValues || {});
            tierStyles.set(
                state.tierStyles || ["decimal", "lower-alpha", "lower-roman"],
            );
            continuousNumbering.set(
                state.continuousNumbering !== undefined
                    ? state.continuousNumbering
                    : true,
            );
            variableConfigs.set(state.variableConfigs || {});

            activeDocumentId.set(doc.id);
            postLoadAction = action;
            viewMode.set("assemble");
        } catch (err) {
            console.error("Failed to load document:", err);
        }
    }

    function loadStructure(structure) {
        if (confirm("Load this structure? Unsaved progress will be lost.")) {
            rawTemplate.set(structure.content);
            structureTitle.set(structure.title);
            structureId.set(structure.id);
            activeDocumentId.set(null);
            postLoadAction = null;
            viewMode.set("assemble");
            slotValues.set({});
            variables.set({});

            let configs = {};
            if (
                structure.state &&
                (structure.state.startsWith("{") ||
                    structure.state.startsWith("["))
            ) {
                try {
                    const state = JSON.parse(structure.state);
                    configs = state.variableConfigs || {};
                } catch (e) {
                    console.error(e);
                }
            }
            variableConfigs.set(configs);
        }
    }

    // Effect for post-load actions
    $effect(() => {
        if (postLoadAction && postLoadAction !== "edit" && $rawTemplate) {
            const runner = async () => {
                await tick();
                if (postLoadAction === "pdf") handleExport("pdf");
                else if (postLoadAction === "docx") handleExport("docx");
                else if (postLoadAction === "rtf") handleExport("rtf");
                else if (postLoadAction === "copy") copyToClipboard();
                postLoadAction = null;
            };
            runner();
        }
    });

    function copyToClipboard() {
        const hiddenDiv = document.createElement("div");
        hiddenDiv.style.position = "absolute";
        hiddenDiv.style.left = "-9999px";
        hiddenDiv.style.fontFamily = "'Times New Roman', serif";
        hiddenDiv.style.color = "black";

        const html = parsedTemplate()
            .map((item) => {
                if ($disabledSlots.has(item.id)) return "";
                const raw =
                    item.type === "static"
                        ? item.content
                        : item.value
                          ? item.value.content
                          : `[Missing: ${item.label}]`;
                const offset = sectionListOffsets()[item.id] || 1;
                const resolved = resolveVariables(raw, $variables, true);
                return `<div style="margin-bottom: 12pt;">${parseMarkdown(resolved, offset, $continuousNumbering, $tierStyles)}</div>`;
            })
            .join("");

        hiddenDiv.innerHTML = html;
        document.body.appendChild(hiddenDiv);
        const range = document.createRange();
        range.selectNodeContents(hiddenDiv);
        const selection = window.getSelection();
        if (selection) {
            selection.removeAllRanges();
            selection.addRange(range);
            document.execCommand("copy");
            selection.removeAllRanges();
        }
        document.body.removeChild(hiddenDiv);
    }

    function onDragStart(e, snippet) {
        e.dataTransfer.setData("snippetId", snippet.id);
        e.dataTransfer.effectAllowed = "copy";
    }

    function onDrop(e, item) {
        e.preventDefault();
        dragOverSlotId = null;
        const snippetId = e.dataTransfer.getData("snippetId");
        const snippet = $snippets.find((s) => s.id === snippetId);

        if (
            snippet &&
            snippet.category === item.category &&
            (snippet.tag || null) === (item.tag || null)
        ) {
            slotValues.update((prev) => ({
                ...prev,
                [item.id]: { ...snippet },
            }));
        }
    }

    async function handleSaveClause(e) {
        e.preventDefault();
        const { mode, targetId, title, content, category, tag } = modalConfig;
        const finalTag = tag ? tag.trim() : null;
        modalConfig.isOpen = false;

        try {
            const payload = {
                title,
                content,
                category,
                tags: finalTag ? [finalTag] : [],
            };

            if (mode === "create") {
                const rec = await pb.collection("templates").create(payload);
                snippets.update((prev) => [
                    ...prev,
                    { id: rec.id, category, title, content, tag: finalTag },
                ]);
            } else if (mode === "edit-library") {
                if (targetId.length === 15) {
                    await pb.collection("templates").update(targetId, payload);
                } else {
                    const rec = await pb
                        .collection("templates")
                        .create(payload);
                    snippets.update((prev) =>
                        prev.map((s) =>
                            s.id === targetId
                                ? {
                                      ...s,
                                      id: rec.id,
                                      title,
                                      content,
                                      tag: finalTag,
                                  }
                                : s,
                        ),
                    );
                    return;
                }
                snippets.update((prev) =>
                    prev.map((s) =>
                        s.id === targetId
                            ? { ...s, title, content, tag: finalTag }
                            : s,
                    ),
                );
            } else if (mode === "edit-instance") {
                slotValues.update((prev) => ({
                    ...prev,
                    [targetId]: { ...prev[targetId], content },
                }));
            }
        } catch (err) {
            console.error(err);
        }
    }

    function renderVariableInput(v, value, onChange) {
        const config = $variableConfigs[v] || { type: "text" };
        if (config.type === "date") return "date";
        if (config.type === "select" && config.options) return "select";
        return "text";
    }
</script>

{#if !$user}
    <Login onLogin={() => loadData()} />
{:else}
    <div
        class="flex flex-col h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden select-none"
    >
        <TopNav
            onNavigate={(v) => viewMode.set(v)}
            onLogout={() => user.set(null)}
        />

        <main class="flex-1 flex flex-col overflow-hidden">
            {#if $viewMode === "dashboard"}
                <MattersDashboard
                    onOpenDocument={openDocument}
                    onNewDocument={() =>
                        (modalConfig = {
                            ...modalConfig,
                            isOpen: true,
                            mode: "select-template",
                        })}
                    onCreateMatter={createMatter}
                />
            {:else if $viewMode === "structures-dashboard"}
                <StructuresDashboard
                    onEditStructure={(s) => {
                        editingStructure = s;
                        viewMode.set("structure-editor");
                    }}
                    onCreateStructure={() => {
                        editingStructure = null;
                        viewMode.set("structure-editor");
                    }}
                />
            {:else if $viewMode === "structure-editor"}
                <StructureEditor
                    initialStructure={editingStructure}
                    snippets={$snippets}
                    onUpdateSnippets={(s) => snippets.set(s)}
                    onBack={() => {
                        if ($activeDocumentId) viewMode.set("assemble");
                        else viewMode.set("structures-dashboard");
                    }}
                    onSave={(newRec) => {
                        if (!$activeDocumentId) loadData(true);
                        editingStructure = newRec;
                    }}
                    activeDocumentId={$activeDocumentId}
                    variables={$variables}
                    slotValues={$slotValues}
                    tierStyles={$tierStyles}
                    continuousNumbering={$continuousNumbering}
                    onContentChange={(val) => rawTemplate.set(val)}
                    onTitleChange={(val) => structureTitle.set(val)}
                    variableConfigs={$variableConfigs}
                    onUpdateVariableConfigs={(c) => variableConfigs.set(c)}
                />
            {:else if $viewMode === "assemble" || $viewMode === "preview"}
                <div class="flex-1 flex flex-col overflow-hidden">
                    <!-- Secondary Toolbar -->
                    <div
                        class="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-40 relative"
                    >
                        <div class="flex items-center gap-4">
                            <div
                                class="flex bg-slate-100 p-1 rounded-lg border border-slate-200/50"
                            >
                                {#each ["blueprint", "assemble", "preview"] as m}
                                    <button
                                        onclick={() =>
                                            viewMode.set(
                                                m === "blueprint"
                                                    ? "structure-editor"
                                                    : m,
                                            )}
                                        class={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${($viewMode === "structure-editor" && m === "blueprint") || $viewMode === m ? "bg-white text-indigo-600 shadow-sm border border-slate-100" : "text-slate-400 hover:text-slate-600"}`}
                                    >
                                        {m}
                                    </button>
                                {/each}
                            </div>
                            <button
                                onclick={() =>
                                    (modalConfig = {
                                        ...modalConfig,
                                        isOpen: true,
                                        mode: "variables",
                                        title: "Data Workstation",
                                    })}
                                class="px-4 py-2 bg-white border border-slate-200 rounded-lg text-[10px] font-black uppercase text-slate-600 shadow-sm flex items-center gap-2 hover:bg-slate-50 transition-all border-none cursor-pointer"
                            >
                                <Icon
                                    name="Database"
                                    size={14}
                                    class="text-indigo-500"
                                /> Variables
                            </button>
                        </div>

                        <div class="flex items-center gap-3">
                            {#if lastSaved}
                                <span
                                    class="text-[10px] uppercase font-bold text-slate-300 mr-4"
                                >
                                    Last Saved {lastSaved.toLocaleTimeString(
                                        [],
                                        { hour: "2-digit", minute: "2-digit" },
                                    )}
                                </span>
                            {/if}

                            <div class="relative group inline-block">
                                <button
                                    class="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-indigo-100 active:scale-95 transition-all flex items-center gap-2 border-none cursor-pointer"
                                >
                                    Export <Icon name="ChevronDown" size={12} />
                                </button>
                                <div
                                    class="absolute top-full right-0 pt-2 hidden group-hover:block z-50"
                                >
                                    <div
                                        class="w-48 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-top-2"
                                    >
                                        <button
                                            onclick={copyToClipboard}
                                            class="w-full text-left px-4 py-3 hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center gap-2 border-none bg-transparent cursor-pointer"
                                        >
                                            <Icon
                                                name="Copy"
                                                size={14}
                                                class="text-slate-400"
                                            /> Copy Text
                                        </button>
                                        <button
                                            onclick={() => handleExport("docx")}
                                            class="w-full text-left px-4 py-3 hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center gap-2 border-none bg-transparent cursor-pointer"
                                        >
                                            <Icon
                                                name="FileText"
                                                size={14}
                                                class="text-blue-500"
                                            /> DOCX
                                        </button>
                                        <button
                                            onclick={() => handleExport("pdf")}
                                            class="w-full text-left px-4 py-3 hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center gap-2 border-none bg-transparent cursor-pointer"
                                        >
                                            <Icon
                                                name="File"
                                                size={14}
                                                class="text-red-500"
                                            /> PDF
                                        </button>
                                        <button
                                            onclick={saveDocumentToCloud}
                                            class={`w-full text-left px-4 py-3 hover:bg-slate-50 text-xs font-bold flex items-center gap-2 border-none bg-transparent cursor-pointer ${$activeMatter ? "text-indigo-600" : "text-slate-300"}`}
                                        >
                                            <Icon name="Cloud" size={14} /> Save
                                            to Matter
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="flex-1 flex overflow-hidden">
                        {#if $viewMode === "assemble"}
                            <aside
                                class="w-80 border-r border-slate-200 bg-white flex flex-col shrink-0 shadow-sm overflow-hidden z-10"
                            >
                                <div
                                    class="p-4 border-b border-slate-100 bg-slate-50/50"
                                >
                                    <h2
                                        class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2"
                                    >
                                        Progress
                                    </h2>
                                    {#if true}
                                        {@const slots = parsedTemplate().filter(
                                            (i) => i.type === "slot",
                                        )}
                                        {@const filled = slots.filter(
                                            (i) => i.value,
                                        ).length}
                                        <div
                                            class="px-3 py-2.5 rounded-lg border bg-white border-slate-200 text-slate-600 flex items-center justify-between shadow-sm"
                                        >
                                            <div
                                                class="flex items-center gap-2"
                                            >
                                                <Icon
                                                    name="PieChart"
                                                    size={16}
                                                    class="text-slate-400"
                                                />
                                                <span
                                                    class="text-[11px] font-black uppercase tracking-wide"
                                                    >{filled}/{slots.length} Done</span
                                                >
                                            </div>
                                        </div>
                                    {/if}
                                </div>

                                <div
                                    class="flex-1 overflow-y-auto p-4 custom-scrollbar flex flex-col"
                                >
                                    <input
                                        type="text"
                                        bind:value={searchTerm}
                                        placeholder="Search provisions..."
                                        class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold outline-none mb-3"
                                    />
                                    <div class="space-y-1">
                                        {#each activeCategories() as cat}
                                            {@const isComplete =
                                                parsedTemplate()
                                                    .filter(
                                                        (i) =>
                                                            i.type === "slot" &&
                                                            i.category === cat,
                                                    )
                                                    .every((s) => s.value)}
                                            <button
                                                onclick={() =>
                                                    (activeTab =
                                                        activeTab === cat
                                                            ? null
                                                            : cat)}
                                                class={`w-full text-left px-3 py-2.5 rounded-lg text-[11px] font-bold border flex items-center justify-between border-none cursor-pointer ${isComplete ? "bg-emerald-50 text-emerald-700" : activeTab === cat ? "bg-indigo-600 text-white" : "bg-slate-50 text-slate-500"}`}
                                            >
                                                <span>{cat.toUpperCase()}</span>
                                                {#if isComplete}<Icon
                                                        name="CheckCircle2"
                                                        size={14}
                                                    />{/if}
                                            </button>
                                            {#if activeTab === cat}
                                                <div
                                                    class="pl-2 space-y-2 border-l-2 border-indigo-100 ml-2 py-2"
                                                >
                                                    {#each $snippets.filter((s) => s.category === cat && (!searchTerm || s.title
                                                                    .toLowerCase()
                                                                    .includes(searchTerm.toLowerCase()))) as snippet}
                                                        <div
                                                            draggable="true"
                                                            ondragstart={(e) =>
                                                                onDragStart(
                                                                    e,
                                                                    snippet,
                                                                )}
                                                            class="bg-white border border-slate-200 rounded-lg p-3 hover:border-indigo-400 hover:shadow-md cursor-grab text-[11px] font-bold text-slate-700"
                                                        >
                                                            {snippet.title}
                                                        </div>
                                                    {/each}
                                                </div>
                                            {/if}
                                        {/each}
                                    </div>
                                </div>
                            </aside>
                        {/if}

                        <section
                            class="flex-1 overflow-y-auto p-12 bg-slate-50/50 scroll-smooth"
                        >
                            <div
                                class={`mx-auto bg-white shadow-2xl min-h-[1056px] w-full max-w-[816px] p-16 lg:p-24 border border-slate-200 transition-all duration-500 ${$viewMode === "preview" ? "rounded-none shadow-xl border-slate-100" : "rounded-2xl"}`}
                            >
                                <div class="space-y-2">
                                    {#each parsedTemplate() as item}
                                        {@const offset =
                                            sectionListOffsets()[item.id] || 1}
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
                                                ondragleave={() =>
                                                    (dragOverSlotId = null)}
                                                ondrop={(e) => onDrop(e, item)}
                                                class={`relative min-h-[40px] rounded-2xl transition-all border-2 flex flex-col items-center justify-center mb-4 cursor-pointer
                                                      ${item.value ? "border-transparent bg-indigo-50/30 border-indigo-100" : "border-dashed border-slate-200 bg-slate-50/50"}
                                                      ${dragOverSlotId === item.id ? "ring-2 ring-indigo-500 border-indigo-500" : ""}`}
                                                onclick={() => {
                                                    if (
                                                        $viewMode === "assemble"
                                                    )
                                                        activeTab =
                                                            item.category;
                                                }}
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
                                                    <div
                                                        class="w-full p-2 group relative"
                                                    >
                                                        {#if $viewMode === "assemble"}
                                                            <div
                                                                class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                                            >
                                                                <button
                                                                    onclick={(
                                                                        e,
                                                                    ) => {
                                                                        e.stopPropagation();
                                                                        slotValues.update(
                                                                            (
                                                                                prev,
                                                                            ) => {
                                                                                const n =
                                                                                    {
                                                                                        ...prev,
                                                                                    };
                                                                                delete n[
                                                                                    item
                                                                                        .id
                                                                                ];
                                                                                return n;
                                                                            },
                                                                        );
                                                                    }}
                                                                    class="p-1 px-2 bg-white border border-slate-200 rounded-lg text-red-500 hover:bg-red-50 shadow-sm text-[9px] font-black uppercase border-none cursor-pointer"
                                                                    >Clear</button
                                                                >
                                                            </div>
                                                        {/if}
                                                        <MarkdownRenderer
                                                            content={item.value
                                                                .content}
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
                </div>
            {/if}
        </main>

        <footer
            class="h-12 bg-white border-t border-slate-200 px-8 flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0"
        >
            <div class="flex gap-6">
                <span class="flex items-center gap-2"
                    ><div class="w-2 h-2 rounded-full bg-emerald-400"></div>
                    DocAssemble v7.0</span
                >
                <span>Active</span>
            </div>
            <div class="flex items-center gap-4">
                <Icon name="ShieldCheck" size={14} class="text-indigo-400" />
                <span>Protected Workspace</span>
            </div>
        </footer>
    </div>
{/if}

{#if editingVariable}
    <div
        style="position: fixed; top: {editingVariable.rect
            .top}px; left: {editingVariable.rect.left}px; width: {Math.max(
            editingVariable.rect.width + 20,
            120,
        )}px; z-index: 100"
    >
        <input
            autofocus
            class="w-full px-2 py-0.5 rounded font-bold border-2 border-indigo-500 font-mono text-[0.85em] bg-white shadow-xl outline-none text-indigo-700"
            bind:value={editingVariable.value}
            onblur={saveVariableEdit}
            onkeydown={(e) => {
                if (e.key === "Enter")
                    /** @type {HTMLInputElement} */ (e.target).blur();
            }}
        />
    </div>
{/if}

{#if modalConfig.isOpen && modalConfig.mode === "select-template"}
    <div
        class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in"
    >
        <div
            class="bg-white rounded-3xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden"
        >
            <header
                class="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-indigo-50/30"
            >
                <h2
                    class="text-2xl font-black text-slate-800 tracking-tighter uppercase"
                >
                    Select Template
                </h2>
                <button
                    onclick={() => (modalConfig.isOpen = false)}
                    class="p-3 bg-white border border-slate-200 rounded-2xl cursor-pointer border-none bg-transparent"
                >
                    <Icon name="X" />
                </button>
            </header>
            <div
                class="flex-1 overflow-y-auto p-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
                {#each $structures as t}
                    <button
                        onclick={() => {
                            loadStructure(t);
                            modalConfig.isOpen = false;
                        }}
                        class="bg-white border border-slate-200 hover:border-indigo-400 hover:shadow-2xl p-8 rounded-3xl cursor-pointer transition-all flex flex-col h-56 relative overflow-hidden text-left bg-transparent"
                    >
                        <h3
                            class="text-lg font-black text-slate-800 mb-2 leading-tight uppercase"
                        >
                            {t.title}
                        </h3>
                        <div
                            class="mt-auto flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-300"
                        >
                            Start drafting →
                        </div>
                    </button>
                {/each}
            </div>
        </div>
    </div>
{/if}

{#if modalConfig.isOpen && modalConfig.mode === "variables"}
    <div
        class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in"
    >
        <div
            class="bg-white rounded-3xl shadow-2xl w-full max-w-xl flex flex-col max-h-[90vh] overflow-hidden"
        >
            <header
                class="px-8 py-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50"
            >
                <h3
                    class="font-black text-slate-800 uppercase tracking-widest text-xs"
                >
                    Workstation
                </h3>
                <button
                    onclick={() => (modalConfig.isOpen = false)}
                    class="text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer"
                    ><Icon name="X" /></button
                >
            </header>
            <div class="flex-1 overflow-y-auto p-8 space-y-8">
                <div>
                    <h4
                        class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4"
                    >
                        Direct Values
                    </h4>
                    <div class="grid grid-cols-2 gap-4">
                        {#each detectedVariables().simple as v}
                            <div class="space-y-1">
                                <label
                                    class="text-[9px] font-black text-slate-400 uppercase tracking-widest"
                                    >{v}</label
                                >
                                <input
                                    type="text"
                                    bind:value={
                                        $variables[/** @type {any} */ (v)]
                                    }
                                    class="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                                />
                            </div>
                        {/each}
                    </div>
                </div>
            </div>
            <footer
                class="p-6 bg-slate-50 border-t border-slate-100 flex justify-end"
            >
                <button
                    onclick={() => (modalConfig.isOpen = false)}
                    class="px-8 py-3 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase border-none cursor-pointer"
                    >Done</button
                >
            </footer>
        </div>
    </div>
{/if}
