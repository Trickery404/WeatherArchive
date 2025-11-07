<script lang="ts">
	export let title = 'Oops, looks like something went wrong';
	export let detail = '';
</script>

<div class="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-red-900">
	<p class="font-semibold">{title}</p>
	{#if detail}
		<p class="text-sm mt-1">{detail}</p>
	{/if}
</div>
