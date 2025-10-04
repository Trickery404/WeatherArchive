<script>
	import '../app.css';
	import { asset, resolve } from '$app/paths';
</script>

<header class="border-b bg-white/70 backdrop-blur">
	<div class="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
		<a href={resolve('/')} class="flex items-center gap-3">
			<img src={asset('/logo.png')} alt="The Weather Archive" class="h-8 w-8" />
			<span class="text-xl font-bold">The Weather Archive</span>
		</a>
	</div>
</header>

<main class="max-w-5xl mx-auto px-4 py-8">
	<slot />
</main>
