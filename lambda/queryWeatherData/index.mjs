import { Client } from 'pg';
import Redis from 'ioredis';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

let redisClient = null;
function getRedis() {
  if (!redisClient) {
    redisClient = new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT) || 6379,
      username: process.env.REDIS_USERNAME || 'default',
      password: process.env.REDIS_PASSWORD,
      retryStrategy: (times) => {
        if (times > 3) {
          console.error('[Redis] Max retries reached');
          return null;
        }
        return Math.min(times * 100, 2000);
      },
      connectTimeout: 10000,
      commandTimeout: 5000
    });

    redisClient.on('error', (err) => {
      console.error('[Redis] Error:', err.message);
    });

    redisClient.on('connect', () => {
      console.log('[Redis] Connected successfully');
    });
  }
  return redisClient;
}

const PG_CONFIG = {
  host: process.env.PG_HOST,
  database: process.env.PG_DB,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  port: 5432,
  ssl: { rejectUnauthorized: false }
};

// --- S3 Client ---
const REGION = 'us-east-1';
const s3 = new S3Client({ region: REGION });
const RAW_BUCKET = 'weatherarchive-raw';
const EDITED_BUCKET = 'weatherarchive-edited';
const VIDEO_BUCKET = 'weatherarchive-videos';

// Generate a signed URL for a given bucket/key
async function generateSignedUrl(bucket, key) {
  if (!key) return null;

  try {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key
    });

    return await getSignedUrl(s3, command, { expiresIn: 3600 }); // 1 hour
  } catch (error) {
    console.error(`[S3] Error generating signed URL for ${bucket}/${key}:`, error.message);
    return null; // Return null instead of throwing -> other URLs can still be generated
  }
}

//Get cached data or fetch from database
async function getCachedOrFetch(cacheKey, fetchFn, ttl = 3600) {
  try {
    const redis = getRedis();
    const cached = await redis.get(cacheKey);

    if (cached) {
      console.log(`[Cache] HIT: ${cacheKey}`);
      const parsed = JSON.parse(cached);
      console.log(`[Cache] Loaded data from cache: mode=${parsed.mode}, frameCount=${parsed.frameCount}`);
      return {
        data: parsed,
        source: 'cache'
      };
    }

    console.log(`[Cache] MISS: ${cacheKey}`);
  } catch (error) {
    console.error(`[Cache] Get error:`, error.message);
    // Continue to database fetch even if cache fails
  }

  console.log(`[Database] Fetching data...`);

  const data = await fetchFn();

  try {
    const redis = getRedis();
    await redis.setex(cacheKey, ttl, JSON.stringify(data));
    console.log(`[Cache] Stored: ${cacheKey} (TTL: ${ttl}s) - mode=${data.mode}, frameCount=${data.frameCount}`);
  } catch (error) {
    console.error(`[Cache] Store error:`, error.message);
    // Continue even if cache store fails
  }

  return {
    data: data,
    source: 'database'
  };
}

// Fetch exactly 12 img/h
async function fetchHourFrames(client, citySlug, date, hour) {
  const query = `
    SELECT
      id,
      city_slug,
      capture_time,
      camera_id,
      s3_unedited_key,
      s3_edited_key,
      s3_video_key,
      temperature,
      humidity,
      air_pressure,
      processed,
      used_in_video,
      created_at
    FROM images
    WHERE city_slug = $1
      AND DATE(capture_time) = $2
      AND EXTRACT(HOUR FROM capture_time) = $3
    ORDER BY capture_time DESC
    LIMIT 12
  `;

  console.log('[Database] Fetching hour frames:', query);
  console.log('[Database] Parameters:', [citySlug, date, parseInt(hour)]);

  const result = await client.query(query, [citySlug, date, parseInt(hour)]);
  console.log(`[Database] Found ${result.rows.length} frames for hour ${hour}`);

  return result.rows;
}

//Fetc latest img for hour when under < 12 frames
async function fetchLatestForHour(client, citySlug, date, hour) {
  const query = `
    SELECT
      id,
      city_slug,
      capture_time,
      camera_id,
      s3_unedited_key,
      s3_edited_key,
      s3_video_key,
      temperature,
      humidity,
      air_pressure,
      processed,
      used_in_video,
      created_at
    FROM images
    WHERE city_slug = $1
      AND DATE(capture_time) = $2
      AND EXTRACT(HOUR FROM capture_time) = $3
    ORDER BY capture_time DESC
    LIMIT 1
  `;

  console.log('[Database] Fetching latest image for hour:', query);
  console.log('[Database] Parameters:', [citySlug, date, parseInt(hour)]);

  const result = await client.query(query, [citySlug, date, parseInt(hour)]);
  console.log(`[Database] Found ${result.rows.length} image(s) for hour ${hour}`);

  return result.rows[0] || null;
}

// Lambda Handler
export const handler = async (event) => {
  console.log('[queryWeatherData] Handler started');
  console.log('[queryWeatherData] Event:', JSON.stringify(event, null, 2));

  // CORS headers for all responses
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,x-api-key,cache-control',
    'Access-Control-Allow-Methods': 'GET,OPTIONS'
  };

  // Handle CORS preflight (OPTIONS)
  if (event.httpMethod === 'OPTIONS' || event.requestContext?.http?.method === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  try {
    const pathParams = event.pathParameters || {};
    const queryParams = event.queryStringParameters || {};

    const citySlug = pathParams.city || queryParams.city;
    const date = queryParams.date;
    const hour = queryParams.hour;

    // Validation: city date hour
    if (!citySlug) {
      console.warn('[queryWeatherData] Missing city parameter');
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        },
        body: JSON.stringify({
          error: 'Missing required parameter: city',
          usage: 'GET /queryWeatherData?city={citySlug}&date=YYYY-MM-DD&hour=0-23'
        })
      };
    }

    if (!date) {
      console.warn('[queryWeatherData] Missing date parameter');
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        },
        body: JSON.stringify({
          error: 'Missing required parameter: date',
          usage: 'GET /queryWeatherData?city={citySlug}&date=YYYY-MM-DD&hour=0-23'
        })
      };
    }

    if (hour === undefined || hour === null) {
      console.warn('[queryWeatherData] Missing hour parameter');
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        },
        body: JSON.stringify({
          error: 'Missing required parameter: hour',
          usage: 'GET /queryWeatherData?city={citySlug}&date=YYYY-MM-DD&hour=0-23'
        })
      };
    }

    // Validation: date format
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      console.warn('[queryWeatherData] Invalid date format:', date);
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        },
        body: JSON.stringify({
          error: 'Invalid date format',
          usage: 'Date must be in YYYY-MM-DD format',
          received: date
        })
      };
    }

    // Validation: hour range
    if (hour !== undefined && hour !== null) {
      const hourNum = parseInt(hour);
      if (isNaN(hourNum) || hourNum < 0 || hourNum > 23) {
        console.warn('[queryWeatherData] Invalid hour:', hour);
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          },
          body: JSON.stringify({
            error: 'Invalid hour value',
            usage: 'Hour must be between 0 and 23',
            received: hour
          })
        };
      }
    }

    let cacheKey = `city:${citySlug}:${date}:h${hour}`;

    console.log(`[queryWeatherData] Cache key: ${cacheKey}`);
    console.log(`[queryWeatherData] Query params: city=${citySlug}, date=${date}, hour=${hour}`);

    // Wrap database + decision logic in a cacheable function
    const fetchDataLogic = async () => {
      const client = new Client(PG_CONFIG);

      try {
        await client.connect();
        console.log('[Database] Connected to PostgreSQL');

        // 1. Check if 12 frames for hour
        const frames = await fetchHourFrames(client, citySlug, date, hour);

        let mode = 'image';
        let selected = null;
        let startTime = null;
        let endTime = null;

        if (frames.length === 12) {
          // Video mode: 12 frames available
          mode = 'video';

          // For videos: get first and last frame for correct time span
          const chronologicalFrames = [...frames].reverse();
          const firstFrame = chronologicalFrames[0];
          const lastFrame = chronologicalFrames[chronologicalFrames.length - 1];

          startTime = firstFrame.capture_time;
          endTime = lastFrame.capture_time;

          // selected = frame with video_key, or first frame
          selected = frames.find(r => r.s3_video_key) || frames[0];

          console.log(`[queryWeatherData] Video mode: 12 frames found (${startTime} to ${endTime})`);
        } else {
          // Image mode: fallback to latest image of hour
          mode = 'image';
          selected = await fetchLatestForHour(client, citySlug, date, hour);
          console.log(`[queryWeatherData] Image mode: ${frames.length} frames (need 12), showing latest image of hour ${hour}`);
        }

        if (!selected) {
          console.warn('[queryWeatherData] No data found');
          const err = new Error('No data found');
          err.statusCode = 404;
          throw err;
        }

        // 2. Generate signed URLs ONLY for the selected item
        console.log(`[S3] Generating signed URLs for selected ${mode}...`);
        const enrichedSelected = { ...selected };

        if (mode === 'video' && selected.s3_video_key) {
          enrichedSelected.signed_video_url = await generateSignedUrl(VIDEO_BUCKET, selected.s3_video_key);
        }

        // Always sign image URLs
        if (selected.s3_edited_key) {
          enrichedSelected.signed_edited_url = await generateSignedUrl(EDITED_BUCKET, selected.s3_edited_key);
        }

        if (selected.s3_unedited_key) {
          enrichedSelected.signed_unedited_url = await generateSignedUrl(RAW_BUCKET, selected.s3_unedited_key);
        }

        console.log(`[S3] Signed URLs generated successfully`);

        // minimal payload for caching
        return {
          mode,
          frameCount: frames.length,
          selected: enrichedSelected,
          startTime: startTime,
          endTime: endTime
        };

      } finally {
        await client.end();
        console.log('[Database] Connection closed');
      }
    };

    // Use cache-or-fetch wrapper
    let result;
    try {
      result = await getCachedOrFetch(cacheKey, fetchDataLogic, 3600);
    } catch (error) {
      if (error.statusCode === 404) {
        return {
          statusCode: 404,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          },
          body: JSON.stringify({
            error: 'No data found',
            city: citySlug,
            date,
            hour: parseInt(hour)
          })
        };
      }
      throw error;
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      },
      body: JSON.stringify({
        city: citySlug,
        date,
        hour: parseInt(hour),
        mode: result.data.mode,
        frameCount: result.data.frameCount,
        source: result.source,
        cached: result.source === 'cache',
        selected: result.data.selected,
        startTime: result.data.startTime,
        endTime: result.data.endTime
      })
    };

  } catch (error) {
    console.error('[queryWeatherData] ERROR:', error);

    let statusCode = 500;
    let errorResponse = {
      error: 'Internal server error',
      message: error.message,
      type: error.name
    };

    // Database connection errors
    if (error.message.includes('Database query failed')) {
      statusCode = 500;
      errorResponse.error = 'Database error';
    }
    // Invalid city or no data found
    else if (error.message.includes('does not exist') || error.message.includes('not found')) {
      statusCode = 404;
      errorResponse.error = 'City not found';
    }
    // Validation errors
    else if (error.message.includes('Invalid') || error.message.includes('required')) {
      statusCode = 400;
      errorResponse.error = 'Validation error';
    }

    return {
      statusCode,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      },
      body: JSON.stringify(errorResponse)
    };
  }
};