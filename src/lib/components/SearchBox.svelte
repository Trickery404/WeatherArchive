<script>
	import { createEventDispatcher } from 'svelte';

	export let capitals = [];
	export let placeholder = 'Search city...';
	export let value = '';

	const dispatch = createEventDispatcher();
	let error = '';

	const slug = (s) => s.toLowerCase().replace(/\s+/g, '-');

	function submit() {
		const hit = capitals.find(
			(c) => c.toLowerCase() === value.trim().toLowerCase()
		);
		if (hit) {
			error = '';
			dispatch('select', { city: hit, slug: slug(hit) });
		} else {
			error = 'This input is not part of the list of capitals. Please try again.';
		}
	}

	function handleInput(e) {
		const v = e.target.value;
		error = '';
		dispatch('input', v);
	}
</script>

<div class="w-full max-w-3xl">
	<div class="flex gap-2">
		<input
			value={value}
			on:input={handleInput}
			on:keydown={(e) => e.key === 'Enter' && submit()}
			{placeholder}
			class="flex-1 rounded-xl border border-stone-300 bg-white px-5 py-4"
		/>
		<button type="button" on:click={submit} class="rounded-xl px-5 py-4 bg-black text-white">
			Search
		</button>
	</div>

	{#if error}
		<p class="mt-2 text-sm text-red-500">{error}</p>
	{/if}
</div>


