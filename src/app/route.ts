import { type NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Redirect all root traffic to the repair form
  // The /repairs/liff page handles both LINE context (if available) and guest mode
  return NextResponse.redirect(new URL('/repairs/liff', request.nextUrl.origin));
}
