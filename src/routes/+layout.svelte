<script>
	import '$lib/styles/app.css';
	import Header from '$lib/components/Header.svelte';
</script>

<Header />

<main class="max-w-7xl mx-auto px-6 py-10">
	<slot />
</main>
