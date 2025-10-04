<script lang="ts">
    export let title = 'The Weather Archive';
    export let logo = '/logo.png';
</script>

<header class="border-b bg-slate-900/90 backdrop-blur">
    <div class="max-w-7xl mx-auto px-6 py-6">
        <a href="/" class="flex items-center gap-8 no-underline text-white">
            <img src={logo} alt={title} class="h-[72px] w-[72px] md:h-[90px] md:w-[90px]" />
            <h1 class="font-brand text-[clamp(2.25rem,4vw,3.5rem)] leading-none font-bold whitespace-nowrap">
                {title}
            </h1>
        </a>
    </div>
</header>
