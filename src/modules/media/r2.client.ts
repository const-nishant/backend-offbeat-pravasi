import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

let client: S3Client | null = null;

function getR2Client(): S3Client {
  if (!client) {
    client = new S3Client({
      region: process.env.R2_REGION ?? 'auto',
      endpoint:
        process.env.R2_ENDPOINT ??
        (process.env.R2_ACCOUNT_ID
          ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
          : undefined),
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
      },
      forcePathStyle: true,
    });
  }
  return client;
}

function bucketForCategory(category: string): string {
  const map: Record<string, string> = {
    PROFILE: process.env.R2_BUCKET_PROFILE || 'offbeat-profile',
    BANNER: process.env.R2_BUCKET_PROFILE || 'offbeat-profile',
    POST: process.env.R2_BUCKET_POSTS || 'offbeat-posts',
    TREK: process.env.R2_BUCKET_TREKS || 'offbeat-treks',
    STORY: process.env.R2_BUCKET_POSTS || 'offbeat-posts',
  };
  return map[category] ?? 'offbeat-general';
}

export async function generatePresignedPutUrl(
  key: string,
  category: string,
  mimeType: string,
): Promise<string> {
  const s3 = getR2Client();
  const bucket = bucketForCategory(category);

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: mimeType,
  });

  const url = await getSignedUrl(s3, command, { expiresIn: 900 });
  return url;
}

export { getR2Client, bucketForCategory };
