import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://rp-trr-ku-csc-server-smoky.vercel.app';

export async function POST(request: NextRequest) {
  try {
    // Get the form data from the request
    const incomingFormData = await request.formData();
    const authHeader = request.headers.get('Authorization');
    
    console.log('[Frontend API] Creating LIFF repair ticket');
    console.log('[Frontend API] Backend URL:', API_BASE_URL);

    // Create a new FormData to send to backend
    const backendFormData = new FormData();
    
    // Copy all entries from incoming form data
    for (const [key, value] of incomingFormData.entries()) {
      if (value instanceof File) {
        // For files, we need to convert to Blob
        const arrayBuffer = await value.arrayBuffer();
        const blob = new Blob([arrayBuffer], { type: value.type });
        backendFormData.append(key, blob, value.name);
      } else {
        backendFormData.append(key, value);
      }
    }

    // Forward the request to NestJS backend
    const response = await fetch(`${API_BASE_URL}/api/repairs/liff/create`, {
      method: 'POST',
      headers: {
        ...(authHeader ? { 'Authorization': authHeader } : {}),
      },
      body: backendFormData,
    });

    const contentType = response.headers.get('content-type');
    
    if (!response.ok) {
      let errorMessage = 'Failed to create repair ticket';
      if (contentType?.includes('application/json')) {
        const errorData = await response.json();
        console.error('Backend error:', errorData);
        errorMessage = errorData.message || errorMessage;
      } else {
        const text = await response.text();
        console.error('Backend error (non-JSON):', text);
      }
      return NextResponse.json(
        { message: errorMessage },
        { status: response.status }
      );
    }

    const data = await response.json();
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
