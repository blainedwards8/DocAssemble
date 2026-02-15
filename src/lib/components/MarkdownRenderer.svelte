<script>
    import { resolveVariables, parseMarkdown } from "$lib/utils/utils.js";

    let {
        content,
        variables = {},
        startOffset = 1,
        continuous = false,
        tierStyles = [],
        class: className = "",
        onVariableClick,
    } = $props();

    let resolved = $derived(resolveVariables(content, variables));
    let htmlContent = $derived(
        parseMarkdown(resolved, startOffset, continuous, tierStyles),
    );

    /** @param {MouseEvent} e */
    function handleClick(e) {
        const target = /** @type {HTMLElement} */ (e.target).closest(
            "[data-variable]",
        );
        if (target && onVariableClick) {
            e.stopPropagation();
            const rect = target.getBoundingClientRect();
            const variablePath = target.getAttribute("data-variable");
            if (variablePath) {
                onVariableClick(variablePath, rect);
            }
        }
    }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
    onclick={handleClick}
    class={`markdown-content prose prose-slate max-w-none ${className}`}
>
    {@html htmlContent}
</div>
