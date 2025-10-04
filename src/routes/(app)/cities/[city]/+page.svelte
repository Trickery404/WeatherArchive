<script>
    import CityDetailPage from '$lib/pages/CityDetailPage.svelte';
    export let params;
</script>

<CityDetailPage citySlug={params.city} />
