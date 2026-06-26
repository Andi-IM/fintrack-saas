const fs = require('fs');
const path = require('path');

const supabaseUrl = 'http://localhost:8000';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgyNDQ1NTMyLCJleHAiOjE5NDAxMjU1MzJ9.d2Bbg1nPSX6VBxYdRBMn55ClVuzmkhSd7vxGWtglN-0';

// Try to read AUTHORIZED_EMAIL from env files
let authorizedEmail = '';
try {
  const envPath = path.join(__dirname, '../frontend/.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/^AUTHORIZED_EMAIL=(.*)$/m);
    if (match && match[1]) {
      authorizedEmail = match[1].trim();
    }
  }
  if (!authorizedEmail) {
    const envDefaultPath = path.join(__dirname, '../frontend/.env');
    if (fs.existsSync(envDefaultPath)) {
      const envContent = fs.readFileSync(envDefaultPath, 'utf8');
      const match = envContent.match(/^AUTHORIZED_EMAIL=(.*)$/m);
      if (match && match[1]) {
        authorizedEmail = match[1].trim();
      }
    }
  }
} catch (e) {
  console.warn('Could not read environment files:', e.message);
}

const email = authorizedEmail || 'user@example.com';
const password = 'password123';

async function run() {
  console.log(`Checking if user ${email} already exists...`);

  // Check login
  const loginRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'apikey': supabaseAnonKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  });

  if (loginRes.ok) {
    console.log(`User ${email} already exists and can log in successfully!`);
    process.exit(0);
  }

  const loginErrData = await loginRes.json().catch(() => ({}));
  console.log(`Login failed (as expected if user doesn't exist yet):`, loginErrData);

  console.log(`Attempting to sign up user ${email}...`);

  const signUpRes = await fetch(`${supabaseUrl}/auth/v1/signup`, {
    method: 'POST',
    headers: {
      'apikey': supabaseAnonKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  });

  const signUpData = await signUpRes.json().catch(() => ({}));

  if (!signUpRes.ok) {
    console.error(`Sign up failed:`, signUpData);
    process.exit(1);
  }

  console.log(`Successfully registered and seeded user ${email}!`);
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
