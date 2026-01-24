import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CITIES = ['vienna', 'berlin', 'paris', 'london', 'rome', 'madrid', 'amsterdam', 'brussels'];

const today = new Date();
const dates = [];
for (let i = 0; i < 7; i++) {
	const d = new Date(today);
	d.setDate(today.getDate() + i);
	dates.push(d.toISOString().split('T')[0]);
}

const hours = Array.from({ length: 15 }, (_, i) => i + 6);
const outputDir = path.join(__dirname, '..', 'static', 'images');

if (!fs.existsSync(outputDir)) {
	fs.mkdirSync(outputDir, { recursive: true });
}

let count = 0;

console.log(' Generiere einzigartige Testbilder...\n');

async function generateImages() {
	for (const city of CITIES) {
		for (const date of dates) {
			for (const hour of hours) {
				const hourStr = hour.toString().padStart(2, '0');
				const filename = `${city}_${date}_${hourStr}.jpg`;
				const filepath = path.join(outputDir, filename);

				// Generiere Farbe basierend auf Stadt und Stunde
				const hue = (CITIES.indexOf(city) * 45 + hour * 10) % 360;
				const saturation = 30 + ((hour * 3) % 40);
				const lightness = 40 + (hour % 8) * 5;

				// Erstelle SVG mit Text
				const svg = `
					<svg width="800" height="600">
						<rect width="800" height="600" fill="hsl(${hue}, ${saturation}%, ${lightness}%)"/>
						<text x="400" y="250" font-family="Arial" font-size="48" fill="white" text-anchor="middle" font-weight="bold">
							${city.toUpperCase()}
						</text>
						<text x="400" y="320" font-family="Arial" font-size="36" fill="white" text-anchor="middle">
							${date}
						</text>
						<text x="400" y="380" font-family="Arial" font-size="48" fill="white" text-anchor="middle" font-weight="bold">
							${hourStr}:00
						</text>
					</svg>
				`;

				await sharp(Buffer.from(svg)).jpeg({ quality: 80 }).toFile(filepath);

				count++;

				if (count % 50 === 0) {
					console.log(`   ${count} images created...`);
				}
			}
		}
	}

	console.log(`\n Generated ${count} unique test images`);
	console.log(` Location: ${outputDir}`);
	console.log(` Dates: ${dates[0]} to ${dates[dates.length - 1]}`);
	console.log(` Hours: ${hours[0]}:00 to ${hours[hours.length - 1]}:00`);
	console.log(` Cities: ${CITIES.join(', ')}`);
}

generateImages().catch((error) => {
	console.error(' Error:', error);
	process.exit(1);
});

