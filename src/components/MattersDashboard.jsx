import React, { useState, useEffect } from 'react';
import Icon from './Icon';

const MattersDashboard = ({ pb, matters, activeMatterId, onSelectMatter, onCreateMatter, onOpenDocument, onNewDocument }) => {
    const [documents, setDocuments] = useState([]);
    const [isLoadingDocs, setIsLoadingDocs] = useState(false);
    const [isCreatingMatter, setIsCreatingMatter] = useState(false);
    const [newMatterName, setNewMatterName] = useState('');
    const [newMatterClient, setNewMatterClient] = useState('');

    // Fetch documents when activeMatterId changes
    useEffect(() => {
        if (activeMatterId) {
            fetchDocuments(activeMatterId);
        } else {
            setDocuments([]);
        }
    }, [activeMatterId]);

    const fetchDocuments = async (matterId) => {
        setIsLoadingDocs(true);
        try {
            const records = await pb.collection('documents').getList(1, 50, {
                filter: `matter = "${matterId}"`,
                sort: '-created',
            });
            setDocuments(records.items);
        } catch (err) {
            console.error("Error fetching documents:", err);
        } finally {
            setIsLoadingDocs(false);
        }
    };

    const handleCreateMatter = (e) => {
        e.preventDefault();
        // Use 'title' to match existing schema if possible, or support both.
        // Assuming schema uses title based on App.jsx usage.
        onCreateMatter({ title: newMatterName, client: newMatterClient, case_number: newMatterClient });
        setIsCreatingMatter(false);
        setNewMatterName('');
        setNewMatterClient('');
    };

    if (activeMatterId) {
        const activeMatter = matters.find(m => m.id === activeMatterId);
        return (
            <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
                {/* Header */}
                <header className="bg-white border-b border-slate-200 px-8 py-6 sticky top-0 z-10">
                    <button onClick={() => onSelectMatter(null)} className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-indigo-600 mb-4 transition-colors">
                        <Icon name="ArrowLeft" size={14} /> BACK TO MATTERS
                    </button>
                    <div className="flex justify-between items-end">
                        <div className="space-y-1">
                            <h1 className="text-2xl font-black text-slate-800 tracking-tight">{activeMatter?.title || 'Unknown Matter'}</h1>
                            <p className="text-sm font-medium text-slate-400">{activeMatter?.client || activeMatter?.case_number || 'No Client'}</p>
                        </div>
                        <button onClick={onNewDocument} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-200 transition-all flex items-center gap-2">
                            <Icon name="Plus" size={16} /> New Document
                        </button>
                    </div>
                </header>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {/* Documents Grid */}
                    {isLoadingDocs ? (
                        <div className="flex bg-white rounded-xl p-8 items-center justify-center gap-2 text-sm text-slate-400 font-medium border border-slate-100 shadow-sm animate-pulse">
                            <Icon name="Loader2" className="animate-spin" /> Loading Documents...
                        </div>
                    ) : documents.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-200">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                                <Icon name="FileText" size={32} />
                            </div>
                            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">No Documents Yet</h3>
                            <button onClick={onNewDocument} className="mt-4 text-indigo-600 hover:text-indigo-700 text-xs font-bold underline">Create your first document</button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {documents.map(doc => (
                                <div key={doc.id} className="group relative bg-white border border-slate-200 rounded-xl p-5 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between h-48" onClick={() => onOpenDocument(doc)}>
                                    <div className="flex items-start justify-between">
                                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
                                            <Icon name="FileText" size={20} />
                                        </div>
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button className="p-1.5 text-slate-300 hover:text-indigo-600 bg-slate-50 hover:bg-white rounded-lg border border-transparent hover:border-slate-100 shadow-sm"><Icon name="MoreHorizontal" size={16} /></button>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800 text-sm mb-1 line-clamp-2 leading-relaxed">{doc.title || 'Untitled Document'}</h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Last Edited {new Date(doc.updated).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
            {/* Dashboard Header */}
            <header className="bg-white border-b border-slate-200 px-10 py-8 sticky top-0 z-10 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tighter mb-1">Matters</h1>
                    <p className="text-sm font-medium text-slate-400">Manage your clients and cases</p>
                </div>
                <button onClick={() => setIsCreatingMatter(true)} className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg transition-all flex items-center gap-2">
                    <Icon name="Plus" size={16} /> New Matter
                </button>
            </header>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                {isCreatingMatter && (
                    <div className="mb-8 bg-white p-6 rounded-2xl border border-indigo-100 shadow-lg animate-in slide-in-from-top-4">
                        <form onSubmit={handleCreateMatter} className="flex gap-4 items-end">
                            <div className="flex-1 space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Matter Name</label>
                                <input autoFocus type="text" value={newMatterName} onChange={e => setNewMatterName(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-300" placeholder="e.g. Smith Divorce" required />
                            </div>
                            <div className="flex-1 space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Case Number / Client</label>
                                <input type="text" value={newMatterClient} onChange={e => setNewMatterClient(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-300" placeholder="e.g. 2023-CV-12345" />
                            </div>
                            <div className="flex gap-2">
                                <button type="button" onClick={() => setIsCreatingMatter(false)} className="px-5 py-3 text-slate-400 hover:text-slate-600 font-bold bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-xs uppercase tracking-wide transition-all">Cancel</button>
                                <button type="submit" className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-md hover:shadow-lg transition-all">Create Matter</button>
                            </div>
                        </form>
                    </div>
                )}

                {matters.length === 0 ? (
                    <div className="text-center py-24">
                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
                            <Icon name="Briefcase" size={40} />
                        </div>
                        <h3 className="text-lg font-black text-slate-400 uppercase tracking-widest mb-2">No Matters Found</h3>
                        <p className="text-slate-400 text-sm">Create your first matter to get started.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {matters.map(matter => (
                            <div key={matter.id} onClick={() => onSelectMatter(matter.id)} className="bg-white border border-slate-200 hover:border-indigo-400 hover:shadow-xl hover:-translate-y-1 p-6 rounded-2xl cursor-pointer transition-all group h-48 flex flex-col justify-between relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-slate-50 to-indigo-50/50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-150 duration-700"></div>
                                <div className="relative z-10">
                                    <div className="flex justify-between items-start mb-4">
                                        <span className="w-10 h-10 rounded-lg bg-slate-50 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center transition-colors shadow-sm">
                                            <Icon name="Briefcase" size={18} />
                                        </span>
                                        {/* <span className="text-[10px] font-black bg-emerald-50 text-emerald-600 px-2 py-1 rounded">ACTIVE</span> */}
                                    </div>
                                    <h3 className="font-bold text-lg text-slate-800 mb-1 leading-snug group-hover:text-indigo-700 transition-colors">{matter.title}</h3>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{matter.client || matter.case_number || 'No Client'}</p>
                                </div>
                                <div className="relative z-10 pt-4 mt-auto border-t border-slate-50 flex justify-between items-center">
                                    <span className="text-[10px] font-bold text-slate-300 group-hover:text-indigo-400 transition-colors">View Documents →</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MattersDashboard;
