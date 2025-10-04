<script lang="ts">
	import { goto } from '$app/navigation';

	const capitals = [
		'Vienna','Berlin','Paris','London','Rome','Madrid','Lisbon','Dublin','Brussels','Amsterdam',
		'Luxembourg','Monaco','Andorra la Vella','San Marino','Vatican City','Bern','Vaduz',
		'Reykjavik','Oslo','Stockholm','Helsinki','Copenhagen','Tallinn','Riga','Vilnius',
		'Warsaw','Prague','Bratislava','Budapest','Ljubljana','Zagreb','Sarajevo','Belgrade',
		'Podgorica','Skopje','Tirana','Sofia','Bucharest','Chisinau','Athens','Nicosia',
		'Ankara','Tbilisi','Yerevan','Baku','Minsk','Kyiv','Moscow','Pristina'
	].sort((a,b)=>a.localeCompare(b));

	const SHOW_ALL_INITIALLY = true;

	let query = '';
	$: list = SHOW_ALL_INITIALLY
		? (query ? capitals.filter(c => c.toLowerCase().includes(query.toLowerCase())) : capitals)
		: (query ? capitals.filter(c => c.toLowerCase().startsWith(query.toLowerCase())) : []);

	const slug = (s: string) => s.toLowerCase().replace(/\s+/g, '-');

	function go(q = query) {
		const hit = capitals.find(c => c.toLowerCase() === (q || '').toLowerCase());
		if (hit) goto(`/cities/${slug(hit)}`);
	}
</script>

<h1 class="font-brand text-4xl font-bold mb-6">Search a city</h1>

<div class="w-full max-w-3xl">
	<div class="flex gap-2">
		<input
			aria-label="Search city"
			bind:value={query}
			on:keydown={(e) => e.key === 'Enter' && go()}
			placeholder="Search city..."
			class="flex-1 rounded-xl px-5 py-4 shadow-sm
             border border-stone-300 bg-white text-stone-900 placeholder-stone-500
             focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500"
		/>
		<button
			type="button"
			on:click={() => go()}
			class="rounded-xl px-5 py-4 bg-black text-white hover:bg-zinc-900
             focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
		>
			Search
		</button>
	</div>

	{#if list.length}
		<ul class="mt-2 max-h-72 overflow-auto rounded-xl shadow-sm
               border border-stone-300 bg-white/95 text-stone-900">
			{#each list as s (s)}
				<li class="{SHOW_ALL_INITIALLY && !query ? 'opacity-60' : ''}">
					<button
						type="button"
						class="w-full text-left px-4 py-2 hover:bg-stone-100"
						on:click={() => (query = s)}
					>
						{s}
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>
