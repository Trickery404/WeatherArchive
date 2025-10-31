<script lang="ts">
	export let placeholder = 'Search city...';
	export let suggestions: string[] = [];
	export let value = '';
	export let onSubmit: (q: string) => void;

	// two-way binding API
	export { value as modelValue };
</script>

<div class="w-full max-w-3xl">
	<div class="flex gap-2">
		<input
			class="flex-1 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/40
             px-5 py-4 focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
			{placeholder}
			bind:value
			on:keydown={(e) => e.key === 'Enter' && onSubmit?.(value)}
			aria-label="Search city"
		/>
		<button
			class="rounded-xl px-5 py-4 bg-black text-white hover:bg-zinc-900 focus:outline-none
             focus:ring-2 focus:ring-cyan-500/60"
			type="button"
			on:click={() => onSubmit?.(value)}
		>
			Search
		</button>
	</div>

	{#if value && suggestions.length}
		<ul class="mt-2 rounded-xl border bg-white shadow-sm overflow-hidden">
			{#each suggestions as s (s)}
				<li>
					<button
						type="button"
						class="w-full text-left px-4 py-2 hover:bg-gray-100"
						on:click={() => (value = s)}
					>
						{s}
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>
