import { NextRequest, NextResponse } from 'next/server';

// 🚀 FIXED: Hardcode Production URL as fallback to ensure it works even if env is missing
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
    // ⚠️ Added signal for timeout handling (optional but good practice)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout (Vercel max is ~10-60s)

    try {
        const response = await fetch(`${API_BASE_URL}/api/repairs/liff/create`, {
          method: 'POST',
          headers: {
            ...(authHeader ? { 'Authorization': authHeader } : {}),
            // Do NOT set Content-Type header for FormData, fetch does it automatically with boundary
          },
          body: backendFormData,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        const contentType = response.headers.get('content-type');
        
        if (!response.ok) {
          let errorMessage = `Backend returned ${response.status}`;
          if (contentType?.includes('application/json')) {
            const errorData = await response.json();
            console.error('[Frontend API] Backend Error JSON:', errorData);
            errorMessage = errorData.message || errorMessage;
          } else {
            const text = await response.text();
            console.error('[Frontend API] Backend Error Text:', text);
            errorMessage = text || errorMessage;
          }
          return NextResponse.json(
            { message: `Backend Error: ${errorMessage}` },
            { status: response.status }
          );
        }

        const data = await response.json();
        console.log('[Frontend API] LIFF repair ticket created:', data.ticketCode);
        return NextResponse.json(data, { status: 201 });

    } catch (fetchError: any) {
        clearTimeout(timeoutId);
        console.error('[Frontend API] Fetch/Network Error:', fetchError);
        
        if (fetchError.name === 'AbortError') {
             return NextResponse.json(
                { message: 'Request timed out connecting to Backend' },
                { status: 504 }
            );
        }

        return NextResponse.json(
            { message: `Network/Fetch Error: ${fetchError.message} (URL: ${API_BASE_URL})` },
            { status: 502 }
        );
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error('[Frontend API] Critical Error:', error);
    return NextResponse.json(
      { message: errorMessage },
      { status: 500 }
    );
  }
}
