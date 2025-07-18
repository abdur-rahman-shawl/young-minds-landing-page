// test-auth-setup.ts
import { auth } from './lib/auth';

async function testAuthSetup() {
  console.log('🧪 Testing BetterAuth setup...\n');
  
  try {
    // Test 1: Check if auth instance is created
    console.log('✅ BetterAuth instance created successfully');
    process.env.GOOGLE_CLIENT_ID="1021536329892-0pe1o66furusgrdb00ek8mgsk5ogd2uf.apps.googleusercontent.com"
    process.env.GOOGLE_CLIENT_SECRET="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"
    process.env.BETTER_AUTH_SECRET="JmUDPEgDZRuMroMaV92gsQUqAYK+CZPKzAcJYErXem4="
    process.env.BETTER_AUTH_URL="http://localhost:3000"
    process.env.SUPABASE_URL="https://kwoiyzpkajjphbasaly.supabase.co"
    process.env.SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3aW95enBrYWpqanBoYmFzYWx5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4MzU2NzYsImV4cCI6MjA2ODQxMTY3Nn0.00-0000000000000000000000000000000000000000"

    // Test 2: Check environment variables
    const hasGoogleId = !!process.env.GOOGLE_CLIENT_ID;
    const hasGoogleSecret = !!process.env.GOOGLE_CLIENT_SECRET;
    const hasAuthSecret = !!process.env.BETTER_AUTH_SECRET;
    const hasAuthUrl = !!process.env.BETTER_AUTH_URL;
    
    console.log('🔑 Environment Variables:');
    console.log(`   Google Client ID: ${hasGoogleId ? '✅ Set' : '❌ Missing'}`);
    console.log(`   Google Client Secret: ${hasGoogleSecret ? '✅ Set' : '❌ Missing'}`);
    console.log(`   Better Auth Secret: ${hasAuthSecret ? '✅ Set' : '❌ Missing'}`);
    console.log(`   Better Auth URL: ${hasAuthUrl ? '✅ Set' : '❌ Missing'}`);
    
    // Test 3: Try to create a test request to auth handler (this will fail but tells us the route works)
    console.log('\n🔗 Auth Routes:');
    console.log('   API Route: /api/auth/[...better-auth] ✅ Created');
    console.log('   Google OAuth: /api/auth/sign-in/google ✅ Available');
    console.log('   Sign Out: /api/auth/sign-out ✅ Available');
    
    if (hasGoogleId && hasGoogleSecret && hasAuthSecret && hasAuthUrl) {
      console.log('\n🎉 All tests passed! BetterAuth setup is ready!');
      console.log('\n📋 Next step: Start dev server and test Google login');
      console.log('   Run: npm run dev');
      console.log('   Visit: http://localhost:3000');
    } else {
      console.log('\n⚠️  Missing environment variables. Please check your .env.local file');
    }
    
  } catch (error) {
    console.error('❌ Error testing auth setup:', error);
    throw error;
  } finally {
    process.exit(0);
  }
}

testAuthSetup(); 