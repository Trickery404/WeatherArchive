<script>
	import WeatherPlot from '$lib/components/WeatherPlot.svelte';
	import ErrorMessage from '$lib/components/ErrorMessage.svelte';
	import DatePicker from '$lib/components/DatePicker.svelte';
	import { fetchCityImages } from '$lib/services/weatherApi';
	import { onMount } from 'svelte';

	export let citySlug = '';
	const pretty = citySlug
		? citySlug.split('-').map(s => s[0].toUpperCase() + s.slice(1)).join(' ')
		: '';

	// Available dates
	const availableDates = [
		'2026-02-16',
		'2026-02-17',
		'2026-02-18'
	];

	const availableHours = {
		'2026-02-16': [6, 7, 8, 9, 10, 11],
		'2026-02-17': [6, 7, 8, 9, 10, 11],
		'2026-02-18': [6, 7, 8, 9, 10, 11]
	};

	// Initialize with first available date
	let date = availableDates[0];
	let hour = 6; // Automatically set to earliest available hour
	let errorMessage = '';

	// API Integration
	let images = [];
	let loading = false;
	let cacheStatus = null;
	let currentImage = null;
	let videoData = null; // Separate video data for the full day

	// Load video data for the full day (check if video exists)
	async function loadVideoData() {
		if (!citySlug || !date) return;

		try {
			// Fetch all images for the day (no hour filter)
			const data = await fetchCityImages(citySlug, date, null);
			const allImages = data.images || [];

			if (allImages.length >= 12) {
				// Check if any image has a video URL
				const imageWithVideo = allImages.find(img => img.signed_video_url);
				if (imageWithVideo) {
					// Images come DESC from API, so reverse for correct start/end
					const sortedImages = [...allImages].sort((a, b) =>
						new Date(a.capture_time) - new Date(b.capture_time)
					);

					videoData = {
						url: imageWithVideo.signed_video_url,
						count: allImages.length,
						startTime: sortedImages[0]?.capture_time,
						endTime: sortedImages[sortedImages.length - 1]?.capture_time
					};
					console.log('[Video] Found video for date:', date);
					return;
				}
			}

			// No video available
			videoData = null;
			console.log('[Video] No video available for date:', date, 'Images:', allImages.length);
		} catch (error) {
			console.error('[Video] Error loading video data:', error);
			videoData = null;
		}
	}

	// Load images from API for specific hour
	async function loadImages() {
		if (!citySlug || !date || hour === undefined) return;

		loading = true;
		errorMessage = '';

		try {
			// First, check for video data
			await loadVideoData();

			// Then load image for specific hour
			const data = await fetchCityImages(citySlug, date, hour);
			images = data.images || [];

			if (images.length > 0) {
				// Select the most recent (last) image
				const lastIndex = images.length - 1;
				currentImage = images[lastIndex];
				cacheStatus = data.source;
			} else {
				currentImage = null;
				cacheStatus = null;
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

	onMount(() => {
		// Set hour to earliest available hour for initial date
		const initialHours = availableHours[date] || [];
		if (initialHours.length > 0) {
			hour = Math.min(...initialHours);
		}
		loadImages();
		loadVideoData();
	});

	$: if (citySlug && date && hour !== undefined) {
		loadImages();
	}

	// Reload video data when date changes
	$: if (citySlug && date) {
		loadVideoData();
	}

	// Use signed URLs from Lambda response (valid for 1 hour)
	$: imagePath = currentImage
		? (currentImage.signed_edited_url || currentImage.signed_unedited_url || '')
		: '';
	$: videoPath = videoData?.url || '';
	$: hasVideo = !!videoPath;
	$: hasData = currentImage !== null;

	// Video generation status
	$: videoGenerating = !hasVideo && hasData; // Show generating message when no video but data exists
	$: videoNotAvailable = !hasVideo && !hasData; // No video and no data

	// Video info
	$: videoInfo = hasVideo && videoData ? {
		frameCount: videoData.count,
		startTime: videoData.startTime ? new Date(videoData.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '',
		endTime: videoData.endTime ? new Date(videoData.endTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '',
		duration: `${videoData.count} seconds`
	} : null;

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

	// Auto-adjust hour if not available for selected date
	$: if (date && currentAvailableHours.length > 0 && !currentAvailableHours.includes(hour)) {
		hour = Math.min(...currentAvailableHours); // Earliest available hour
	}

	function handleDateChange(event) {
		date = event.detail;
		// Set hour to earliest available hour for new date
		const newHours = availableHours[date] || [];
		if (newHours.length > 0) {
			hour = Math.min(...newHours);
		}
	}
</script>

<h1 class="font-brand text-3xl font-bold mb-6">{pretty}</h1>

{#if !loading && cacheStatus && images.length > 0}
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
		<h2 class="font-semibold mb-2">
			Weather {hasVideo ? 'Video' : 'Image'}
			{#if hasVideo && videoInfo}
				<span class="text-xs font-normal text-stone-500 ml-2">({videoInfo.startTime} - {videoInfo.endTime})</span>
			{:else if videoGenerating}
				<span class="text-xs font-normal text-amber-600 ml-2">Video generating...</span>
			{:else if videoNotAvailable}
				<span class="text-xs font-normal text-stone-400 ml-2">(Video not yet available)</span>
			{/if}
		</h2>

		{#if loading}
			<div class="aspect-video rounded-xl bg-stone-200 flex items-center justify-center">
				<div class="text-center">
					<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-stone-600 mx-auto mb-2"></div>
					<span class="text-stone-600">Loading...</span>
				</div>
			</div>
		{:else if hasVideo}
			<!-- Video Player - Show video if available (12+ images for the day) -->
			<div class="aspect-video rounded-xl bg-stone-200 overflow-hidden relative">
				<video
					src={videoPath}
					controls
					autoplay
					loop
					muted
					class="w-full h-full object-cover"
				>
					<track kind="captions" />
					Your browser does not support the video tag.
				</video>

				<div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3 pointer-events-none">
					<p class="text-white text-sm font-medium">
						{videoInfo.startTime} - {videoInfo.endTime}
					</p>
				</div>
			</div>
		{:else if hasData && imagePath}
			<!-- Static Image - Show latest image when video not available (< 12 images) -->
			<div class="aspect-video rounded-xl bg-stone-200 overflow-hidden relative">
				<img
					src={imagePath}
					alt="{pretty} weather on {date} at {hour}:00"
					class="w-full h-full object-cover"
				/>

				{#if videoGenerating}
					<!-- Banner: Video is being generated -->
					<div class="absolute top-3 left-3 right-3 bg-amber-500/90 backdrop-blur-sm rounded-lg p-2 flex items-center gap-2">
						<svg class="w-4 h-4 text-white animate-spin" fill="none" viewBox="0 0 24 24">
							<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
							<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
						</svg>
						<span class="text-white text-xs font-medium">Video is being generated</span>
					</div>
				{/if}
			</div>
		{:else}
			<!-- Placeholder -->
			<div class="aspect-video rounded-xl bg-stone-100 border-2 border-dashed border-stone-300 flex items-center justify-center">
				<div class="text-center p-4">
					<span class="text-stone-500">No video or image available for this date/hour</span>
					<p class="text-stone-400 text-xs mt-2">Try selecting a different date or hour</p>
				</div>
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
				on:change={handleDateChange}
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

