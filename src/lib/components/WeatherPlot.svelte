<script>
	import { onMount } from 'svelte';
	import { Chart, registerables } from 'chart.js';

	export let cityName = '';

	/** @type {HTMLCanvasElement} */
	let chartCanvas;
	/** @type {Chart | null} */
	let chart = null;

	// TODO: Replace with real data from backend
	const weatherData = {
		labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
		temperature: [24, 26, 28, 27, 26, 25, 26],
		humidity: [52, 48, 45, 50, 55, 58, 50],
		pressure: [1013, 1016, 1018, 1015, 1014, 1012, 1016]
	};

	onMount(() => {
		Chart.register(...registerables);

		if (chartCanvas) {
			const ctx = chartCanvas.getContext('2d');
			if (ctx) {
				chart = new Chart(ctx, {
					type: 'line',
					data: {
						labels: weatherData.labels,
						datasets: [
							{
								label: 'Temperature (°C)',
								data: weatherData.temperature,
								borderColor: 'rgb(249, 115, 22)',
								backgroundColor: 'rgba(249, 115, 22, 0.1)',
								yAxisID: 'y',
								tension: 0.4
							},
							{
								label: 'Humidity (%)',
								data: weatherData.humidity,
								borderColor: 'rgb(14, 116, 144)',
								backgroundColor: 'rgba(14, 116, 144, 0.1)',
								yAxisID: 'y1',
								tension: 0.4
							},
							{
								label: 'Air Pressure (hPa)',
								data: weatherData.pressure,
								borderColor: 'rgb(4, 120, 87)',
								backgroundColor: 'rgba(4, 120, 87, 0.1)',
								yAxisID: 'y2',
								tension: 0.4
							}
						]
					},
					options: {
						responsive: true,
						maintainAspectRatio: false,
						interaction: {
							mode: 'index',
							intersect: false
						},
						plugins: {
							title: {
								display: false
							},
							legend: {
								display: true,
								position: 'bottom'
							}
						},
						scales: {
							y: {
								type: 'linear',
								display: true,
								position: 'left',
								title: {
									display: true,
									text: 'Temperature (°C)'
								},
								min: 0,
								max: 40
							},
							y1: {
								type: 'linear',
								display: true,
								position: 'right',
								title: {
									display: true,
									text: 'Humidity (%)'
								},
								min: 0,
								max: 100,
								grid: {
									drawOnChartArea: false
								}
							},
							y2: {
								type: 'linear',
								display: false,
								position: 'right',
								min: 1000,
								max: 1030
							}
						}
					}
				});
			}
		}

		return () => {
			if (chart) {
				chart.destroy();
			}
		};
	});
</script>

<div class="w-full h-full">
	<canvas bind:this={chartCanvas}></canvas>
</div>
