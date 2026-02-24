import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import pkg from "pg";

const { Client } = pkg;

const s3 = new S3Client({});
const DESTINATION_BUCKET = "weatherarchive-edited";

const PG_CONFIG = {
	host: process.env.PG_HOST,
	database: process.env.PG_DB,
	user: process.env.PG_USER,
	password: process.env.PG_PASSWORD,
	port: 5432,
	ssl: { rejectUnauthorized: false }
};

export const handler = async (event) => {
	try {
		const record = event.Records[0];

		const sourceBucket = record.s3.bucket.name;
		const key = decodeURIComponent(
			record.s3.object.key.replace(/\+/g, " ")
		);

		// 1. Download original image
		const getObjectResponse = await s3.send(
			new GetObjectCommand({
				Bucket: sourceBucket,
				Key: key
			})
		);

		const imageBuffer = await streamToBuffer(getObjectResponse.Body);

		// 2. Resize image
		const resizedImage = await sharp(imageBuffer)
			.resize(570, 320, { fit: "cover" })
			.toBuffer();

		// 3. Upload to weatherarchive-edited (edited/city/.....)
		const newKey = key.replace(/^raw\//, "edited/");

		await s3.send(
			new PutObjectCommand({
				Bucket: DESTINATION_BUCKET,
				Key: newKey,
				Body: resizedImage,
				ContentType: getObjectResponse.ContentType
			})
		);

		console.log(`Uploaded resized image: ${DESTINATION_BUCKET}/${newKey}`);

		// 4. Update Postgres record
		const client = new Client(PG_CONFIG);
		await client.connect();

		const updateQuery = `
      UPDATE images
      SET
        s3_edited_key = $1,  -- Update the s3_edited_key
        processed = true,
        updated_at = now()
      WHERE s3_unedited_key = $2
    `;

		const result = await client.query(updateQuery, [
			newKey,
			key
		]);

		await client.end();

		if (result.rowCount === 0) {
			console.warn(`No DB row found for key: ${key}`);
		} else {
			console.log(`DB updated for key: ${key}`);
		}

		return { statusCode: 200 };

	} catch (err) {
		console.error("Image processing failed:", err);
		throw err;
	}
};

// ===== Helper: convert stream -> buffer =====
const streamToBuffer = async (stream) => {
	const chunks = [];
	for await (const chunk of stream) {
		chunks.push(chunk);
	}
	return Buffer.concat(chunks);
};