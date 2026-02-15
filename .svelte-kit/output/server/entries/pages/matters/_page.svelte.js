import "clsx";
import { s as store_get, e as escape_html, b as ensure_array_like, u as unsubscribe_stores } from "../../../chunks/root.js";
import { I as Icon, a as activeMatter, m as matters } from "../../../chunks/Icon.js";
import "../../../chunks/pocketbase.js";
import { T as TopNav } from "../../../chunks/TopNav.js";
import "@sveltejs/kit/internal";
import "../../../chunks/exports.js";
import "../../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../../chunks/state.svelte.js";
function MattersDashboard($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let documents = [];
    if (store_get($$store_subs ??= {}, "$activeMatter", activeMatter)) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="flex-1 flex flex-col bg-slate-50 overflow-hidden"><div class="bg-white border-b border-slate-200 px-8 py-4 sticky top-0 z-10 flex justify-between items-center"><div class="flex items-center gap-6"><button class="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-all border-none bg-transparent cursor-pointer" title="Back to Matters">`);
      Icon($$renderer2, { name: "ArrowLeft", size: 20 });
      $$renderer2.push(`<!----></button> <div class="h-8 w-px bg-slate-100"></div> <div><h1 class="text-xl font-black text-slate-800 tracking-tight leading-none mb-1">${escape_html(store_get($$store_subs ??= {}, "$activeMatter", activeMatter)?.title || "Unknown Matter")}</h1> <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">${escape_html(store_get($$store_subs ??= {}, "$activeMatter", activeMatter)?.client || store_get($$store_subs ??= {}, "$activeMatter", activeMatter)?.case_number || "No Client")}</p></div></div> <button class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 transition-all flex items-center gap-2 border-none cursor-pointer">`);
      Icon($$renderer2, { name: "Plus", size: 14 });
      $$renderer2.push(`<!----> New Document</button></div> <div class="flex-1 overflow-y-auto p-8 custom-scrollbar">`);
      if (documents.length === 0) {
        $$renderer2.push("<!--[1-->");
        $$renderer2.push(`<div class="text-center py-20 bg-white rounded-xl border border-dashed border-slate-200"><div class="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">`);
        Icon($$renderer2, { name: "FileText", size: 32 });
        $$renderer2.push(`<!----></div> <h3 class="text-sm font-black uppercase tracking-widest text-slate-400">No Documents Yet</h3> <button class="mt-4 text-indigo-600 hover:text-indigo-700 text-xs font-bold underline bg-transparent border-none cursor-pointer">Create your first document</button></div>`);
      } else {
        $$renderer2.push("<!--[!-->");
        $$renderer2.push(`<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"><!--[-->`);
        const each_array = ensure_array_like(documents);
        for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
          let doc = each_array[$$index];
          $$renderer2.push(`<div role="button" tabindex="0" class="group relative bg-white border border-slate-200 rounded-xl p-5 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between h-48 text-left"><div class="flex items-start justify-between w-full"><div class="p-3 bg-indigo-50 text-indigo-600 rounded-lg">`);
          Icon($$renderer2, { name: "FileText", size: 20 });
          $$renderer2.push(`<!----></div> <div class="opacity-0 group-hover:opacity-100 transition-all flex gap-1"><button title="Copy Text" class="p-1.5 text-slate-400 hover:text-indigo-600 bg-slate-50 hover:bg-white rounded-lg border border-transparent hover:border-slate-100 shadow-sm transition-all cursor-pointer">`);
          Icon($$renderer2, { name: "Copy", size: 14 });
          $$renderer2.push(`<!----></button> <button title="Export PDF" class="p-1.5 text-slate-400 hover:text-red-500 bg-slate-50 hover:bg-white rounded-lg border border-transparent hover:border-slate-100 shadow-sm transition-all cursor-pointer">`);
          Icon($$renderer2, { name: "File", size: 14 });
          $$renderer2.push(`<!----></button> <button title="Export DOCX" class="p-1.5 text-slate-400 hover:text-blue-500 bg-slate-50 hover:bg-white rounded-lg border border-transparent hover:border-slate-100 shadow-sm transition-all cursor-pointer">`);
          Icon($$renderer2, { name: "FileText", size: 14 });
          $$renderer2.push(`<!----></button></div></div> <div><h3 class="font-bold text-slate-800 text-sm mb-1 line-clamp-2 leading-relaxed">${escape_html(doc.title || "Untitled Document")}</h3> <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Last Edited ${escape_html(new Date(doc.updated).toLocaleDateString())}</p></div></div>`);
        }
        $$renderer2.push(`<!--]--></div>`);
      }
      $$renderer2.push(`<!--]--></div></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<div class="flex-1 flex flex-col bg-slate-50 overflow-hidden"><div class="bg-white border-b border-slate-200 px-10 py-6 sticky top-0 z-10 flex justify-between items-center"><div><h2 class="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">General Matters</h2></div> <button class="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg transition-all flex items-center gap-2 border-none cursor-pointer">`);
      Icon($$renderer2, { name: "Plus", size: 16 });
      $$renderer2.push(`<!----> New Matter</button></div> <div class="flex-1 overflow-y-auto p-10 custom-scrollbar">`);
      {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--> `);
      if (store_get($$store_subs ??= {}, "$matters", matters).length === 0) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<div class="text-center py-24"><div class="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">`);
        Icon($$renderer2, { name: "Briefcase", size: 40 });
        $$renderer2.push(`<!----></div> <h3 class="text-lg font-black text-slate-400 uppercase tracking-widest mb-2">No Matters Found</h3> <p class="text-slate-400 text-sm">Create your first matter to get started.</p></div>`);
      } else {
        $$renderer2.push("<!--[!-->");
        $$renderer2.push(`<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"><!--[-->`);
        const each_array_1 = ensure_array_like(store_get($$store_subs ??= {}, "$matters", matters));
        for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
          let matter = each_array_1[$$index_1];
          $$renderer2.push(`<button class="bg-white border border-slate-200 hover:border-indigo-400 hover:shadow-xl hover:-translate-y-1 p-6 rounded-2xl cursor-pointer transition-all group h-48 flex flex-col justify-between relative overflow-hidden text-left bg-transparent"><div class="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-slate-50 to-indigo-50/50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-150 duration-700"></div> <div class="relative z-10"><div class="flex justify-between items-start mb-4"><span class="w-10 h-10 rounded-lg bg-slate-50 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center transition-colors shadow-sm">`);
          Icon($$renderer2, { name: "Briefcase", size: 18 });
          $$renderer2.push(`<!----></span></div> <h3 class="font-bold text-lg text-slate-800 mb-1 leading-snug group-hover:text-indigo-700 transition-colors uppercase">${escape_html(matter.title)}</h3> <p class="text-xs font-bold text-slate-400 uppercase tracking-wider">${escape_html(matter.client || matter.case_number || "No Client")}</p></div> <div class="relative z-10 pt-4 mt-auto border-t border-slate-50 flex justify-between items-center"><span class="text-[10px] font-bold text-slate-300 group-hover:text-indigo-400 transition-colors">View Documents →</span></div></button>`);
        }
        $$renderer2.push(`<!--]--></div>`);
      }
      $$renderer2.push(`<!--]--></div></div>`);
    }
    $$renderer2.push(`<!--]-->`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    $$renderer2.push(`<div class="h-screen flex flex-col bg-slate-50 overflow-hidden">`);
    TopNav($$renderer2);
    $$renderer2.push(`<!----> <main class="flex-1 overflow-hidden flex flex-col">`);
    MattersDashboard($$renderer2);
    $$renderer2.push(`<!----></main></div>`);
  });
}
export {
  _page as default
};
