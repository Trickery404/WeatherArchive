<script>
	import WeatherPlot from '$lib/components/WeatherPlot.svelte';
	import ErrorMessage from '$lib/components/ErrorMessage.svelte';
	import DatePicker from '$lib/components/DatePicker.svelte';
	import { fetchCityImages, getImageUrl } from '$lib/services/weatherApi';
	import { onMount } from 'svelte';

	export let citySlug = '';
	const pretty = citySlug
		? citySlug.split('-').map(s => s[0].toUpperCase() + s.slice(1)).join(' ')
		: '';

	let date = '2026-01-17';
	let hour = 10;
	let errorMessage = '';

	// API Integration
	let images = [];
	let loading = false;
	let cacheStatus = null;
	let currentImage = null;

	// Available dates
	const availableDates = [
		'2025-01-01',
		'2026-01-17',
		'2026-01-18',
		'2026-01-19',
		'2026-01-20',
		'2026-01-21',
		'2026-01-22',
		'2026-01-23'
	];

	const availableHours = {
		'2025-01-01': [8, 9, 10, 11],
		'2026-01-17': [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
		'2026-01-18': [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
		'2026-01-19': [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
		'2026-01-20': [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
		'2026-01-21': [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
		'2026-01-22': [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
		'2026-01-23': [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
	};

	// Load images from API
	async function loadImages() {
		if (!citySlug || !date || hour === undefined) return;

		loading = true;
		errorMessage = '';

		try {
			const data = await fetchCityImages(citySlug, date, hour);
			images = data.images || [];

			if (images.length > 0) {
				currentImage = images[0];
				cacheStatus = data.source; // Only set cache status if images found
			} else {
				currentImage = null;
				cacheStatus = null; // Reset cache status if no images
				errorMessage = `No image found for ${date} at ${hour}:00`;
			}
		} catch (error) {
			errorMessage = `Error loading images: ${error.message}`;
			images = [];
			currentImage = null;
			cacheStatus = null;
		} finally {
			loading = false;
		}
	}

	onMount(loadImages);
	$: if (citySlug && date && hour !== undefined) {
		loadImages();
	}

	$: imagePath = currentImage ? getImageUrl(currentImage.s3_edited_key || currentImage.s3_unedited_key) : '';
	$: hasData = currentImage !== null;

	$: currentWeather = currentImage ? {
		temperature: parseFloat(currentImage.temperature) || 26,
		humidity: currentImage.humidity || 48,
		pressure: currentImage.air_pressure || 1016,
		description: 'Sunny',
		humidityStatus: 'Comfortable',
		pressureStatus: 'Stable'
	} : {
		temperature: 26,
		humidity: 48,
		pressure: 1016,
		description: 'Sunny',
		humidityStatus: 'Comfortable',
		pressureStatus: 'Stable'
	};

	$: hasDataForDate = date ? availableDates.includes(date) : false;
	$: hasDataForHour = date && hasDataForDate ? availableHours[date]?.includes(hour) : false;

	$: minDate = availableDates.length > 0 ? availableDates[0] : '';
	$: maxDate = availableDates.length > 0 ? availableDates[availableDates.length - 1] : '';

	$: currentAvailableHours = date ? availableHours[date] || [] : [];
	$: minHour = currentAvailableHours.length > 0 ? Math.min(...currentAvailableHours) : 0;
	$: maxHour = currentAvailableHours.length > 0 ? Math.max(...currentAvailableHours) : 23;

	$: if (date && !availableDates.includes(date)) {
		errorMessage = `No data available for ${date}. Please select an available date.`;
	} else if (date && hour !== undefined && !currentAvailableHours.includes(hour)) {
		errorMessage = `No data available for ${hour}:00 on ${date}. Available hours: ${currentAvailableHours.join(', ')}`;
	} else if (!errorMessage) {
		errorMessage = '';
	}

	$: if (date && currentAvailableHours.length > 0 && !currentAvailableHours.includes(hour)) {
		hour = currentAvailableHours[0];
	}

	function handleDateChange(event) {
		date = event.detail;
	}
</script>

<h1 class="font-brand text-3xl font-bold mb-6">{pretty}</h1>

{#if cacheStatus && images.length > 0}
	<div class="mb-4 p-3 rounded-lg {cacheStatus === 'cache' ? 'bg-green-50 border border-green-200' : 'bg-blue-50 border border-blue-200'}">
		<span class="{cacheStatus === 'cache' ? 'text-green-800' : 'text-blue-800'} font-medium">
			{cacheStatus === 'cache' ? 'Loaded from Redis cache' : 'Loaded from database'}
		</span>
	</div>
{/if}

{#if errorMessage}
	<ErrorMessage detail={errorMessage} />
{/if}

<section class="grid md:grid-cols-2 gap-6 mb-6">
	<div class="rounded-2xl border border-stone-300/70 bg-white/85 backdrop-blur p-4">
		<h2 class="font-semibold mb-2">Weather Image</h2>

		{#if loading}
			<div class="aspect-video rounded-xl bg-stone-200 flex items-center justify-center">
				<div class="text-center">
					<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-stone-600 mx-auto mb-2"></div>
					<span class="text-stone-600">Loading from API...</span>
				</div>
			</div>
		{:else if hasData && imagePath}
			<div class="aspect-video rounded-xl bg-stone-200 overflow-hidden relative">
				<img
					src={imagePath}
					alt="{pretty} weather on {date} at {hour}:00"
					class="w-full h-full object-cover"
				/>

				<div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
					<p class="text-white text-sm font-medium">{date} at {hour}:00</p>
					{#if currentImage}
						<p class="text-white/80 text-xs">
							{currentImage.temperature}°C • {currentImage.humidity}% • {currentImage.air_pressure} hPa
						</p>
					{/if}
				</div>
			</div>
		{:else}
			<div class="aspect-video rounded-xl bg-stone-100 border-2 border-dashed border-stone-300 flex items-center justify-center">
				<span class="text-stone-500">No image available for this date/hour</span>
			</div>
		{/if}
	</div>

	<div class="rounded-2xl border border-stone-300/70 bg-white/85 backdrop-blur p-4 flex flex-col">
		<h2 class="font-semibold mb-2">Weather Data - {pretty}</h2>

		<div class="flex gap-4 flex-1 min-h-0">
			<div class="flex-1 min-w-0">
				<WeatherPlot cityName={pretty} />
			</div>

			{#if hasData}
				<div class="flex flex-col gap-4 w-32">
					<div class="flex flex-col items-center justify-center p-3 bg-orange-50 rounded-lg">
						<span class="font-bold text-xs mb-1">Temperature</span>
						<span class="text-2xl text-orange-600 font-bold">{currentWeather.temperature}°C</span>
						<span class="text-stone-500 text-xs mt-1">{currentWeather.description}</span>
					</div>
					<div class="flex flex-col items-center justify-center p-3 bg-cyan-50 rounded-lg">
						<span class="font-bold text-xs mb-1">Humidity</span>
						<span class="text-2xl text-cyan-700 font-bold">{currentWeather.humidity}%</span>
						<span class="text-stone-500 text-xs mt-1">{currentWeather.humidityStatus}</span>
					</div>
					<div class="flex flex-col items-center justify-center p-3 bg-emerald-50 rounded-lg">
						<span class="font-bold text-xs mb-1">Air Pressure</span>
						<span class="text-2xl text-emerald-700 font-bold">{currentWeather.pressure} hPa</span>
						<span class="text-stone-500 text-xs mt-1">{currentWeather.pressureStatus}</span>
					</div>
				</div>
			{/if}
		</div>
	</div>
</section>

<section class="rounded-2xl border border-stone-300/70 bg-white/85 backdrop-blur p-4">
	<h2 class="font-semibold mb-4">Select Date & Time</h2>
	<div class="grid sm:grid-cols-3 gap-4">
		<div>
			<label for="date" class="block text-sm font-medium mb-1">Date</label>
			<DatePicker
				selectedDate={date}
				{availableDates}
				{minDate}
				{maxDate}
				on:dateChange={handleDateChange}
			/>
		</div>

		<div>
			<label for="hour" class="block text-sm font-medium mb-1">Hour</label>
			<input
				id="hour"
				type="range"
				min={minHour}
				max={maxHour}
				step="1"
				bind:value={hour}
				class="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer"
			/>
			<div class="flex justify-between text-xs text-stone-500 mt-1">
				<span>{minHour}:00</span>
				<span class="font-semibold text-stone-700">{hour}:00</span>
				<span>{maxHour}:00</span>
			</div>
		</div>

		<div class="flex items-end">
			<button
				class="w-full px-4 py-2 bg-stone-800 text-white rounded-lg hover:bg-stone-700 transition-colors"
				on:click={() => loadImages()}
			>
				Refresh Data
			</button>
		</div>
	</div>
</section>

