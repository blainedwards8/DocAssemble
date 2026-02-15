import "clsx";
import "@sveltejs/kit/internal";
import "../../../../chunks/exports.js";
import "../../../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../../../chunks/root.js";
import "../../../../chunks/state.svelte.js";
import "../../../../chunks/pocketbase.js";
import { T as TopNav } from "../../../../chunks/TopNav.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    $$renderer2.push(`<div class="h-screen flex flex-col bg-slate-50 overflow-hidden">`);
    TopNav($$renderer2);
    $$renderer2.push(`<!----> <main class="flex-1 overflow-hidden flex flex-col">`);
    {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="flex-1 flex items-center justify-center"><p class="text-slate-400 font-bold animate-pulse">Loading editor...</p></div>`);
    }
    $$renderer2.push(`<!--]--></main></div>`);
  });
}
export {
  _page as default
};
