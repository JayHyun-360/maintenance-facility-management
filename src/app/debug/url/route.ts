// Debug endpoint to check URL construction
import { NextResponse } from 'next/server';
import { getURL, getAuthCallbackURL } from '@/lib/utils/url';

export async function GET() {
  return NextResponse.json({
    environment: process.env.NODE_ENV,
    next_public_site_url: process.env.NEXT_PUBLIC_SITE_URL,
    vercel_url: process.env.VERCEL_URL,
    getURL_result: getURL(),
    getAuthCallbackURL_result: getAuthCallbackURL('/admin/dashboard'),
  });
}
