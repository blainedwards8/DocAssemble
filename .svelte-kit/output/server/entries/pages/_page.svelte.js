import { a as attr, s as store_get, u as unsubscribe_stores } from "../../chunks/root.js";
import "@sveltejs/kit/internal";
import "../../chunks/exports.js";
import "../../chunks/utils.js";
import "clsx";
import "@sveltejs/kit/internal/server";
import "../../chunks/state.svelte.js";
import "../../chunks/pocketbase.js";
import { I as Icon, u as user } from "../../chunks/Icon.js";
function Login($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let email = "";
    let password = "";
    let loading = false;
    $$renderer2.push(`<div class="min-h-screen flex items-center justify-center bg-slate-100"><div class="bg-white p-10 rounded-2xl shadow-xl w-full max-w-md border border-slate-200"><div class="flex flex-col items-center mb-8 gap-4"><div class="bg-indigo-600 p-3 rounded-xl text-white shadow-lg">`);
    Icon($$renderer2, { name: "Layout", size: 32 });
    $$renderer2.push(`<!----></div> <h1 class="text-2xl font-black text-slate-800 uppercase tracking-tight">DocAssemble</h1></div> <form class="space-y-6"><div><label class="block text-xs font-black uppercase text-slate-400 mb-2 tracking-widest">Email</label> <input type="email" required=""${attr("value", email)} class="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all font-medium" placeholder="attorney@firm.com"/></div> <div><label class="block text-xs font-black uppercase text-slate-400 mb-2 tracking-widest">Password</label> <input type="password" required=""${attr("value", password)} class="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all font-medium" placeholder="••••••••"/></div> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <button type="submit"${attr("disabled", loading, true)} class="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-black uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">`);
    {
      $$renderer2.push("<!--[!-->");
      Icon($$renderer2, { name: "LogIn" });
      $$renderer2.push(`<!----> <span>Sign In</span>`);
    }
    $$renderer2.push(`<!--]--></button></form></div></div>`);
  });
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    if (!store_get($$store_subs ??= {}, "$user", user)) {
      $$renderer2.push("<!--[-->");
      Login($$renderer2);
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<div class="h-screen flex items-center justify-center bg-slate-50"><p class="text-slate-400 font-bold animate-pulse uppercase tracking-widest text-xs">Redirecting to Dashboard...</p></div>`);
    }
    $$renderer2.push(`<!--]-->`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _page as default
};
