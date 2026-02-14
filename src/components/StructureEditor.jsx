import React, { useState, useEffect, useMemo } from 'react';
import Icon from './Icon';
import { extractStructureMetadata } from '../utils';

const StructureEditor = ({ pb, initialStructure, onSave, onBack }) => {
    const [title, setTitle] = useState(initialStructure?.title || 'New Structure');
    const [content, setContent] = useState(initialStructure?.content || '');
    const [isSaving, setIsSaving] = useState(false);
    const [isCheatSheetOpen, setIsCheatSheetOpen] = useState(false);

    const metadata = useMemo(() => extractStructureMetadata(content), [content]);

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
            const data = {
                title,
                content,
                category: 'Structure',
                tags: []
            };

            if (initialStructure?.id) {
                await pb.collection('templates').update(initialStructure.id, data);
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
                            placeholder="# Write your structure here...
                            
Use {variable_name} for variables.
Use # for Sections.
Use {#foreach list}...{/foreach} for loops."
                            spellCheck={false}
                        />
                    </div>
                </div>

                {/* Sidebar */}
                <div className="w-80 flex flex-col bg-slate-50 overflow-hidden shrink-0">
                    <div className="p-6 overflow-y-auto custom-scrollbar h-full space-y-8">
                        {/* Sections Area */}
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <Icon name="Hash" size={16} className="text-indigo-500" />
                                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Sections</h3>
                            </div>
                            <div className="space-y-1">
                                {metadata.sections.length > 0 ? (
                                    metadata.sections.map((s, i) => (
                                        <div key={i} className={`text-xs p-2 rounded-lg bg-white border border-slate-100 shadow-sm font-bold text-slate-600 ${s.level > 1 ? 'ml-4 opacity-70' : ''}`}>
                                            {s.title}
                                        </div>
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

                        {/* Loops Area */}
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <Icon name="Repeat" size={16} className="text-amber-500" />
                                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Loops</h3>
                            </div>
                            <div className="space-y-2">
                                {metadata.loops.length > 0 ? (
                                    metadata.loops.map((l, i) => (
                                        <div key={i} className="text-[10px] font-black p-2 bg-amber-50 border border-amber-100 text-amber-700 rounded-lg">
                                            List: {l}
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-[10px] italic text-slate-300">No loops found</div>
                                )}
                            </div>
                        </div>

                        <div className="pt-8 border-t border-slate-200">
                            <p className="text-[10px] text-slate-300 font-medium">DocAssemble Markdown Structure Editor v1.0. Variables and sections are extracted in real-time as you type.</p>
                        </div>
                    </div>
                </div>
            </div>

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
                                <h3 className="text-xs font-black uppercase tracking-widest text-indigo-500 mb-3">Sections & Titles</h3>
                                <div className="space-y-2 font-mono text-xs bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <div className="flex justify-between border-b border-slate-100 pb-2"><span className="text-slate-400"># Title</span> <span className="text-slate-800">Main Header</span></div>
                                    <div className="flex justify-between border-b border-slate-100 py-2"><span className="text-slate-400">## Title</span> <span className="text-slate-800">Secondary Header</span></div>
                                    <div className="flex justify-between pt-2"><span className="text-slate-400">### Title</span> <span className="text-slate-800">Third Level</span></div>
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
