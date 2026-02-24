import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import Busboy from "busboy";
import pkg from "pg";
import Redis from "ioredis";
import path from "path";

const { Client } = pkg;

const s3 = new S3Client({ region: process.env.AWS_REGION });
const BUCKET = "weatherarchive-raw";

const PG_CONFIG = {
	host: process.env.PG_HOST,
	database: process.env.PG_DB,
	user: process.env.PG_USER,
	password: process.env.PG_PASSWORD,
	port: 5432,
	ssl: { rejectUnauthorized: false }
};

let redisClient = null;
function getRedis() {
	if (!redisClient) {
		redisClient = new Redis({
			host: process.env.REDIS_HOST,
			port: parseInt(process.env.REDIS_PORT) || 6379,
			username: process.env.REDIS_USERNAME || 'default',
			password: process.env.REDIS_PASSWORD,
			retryStrategy: (times) => (times > 3 ? null : Math.min(times * 100, 2000)),
			connectTimeout: 10000,
			commandTimeout: 5000
		});
		redisClient.on('error', (err) => console.error('[Redis] Error:', err.message));
	}
	return redisClient;
}

async function invalidateCityCache(citySlug) {
	try {
		const redis = getRedis();
		const keys = await redis.keys(`city:${citySlug}:*`);
		if (keys.length > 0) {
			await redis.del(...keys);
			console.log(`[Cache] Invalidated ${keys.length} keys for ${citySlug}`);
			return keys.length;
		}
		console.log(`[Cache] No keys found for ${citySlug}`);
		return 0;
	} catch (error) {
		console.error('[Cache] Invalidation failed:', error.message);
		return 0;
	}
}

function validateMetadata(metadata) {
	const required = [
		"city_slug",
		"capture_time",
		"camera_id"
	];

	for (const field of required) {
		if (!metadata[field]) {
			throw new Error(`Missing required metadata field: ${field}`);
		}
	}

	const captureTime = new Date(metadata.capture_time);
	if (isNaN(captureTime.getTime())) {
		throw new Error("Invalid capture_time format");
	}

	if (
		metadata.humidity !== undefined &&
		(metadata.humidity < 0 || metadata.humidity > 100)
	) {
		throw new Error("Humidity must be between 0 and 100");
	}

	if (
		metadata.air_pressure !== undefined &&
		metadata.air_pressure <= 0
	) {
		throw new Error("Air pressure must be > 0");
	}
}

function parseMultipart(event) {
	return new Promise((resolve, reject) => {
		const contentType = event.headers["content-type"] || event.headers["Content-Type"];
		if (!contentType) return reject(new Error("Missing Content-Type header"));

		const busboy = Busboy({ headers: { "content-type": contentType } });
		let imageBuffer = null;
		let metadata = null;
		let filename = null;

		busboy.on("file", (fieldname, file, info) => {
			if (fieldname !== "image") {
				file.resume();
				return;
			}
			filename = info.filename; // capture the original filename
			const chunks = [];
			file.on("data", (data) => chunks.push(data));
			file.on("end", () => { imageBuffer = Buffer.concat(chunks); });
		});

		busboy.on("field", (fieldname, value) => {
			if (fieldname === "metadata") metadata = JSON.parse(value);
		});

		busboy.on("error", reject);
		busboy.on("finish", () => {
			if (!imageBuffer) return reject(new Error("Image field missing"));
			if (!metadata) return reject(new Error("Metadata field missing"));
			resolve({ imageBuffer, metadata, filename });
		});

		const body = event.isBase64Encoded
			? Buffer.from(event.body, "base64")
			: Buffer.from(event.body, "latin1");
		busboy.end(body);
	});
}

// ===== Lambda Handler =====
export const handler = async (event) => {
	console.log("Headers:", JSON.stringify(event.headers, null, 2));
	console.log("isBase64Encoded:", event.isBase64Encoded);
	console.log("Body length:", event.body?.length);

	try {
		const { imageBuffer, metadata, filename } = await parseMultipart(event);
		console.log("Parsed metadata:", metadata);
		console.log("Original filename:", filename);
		console.log("Image size:", imageBuffer.length);

		// --- Validate Metadata ---
		validateMetadata(metadata);

		// --- Check if City Exists ---
		const client = new Client(PG_CONFIG);
		await client.connect();

		const cityCheck = await client.query(
			"SELECT 1 FROM cities WHERE slug = $1",
			[metadata.city_slug]
		);

		if (cityCheck.rowCount === 0) {
			await client.end();
			throw new Error("Invalid city_slug");
		}

		// --- Insert Data into PostgreSQL ---
		const captureTime = new Date(metadata.capture_time);
		const year = captureTime.getUTCFullYear();
		const month = String(captureTime.getUTCMonth() + 1).padStart(2, '0');
		const day = String(captureTime.getUTCDate()).padStart(2, '0');
		const hour = String(captureTime.getUTCHours()).padStart(2, '0');

		const s3Key = `raw/${metadata.city_slug}/${year}/${month}/${day}/${hour}/${filename}`;

		const insertQuery = `
      INSERT INTO images
        (city_slug, capture_time, camera_id, s3_unedited_key,
         temperature, humidity, air_pressure,
         processed, used_in_video, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,now(), now())
      ON CONFLICT (camera_id, capture_time) DO NOTHING
      RETURNING id
    `;

		const values = [
			metadata.city_slug,
			metadata.capture_time,
			metadata.camera_id,
			s3Key,
			metadata.temperature,
			metadata.humidity,
			metadata.air_pressure,
			false,
			false
		];

		const insertResult = await client.query(insertQuery, values);

		if (insertResult.rowCount === 0) {
			await client.end();
			throw new Error("Duplicate entry: image already exists");
		}

		const insertedId = insertResult.rows[0].id;

		// --- Upload to S3 ---
		try {
			await s3.send(new PutObjectCommand({
				Bucket: BUCKET,
				Key: s3Key,
				Body: imageBuffer,
				ContentType: "image/jpeg"
			}));
			console.log("Uploaded to S3:", s3Key);
		} catch (uploadErr) {
			// When error -> Rollback DB if upload fails
			await client.query("DELETE FROM images WHERE id = $1", [insertedId]);
			await client.end();
			throw new Error("S3 Upload failed, DB rollback executed.");
		}

		// --- Cache Invalidation ---
		const invalidatedCount = await invalidateCityCache(metadata.city_slug);

		await client.end();

		return {
			statusCode: 200,
			body: JSON.stringify({
				s3_bucket: BUCKET,
				s3_key: s3Key,
				db_id: insertedId ?? null,
				cache_invalidated: invalidatedCount > 0,
				cache_keys_deleted: invalidatedCount
			})
		};
	} catch (err) {
		console.error("ERROR:", err);
		return {
			statusCode: 500,
			body: JSON.stringify({ error: err.message })
		};
	}
};