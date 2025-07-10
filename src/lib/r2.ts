import { S3Client } from '@aws-sdk/client-s3';

const R2_ENDPOINT = `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`;

export const r2Client = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY!,
  },
});

export const R2_BUCKET_NAME = 'chat';
export const R2_PUBLIC_URL = `https://pub-${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.dev`;