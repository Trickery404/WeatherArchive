import {
	S3Client,
	ListObjectsV2Command,
	GetObjectCommand,
	PutObjectCommand
} from "@aws-sdk/client-s3";

import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import pkg from "pg";

const { Client } = pkg;
const s3 = new S3Client({ region: process.env.AWS_REGION });
const execFileAsync = promisify(execFile);
const SOURCE_BUCKET = "weatherarchive-edited";
const VIDEO_OUTPUT_BUCKET = "weatherarchive-videos";
const FFMPEG_PATH = "/opt/bin/ffmpeg";

// Postgres config
const PG_CONFIG = {
	host: process.env.PG_HOST,
	database: process.env.PG_DB,
	user: process.env.PG_USER,
	password: process.env.PG_PASSWORD,
	port: 5432,
	ssl: { rejectUnauthorized: false }
};

export const handler = async () => {
	try {
		console.log("Starting full folder scan for video generation...");

		// 1. List cities
		const citiesResp = await s3.send(new ListObjectsV2Command({
			Bucket: SOURCE_BUCKET,
			Prefix: "edited/",
			Delimiter: "/"
		}));

		const cities = citiesResp.CommonPrefixes?.map(p => p.Prefix.split("/")[1]) || [];
		console.log("Cities:", cities);

		for (const city of cities) {
			// 2. List years
			const years = await listFolders(`edited/${city}/`);
			for (const year of years) {

				// 3. List months
				const months = await listFolders(`edited/${city}/${year}/`);
				for (const month of months) {

					// 4. List days
					const days = await listFolders(`edited/${city}/${year}/${month}/`);
					for (const day of days) {

						// 5. List hours
						const hours = await listFolders(`edited/${city}/${year}/${month}/${day}/`);
						for (const hour of hours) {

							const prefix = `edited/${city}/${year}/${month}/${day}/${hour}/`;
							console.log(`Processing folder: ${prefix}`);

							// 6. List images
							const imageListResp = await s3.send(new ListObjectsV2Command({
								Bucket: SOURCE_BUCKET,
								Prefix: prefix
							}));

							const allObjects = imageListResp.Contents || [];

							if (allObjects.length < 12) {
								console.log(`Not enough images (${allObjects.length}). Skipping.`);
								continue;
							}

							// 7. Check if video already exists
							const videoKey = `videos/${city}_${year}-${month}-${day}_${hour}.mp4`;

							const videoExistsResp = await s3.send(new ListObjectsV2Command({
								Bucket: VIDEO_OUTPUT_BUCKET,
								Prefix: videoKey
							}));

							if (videoExistsResp.Contents?.length > 0) {
								console.log(`Video already exists: ${videoKey}`);
								continue;
							}

							// 8. Validation
							const imagesWithTimestamps = allObjects.map(obj => ({
								key: obj.Key,
								timestamp: extractTimestampFromKey(obj.Key)
							}));

							const missing = checkForMissingImages(imagesWithTimestamps);
							if (missing.length > 0) {
								console.log(`Missing images:`, missing);
								continue;
							}

							// 9. Download images
							const localFiles = [];
							for (const obj of allObjects) {
								const fileName = path.basename(obj.Key);
								const localPath = `/tmp/${fileName}`;

								const getResp = await s3.send(new GetObjectCommand({
									Bucket: SOURCE_BUCKET,
									Key: obj.Key
								}));

								const buffer = await streamToBuffer(getResp.Body);
								fs.writeFileSync(localPath, buffer);

								localFiles.push(localPath);
							}

							localFiles.sort();

							// 10. Create FFmpeg file list
							const listFile = "/tmp/filelist.txt";
							const fileListContent = localFiles
								.map(f => `file '${f}'\nduration 1`)
								.join("\n");

							fs.writeFileSync(listFile, fileListContent);
							fs.appendFileSync(listFile, `\nfile '${localFiles[localFiles.length - 1]}'`);

							// 11. Generate video
							const outputVideo = `/tmp/${city}_${year}-${month}-${day}_${hour}.mp4`;

							await execFileAsync(FFMPEG_PATH, [
								"-f", "concat",
								"-safe", "0",
								"-i", listFile,
								"-vsync", "vfr",
								"-pix_fmt", "yuv420p",
								outputVideo
							]);

							console.log(`Video created: ${outputVideo}`);

							// 12. Upload video
							await s3.send(new PutObjectCommand({
								Bucket: VIDEO_OUTPUT_BUCKET,
								Key: videoKey,
								Body: fs.readFileSync(outputVideo),
								ContentType: "video/mp4"
							}));

							console.log(`Uploaded video: ${videoKey}`);

							// 13. Update Postgres for all images in this hour
							const client = new Client(PG_CONFIG);
							await client.connect();

							const startOfHour = `${year}-${month}-${day} ${hour}:00:00`;
							const endOfHour = `${year}-${month}-${day} ${hour}:59:59`;

							const updateQuery = `
                UPDATE images
                SET 
                  s3_video_key = $1,
                  used_in_video = true,
                  updated_at = now()
                WHERE city_slug = $2
                  AND capture_time >= $3
                  AND capture_time <= $4
              `;

							const result = await client.query(updateQuery, [
								videoKey,
								city,
								startOfHour,
								endOfHour
							]);

							await client.end();

							console.log(`Updated ${result.rowCount} rows for video ${videoKey}`);
						}
					}
				}
			}
		}

		return { statusCode: 200, body: "All folders processed" };

	} catch (err) {
		console.error("ERROR:", err);
		return { statusCode: 500, body: err.message };
	}
};

// === Helpers ===
const listFolders = async (prefix) => {
	const resp = await s3.send(new ListObjectsV2Command({
		Bucket: SOURCE_BUCKET,
		Prefix: prefix,
		Delimiter: "/"
	}));

	return resp.CommonPrefixes?.map(p => p.Prefix.split("/").slice(-2)[0]) || [];
};

const streamToBuffer = async (stream) => {
	const chunks = [];
	for await (const chunk of stream) chunks.push(chunk);
	return Buffer.concat(chunks);
};

const extractTimestampFromKey = (key) => {
	const regex = /(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})\.jpg/;
	const match = key.match(regex);
	if (!match) return null;

	return {
		year: match[1],
		month: match[2],
		day: match[3],
		hour: match[4],
		minute: match[5]
	};
};

const checkForMissingImages = (images) => {
	const missing = [];
	for (let i = 0; i < 12; i++) {
		const expectedMinute = i * 5;
		const found = images.find(img =>
			img.timestamp &&
			parseInt(img.timestamp.minute) === expectedMinute
		);
		if (!found) missing.push(`Missing image at minute ${expectedMinute}`);
	}
	return missing;
};