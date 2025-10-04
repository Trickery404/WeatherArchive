<script lang="ts">
    let query = '';
    const topics = ['Vienna', 'Berlin', 'Paris', 'London']; // statisch für den Draft
    $: suggestions = query
        ? topics.filter((t) => t.toLowerCase().startsWith(query.toLowerCase()))
        : [];

    let showError = false;

    function go() {
        if (suggestions.includes(query)) {
            window.location.href = `/city/${query.toLowerCase()}`;
        } else {
            showError = true;
        }
    }
</script>

<h1 class="text-3xl font-bold mb-6">Search a city</h1>

<div class="w-full max-w-xl">
    <div class="flex gap-2">
        <input
                aria-label="Search city"
                class="flex-1 rounded-xl border px-4 py-3"
                placeholder="Search city..."
                bind:value={query}
                on:keydown={(e) => e.key === 'Enter' && go()}
        />
        <button class="rounded-xl px-5 py-3 bg-black text-white" on:click={go} type="button">
            Search
        </button>
    </div>

    {#if query && suggestions.length}
        <ul class="mt-2 rounded-xl border bg-white shadow-sm overflow-hidden">
            {#each suggestions as s (s)}
                <li>
                    <button
                            type="button"
                            class="w-full text-left px-4 py-2 hover:bg-gray-100"
                            on:click={() => (query = s)}
                    >
                        {s}
                    </button>
                </li>
            {/each}
        </ul>
    {/if}

    {#if showError}
        <p class="mt-3 text-sm text-red-600">
            Topic not found. Please choose one from the list.
        </p>
    {/if}
</div>
