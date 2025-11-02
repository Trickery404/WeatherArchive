<script lang="ts">
	import ErrorMessage from '$lib/components/ErrorMessage.svelte';

	const capitals = [
		'Vienna','Berlin','Paris','London','Rome','Madrid','Lisbon','Dublin','Brussels','Amsterdam',
		'Luxembourg','Monaco','Andorra la Vella','San Marino','Vatican City','Bern','Vaduz',
		'Reykjavik','Oslo','Stockholm','Helsinki','Copenhagen','Tallinn','Riga','Vilnius',
		'Warsaw','Prague','Bratislava','Budapest','Ljubljana','Zagreb','Sarajevo','Belgrade',
		'Podgorica','Skopje','Tirana','Sofia','Bucharest','Chisinau','Athens','Nicosia',
		'Ankara','Tbilisi','Yerevan','Baku','Minsk','Kyiv','Moscow','Pristina'
	].sort((a,b)=>a.localeCompare(b));

	export let citySlug = '';

	const pretty = citySlug
		? citySlug.split('-').map(s => s[0].toUpperCase() + s.slice(1)).join(' ')
		: '';

	const exists = capitals.some(c => c.toLowerCase() === pretty.toLowerCase());

	let date = '';
	let hour = 12;
</script>

{#if !exists}
	<ErrorMessage
		title="Not found"
		detail={`„${pretty}“ ist keine bekannte Hauptstadt.`}
	/>
{:else}
	<h1 class="font-brand text-3xl font-bold mb-6">{pretty}</h1>

	<section class="grid md:grid-cols-2 gap-6 mb-6">
		<div class="rounded-2xl border border-stone-300/70 bg-white/85 backdrop-blur p-4">
			<h2 class="font-semibold mb-2">Video</h2>
			<div class="aspect-video rounded-xl bg-stone-200 flex items-center justify-center">
				<span class="text-stone-600">Video Placeholder</span>
			</div>
		</div>

		<div class="rounded-2xl border border-stone-300/70 bg-white/85 backdrop-blur p-4">
			<h2 class="font-semibold mb-2">Weather Plot</h2>
			<div class="grid grid-cols-1 md:grid-cols-3 gap-4 h-64">
				<div class="flex flex-col items-center justify-center h-full">
					<span class="font-bold mb-1">Temperature</span>
					<span class="text-2xl text-orange-600">26°C</span>
					<span class="text-stone-500 text-sm">Sunny</span>
				</div>
				<div class="flex flex-col items-center justify-center h-full">
					<span class="font-bold mb-1">Humidity</span>
					<span class="text-2xl text-cyan-700">48%</span>
					<span class="text-stone-500 text-sm">Pleasant</span>
				</div>
				<div class="flex flex-col items-center justify-center h-full">
					<span class="font-bold mb-1">Air Pressure</span>
					<span class="text-2xl text-emerald-700">1016 hPa</span>
					<span class="text-stone-500 text-sm">Stable</span>
				</div>
			</div>
		</div>
	</section>

	<section class="rounded-2xl border border-stone-300/70 bg-white/85 backdrop-blur p-4 grid sm:grid-cols-3 gap-4">
		<div>
			<label for="date" class="block text-sm font-medium mb-1">Date</label>
			<input id="date" type="date" class="w-full rounded-xl border px-3 py-2" bind:value={date} />
		</div>

		<div class="sm:col-span-2">
			<label for="hour" class="block text-sm font-medium mb-1">Hour of day</label>
			<input id="hour" type="range" min="0" max="23" bind:value={hour} class="w-full" />
			<div class="text-sm text-stone-600 mt-1">Selected: {hour}:00</div>
		</div>
	</section>
{/if}
