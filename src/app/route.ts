import { type NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Redirect all root traffic to the repair form directly
  return NextResponse.redirect(new URL('/repairs/liff/form', request.nextUrl.origin));
}
