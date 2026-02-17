<script>
    //import MattersDashboard from "$lib/components/MattersDashboard.svelte";
    import Icon from "$lib/components/Icon.svelte";
    import { goto } from "$app/navigation";
    let { data } = $props();
    let { matters } = data;

    function selectMatter(id) {
        goto(`/app/matters/${id}`);
    }
</script>

<div class="h-screen flex flex-col bg-slate-50 overflow-hidden">
    <main class="flex-1 overflow-hidden flex flex-col">
        {#if matters.length === 0}
            <div class="text-center py-24">
                <div
                    class="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300"
                >
                    <Icon name="Briefcase" size={40} />
                </div>
                <h3
                    class="text-lg font-black text-slate-400 uppercase tracking-widest mb-2"
                >
                    No Matters Found
                </h3>
                <p class="text-slate-400 text-sm">
                    Create your first matter to get started.
                </p>
            </div>
        {:else}
            <div
                class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            >
                {#each matters as matter (matter.id)}
                    <button
                        onclick={() => selectMatter(matter.id)}
                        class="bg-white border border-slate-200 hover:border-indigo-400 hover:shadow-xl hover:-translate-y-1 p-6 rounded-2xl cursor-pointer transition-all group h-48 flex flex-col justify-between relative overflow-hidden text-left bg-transparent"
                    >
                        <div
                            class="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-slate-50 to-indigo-50/50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-150 duration-700"
                        ></div>
                        <div class="relative z-10">
                            <div class="flex justify-between items-start mb-4">
                                <span
                                    class="w-10 h-10 rounded-lg bg-slate-50 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center transition-colors shadow-sm"
                                >
                                    <Icon name="Briefcase" size={18} />
                                </span>
                            </div>
                            <h3
                                class="font-bold text-lg text-slate-800 mb-1 leading-snug group-hover:text-indigo-700 transition-colors uppercase"
                            >
                                {matter.title}
                            </h3>
                            <p
                                class="text-xs font-bold text-slate-400 uppercase tracking-wider"
                            >
                                {matter.client ||
                                    matter.case_number ||
                                    "No Client"}
                            </p>
                        </div>
                        <div
                            class="relative z-10 pt-4 mt-auto border-t border-slate-50 flex justify-between items-center"
                        >
                            <span
                                class="text-[10px] font-bold text-slate-300 group-hover:text-indigo-400 transition-colors"
                                >View Documents →</span
                            >
                        </div>
                    </button>
                {/each}
            </div>
        {/if}
    </main>
</div>
