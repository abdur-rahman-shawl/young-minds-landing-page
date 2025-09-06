import { NextRequest, NextResponse } from 'next/server';
import { sendVerificationOtp } from '@/lib/otp';

export async function POST(req: NextRequest) {
  const { email } = await req.json();

  if (!email) {
    return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 });
  }

  const result = await sendVerificationOtp(email);

  if (result.success) {
    return NextResponse.json({ success: true, message: result.message });
  } else {
    return NextResponse.json({ success: false, error: result.error }, { status: 500 });
  }
}