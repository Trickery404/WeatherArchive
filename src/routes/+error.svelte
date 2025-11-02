<script lang="ts">
	import ErrorMessage from '$lib/components/ErrorMessage.svelte';
	export let error;
	export let status;
</script>

<main class="max-w-7xl mx-auto px-6 py-10">
	<ErrorMessage
		title={status === 404 ? 'Site not found' : 'Oops, looks like something went wrong'}
		detail={status === 404
			? 'The requested page does not exist or has been moved.'
			: error?.message ?? 'Please try again at a later time.'}
	/>
	<a href="/" class="inline-block mt-4 text-cyan-700 underline">Navigate back to the homepage</a>
</main>