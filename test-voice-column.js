const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.POSTGRES_URL);

async function testVoiceColumn() {
  try {
    console.log('Testing voice column...');
    const result = await sql`SELECT voice FROM project LIMIT 1`;
    console.log('✓ Voice column exists and is accessible');
    console.log('Sample result:', result);
  } catch (error) {
    console.log('✗ Error accessing voice column:', error.message);
  }
}

testVoiceColumn();