<script lang="ts">
	import { goto } from '$app/navigation';
	import SearchBox from '$lib/components/SearchBox.svelte';

	const capitals = [
		'Vienna','Berlin','Paris','London','Rome','Madrid','Lisbon','Dublin','Brussels','Amsterdam',
		'Luxembourg','Monaco','Andorra la Vella','San Marino','Vatican City','Bern','Vaduz',
		'Reykjavik','Oslo','Stockholm','Helsinki','Copenhagen','Tallinn','Riga','Vilnius',
		'Warsaw','Prague','Bratislava','Budapest','Ljubljana','Zagreb','Sarajevo','Belgrade',
		'Podgorica','Skopje','Tirana','Sofia','Bucharest','Chisinau','Athens','Nicosia',
		'Ankara','Tbilisi','Yerevan','Baku','Minsk','Kyiv','Moscow','Pristina'
	].sort((a,b)=>a.localeCompare(b));

	let query = '';

	$: list = query
		? capitals.filter(c => c.toLowerCase().includes(query.toLowerCase()))
		: capitals;

	function handleSelect(e: CustomEvent) {
		goto(`/cities/${e.detail.slug}`);
	}

	function handleInput(v: string) {
		query = v;
	}

	function pick(city: string) {
		query = city;
		goto(`/cities/${city.toLowerCase().replace(/\s+/g, '-')}`);
	}
</script>

<h1 class="font-brand text-4xl font-bold mb-6">Search a city</h1>

<SearchBox
	{capitals}
	value={query}
	on:input={(e) => handleInput(e.detail)}
	on:select={handleSelect}
/>

{#if list.length}
	<ul class="mt-2 max-h-72 overflow-auto rounded-xl shadow-sm
           border border-stone-300 bg-white/95 text-stone-900 w-full max-w-3xl">
		{#each list as city (city)}
			<li>
				<button
					type="button"
					class="w-full text-left px-4 py-2 hover:bg-stone-100"
					on:click={() => pick(city)}
				>
					{city}
				</button>
			</li>
		{/each}
	</ul>
{/if}
