import React from 'react';
import Icon from './Icon';

const TopNav = ({ user, viewMode, onNavigate, onLogout, activeMatter }) => {
    return (
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-50 shadow-sm relative">
            <div className="flex items-center gap-8">
                {/* Logo */}
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => onNavigate('dashboard')}>
                    <div className="bg-indigo-600 text-white p-2 rounded-xl shadow-lg shadow-indigo-100 flex items-center justify-center">
                        <Icon name="FileText" size={20} />
                    </div>
                    <span className="text-lg font-black tracking-tighter text-slate-800 hidden sm:inline">DocAssemble</span>
                </div>

                {/* Primary Navigation */}
                <nav className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/50">
                    <button
                        onClick={() => onNavigate('dashboard')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'dashboard' || (viewMode === 'assemble' && activeMatter)
                                ? 'bg-white text-indigo-600 shadow-sm'
                                : 'text-slate-400 hover:text-slate-600'
                            }`}
                    >
                        <Icon name="Briefcase" size={14} />
                        <span>Matters</span>
                    </button>
                    <button
                        onClick={() => onNavigate('structures-dashboard')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'structures-dashboard' || viewMode === 'structure-editor'
                                ? 'bg-white text-indigo-600 shadow-sm'
                                : 'text-slate-400 hover:text-slate-600'
                            }`}
                    >
                        <Icon name="FileCode" size={14} />
                        <span>Templates</span>
                    </button>
                </nav>

                {/* Breadcrumb for Active Matter/Document if in Editor */}
                {viewMode === 'assemble' && activeMatter && (
                    <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
                        <Icon name="ChevronRight" size={16} className="text-slate-200" />
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100/50">
                            <Icon name="FileText" size={14} />
                            <span className="text-xs font-bold max-w-[150px] truncate">
                                {activeMatter.title}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex items-center gap-4">
                {/* User Profile */}
                <div className="flex items-center gap-3 pl-4 border-l border-slate-100">
                    <div className="text-right hidden sm:block">
                        <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest leading-none mb-1">{user?.email?.split('@')[0] || 'User'}</p>
                        <p className="text-[9px] font-medium text-slate-400 leading-none">{user?.email || ''}</p>
                    </div>
                    <div className="w-9 h-9 flex items-center justify-center bg-slate-100 rounded-xl text-slate-400 border border-slate-200/50 relative group cursor-pointer hover:bg-slate-200 transition-colors">
                        <Icon name="User" size={18} />
                        {/* Logout Mini Tooltip/Menu */}
                        <div onClick={onLogout} className="absolute top-full right-0 mt-2 p-2 bg-white border border-slate-200 rounded-xl shadow-xl hidden group-hover:block hover:bg-red-50 transition-colors z-[100] w-32 animate-in fade-in slide-in-from-top-1">
                            <button className="flex items-center gap-2 w-full text-left text-[10px] font-black uppercase text-slate-600 hover:text-red-600 transition-colors">
                                <Icon name="LogOut" size={14} /> Sign Out
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default TopNav;
