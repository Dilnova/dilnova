import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is missing in .env.local');
  }

  console.log('🌱 Connecting to database...');
  const sql = postgres(connectionString);

  console.log('📋 Creating "pricing_plans" table...');
  await sql`
    CREATE TABLE IF NOT EXISTS pricing_plans (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      price TEXT NOT NULL,
      period TEXT NOT NULL DEFAULT '/month',
      description TEXT,
      features JSONB NOT NULL DEFAULT '[]'::jsonb,
      is_popular BOOLEAN NOT NULL DEFAULT FALSE,
      button_text TEXT NOT NULL DEFAULT 'Get Started',
      button_link TEXT NOT NULL DEFAULT '/contact',
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    )
  `;

  console.log('📋 Creating "contact_submissions" table...');
  await sql`
    CREATE TABLE IF NOT EXISTS contact_submissions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      category TEXT NOT NULL,
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    )
  `;

  console.log('📋 Creating indexes for "contact_submissions"...');
  await sql`CREATE INDEX IF NOT EXISTS idx_contact_submissions_email ON contact_submissions (email)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_contact_submissions_status ON contact_submissions (status)`;

  console.log('🚀 Database tables initialized successfully!');
  await sql.end();
}

main().catch((err) => {
  console.error('❌ Failed to initialize database tables:', err);
  process.exit(1);
});
