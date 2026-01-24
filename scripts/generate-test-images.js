import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Minimales 1x1 JPEG (Base64)
const MINIMAL_JPEG_BASE64 =
	'/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAIBAQIBAQICAgICAgICAwUDAwMDAwYEBAMFBwYHBwcGBwcICQsJCAgKCAcHCg0KCgsMDAwMBwkODw0MDgsMDAz/2wBDAQICAgMDAwYDAwYMCAcIDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAz/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlbaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD9/KKKKAP/2Q==';

const CITIES = ['vienna', 'berlin', 'paris', 'london', 'rome', 'madrid', 'amsterdam', 'brussels'];

// Aktuelles Datum und die nchsten 7 Tage
const today = new Date();
const dates = [];
for (let i = 0; i < 7; i++) {
	const d = new Date(today);
	d.setDate(today.getDate() + i);
	dates.push(d.toISOString().split('T')[0]); // YYYY-MM-DD
}

// Stunden: 6-20 Uhr
const hours = Array.from({ length: 15 }, (_, i) => i + 6);

const outputDir = path.join(__dirname, '..', '..', '..', 'static', 'images');

// Stelle sicher, dass Verzeichnis existiert
if (!fs.existsSync(outputDir)) {
	fs.mkdirSync(outputDir, { recursive: true });
}

// Generiere Bilder
const buffer = Buffer.from(MINIMAL_JPEG_BASE64, 'base64');
let count = 0;

CITIES.forEach((city) => {
	dates.forEach((date) => {
		hours.forEach((hour) => {
			const filename = `${city}_${date}_${hour.toString().padStart(2, '0')}.jpg`;
			const filepath = path.join(outputDir, filename);
			fs.writeFileSync(filepath, buffer);
			count++;
		});
	});
});

console.log(` Generated ${count} test images`);
console.log(` Location: ${outputDir}`);
console.log(` Dates: ${dates[0]} to ${dates[dates.length - 1]}`);
console.log(` Hours: ${hours[0]}:00 to ${hours[hours.length - 1]}:00`);
console.log(` Cities: ${CITIES.join(', ')}`);

