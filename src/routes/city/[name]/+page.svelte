<script lang="ts">
    export let params;
    const pretty = params.name.charAt(0).toUpperCase() + params.name.slice(1);
    let date = '';
    let hour = 12;

    const disabledInfo = '';
</script>

<h1 class="text-3xl font-bold mb-6">{pretty}</h1>

<section class="grid md:grid-cols-2 gap-6 mb-6">
    <div class="rounded-2xl border bg-white p-4">
        <h2 class="font-semibold mb-2">Video</h2>
        <div class="aspect-video rounded-xl bg-gray-200 flex items-center justify-center">
            <span class="text-gray-600">Video Placeholder</span>
        </div>
    </div>

    <div class="rounded-2xl border bg-white p-4">
        <h2 class="font-semibold mb-2">Weather Plot</h2>
        <div class="h-64 rounded-xl bg-gray-200 flex items-center justify-center">
            <span class="text-gray-600">Plot Placeholder</span>
        </div>
    </div>
</section>

<section class="rounded-2xl border bg-white p-4 grid sm:grid-cols-3 gap-4">
    <div>
        <label for="date" class="block text-sm font-medium mb-1">Date</label>
        <input id="date" type="date" class="w-full rounded-xl border px-3 py-2" bind:value={date} />
        <p class="text-xs text-gray-500 mt-1">{disabledInfo}</p>
    </div>

    <div class="sm:col-span-2">
        <label for="hour" class="block text-sm font-medium mb-1">Hour of day</label>
        <input id="hour" type="range" min="0" max="23" bind:value={hour} class="w-full" />
        <div class="text-sm text-gray-600 mt-1">Selected: {hour}:00</div>
    </div>
</section>
