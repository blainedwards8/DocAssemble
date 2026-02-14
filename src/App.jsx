import React, { useState, useEffect, useMemo, useRef } from 'react';
import { pb } from './lib/pocketbase';
import Login from './components/Login';
import Icon from './components/Icon';
import MarkdownRenderer from './components/MarkdownRenderer';
import { resolveVariables, parseMarkdown, triggerSave } from './utils';
import { generateDocx, generatePdf, generateRtf } from './exportUtils';
import { INITIAL_SNIPPETS, INITIAL_RAW_TEMPLATE, TIER_TYPES } from './constants';

function App() {
  const [user, setUser] = useState(pb.authStore.record);
  const [matters, setMatters] = useState([]);
  const [activeMatterId, setActiveMatterId] = useState(null);

  // Load initial state once
  const [initialData] = useState(() => {
    try {
      // Keep local storage for offline/fallback or non-critical UI state
      const item = localStorage.getItem('DOCASSEMBLE_AUTOSAVE_V1');
      return item ? JSON.parse(item) : {};
    } catch (e) {
      console.error("Failed to load autosave", e);
      return {};
    }
  });

  const [rawTemplate, setRawTemplate] = useState(initialData.rawTemplate || INITIAL_RAW_TEMPLATE);
  const [snippets, setSnippets] = useState(initialData.snippets || INITIAL_SNIPPETS);
  const [structures, setStructures] = useState([]); // Document Structure Templates
  const [variables, setVariables] = useState(initialData.variables || {
    petitioner_name: "Jane Doe",
    respondent_name: "John Smith",
    children: [{ name: "Alice Smith", dob: "January 15, 2012" }]
  });
  const [continuousNumbering, setContinuousNumbering] = useState(initialData.continuousNumbering !== undefined ? initialData.continuousNumbering : true);
  const [tierStyles, setTierStyles] = useState(initialData.tierStyles || ['decimal', 'lower-alpha', 'lower-roman']);
  const [viewMode, setViewMode] = useState('assemble');
  const [slotValues, setSlotValues] = useState(initialData.slotValues || {});
  const [disabledSlots, setDisabledSlots] = useState(new Set(initialData.disabledSlots || []));
  const [lastSaved, setLastSaved] = useState(null);

  const [activeTab, setActiveTab] = useState(null);
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverSlotId, setDragOverSlotId] = useState(null);

  const [modalConfig, setModalConfig] = useState({ isOpen: false, mode: 'create', targetId: null, title: '', content: '', category: null, tag: '' });

  const fileInputRef = useRef(null);
  const libraryInputRef = useRef(null);
  const structureInputRef = useRef(null);

  useEffect(() => {
    // Auth Listener
    return pb.authStore.onChange((token, model) => {
      setUser(model);
    });
  }, []);

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      try {
        // 1. Load Templates
        // Assuming 'templates' collection exists. If not, we might need a fallback or create it.
        // For now, we'll try to fetch. If 404, we'll ignore (or user should create it).
        try {
          const templates = await pb.collection('templates').getFullList({ sort: 'title' });
          if (templates.length > 0) {
            const allItems = templates.map(t => ({
              id: t.id,
              category: t.category,
              title: t.title,
              content: t.content,
              tag: t.tags ? (typeof t.tags === 'string' ? t.tags : JSON.stringify(t.tags)) : ''
            }));

            // Split into Structures and Provisions (Snippets)
            const structItems = allItems.filter(i => i.category === 'Structure');
            const snippetItems = allItems.filter(i => i.category !== 'Structure');

            setStructures(structItems);
            setSnippets(snippetItems);
          }
        } catch (err) {
          console.warn("Templates collection not found or empty", err);
        }

        // 2. Load Matters
        try {
          const matterList = await pb.collection('matters').getFullList({ sort: '-created' });
          setMatters(matterList);
          if (matterList.length > 0) setActiveMatterId(matterList[0].id);
        } catch (err) {
          console.warn("Matters collection not found", err);
        }

      } catch (e) {
        console.error("Error loading PB data", e);
      }
    }
    loadData();
  }, [user]);

  const parsedTemplate = useMemo(() => {
    const lines = rawTemplate.split('\n');
    const result = [];
    let currentStatic = [];
    const seenIds = new Map();

    lines.forEach((line) => {
      // Syntax: [[Label|Category]] or [[Label|Category|Tag]]
      const slotMatch = line.match(/^\[\[(.*)\]\]$/);
      if (slotMatch) {
        const parts = slotMatch[1].split('|');
        if (parts.length >= 2) {
          if (currentStatic.length > 0) { result.push({ id: `static-${result.length}`, type: 'static', content: currentStatic.join('\n') }); currentStatic = []; }

          const label = parts[0].trim();
          const category = parts[1].trim();
          const tag = parts[2] ? parts[2].trim() : null; // Optional tag

          // ID Generation: Include tag in uniqueness if present
          const baseKey = `slot-${label}-${category}-${tag || 'default'}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          const count = seenIds.get(baseKey) || 0;
          seenIds.set(baseKey, count + 1);
          const slotId = `${baseKey}-${count}`;

          result.push({ id: slotId, type: 'slot', label, category, tag, value: slotValues[slotId] || null });
        } else currentStatic.push(line);
      } else currentStatic.push(line);
    });
    if (currentStatic.length > 0) result.push({ id: `static-${result.length}`, type: 'static', content: currentStatic.join('\n') });
    return result;
  }, [rawTemplate, slotValues]);

  const activeCategories = useMemo(() => {
    const categories = new Set();
    parsedTemplate.forEach(item => { if (item.type === 'slot') categories.add(item.category); });
    return Array.from(categories).sort();
  }, [parsedTemplate]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!activeTab && activeCategories.length > 0) setActiveTab(activeCategories[0]);
    else if (activeTab && !activeCategories.includes(activeTab)) setActiveTab(activeCategories[0] || null);
  }, [activeCategories, activeTab]);

  const sectionListOffsets = useMemo(() => {
    let currentCount = 1;
    const offsets = {};
    parsedTemplate.forEach(item => {
      offsets[item.id] = currentCount;
      const content = item.type === 'static' ? item.content : (item.value?.content || "");
      const matches = content.match(/^(\d+)\. (.*$)/gm);
      if (matches && continuousNumbering) currentCount += matches.length;
    });
    return offsets;
  }, [parsedTemplate, continuousNumbering]);

  const detectedVariables = useMemo(() => {
    const simpleVars = new Set();
    const loops = new Map();
    const scan = (text) => {
      if (!text) return;
      const loopRegex = /\{#foreach\s+([a-zA-Z0-9_]+)\}([\s\S]*?)\{\/foreach\}/g;
      let match;
      while ((match = loopRegex.exec(text)) !== null) {
        const key = match[1];
        const subContent = match[2];
        if (!loops.has(key)) loops.set(key, new Set());
        const subMatchRegex = /\{([a-zA-Z0-9_]+)\}/g;
        let subMatch;
        while ((subMatch = subMatchRegex.exec(subContent)) !== null) loops.get(key).add(subMatch[1]);
      }
      const cleanText = text.replace(loopRegex, "");
      const varRegex = /\{([a-zA-Z0-9_]+)\}/g;
      while ((match = varRegex.exec(cleanText)) !== null) simpleVars.add(match[1]);
    };
    parsedTemplate.forEach(item => { scan(item.content); if (item.value) scan(item.value.content); });
    return {
      simple: Array.from(simpleVars).sort(),
      loops: Array.from(loops.entries()).map(([name, fields]) => ({ name, fields: Array.from(fields).sort() }))
    };
  }, [parsedTemplate]);

  // --- Handlers ---
  const addRowToList = (listName) => {
    setVariables(prev => {
      const list = prev[listName] || [];
      const fields = detectedVariables.loops.find(l => l.name === listName)?.fields || [];
      const newRow = fields.reduce((acc, f) => ({ ...acc, [f]: "" }), {});
      return { ...prev, [listName]: [...list, newRow] };
    });
  };

  const updateListVariable = (listName, index, field, value) => {
    setVariables(prev => {
      const list = [...(prev[listName] || [])];
      list[index] = { ...list[index], [field]: value };
      return { ...prev, [listName]: list };
    });
  };

  const removeRowFromList = (listName, index) => {
    setVariables(prev => {
      const list = [...(prev[listName] || [])];
      list.splice(index, 1);
      return { ...prev, [listName]: list };
    });
  };

  const openVariableModal = () => { setModalConfig({ isOpen: true, mode: 'variables', title: 'Data Workstation', content: '', category: null, tag: '' }); };
  const openEditLibraryModal = (e, snippet) => { e.stopPropagation(); setModalConfig({ isOpen: true, mode: 'edit-library', targetId: snippet.id, title: snippet.title, content: snippet.content, category: snippet.category, tag: snippet.tag || '' }); };
  const openEditInstanceModal = (e, item) => { e.stopPropagation(); setModalConfig({ isOpen: true, mode: 'edit-instance', targetId: item.id, title: item.value.title, content: item.value.content, category: item.category, tag: item.tag || '' }); };

  const handleSaveClause = (e) => {
    e.preventDefault();
    const { mode, targetId, title, content, category, tag } = modalConfig;
    const finalTag = tag ? tag.trim() : null; // Normalize empty string to null

    if (mode === 'create') setSnippets(prev => [...prev, { id: `c-${Date.now()}`, category, title, content, tag: finalTag }]);
    else if (mode === 'edit-library') {
      setSnippets(prev => prev.map(s => s.id === targetId ? { ...s, title, content, tag: finalTag } : s));
      setSlotValues(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(k => { if (next[k]?.id === targetId) next[k] = { ...next[k], title, content, tag: finalTag }; });
        return next;
      });
    } else if (mode === 'edit-instance') {
      setSlotValues(prev => ({ ...prev, [targetId]: { ...prev[targetId], content } })); // content only for instance edits? User likely wants to update title too, but keeping minimal changes first.
    }
    setModalConfig({ ...modalConfig, isOpen: false });
  };

  // --- Autosave & Load ---
  // --- Autosave ---
  // Note: Loading is handled during state initialization

  useEffect(() => {
    const state = { rawTemplate, snippets, variables, tierStyles, continuousNumbering, slotValues, disabledSlots: Array.from(disabledSlots) };
    localStorage.setItem('DOCASSEMBLE_AUTOSAVE_V1', JSON.stringify(state));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLastSaved(new Date());
  }, [rawTemplate, snippets, variables, tierStyles, continuousNumbering, slotValues, disabledSlots]);

  const resetProject = () => {
    if (confirm("Are you sure you want to reset the project to defaults? This will clear your autosave.")) {
      localStorage.removeItem('DOCASSEMBLE_AUTOSAVE_V1');
      window.location.reload();
    }
  };

  const exportProject = async () => {
    const state = { type: 'docassemble-project', rawTemplate, slotValues, variables, tierStyles, continuousNumbering, disabledSlots: Array.from(disabledSlots) };
    await triggerSave(JSON.stringify(state, null, 2), `Project_${Date.now()}.json`, 'application/json', 'json');
  };



  const exportTemplate = async () => {
    const meta = `---\ntier1: ${tierStyles[0]}\ntier2: ${tierStyles[1]}\ntier3: ${tierStyles[2]}\ncontinuous: ${continuousNumbering}\n---\n\n`;
    await triggerSave(meta + rawTemplate, `Template_${Date.now()}.md`, 'text/markdown', 'md');
  };

  const copyToClipboard = () => {
    const hiddenDiv = document.createElement("div");
    hiddenDiv.style.position = "absolute"; hiddenDiv.style.left = "-9999px";
    hiddenDiv.style.fontFamily = "'Times New Roman', serif"; hiddenDiv.style.color = "black";
    const html = parsedTemplate.map(item => {
      // Logic for disabled slots:
      if (disabledSlots.has(item.id)) return '';

      const raw = item.type === 'static' ? item.content : (item.value ? item.value.content : `[Missing: ${item.label}]`);
      const offset = sectionListOffsets[item.id] || 1;
      const resolved = resolveVariables(raw, variables, true);
      return `<div style="margin-bottom: 12pt;">${parseMarkdown(resolved, offset, continuousNumbering, tierStyles)}</div>`;
    }).join('');
    hiddenDiv.innerHTML = html;
    document.body.appendChild(hiddenDiv);
    const range = document.createRange(); range.selectNodeContents(hiddenDiv);
    const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
    document.execCommand('copy');
    selection.removeAllRanges(); document.body.removeChild(hiddenDiv);
    selection.removeAllRanges(); document.body.removeChild(hiddenDiv);
  };

  const handleExport = async (format) => {
    let blob;
    const filename = `Document_${Date.now()}`;

    try {
      if (format === 'docx') {
        blob = await generateDocx(parsedTemplate, variables, sectionListOffsets, continuousNumbering, tierStyles, disabledSlots);
        await triggerSave(blob, `${filename}.docx`, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      } else if (format === 'pdf') {
        blob = generatePdf(parsedTemplate, variables, sectionListOffsets, continuousNumbering, tierStyles, disabledSlots);
        await triggerSave(blob, `${filename}.pdf`, 'application/pdf');
      } else if (format === 'rtf') {
        blob = generateRtf(parsedTemplate, variables, sectionListOffsets, continuousNumbering, tierStyles, disabledSlots);
        await triggerSave(blob, `${filename}.rtf`, 'application/rtf');
      }
    } catch (e) {
      console.error("Export failed", e);
      alert("Export failed: " + e.message);
    }
  };

  const saveLibraryToCloud = async () => {
    if (!confirm(`Sync ${snippets.length} clauses to PocketBase? This may overwrite changes.`)) return;

    // Simple sync strategy: 
    // 1. Iterate snippets
    // 2. If valid PB ID (15 chars?), update. Else create.
    let count = 0;
    for (const s of snippets) {
      try {
        // Check if ID looks like a PB ID (15 chars alphanumeric)
        // Local IDs are often `c-` prefix or just long numeric. PB IDs are 15 chars.
        const isPbId = s.id && s.id.length === 15 && !s.id.includes('-');

        const payload = {
          title: s.title,
          content: s.content,
          category: s.category,
          tags: s.tag // Schema has 'tags' as json, but we treated it as string in load. 
          // If schema is JSON array, we need to wrap.
          // Looking at schema: tags is JSON.
        };
        // Fix tags format for schema
        payload.tags = s.tag ? [s.tag] : [];

        // Also, 'templates' might need other fields? We'll assume strict fields are title, content, category.

        if (isPbId) {
          await pb.collection('templates').update(s.id, payload);
        } else {
          const rec = await pb.collection('templates').create(payload);
          // Update local ID to match PB ID to avoid duplicates next time
          setSnippets(prev => prev.map(p => p.id === s.id ? { ...p, id: rec.id } : p));
        }
        count++;
      } catch (err) {
        console.error(`Failed to save snippet ${s.title}`, err);
      }
    }
    alert(`Synced ${count} items to Cloud.`);
  };

  const saveDocumentToCloud = async () => {
    if (!activeMatterId) {
      alert("Please select a Matter first.");
      return;
    }

    try {
      const filename = `Generated_${Date.now()}.pdf`;
      const blob = generatePdf(parsedTemplate, variables, sectionListOffsets, continuousNumbering, tierStyles, disabledSlots);

      // formData
      const formData = new FormData();
      formData.append('title', `DocAssemble Generated - ${new Date().toLocaleString()}`);
      formData.append('matter', activeMatterId);
      formData.append('file', blob, filename);
      // formData.append('summary', 'Generated via DocAssemble Desktop');

      await pb.collection('documents').create(formData);
      alert("Document saved to Matter successfully!");
    } catch (e) {
      console.error("Cloud Save Failed", e);
      alert("Failed to save to cloud: " + e.message);
    }
  };

  const onDragStart = (e, snippet) => { setDraggedItem(snippet); e.dataTransfer.setData('snippetId', snippet.id); e.dataTransfer.effectAllowed = 'copy'; };
  const onDragOver = (e, item) => { e.preventDefault(); if (!draggedItem) return; setDragOverSlotId(item.id); };
  const onDragLeave = () => setDragOverSlotId(null);
  const onDrop = (e, item) => {
    e.preventDefault(); onDragLeave();
    const snippetId = e.dataTransfer.getData('snippetId');
    const snippet = snippets.find(s => s.id === snippetId);

    // Strict Tag Matching:
    // 1. Categories must match
    // 2. Tags must match (strict equality) - undefined/null matches undefined/null
    const categoryMatch = snippet && snippet.category === item.category;
    const tagMatch = (snippet?.tag || null) === (item.tag || null);

    if (categoryMatch && tagMatch) {
      setSlotValues(prev => ({ ...prev, [item.id]: { ...snippet } }));
    }
    setDraggedItem(null);
  };

  const handleSlotClick = (category) => { if (viewMode === 'assemble') setActiveTab(category); };

  const toggleSlot = (e, id) => {
    e.stopPropagation();
    setDisabledSlots(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const [searchTerm, setSearchTerm] = useState('');

  // Filter snippets based on search
  const filteredSnippets = useMemo(() => {
    if (!searchTerm) return snippets;
    const lower = searchTerm.toLowerCase();
    return snippets.filter(s =>
      (s.title && s.title.toLowerCase().includes(lower)) ||
      (s.tag && s.tag.toLowerCase().includes(lower)) ||
      (s.category && s.category.toLowerCase().includes(lower))
    );
  }, [snippets, searchTerm]);

  const filteredCategories = useMemo(() => {
    if (!searchTerm) return activeCategories;
    const cats = new Set();
    filteredSnippets.forEach(s => cats.add(s.category));
    return Array.from(cats).sort();
  }, [activeCategories, filteredSnippets, searchTerm]);

  // Update active tab if current one disappears due to filter
  if (searchTerm && filteredCategories.length > 0 && !filteredCategories.includes(activeTab)) {
    setActiveTab(filteredCategories[0]);
  }


  if (!user) {
    return <Login onLogin={setUser} />;
  }


  return (
    <div className="flex flex-col h-screen bg-slate-100 text-slate-900 font-sans overflow-hidden select-none">
      {/* Hidden File Inputs */}
      <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={(e) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const data = JSON.parse(ev.target.result);
          if (data.type === 'docassemble-project') {
            setRawTemplate(data.rawTemplate); setSlotValues(data.slotValues);
            setVariables(data.variables); setTierStyles(data.tierStyles);
            setContinuousNumbering(data.continuousNumbering);
            if (data.disabledSlots) setDisabledSlots(new Set(data.disabledSlots));
          }
        };
        reader.readAsText(e.target.files[0]);
      }} />
      <input type="file" ref={libraryInputRef} className="hidden" accept=".json" onChange={(e) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const data = JSON.parse(ev.target.result);
          if (data.type === 'docassemble-library') setSnippets(data.snippets);
        };
        reader.readAsText(e.target.files[0]);
      }} />
      <input type="file" ref={structureInputRef} className="hidden" accept=".md,.txt" onChange={(e) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const text = ev.target.result;
          if (text.startsWith('---')) {
            const parts = text.split('---');
            const meta = parts[1];
            const body = parts.slice(2).join('---').trim();
            const t1 = meta.match(/tier1:\s*(.*)/)?.[1];
            const cont = meta.match(/continuous:\s*(.*)/)?.[1];
            if (t1) setTierStyles([t1, tierStyles[1], tierStyles[2]]);
            if (cont) setContinuousNumbering(cont.trim() === 'true');
            setRawTemplate(body);
          } else setRawTemplate(text.trim());
        };
        reader.readAsText(e.target.files[0]);
      }} />

      <header className="flex items-center justify-between px-6 py-3 bg-white border-b border-slate-200 shrink-0 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-1.5 rounded text-white shadow-sm"><Icon name="Layout" /></div>
          <div><h1 className="text-sm font-black tracking-tight text-slate-800 uppercase leading-none">DocAssemble Desktop</h1></div>

          {/* Matter Selector */}
          <div className="ml-4 pl-4 border-l border-slate-200">
            <select
              value={activeMatterId || ''}
              onChange={(e) => setActiveMatterId(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-[10px] font-bold uppercase rounded px-2 py-1 outline-none focus:border-indigo-500"
            >
              <option value="" disabled>Select Matter...</option>
              {matters.map(m => (
                <option key={m.id} value={m.id}>{m.title} ({m.case_number})</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="mr-2 flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400">{user.email}</span>
            <button onClick={() => pb.authStore.clear()} className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-red-500" title="Logout">
              <Icon name="LogOut" size={14} />
            </button>
          </div>
          {lastSaved && (
            <span className="text-[10px] uppercase font-bold text-slate-400 mr-2 animate-pulse transition-opacity duration-1000">
              Sorted & Saved {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
          <div className="flex items-center bg-slate-50 p-1 rounded-lg border border-slate-200">
            <button onClick={() => fileInputRef.current.click()} className="p-1.5 hover:bg-white rounded transition-all text-slate-400 hover:text-indigo-600" title="Open Project"><Icon name="Upload" size={16} /></button>
            <button onClick={exportProject} className="p-1.5 hover:bg-white rounded transition-all text-slate-400 hover:text-indigo-600" title="Save Project"><Icon name="Save" size={16} /></button>
            <button onClick={resetProject} className="p-1.5 hover:bg-white rounded transition-all text-slate-400 hover:text-red-500" title="Reset Project"><Icon name="RotateCw" size={16} /></button>
          </div>
          <div className="flex bg-slate-50 p-1 rounded-lg border border-slate-200">
            {['assemble', 'structure', 'preview'].map(m => (
              <button key={m} onClick={() => setViewMode(m)} className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === m ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>{m}</button>
            ))}
          </div>
          <button onClick={openVariableModal} className="px-4 py-2 bg-white border border-slate-200 rounded-md text-[10px] font-black uppercase text-slate-600 shadow-sm flex items-center gap-2">
            <Icon name="Database" size={14} className="text-indigo-500" /> Variables
          </button>

          {/* Export Dropdown */}
          <div className="relative group inline-block">
            <button className="px-5 py-2 bg-indigo-600 text-white rounded-md text-[10px] font-black uppercase shadow-lg active:scale-95 transition-all flex items-center gap-2 group-hover:rounded-b-none">
              Export / Copy <Icon name="ChevronDown" size={12} />
            </button>
            {/* Invisible bridge to prevent closing on gap */}
            <div className="absolute top-full left-0 w-full h-2 bg-transparent"></div>
            <div className="absolute top-[calc(100%+4px)] right-0 w-48 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden hidden group-hover:block z-50 animate-in fade-in slide-in-from-top-2">
              <button onClick={copyToClipboard} className="w-full text-left px-4 py-3 hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center gap-2">
                <Icon name="Copy" size={14} className="text-slate-400" /> Copy Text
              </button>
              <div className="h-px bg-slate-100 my-0"></div>
              <button onClick={() => handleExport('docx')} className="w-full text-left px-4 py-3 hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center gap-2">
                <Icon name="FileText" size={14} className="text-blue-500" /> DOCX (Word)
              </button>
              <button onClick={() => handleExport('pdf')} className="w-full text-left px-4 py-3 hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center gap-2">
                <Icon name="File" size={14} className="text-red-500" /> PDF Document
              </button>
              <button onClick={() => handleExport('rtf')} className="w-full text-left px-4 py-3 hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center gap-2">
                <Icon name="FileType" size={14} className="text-slate-500" /> RTF (Rich Text)
              </button>
              <div className="h-px bg-slate-100 my-0"></div>
              <button onClick={saveDocumentToCloud} className={`w-full text-left px-4 py-3 hover:bg-slate-50 text-xs font-bold flex items-center gap-2 ${activeMatterId ? 'text-indigo-600' : 'text-slate-300'}`}>
                <Icon name="Cloud" size={14} /> Save to Matter
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden">

        {viewMode === 'assemble' && (
          <aside className="w-80 border-r border-slate-200 bg-white flex flex-col shrink-0 shadow-sm overflow-hidden z-10">
            {/* 1. Status Section */}
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Document Status</h2>
              {(() => {
                const totalSlots = parsedTemplate.filter(i => i.type === 'slot').length;
                const filledSlots = parsedTemplate.filter(i => i.type === 'slot' && i.value).length;
                const isAllFilled = totalSlots > 0 && totalSlots === filledSlots;

                return (
                  <div className={`px-3 py-2.5 rounded-lg border flex items-center justify-between shadow-sm ${isAllFilled ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-slate-600'}`}>
                    <div className="flex items-center gap-2">
                      <Icon name={isAllFilled ? "CheckCircle2" : "PieChart"} size={16} className={isAllFilled ? "text-emerald-500" : "text-slate-400"} />
                      <span className="text-[11px] font-black uppercase tracking-wide">{filledSlots}/{totalSlots} Completed</span>
                    </div>
                    {isAllFilled && <span className="text-[9px] font-black uppercase bg-emerald-100 px-1.5 py-0.5 rounded text-emerald-700">Ready</span>}
                  </div>
                );
              })()}
            </div>

            {/* 2. Provision Library (Formerly Template Library) */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Values & Provisions</h2>
                <div className="flex gap-1">
                  <button onClick={() => libraryInputRef.current.click()} className="p-1 text-slate-400 hover:text-indigo-600" title="Import Local JSON"><Icon name="Upload" size={14} /></button>
                  <button onClick={saveLibraryToCloud} className="p-1 text-indigo-400 hover:text-indigo-600" title="Sync Provisions to Cloud"><Icon name="CloudUpload" size={14} /></button>
                </div>
              </div>

              {/* Search Input */}
              <div className="relative mb-3 shrink-0">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search provisions..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-indigo-400 pl-8"
                />
                <div className="absolute left-2.5 top-2.5 text-slate-400"><Icon name="Search" size={12} /></div>
              </div>

              <div className="space-y-1">
                {activeCategories.length === 0 && filteredCategories.length === 0 && (
                  <div className="text-center py-8 border-2 border-dashed border-slate-100 rounded-lg">
                    <p className="text-slate-300 text-[10px] font-bold uppercase">No provisions found</p>
                  </div>
                )}

                {filteredCategories.map(cat => {
                  const relevantSlots = parsedTemplate.filter(item => item.type === 'slot' && item.category === cat);
                  const isComplete = relevantSlots.length > 0 && relevantSlots.every(slot => slot.value !== null);
                  const isActiveCategory = activeTab === cat;
                  let btnClass = `w-full text-left px-3 py-2.5 rounded-lg text-[11px] font-bold transition-all border flex items-center justify-between `;
                  // Style logic
                  if (isComplete) btnClass += isActiveCategory ? "bg-emerald-600 border-emerald-600 text-white shadow-md ring-2 ring-emerald-100" : "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100";
                  else btnClass += isActiveCategory ? "bg-indigo-600 border-indigo-600 text-white shadow-md" : "bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100";

                  return (
                    <div key={cat} className="space-y-1">
                      <button onClick={() => setActiveTab(isActiveCategory ? null : cat)} className={btnClass}>
                        <span className="truncate pr-2">{cat.toUpperCase()}</span>
                        {isComplete && <Icon name="CheckCircle2" size={14} className={isActiveCategory ? "text-white" : "text-emerald-500"} />}
                      </button>
                      {isActiveCategory && (
                        <div className="pl-2 pr-1 py-2 space-y-2 border-l-2 border-slate-100 ml-2 animate-in slide-in-from-left-1 duration-200">
                          {filteredSnippets.filter(s => s.category === cat).map(snippet => (
                            <div key={snippet.id} draggable onDragStart={(e) => onDragStart(e, snippet)} onDragEnd={() => setDraggedItem(null)} className="bg-white border border-slate-200 rounded-lg p-3 cursor-grab hover:border-indigo-400 hover:shadow-md transition-all shadow-sm flex flex-col gap-1 group">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-slate-700">{snippet.title}</span>
                                <button onClick={(e) => openEditLibraryModal(e, snippet)} className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-indigo-600 transition-opacity"><Icon name="Pencil" size={12} /></button>
                              </div>
                              {snippet.tag && (
                                <span className="text-[9px] font-black uppercase text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded w-fit">{snippet.tag}</span>
                              )}
                            </div>
                          ))}
                          <button onClick={() => setModalConfig({ isOpen: true, mode: 'create', targetId: null, title: '', content: '', category: cat, tag: '' })} className="w-full py-2 border-2 border-dashed border-slate-100 rounded-lg text-slate-300 hover:text-indigo-400 hover:border-indigo-100 transition-all flex items-center justify-center gap-1">
                            <Icon name="PlusCircle" size={14} />
                            <span className="text-[9px] font-black uppercase">Add New Provision</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>
        )}

        <section className="flex-1 overflow-y-auto p-8 bg-slate-100 scroll-smooth">
          {viewMode === 'structure' ? (
            <div className="mx-auto w-full max-w-4xl h-full bg-white rounded-xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in duration-300">
              <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Template Skeleton (Markdown)</span>
                <div className="flex gap-1">
                  <button onClick={() => structureInputRef.current.click()} className="flex items-center gap-1.5 px-3 py-1 bg-slate-200 hover:bg-slate-300 rounded text-[9px] font-black uppercase transition-all">
                    <Icon name="Upload" size={12} /> Load Template
                  </button>
                  <button onClick={exportTemplate} className="flex items-center gap-1.5 px-3 py-1 bg-indigo-600 text-white rounded text-[9px] font-black uppercase transition-all shadow-sm">
                    <Icon name="Save" size={12} /> Save Template
                  </button>
                </div>
              </div>
              <textarea value={rawTemplate} onChange={(e) => setRawTemplate(e.target.value)} className="flex-1 w-full p-10 font-mono text-sm leading-relaxed focus:outline-none resize-none bg-white text-slate-700" placeholder="# Header... [[Section|Category]]" />
            </div>
          ) : (
            <div className={`mx-auto bg-white shadow-2xl min-h-[1056px] w-full max-w-[816px] p-10 lg:p-24 border border-slate-200 ${viewMode === 'preview' ? 'rounded-none shadow-none border-transparent' : 'rounded-lg'}`}>
              <div className="space-y-2">
                {parsedTemplate.map((item) => {
                  const offset = sectionListOffsets[item.id] || 1;
                  const isBeingHovered = dragOverSlotId === item.id;
                  const isValidDrop = draggedItem && draggedItem.category === item.category && (draggedItem.tag || null) === (item.tag || null);
                  const isActiveSlot = activeTab === item.category && viewMode === 'assemble';

                  if (item.type === 'static') return <MarkdownRenderer key={item.id} content={item.content} variables={variables} startOffset={offset} continuous={continuousNumbering} tierStyles={tierStyles} className="mb-6" />;

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleSlotClick(item.category)}
                      onDragOver={(e) => onDragOver(e, item)}
                      onDragLeave={onDragLeave}
                      onDrop={(e) => onDrop(e, item)}
                      className={`relative min-h-[40px] rounded-xl transition-all border-2 flex flex-col items-center justify-center 
                                                ${viewMode === 'preview' ? 'border-transparent' : ''} 
                                                ${item.value && viewMode !== 'preview' ? 'border-transparent bg-indigo-50/40 border-indigo-200 my-4 shadow-sm ring-1 ring-indigo-100' : 'border-dashed border-slate-200 bg-slate-50/50 my-2'}
                                                ${isBeingHovered && isValidDrop ? 'bg-green-50 border-green-400 border-solid scale-[1.02] shadow-lg ring-4 ring-green-100' : ''}
                                                ${isBeingHovered && !isValidDrop ? 'bg-red-50 border-red-400 border-solid' : ''}
                                                ${viewMode === 'assemble' ? 'cursor-pointer hover:shadow-sm' : ''}
                                            `}
                    >
                      {viewMode === 'assemble' && (
                        <div className="absolute -top-3 left-4 flex items-center gap-2 pointer-events-none z-10">
                          <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded shadow-sm border ${isActiveSlot ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white text-slate-400 border-slate-200'
                            }`}>
                            {item.label} • {item.category} {item.tag ? `• ${item.tag.toUpperCase()}` : ''}
                          </span>
                        </div>
                      )}

                      {!item.value ? (
                        viewMode === 'preview' ? <div className="w-full py-4 px-6 border border-amber-200 bg-amber-50 rounded-xl text-amber-700 text-[10px] italic font-black shadow-sm">ACTION REQUIRED: ADD {item.label.toUpperCase()}</div> : (
                          <>
                            <div className={`flex flex-col items-center gap-2 pointer-events-none text-center py-4 ${disabledSlots.has(item.id) ? 'opacity-40' : ''}`}>
                              <Icon name="Plus" size={16} className={isActiveSlot ? 'text-indigo-500' : 'text-slate-300'} />
                              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{disabledSlots.has(item.id) ? 'Section Disabled' : 'Empty Section'}</span>
                            </div>
                            {viewMode === 'assemble' && (
                              <button onClick={(e) => toggleSlot(e, item.id)} className="absolute top-2 right-2 p-1 text-slate-300 hover:text-indigo-500 z-10" title={disabledSlots.has(item.id) ? "Enable Section" : "Disable Section"}>
                                <Icon name={disabledSlots.has(item.id) ? "EyeOff" : "Eye"} size={12} />
                              </button>
                            )}
                          </>
                        )
                      ) : (
                        <div className="w-full relative group p-2">
                          {viewMode === 'assemble' && (
                            <div className="absolute -top-4 right-0 opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity z-10">
                              <button onClick={(e) => toggleSlot(e, item.id)} className={`p-1 bg-white border border-slate-200 rounded shadow-sm hover:bg-slate-50 ${disabledSlots.has(item.id) ? 'text-slate-400' : 'text-indigo-600'}`} title={disabledSlots.has(item.id) ? "Enable Section" : "Disable Section"}>
                                <Icon name={disabledSlots.has(item.id) ? "EyeOff" : "Eye"} size={10} />
                              </button>
                              <button onClick={(e) => openEditInstanceModal(e, item)} className="p-1 bg-white border border-slate-200 rounded text-indigo-600 shadow-sm hover:bg-indigo-50"><Icon name="Pencil" size={10} /></button>
                              <button onClick={(e) => { e.stopPropagation(); const n = { ...slotValues }; delete n[item.id]; setSlotValues(n); }} className="p-1 bg-white border border-slate-200 rounded text-red-500 shadow-sm hover:bg-red-50"><Icon name="Trash2" size={10} /></button>
                            </div>
                          )}
                          <div className={`${viewMode === 'assemble' ? 'opacity-90' : ''} ${disabledSlots.has(item.id) ? 'opacity-40 grayscale pointer-events-none select-none' : ''}`}>
                            <MarkdownRenderer content={item.value.content} variables={variables} startOffset={offset} continuous={continuousNumbering} tierStyles={tierStyles} />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* Right Sidebar: Document Structures (Templates) */}
        {viewMode !== 'preview' && (
          <aside className="w-64 border-l border-slate-200 bg-white flex flex-col shrink-0 shadow-sm z-10">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Document Structures</h2>
              <button onClick={() => structureInputRef.current.click()} className="p-1 text-slate-400 hover:text-indigo-600" title="Load Markdown File"><Icon name="Upload" size={14} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-3">
              {/* List of Templates (Structures) */}
              {structures.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-slate-100 rounded-lg">
                  <p className="text-slate-300 text-[10px] font-bold uppercase">No structures found</p>
                  <p className="text-[9px] text-slate-300 mt-1">Check 'templates' collection</p>
                </div>
              ) : (
                structures.map(t => (
                  <div key={t.id} className="group relative bg-white border border-slate-200 rounded-lg p-3 hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer" onClick={() => {
                    if (confirm(`Load template "${t.title}"? Current progress may be lost.`)) {
                      setRawTemplate(t.content);
                      setSlotValues({}); // Reset values on new template load
                      setViewMode('assemble');
                    }
                  }}>
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-[11px] font-bold text-slate-700 leading-tight mb-1">{t.title}</h3>
                        <p className="text-[9px] text-slate-400 font-medium uppercase tracking-wider">Structure</p>
                      </div>
                      <Icon name="FileText" size={14} className="text-slate-300 group-hover:text-indigo-500" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </aside>
        )}

        {modalConfig.isOpen && (
          <div className="fixed inset-0 bg-slate-900 bg-opacity-50 flex items-center justify-center z-50 animate-in fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-90 duration-300">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="bg-slate-100 p-2 rounded-full text-indigo-600">
                    <Icon name={modalConfig.mode === 'variables' ? 'Database' : 'FileText'} />
                  </div>
                  <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">{modalConfig.title}</h3>
                </div >
                <button onClick={() => setModalConfig({ ...modalConfig, isOpen: false })} className="text-slate-400 hover:text-slate-600 bg-slate-100 p-2 rounded-full transition-colors"><Icon name="X" /></button>
              </div >
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {modalConfig.mode === 'variables' ? (
                  <div className="space-y-12">
                    <section>
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">Direct Placeholders</h4>
                      <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                        {detectedVariables.simple.map(v => (
                          <div key={v} className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{v.replace(/_/g, ' ')}</label>
                            <input type="text" value={variables[v] || ""} onChange={(e) => setVariables({ ...variables, [v]: e.target.value })} className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm" placeholder="Value..." />
                          </div>
                        ))}
                      </div>
                    </section>
                    {detectedVariables.loops.map(loop => (
                      <section key={loop.name}>
                        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">List: {loop.name}</h4>
                          <button onClick={() => addRowToList(loop.name)} className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-[9px] font-black uppercase">Add Row</button>
                        </div>
                        <table className="w-full text-left border-collapse bg-slate-50 rounded-xl overflow-hidden shadow-inner">
                          <thead><tr className="bg-slate-100/50">
                            <th className="px-4 py-2 text-[9px] font-black text-slate-400 uppercase w-12 text-center">#</th>
                            {loop.fields.map(f => <th key={f} className="px-4 py-2 text-[9px] font-black text-slate-400 uppercase">{f}</th>)}
                            <th className="px-4 py-2 w-16"></th>
                          </tr></thead>
                          <tbody className="bg-white">
                            {(variables[loop.name] || []).map((row, rIdx) => (
                              <tr key={rIdx} className="border-t border-slate-100">
                                <td className="px-4 py-2 text-[10px] font-black text-slate-300 text-center">{rIdx + 1}</td>
                                {loop.fields.map(f => (
                                  <td key={f} className="px-2 py-1.5"><input type="text" value={row[f] || ""} onChange={(e) => updateListVariable(loop.name, rIdx, f, e.target.value)} className="w-full px-2 py-1 bg-transparent text-sm border-b border-transparent focus:border-indigo-200" /></td>
                                ))}
                                <td className="px-4 py-2 text-center"><button onClick={() => removeRowFromList(loop.name, rIdx)} className="text-slate-300 hover:text-red-500"><Icon name="Trash2" size={14} /></button></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </section>
                    ))}
                  </div>
                ) : (
                  <form onSubmit={handleSaveClause} className="space-y-6">
                    {modalConfig.mode !== 'edit-instance' && (
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Title</label>
                        <input type="text" required value={modalConfig.title} onChange={(e) => setModalConfig({ ...modalConfig, title: e.target.value })} className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold shadow-sm" />
                      </div>
                    )}
                    {modalConfig.mode !== 'edit-instance' && (
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Tag (Optional)</label>
                        <input type="text" value={modalConfig.tag} onChange={(e) => setModalConfig({ ...modalConfig, tag: e.target.value })} className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold shadow-sm text-indigo-600" placeholder="e.g. Standard, Special, Utah Only" />
                      </div>
                    )}
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Markdown</label>
                      <textarea rows={14} value={modalConfig.content} onChange={(e) => setModalConfig({ ...modalConfig, content: e.target.value })} className="w-full px-4 py-4 border border-slate-200 rounded-xl text-xs font-mono shadow-inner bg-slate-50" />
                    </div>
                    <button type="submit" className="w-full py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase">Apply Changes</button>
                  </form>
                )}
              </div>
            </div >
          </div >
        )
        }
        <footer className="h-10 bg-white border-t border-slate-200 px-6 flex items-center justify-between text-[9px] font-black text-slate-300 uppercase tracking-widest shrink-0">
          <span>DocAssemble v5.3 (Template Controls Fixed)</span>
          <span>Offline Mode Ready (PWA)</span>
        </footer>
      </main >
    </div >
  );
}

export default App;
