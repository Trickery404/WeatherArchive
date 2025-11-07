<script>
	import { createEventDispatcher } from 'svelte';

	export let selectedDate = '';
	/** @type {string[]} */
	export let availableDates = [];
	export let minDate = '';
	export let maxDate = '';

	const dispatch = createEventDispatcher();

	let showPicker = false;
	let currentMonth = new Date();

	$: availableDateSet = new Set(availableDates);

	$: if (selectedDate) {
		currentMonth = new Date(selectedDate);
	} else if (availableDates.length > 0) {
		currentMonth = new Date(availableDates[0]);
	}

	/** @param {Date} date */
	function getDaysInMonth(date) {
		const year = date.getFullYear();
		const month = date.getMonth();
		const firstDay = new Date(year, month, 1);
		const lastDay = new Date(year, month + 1, 0);
		const daysInMonth = lastDay.getDate();
		const startingDayOfWeek = firstDay.getDay();

		const days = [];

		for (let i = 0; i < startingDayOfWeek; i++) {
			days.push(null);
		}

		for (let day = 1; day <= daysInMonth; day++) {
			const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
			const isAvailable = availableDateSet.has(dateStr);
			const isSelected = dateStr === selectedDate;
			days.push({ day, dateStr, isAvailable, isSelected });
		}

		return days;
	}

	$: days = getDaysInMonth(currentMonth);

	function previousMonth() {
		currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
	}

	function nextMonth() {
		currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
	}

	/** @param {string} dateStr */
	function selectDate(dateStr) {
		if (availableDateSet.has(dateStr)) {
			selectedDate = dateStr;
			dispatch('change', dateStr);
			showPicker = false;
		}
	}

	/** @param {string} dateStr */
	function formatDisplayDate(dateStr) {
		if (!dateStr) return 'Select date';
		const date = new Date(dateStr);
		return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
	}

	const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
					   'July', 'August', 'September', 'October', 'November', 'December'];
	const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
</script>

<div class="relative">
	<button
		type="button"
		class="w-full rounded-xl border px-3 py-2 text-left flex justify-between items-center bg-white hover:border-stone-400 transition-colors"
		on:click={() => showPicker = !showPicker}
	>
		<span class={selectedDate ? 'text-stone-900' : 'text-stone-400'}>
			{formatDisplayDate(selectedDate)}
		</span>
		<svg class="w-5 h-5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
		</svg>
	</button>

	{#if showPicker}
		<div class="absolute z-50 bottom-full mb-2 bg-white rounded-xl shadow-lg border border-stone-200 p-4 w-80">
			<div class="flex justify-between items-center mb-4">
				<button
					type="button"
					class="p-2 hover:bg-stone-100 rounded-lg transition-colors"
					on:click={previousMonth}
					aria-label="Previous month"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
					</svg>
				</button>
				<div class="font-semibold text-stone-900">
					{monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
				</div>
				<button
					type="button"
					class="p-2 hover:bg-stone-100 rounded-lg transition-colors"
					on:click={nextMonth}
					aria-label="Next month"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
					</svg>
				</button>
			</div>

			<div class="grid grid-cols-7 gap-1 mb-2">
				{#each weekDays as day}
					<div class="text-center text-xs font-medium text-stone-500 py-1">
						{day}
					</div>
				{/each}
			</div>

			<div class="grid grid-cols-7 gap-1">
				{#each days as dayInfo}
					{#if dayInfo === null}
						<div class="aspect-square"></div>
					{:else}
						<button
							type="button"
							class="aspect-square rounded-lg text-sm font-medium transition-all
								{dayInfo.isSelected ? 'bg-blue-600 text-white' :
								 dayInfo.isAvailable ? 'hover:bg-stone-100 text-stone-900' :
								 'text-stone-300 cursor-not-allowed'}"
							disabled={!dayInfo.isAvailable}
							on:click={() => selectDate(dayInfo.dateStr)}
						>
							{dayInfo.day}
						</button>
					{/if}
				{/each}
			</div>

			<button
				type="button"
				class="w-full mt-4 py-2 text-sm text-stone-600 hover:text-stone-900 transition-colors"
				on:click={() => showPicker = false}
			>
				Close
			</button>
		</div>
	{/if}
</div>

<svelte:window on:click={(/** @type {MouseEvent} */ e) => {
	const target = e.target;
	if (showPicker && target instanceof HTMLElement && !target.closest('.relative')) {
		showPicker = false;
	}
}} />
