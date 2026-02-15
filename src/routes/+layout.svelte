<script>
	import "../app.css";
	import { onMount } from "svelte";
	import { pb } from "$lib/pocketbase";
	import { user, structures, snippets, matters } from "$lib/stores/app";
	import { browser } from "$app/environment";

	let { children } = $props();

	onMount(() => {
		if (!browser) return;

		// Sync user state from PB AuthStore
		if (pb.authStore.isValid) {
			user.set(pb.authStore.record);
			loadData();
		}

		const unsubscribe = pb.authStore.onChange((token, model) => {
			user.set(model);
			if (model) loadData();
		});

		return () => {
			unsubscribe();
		};
	});

	async function loadData() {
		try {
			const templatesRecs = await pb
				.collection("templates")
				.getFullList({ sort: "title" });
			const allItems = templatesRecs.map((t) => ({
				id: t.id,
				category: t.category,
				title: t.title,
				content: t.content,
				state: t.state || t.description,
				tag: Array.isArray(t.tags) ? t.tags[0] || "" : t.tags || "",
			}));

			structures.set(allItems.filter((i) => i.category === "Structure"));
			snippets.set(allItems.filter((i) => i.category !== "Structure"));

			const matterList = await pb
				.collection("matters")
				.getFullList({ sort: "-created" });
			matters.set(matterList);
		} catch (err) {
			console.error("Error loading PB data", err);
		}
	}
</script>

{@render children()}
