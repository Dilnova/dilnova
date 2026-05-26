import dotenv from 'dotenv';
// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

import { PutBucketCorsCommand, GetBucketCorsCommand } from '@aws-sdk/client-s3';
import { b2Client } from '../utils/b2';

async function setBucketCors() {
  const bucketName = process.env.B2_BUCKET_NAME;
  if (!bucketName) {
    console.error('Error: B2_BUCKET_NAME is not defined in .env.local');
    process.exit(1);
  }

  console.log(`Configuring CORS rules for bucket: ${bucketName}...`);

  const corsConfig = {
    Bucket: bucketName,
    CORSConfiguration: {
      CORSRules: [
        {
          AllowedHeaders: ['*'],
          AllowedMethods: ['PUT', 'GET', 'HEAD', 'POST'],
          AllowedOrigins: [
            'http://localhost:3000',
            // Add production/staging origins here if needed
          ],
          ExposeHeaders: ['ETag'],
          MaxAgeSeconds: 3600,
        },
      ],
    },
  };

  try {
    const putCommand = new PutBucketCorsCommand(corsConfig);
    await b2Client.send(putCommand);
    console.log('✅ CORS configuration successfully updated on Backblaze B2!');

    // Verify it works by reading it back
    const getCommand = new GetBucketCorsCommand({ Bucket: bucketName });
    const response = await b2Client.send(getCommand);
    console.log('Current CORS configuration:');
    console.dir(response.CORSRules, { depth: null });
  } catch (error) {
    console.error('❌ Failed to update CORS configuration:', error);
    process.exit(1);
  }
}

setBucketCors();
