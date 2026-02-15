import "clsx";
import { s as store_get, a as attr, b as ensure_array_like, e as escape_html, u as unsubscribe_stores } from "../../../chunks/root.js";
import { I as Icon, s as structures } from "../../../chunks/Icon.js";
import { T as TopNav } from "../../../chunks/TopNav.js";
import "@sveltejs/kit/internal";
import "../../../chunks/exports.js";
import "../../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../../chunks/state.svelte.js";
function StructuresDashboard($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let searchTerm = "";
    let filteredStructures = store_get($$store_subs ??= {}, "$structures", structures).filter((s) => s.title.toLowerCase().includes(searchTerm.toLowerCase()));
    $$renderer2.push(`<div class="flex-1 flex flex-col bg-slate-50 overflow-hidden"><div class="bg-white border-b border-slate-200 px-10 py-6 sticky top-0 z-10"><div class="flex justify-between items-center"><div class="relative flex-1 max-w-xl">`);
    Icon($$renderer2, {
      name: "Search",
      class: "absolute left-4 top-1/2 -translate-y-1/2 text-slate-400",
      size: 18
    });
    $$renderer2.push(`<!----> <input type="text" placeholder="Search templates..." class="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-300"${attr("value", searchTerm)}/></div> <div class="flex gap-4 ml-6"><button class="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-100 transition-all flex items-center gap-2 border-none cursor-pointer">`);
    Icon($$renderer2, { name: "Plus", size: 16 });
    $$renderer2.push(`<!----> New Template</button></div></div></div> <div class="flex-1 overflow-y-auto p-10 custom-scrollbar">`);
    if (filteredStructures.length === 0) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="text-center py-24 bg-white rounded-3xl border border-dashed border-slate-200"><div class="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300 font-black">`);
      Icon($$renderer2, { name: "FileText", size: 40 });
      $$renderer2.push(`<!----></div> <h3 class="text-lg font-black text-slate-400 uppercase tracking-widest mb-2">No Templates Found</h3> <p class="text-slate-400 text-sm mb-6">Create your first document structure to get started.</p> <button class="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg transition-all border-none cursor-pointer">Create First Template</button></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"><!--[-->`);
      const each_array = ensure_array_like(filteredStructures);
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        let structure = each_array[$$index];
        $$renderer2.push(`<button class="bg-white border border-slate-200 hover:border-indigo-400 hover:shadow-xl hover:-translate-y-1 p-6 rounded-2xl cursor-pointer transition-all group h-48 flex flex-col justify-between relative overflow-hidden text-left bg-transparent"><div class="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-slate-50 to-indigo-50/50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-150 duration-700"></div> <div class="relative z-10"><div class="flex justify-between items-start mb-4"><span class="w-10 h-10 rounded-lg bg-slate-50 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center transition-colors shadow-sm">`);
        Icon($$renderer2, { name: "Settings", size: 18 });
        $$renderer2.push(`<!----></span></div> <h3 class="font-bold text-lg text-slate-800 mb-1 leading-snug group-hover:text-indigo-700 transition-colors uppercase">${escape_html(structure.title)}</h3> <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest">Type: Markdown Structure</p></div> <div class="relative z-10 pt-4 mt-auto border-t border-slate-50 flex justify-between items-center text-[10px] font-bold"><span class="text-slate-300 group-hover:text-indigo-400 transition-colors uppercase">Edit Content →</span> <span class="text-slate-200 italic">${escape_html(structure.updated?.split("T")[0])}</span></div></button>`);
      }
      $$renderer2.push(`<!--]--></div>`);
    }
    $$renderer2.push(`<!--]--></div></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    $$renderer2.push(`<div class="h-screen flex flex-col bg-slate-50 overflow-hidden">`);
    TopNav($$renderer2);
    $$renderer2.push(`<!----> <main class="flex-1 overflow-hidden flex flex-col">`);
    StructuresDashboard($$renderer2);
    $$renderer2.push(`<!----></main></div>`);
  });
}
export {
  _page as default
};
