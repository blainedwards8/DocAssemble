import React, { useState, useEffect, useMemo } from 'react';
import Icon from './Icon';
import { extractStructureMetadata } from '../utils';

const StructureEditor = ({ pb, initialStructure, snippets, onUpdateSnippets, onSave, onBack, activeDocumentId, variables, slotValues, tierStyles, continuousNumbering, onContentChange, onTitleChange }) => {
    const [title, setTitle] = useState(initialStructure?.title || 'New Structure');
    const [content, setContent] = useState(initialStructure?.content || '');
    const [isSaving, setIsSaving] = useState(false);
    const [isCheatSheetOpen, setIsCheatSheetOpen] = useState(false);
    const [selectedSection, setSelectedSection] = useState(null);
    const [isProvisionModalOpen, setIsProvisionModalOpen] = useState(false);
    const [editingProvision, setEditingProvision] = useState(null);

    const metadata = useMemo(() => extractStructureMetadata(content), [content]);

    // Update parent when local state changes
    useEffect(() => {
        onContentChange?.(content);
    }, [content]);

    useEffect(() => {
        onTitleChange?.(title);
    }, [title]);

    // Auto-save logic
    useEffect(() => {
        const timer = setTimeout(() => {
            if (content !== (initialStructure?.content || '') || title !== (initialStructure?.title || '')) {
                handleSave();
            }
        }, 2000);
        return () => clearTimeout(timer);
    }, [content, title]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            if (activeDocumentId) {
                // Instance-based structural editing
                const state = {
                    rawTemplate: content,
                    structureId: initialStructure?.id,
                    structureTitle: title,
                    variables: variables || {},
                    slotValues: slotValues || {},
                    tierStyles: tierStyles || ['decimal', 'lower-alpha', 'lower-roman'],
                    continuousNumbering: continuousNumbering !== undefined ? continuousNumbering : true
                };
                const jsonState = JSON.stringify(state);
                await pb.collection('documents').update(activeDocumentId, {
                    description: jsonState,
                    state: jsonState
                });
                return;
            }

            const data = {
                title,
                content,
                category: 'Structure',
                tags: []
            };

            if (initialStructure?.id) {
                const rec = await pb.collection('templates').update(initialStructure.id, data);
                onSave && onSave(rec);
            } else {
                const rec = await pb.collection('templates').create(data);
                onSave && onSave(rec); // Update parent if it was new
            }
        } catch (err) {
            console.error("Save failed:", err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveProvision = async (e) => {
        e.preventDefault();
        const tag = editingProvision.tag?.trim();
        const category = selectedSection?.category || 'Uncategorized';
        const payload = {
            title: editingProvision.title,
            content: editingProvision.content,
            category: category,
            tags: tag ? [tag] : []
        };

        try {
            if (editingProvision.id) {
                const rec = await pb.collection('templates').update(editingProvision.id, payload);
                onUpdateSnippets(snippets.map(s => s.id === rec.id ? { ...rec, tag: rec.tags?.[0] || '' } : s));
            } else {
                const rec = await pb.collection('templates').create(payload);
                onUpdateSnippets([...snippets, { ...rec, tag: rec.tags?.[0] || '' }]);
            }
            setIsProvisionModalOpen(false);
        } catch (err) {
            console.error("Failed to save provision", err);
            alert("Failed to save provision. Please check your connection.");
        }
    };

    const handleDeleteProvision = async (id) => {
        if (!confirm("Are you sure you want to delete this provision?")) return;
        try {
            await pb.collection('templates').delete(id);
            onUpdateSnippets(snippets.filter(s => s.id !== id));
        } catch (err) {
            console.error("Failed to delete provision", err);
        }
    };

    const filteredProvisions = useMemo(() => {
        const category = selectedSection?.category || 'Uncategorized';
        return snippets.filter(s => (s.category || 'Uncategorized') === category);
    }, [snippets, selectedSection]);

    return (
        <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden h-full">
            {/* Header */}
            <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-10 shadow-sm">
                <div className="flex items-center gap-4 flex-1">
                    <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-all">
                        <Icon name="ArrowLeft" size={20} />
                    </button>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="bg-transparent border-none text-lg font-black text-slate-800 focus:ring-0 w-full max-w-md placeholder:text-slate-200"
                        placeholder="Untitled Structure"
                    />
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-300 mr-4">
                        {isSaving ? (
                            <><Icon name="Loader2" size={12} className="animate-spin text-indigo-500" /> Saving...</>
                        ) : (
                            <><Icon name="Check" size={12} className="text-emerald-500" /> Saved to Cloud</>
                        )}
                    </div>
                    <button onClick={() => setIsCheatSheetOpen(true)} className="p-2.5 bg-slate-50 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-xl transition-all border border-slate-200 hover:border-indigo-100 shadow-sm" title="Syntax Cheat Sheet">
                        <Icon name="HelpCircle" size={20} />
                    </button>
                    <button onClick={handleSave} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-100 transition-all">
                        Save Now
                    </button>
                </div>
            </header>

            {/* Main Editor Area */}
            <div className="flex-1 flex overflow-hidden">
                {/* Editor */}
                <div className="flex-1 flex flex-col bg-white border-r border-slate-200 shadow-inner overflow-hidden">
                    <div className="h-full relative font-mono">
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            className="absolute inset-0 w-full h-full p-8 text-sm text-slate-700 leading-relaxed resize-none focus:outline-none custom-scrollbar selection:bg-indigo-100 selection:text-indigo-700"
                            placeholder="# Document Title

Use {variable_name} for variables.
Use [[Section Name|Category]] for document sections/structural elements.
Use {#foreach list}...{/foreach} for loops.

Normal # Markdown Headers are supported."
                            spellCheck={false}
                        />
                    </div>
                </div>

                {/* Dynamic Sidebar */}
                <div className={`flex bg-slate-50 overflow-hidden shrink-0 transition-all duration-300 ${selectedSection ? 'w-[640px]' : 'w-80'}`}>
                    {/* Columns 1: Sections */}
                    <div className="w-80 border-r border-slate-200 p-6 overflow-y-auto custom-scrollbar space-y-8 flex flex-col">
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <Icon name="Hash" size={16} className="text-indigo-500" />
                                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Sections</h3>
                            </div>
                            <div className="space-y-2">
                                {metadata.sections.length > 0 ? (
                                    metadata.sections.map((s, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setSelectedSection(selectedSection?.title === s.title ? null : s)}
                                            className={`w-full text-left text-xs p-3 rounded-xl border transition-all flex justify-between items-center group
                                                ${selectedSection?.title === s.title
                                                    ? 'bg-indigo-600 border-indigo-700 text-white shadow-md'
                                                    : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:bg-indigo-50/30'}`}
                                        >
                                            <div className="flex flex-col">
                                                <span className="font-black">{s.title}</span>
                                                <span className={`text-[9px] uppercase tracking-widest font-black mt-1 ${selectedSection?.title === s.title ? 'text-indigo-200' : 'text-slate-300'}`}>
                                                    {s.category || 'No Category'}
                                                </span>
                                            </div>
                                            <Icon name="ChevronRight" size={14} className={`transition-transform ${selectedSection?.title === s.title ? 'translate-x-1' : 'opacity-0 group-hover:opacity-100'}`} />
                                        </button>
                                    ))
                                ) : (
                                    <div className="text-[10px] italic text-slate-300">No sections found</div>
                                )}
                            </div>
                        </div>

                        {/* Variables Area */}
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <Icon name="Brackets" size={16} className="text-emerald-500" />
                                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Variables</h3>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {metadata.variables.length > 0 ? (
                                    metadata.variables.map((v, i) => (
                                        <span key={i} className="text-[10px] font-black px-2 py-1 bg-white border border-slate-200 text-emerald-600 rounded-md shadow-sm">
                                            {v}
                                        </span>
                                    ))
                                ) : (
                                    <div className="text-[10px] italic text-slate-300 w-full">No variables found</div>
                                )}
                            </div>
                        </div>

                        <div className="mt-auto pt-8 border-t border-slate-200">
                            <p className="text-[10px] text-slate-300 font-medium">DocAssemble Structure Editor v1.1. Manage provisions by selecting a section.</p>
                        </div>
                    </div>

                    {/* Column 2: Provisions (Conditional) */}
                    {selectedSection && (
                        <div className="w-80 bg-white p-6 overflow-y-auto custom-scrollbar flex flex-col border-r border-slate-200 animate-in slide-in-from-right duration-300">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Provisions</h3>
                                    <p className="text-[10px] font-bold text-indigo-500 uppercase">{selectedSection.category}</p>
                                </div>
                                <button
                                    onClick={() => { setEditingProvision({ title: '', content: '' }); setIsProvisionModalOpen(true); }}
                                    className="p-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-lg transition-all"
                                    title="New Provision"
                                >
                                    <Icon name="Plus" size={16} />
                                </button>
                            </div>

                            <div className="space-y-3">
                                {filteredProvisions.length > 0 ? (
                                    filteredProvisions.map(p => (
                                        <div key={p.id} className="group p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-indigo-200 hover:shadow-md transition-all">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex-1">
                                                    <h4 className="text-[11px] font-black text-slate-800 line-clamp-2 leading-tight">{p.title}</h4>
                                                    {p.tag && (
                                                        <span className="inline-block mt-1 px-1.5 py-0.5 bg-indigo-50 text-indigo-500 text-[8px] font-black uppercase tracking-widest rounded border border-indigo-100">
                                                            {p.tag}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                                    <button onClick={() => { setEditingProvision(p); setIsProvisionModalOpen(true); }} className="p-1 text-slate-400 hover:text-indigo-600"><Icon name="Edit3" size={12} /></button>
                                                    <button onClick={() => handleDeleteProvision(p.id)} className="p-1 text-slate-400 hover:text-red-500"><Icon name="Trash2" size={12} /></button>
                                                </div>
                                            </div>
                                            <p className="text-[10px] text-slate-400 font-medium line-clamp-2 italic">{p.content.substring(0, 100)}...</p>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-10 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">No Provisions</p>
                                        <button onClick={() => { setEditingProvision({ title: '', content: '' }); setIsProvisionModalOpen(true); }} className="mt-2 text-[10px] font-bold text-indigo-500 hover:underline">Create First One</button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Provision Modal */}
            {isProvisionModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-6 animate-in fade-in duration-200">
                    <form onSubmit={handleSaveProvision} className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <header className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-indigo-50/30">
                            <div>
                                <h2 className="text-lg font-black text-slate-800 tracking-tight">{editingProvision?.id ? 'Edit Provision' : 'New Provision'}</h2>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Category: {selectedSection?.category}</p>
                            </div>
                            <button type="button" onClick={() => setIsProvisionModalOpen(false)} className="p-2 hover:bg-slate-200/50 rounded-xl transition-all">
                                <Icon name="X" />
                            </button>
                        </header>
                        <div className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Provision Title</label>
                                <input
                                    required
                                    type="text"
                                    value={editingProvision?.title || ''}
                                    onChange={e => setEditingProvision({ ...editingProvision, title: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300"
                                    placeholder="e.g. Standard Indemnification"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tag (Optional)</label>
                                <input
                                    type="text"
                                    value={editingProvision?.tag || ''}
                                    onChange={e => setEditingProvision({ ...editingProvision, tag: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-indigo-600 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300"
                                    placeholder="e.g. strict, optional, v2"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Markdown Content</label>
                                <textarea
                                    required
                                    rows={10}
                                    value={editingProvision?.content || ''}
                                    onChange={e => setEditingProvision({ ...editingProvision, content: e.target.value })}
                                    className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none"
                                    placeholder="Write your provision text here..."
                                />
                            </div>
                        </div>
                        <footer className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                            <button type="button" onClick={() => setIsProvisionModalOpen(false)} className="px-6 py-2.5 text-slate-400 font-bold hover:text-slate-600 transition-colors">Cancel</button>
                            <button type="submit" className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-100 transition-all">
                                {editingProvision?.id ? 'Update Provision' : 'Create Provision'}
                            </button>
                        </footer>
                    </form>
                </div>
            )}

            {/* Cheat Sheet Modal */}
            {isCheatSheetOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200 p-10">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                        <header className="p-8 border-b border-slate-100 flex justify-between items-center bg-indigo-50/30">
                            <div>
                                <h2 className="text-xl font-black text-slate-800 tracking-tight">Syntax Cheat Sheet</h2>
                                <p className="text-sm font-medium text-slate-400 uppercase tracking-widest">DocAssemble Markdown Logic</p>
                            </div>
                            <button onClick={() => setIsCheatSheetOpen(false)} className="p-2 hover:bg-slate-200/50 rounded-xl transition-all">
                                <Icon name="X" />
                            </button>
                        </header>
                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8">
                            <div>
                                <h3 className="text-xs font-black uppercase tracking-widest text-indigo-500 mb-3">Structural Sections</h3>
                                <div className="space-y-2 font-mono text-xs bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <div className="flex justify-between border-b border-slate-100 pb-2"><span className="text-slate-400">[[Title|Category]]</span> <span className="text-slate-800">New Section</span></div>
                                    <div className="flex justify-between pt-2"><span className="text-slate-400">[[Title|Category|Tag]]</span> <span className="text-slate-800">With Tag</span></div>
                                    <p className="text-[10px] text-slate-400 italic mt-4 font-sans">Note: Sections define the logic and split points of your document.</p>
                                </div>
                            </div>
                            <div>
                                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Markdown Headers</h3>
                                <div className="space-y-2 font-mono text-xs bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <div className="flex justify-between border-b border-slate-100 pb-2"><span className="text-slate-400"># Title</span> <span className="text-slate-800">Heading 1</span></div>
                                    <div className="flex justify-between pt-2"><span className="text-slate-400">## Title</span> <span className="text-slate-800">Heading 2</span></div>
                                </div>
                            </div>
                            <div>
                                <h3 className="text-xs font-black uppercase tracking-widest text-emerald-500 mb-3">Variables</h3>
                                <div className="space-y-2 font-mono text-xs bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <div className="flex justify-between border-b border-slate-100 pb-2"><span className="text-slate-400">{"{variable_name}"}</span> <span className="text-slate-800">Simple Placeholder</span></div>
                                    <div className="flex justify-between pt-2"><span className="text-slate-400">{"{first_name}"}</span> <span className="text-slate-800">Dynamic Input</span></div>
                                </div>
                            </div>
                            <div>
                                <h3 className="text-xs font-black uppercase tracking-widest text-amber-500 mb-3">Loops (Lists)</h3>
                                <div className="space-y-2 font-mono text-xs bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <div className="text-slate-400 mb-2">{"{#foreach children}"}</div>
                                    <div className="text-slate-800 ml-4">Child Name: {"{name}"}</div>
                                    <div className="text-slate-400 mt-2">{"{/foreach}"}</div>
                                    <p className="text-[10px] text-slate-400 italic mt-4 font-sans">Wait: Loops iterate over an array of objects. Inside, you can reference sub-fields directly.</p>
                                </div>
                            </div>
                        </div>
                        <footer className="p-6 bg-slate-50 border-t border-slate-100 text-center">
                            <button onClick={() => setIsCheatSheetOpen(false)} className="px-8 py-3 bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 rounded-xl text-xs font-black uppercase tracking-widest transition-all">Got it</button>
                        </footer>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StructureEditor;
