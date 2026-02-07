import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function POST(request: NextRequest) {
  try {
    // Get the form data from the request
    const formData = await request.formData();
    const authHeader = request.headers.get('Authorization');
    
    console.log('[Frontend API] Creating LIFF repair ticket');

    // Forward the request to NestJS backend
    const response = await fetch(`${API_BASE_URL}/api/repairs/liff/create`, {
      method: 'POST',
      headers: {
        ...(authHeader ? { 'Authorization': authHeader } : {}),
        // Don't set Content-Type for FormData - browser will set it with boundary
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Backend error:', data);
      return NextResponse.json(
        { message: data.message || 'Failed to create repair ticket' },
        { status: response.status }
      );
    }

    console.log('[Frontend API] LIFF repair ticket created:', data.ticketCode);
    return NextResponse.json(data, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error('LIFF create repair error:', error);
    return NextResponse.json(
      { message: errorMessage },
      { status: 500 }
    );
  }
}
