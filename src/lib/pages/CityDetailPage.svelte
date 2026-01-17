<script>
	import WeatherPlot from '$lib/components/WeatherPlot.svelte';
	import ErrorMessage from '$lib/components/ErrorMessage.svelte';
	import DatePicker from '$lib/components/DatePicker.svelte';

	export let citySlug = '';
	const pretty = citySlug
		? citySlug.split('-').map(s => s[0].toUpperCase() + s.slice(1)).join(' ')
		: '';

	let date = '2026-01-17'; // Default to today with existing images
	let hour = 10; // Default to hour with existing image
	let errorMessage = '';

	// Available dates (current week with test images)
	const availableDates = [
		'2025-01-01', // Old test images
		'2026-01-17', // Today
		'2026-01-18',
		'2026-01-19',
		'2026-01-20',
		'2026-01-21',
		'2026-01-22',
		'2026-01-23'
	];

	/** @type {Record<string, number[]>} */
	const availableHours = {
		'2025-01-01': [8, 9, 10, 11], // Old test images
		'2026-01-17': [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
		'2026-01-18': [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
		'2026-01-19': [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
		'2026-01-20': [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
		'2026-01-21': [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
		'2026-01-22': [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
		'2026-01-23': [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
	};

	// Image naming: cityslug_YYYY-MM-DD_HH.jpg (e.g., vienna_2025-01-01_08.jpg)
	$: imagePath = date && hour !== undefined
		? `/images/${citySlug}_${date}_${String(hour).padStart(2, '0')}.jpg`
		: '';

	let imageExists = false;
	let imageLoading = false;

	$: if (imagePath) {
		imageLoading = true;
		imageExists = false;
	}

	function handleImageLoad() {
		imageExists = true;
		imageLoading = false;
	}

	function handleImageError() {
		imageExists = false;
		imageLoading = false;
	}

	// TODO: Replace with real-time data
	const currentWeather = {
		temperature: 26,
		humidity: 48,
		pressure: 1016,
		description: 'Sunny',
		humidityStatus: 'Comfortable',
		pressureStatus: 'Stable'
	};

	$: hasDataForDate = date ? availableDates.includes(date) : false;
	$: hasDataForHour = date && hasDataForDate ? availableHours[date]?.includes(hour) : false;
	$: hasData = hasDataForDate && hasDataForHour;

	$: minDate = availableDates.length > 0 ? availableDates[0] : '';
	$: maxDate = availableDates.length > 0 ? availableDates[availableDates.length - 1] : '';

	$: currentAvailableHours = date ? availableHours[date] || [] : [];
	$: minHour = currentAvailableHours.length > 0 ? Math.min(...currentAvailableHours) : 0;
	$: maxHour = currentAvailableHours.length > 0 ? Math.max(...currentAvailableHours) : 23;

	$: if (date && !availableDates.includes(date)) {
		errorMessage = `No data available for ${date}. Please select an available date.`;
	} else if (date && hour !== undefined && !currentAvailableHours.includes(hour)) {
		errorMessage = `No data available for ${hour}:00 on ${date}. Available hours: ${currentAvailableHours.join(', ')}`;
	} else {
		errorMessage = '';
	}

	$: if (date && currentAvailableHours.length > 0 && !currentAvailableHours.includes(hour)) {
		hour = currentAvailableHours[0];
	}

	/** @param {CustomEvent<string>} event */
	function handleDateChange(event) {
		date = event.detail;
	}
</script>

<h1 class="font-brand text-3xl font-bold mb-6">{pretty}</h1>

{#if errorMessage}
	<ErrorMessage detail={errorMessage} />
{/if}

<section class="grid md:grid-cols-2 gap-6 mb-6">
	<div class="rounded-2xl border border-stone-300/70 bg-white/85 backdrop-blur p-4">
		<h2 class="font-semibold mb-2">Weather Image</h2>
		{#if hasData}
			<div class="aspect-video rounded-xl bg-stone-200 overflow-hidden relative">
				{#if imageLoading}
					<div class="absolute inset-0 flex items-center justify-center">
						<div class="text-center">
							<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-stone-600 mx-auto mb-2"></div>
							<span class="text-stone-600">Loading image...</span>
						</div>
					</div>
				{/if}

				<img
					src={imagePath}
					alt="{pretty} weather on {date} at {hour}:00"
					class="w-full h-full object-cover {imageExists ? 'block' : 'hidden'}"
					on:load={handleImageLoad}
					on:error={handleImageError}
				/>

				{#if !imageLoading && !imageExists}
					<div class="absolute inset-0 flex items-center justify-center">
						<div class="text-center p-4">
							<svg class="w-16 h-16 mx-auto text-stone-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
							</svg>
							<span class="text-stone-600 font-medium">No image available</span>
							<p class="text-xs text-stone-500 mt-1">{date} - {hour}:00</p>
							<p class="text-xs text-stone-400 mt-2">Expected: {imagePath.split('/').pop()}</p>
						</div>
					</div>
				{/if}

				{#if imageExists}
					<div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
						<p class="text-white text-sm font-medium">{date} at {hour}:00</p>
					</div>
				{/if}
			</div>
		{:else}
			<div class="aspect-video rounded-xl bg-stone-100 border-2 border-dashed border-stone-300 flex items-center justify-center">
				<span class="text-stone-500">Select an available date and hour</span>
			</div>
		{/if}

		<div class="mt-2 text-xs text-stone-500">
			<p><strong>Expected filename format:</strong></p>
			<p class="font-mono bg-stone-100 px-2 py-1 rounded mt-1">
				{citySlug}_YYYY-MM-DD_HH.jpg
			</p>
			<p class="mt-1">Example: {citySlug}_2025-01-01_08.jpg</p>
		</div>
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
				on:change={handleDateChange}
			/>
			<div class="text-xs text-stone-500 mt-1">
				Available dates: {availableDates.length}
			</div>
		</div>

		<div class="sm:col-span-2">
			<label for="hour" class="block text-sm font-medium mb-1">
				Hour of day
				{#if currentAvailableHours.length > 0}
					<span class="text-stone-500 text-xs">
						(Available: {minHour}:00 - {maxHour}:00)
					</span>
				{/if}
			</label>
			<input
				id="hour"
				type="range"
				min={currentAvailableHours.length > 0 ? minHour : 0}
				max={currentAvailableHours.length > 0 ? maxHour : 23}
				bind:value={hour}
				class="w-full"
				disabled={!date || currentAvailableHours.length === 0}
			/>
			<div class="text-sm text-stone-600 mt-1 flex justify-between">
				<span>Selected: {hour}:00</span>
				{#if hasDataForHour}
					<span class="text-green-600 font-medium">✓ Data available</span>
				{/if}
			</div>
		</div>
	</div>

	{#if date && currentAvailableHours.length > 0}
		<div class="mt-4 p-3 bg-blue-50 rounded-lg">
			<p class="text-sm text-blue-900">
				<strong>Available hours for {date}:</strong>
				{currentAvailableHours.map((/** @type {number} */ h) => `${h}:00`).join(', ')}
			</p>
		</div>
	{/if}
</section>
