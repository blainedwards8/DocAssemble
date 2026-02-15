import { g as getContext, s as store_get, c as attr_class, e as escape_html, u as unsubscribe_stores } from "./root.js";
import { I as Icon, a as activeMatter, u as user } from "./Icon.js";
import "./pocketbase.js";
import "clsx";
import "@sveltejs/kit/internal";
import "./exports.js";
import "./utils.js";
import "@sveltejs/kit/internal/server";
import "./state.svelte.js";
const getStores = () => {
  const stores$1 = getContext("__svelte__");
  return {
    /** @type {typeof page} */
    page: {
      subscribe: stores$1.page.subscribe
    },
    /** @type {typeof navigating} */
    navigating: {
      subscribe: stores$1.navigating.subscribe
    },
    /** @type {typeof updated} */
    updated: stores$1.updated
  };
};
const page = {
  subscribe(fn) {
    const store = getStores().page;
    return store.subscribe(fn);
  }
};
function TopNav($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let currentPath = store_get($$store_subs ??= {}, "$page", page).url.pathname;
    $$renderer2.push(`<header class="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-50 shadow-sm relative"><div class="flex items-center gap-8"><a href="/" class="flex items-center gap-2 cursor-pointer border-none bg-transparent p-0 no-underline"><div class="bg-indigo-600 text-white p-2 rounded-xl shadow-lg shadow-indigo-100 flex items-center justify-center">`);
    Icon($$renderer2, { name: "FileText", size: 20 });
    $$renderer2.push(`<!----></div> <span class="text-lg font-black tracking-tighter text-slate-800 hidden sm:inline">DocAssemble</span></a> <nav class="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/50"><a href="/matters"${attr_class(`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all no-underline ${currentPath.startsWith("/matters") || currentPath.startsWith("/edit") ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`)}>`);
    Icon($$renderer2, { name: "Briefcase", size: 14 });
    $$renderer2.push(`<!----> <span>Matters</span></a> <a href="/templates"${attr_class(`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all no-underline ${currentPath.startsWith("/templates") ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`)}>`);
    Icon($$renderer2, { name: "FileCode", size: 14 });
    $$renderer2.push(`<!----> <span>Templates</span></a></nav> `);
    if (currentPath.startsWith("/edit") && store_get($$store_subs ??= {}, "$activeMatter", activeMatter)) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-300">`);
      Icon($$renderer2, { name: "ChevronRight", size: 16, class: "text-slate-200" });
      $$renderer2.push(`<!----> <div class="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100/50">`);
      Icon($$renderer2, { name: "FileText", size: 14 });
      $$renderer2.push(`<!----> <span class="text-xs font-bold max-w-[150px] truncate">${escape_html(store_get($$store_subs ??= {}, "$activeMatter", activeMatter).title)}</span></div></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div> <div class="flex items-center gap-4"><div class="flex items-center gap-3 pl-4 border-l border-slate-100"><div class="text-right hidden sm:block"><p class="text-[10px] font-black text-slate-800 uppercase tracking-widest leading-none mb-1">${escape_html(store_get($$store_subs ??= {}, "$user", user)?.email?.split("@")[0] || "User")}</p> <p class="text-[9px] font-medium text-slate-400 leading-none">${escape_html(store_get($$store_subs ??= {}, "$user", user)?.email || "")}</p></div> <div class="w-9 h-9 flex items-center justify-center bg-slate-100 rounded-xl text-slate-400 border border-slate-200/50 relative group cursor-pointer hover:bg-slate-200 transition-colors">`);
    Icon($$renderer2, { name: "User", size: 18 });
    $$renderer2.push(`<!----> <div class="absolute top-full right-0 mt-2 p-2 bg-white border border-slate-200 rounded-xl shadow-xl hidden group-hover:block hover:bg-red-50 transition-colors z-[100] w-32 animate-in fade-in slide-in-from-top-1"><button class="flex items-center gap-2 w-full text-left text-[10px] font-black uppercase text-slate-600 hover:text-red-600 transition-colors bg-transparent border-none p-0 cursor-pointer">`);
    Icon($$renderer2, { name: "LogOut", size: 14 });
    $$renderer2.push(`<!----> Sign Out</button></div></div></div></div></header>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  TopNav as T
};
