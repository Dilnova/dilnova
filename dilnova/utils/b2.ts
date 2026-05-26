import { S3Client } from '@aws-sdk/client-s3';

const region = process.env.B2_REGION || 'us-east-005';

if (!process.env.B2_APPLICATION_KEY_ID || !process.env.B2_APPLICATION_KEY) {
  console.warn('Warning: Backblaze B2 credentials are not set in environment variables.');
}

export const b2Client = new S3Client({
  endpoint: `https://s3.${region}.backblazeb2.com`,
  region: region,
  credentials: {
    accessKeyId: process.env.B2_APPLICATION_KEY_ID || '',
    secretAccessKey: process.env.B2_APPLICATION_KEY || '',
  },
});
