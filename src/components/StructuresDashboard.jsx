import React, { useState, useEffect } from 'react';
import Icon from './Icon';

const StructuresDashboard = ({ pb, structures, onEditStructure, onCreateStructure, onBack }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredStructures = structures.filter(s =>
        s.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
            {/* Toolbar Area */}
            <div className="bg-white border-b border-slate-200 px-10 py-6 sticky top-0 z-10">
                <div className="flex justify-between items-center">
                    <div className="relative flex-1 max-w-xl">
                        <Icon name="Search" className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search templates..."
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-300"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-4 ml-6">
                        <button onClick={onCreateStructure} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-100 transition-all flex items-center gap-2">
                            <Icon name="Plus" size={16} /> New Template
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                {filteredStructures.length === 0 ? (
                    <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-slate-200">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300 font-black">
                            <Icon name="FileText" size={40} />
                        </div>
                        <h3 className="text-lg font-black text-slate-400 uppercase tracking-widest mb-2">No Templates Found</h3>
                        <p className="text-slate-400 text-sm mb-6">Create your first document structure to get started.</p>
                        <button onClick={onCreateStructure} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg transition-all">
                            Create First Template
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredStructures.map(structure => (
                            <div
                                key={structure.id}
                                onClick={() => onEditStructure(structure)}
                                className="bg-white border border-slate-200 hover:border-indigo-400 hover:shadow-xl hover:-translate-y-1 p-6 rounded-2xl cursor-pointer transition-all group h-48 flex flex-col justify-between relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-slate-50 to-indigo-50/50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-150 duration-700"></div>
                                <div className="relative z-10">
                                    <div className="flex justify-between items-start mb-4">
                                        <span className="w-10 h-10 rounded-lg bg-slate-50 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center transition-colors shadow-sm">
                                            <Icon name="Settings" size={18} />
                                        </span>
                                    </div>
                                    <h3 className="font-bold text-lg text-slate-800 mb-1 leading-snug group-hover:text-indigo-700 transition-colors">{structure.title}</h3>
                                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Type: Markdown Structure</p>
                                </div>
                                <div className="relative z-10 pt-4 mt-auto border-t border-slate-50 flex justify-between items-center text-[10px] font-bold">
                                    <span className="text-slate-300 group-hover:text-indigo-400 transition-colors">Edit Content →</span>
                                    <span className="text-slate-200 italic">{structure.updated?.split('T')[0]}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default StructuresDashboard;
