const dotenv = require('dotenv');
// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const { S3Client, PutBucketCorsCommand, GetBucketCorsCommand } = require('@aws-sdk/client-s3');

// Configure S3 Client locally to avoid importing ES Modules in CommonJS
const region = process.env.B2_REGION || 'us-east-005';
const b2Client = new S3Client({
  endpoint: `https://s3.${region}.backblazeb2.com`,
  region: region,
  credentials: {
    accessKeyId: process.env.B2_APPLICATION_KEY_ID || '',
    secretAccessKey: process.env.B2_APPLICATION_KEY || '',
  },
});

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
