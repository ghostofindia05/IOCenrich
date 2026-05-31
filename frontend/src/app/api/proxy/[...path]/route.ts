import { NextRequest, NextResponse } from 'next/server';
import { initSuperTokens } from '@/utils/supertokens';
import Session from 'supertokens-node/recipe/session';
import { withSession } from "supertokens-node/nextjs";

initSuperTokens();

async function handleProxy(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    return withSession(request, async (err, session) => {
        if (err) {
            return NextResponse.json({ error: err.message }, { status: 500 });
        }

        // Use internal backend URL for server-to-server calls.
        const backendBaseUrl = process.env.BACKEND_URL || 'http://localhost:8000';

        const resolvedParams = await params;
        const targetPath = resolvedParams.path.join('/');
        const queryStr = request.nextUrl.search;

        const targetUrl = `${backendBaseUrl}/api/v1/${targetPath}${queryStr}`;

        const headers = new Headers(request.headers);

        // Inject Bearer token only if the user is authenticated (verified by active session)
        if (session) {
            const accessToken = session.getAccessToken();
            console.log(`[PROXY] Injecting auth token for ${targetPath}`);
            headers.set('Authorization', `Bearer ${accessToken}`);
        } else {
            console.warn(`[PROXY] NO SESSION TOKEN FOUND for ${targetPath}`);
            headers.delete('Authorization');
        }

        // Remove headers that might confuse the backend proxying
        headers.delete('host');
        headers.delete('connection');

        try {
            const fetchOptions: RequestInit = {
                method: request.method,
                headers: headers,
                cache: 'no-store',
                redirect: 'manual'
            };

            if (request.method !== 'GET' && request.method !== 'HEAD') {
                const bodyStr = await request.text();
                if (bodyStr.length > 0) {
                    fetchOptions.body = bodyStr;
                    // Ensure Content-Type is forwarded for requests with a body
                    if (!headers.has('content-type')) {
                        headers.set('content-type', 'application/json');
                    }
                } else {
                    // Empty POST/PUT/PATCH — set Content-Type to satisfy backend WAF rules
                    headers.set('content-type', 'application/json');
                }
            }

            console.log(`[PROXY] ${request.method} -> ${targetUrl}`);
            const apiResponse = await fetch(targetUrl, fetchOptions);
            console.log(`[PROXY] ${apiResponse.status} <- ${targetUrl}`);

            const responseHeaders = new Headers(apiResponse.headers);
            responseHeaders.delete('content-encoding'); // Let Next.js handle it

            // Rewrite redirects (e.g., 307 Temporary Redirects) to stay within the proxy
            const locationHeader = responseHeaders.get('location');
            if (locationHeader && locationHeader.startsWith(`${backendBaseUrl}/api/v1`)) {
                const rewrittenLocation = locationHeader.replace(`${backendBaseUrl}/api/v1`, '/api/proxy');
                console.log(`[PROXY] Rewriting redirect Location from ${locationHeader} to ${rewrittenLocation}`);
                responseHeaders.set('location', rewrittenLocation);
            }

            return new NextResponse(apiResponse.body, {
                status: apiResponse.status,
                statusText: apiResponse.statusText,
                headers: responseHeaders,
            });

        } catch (error) {
            console.error("Proxy error:", error);
            return new NextResponse(JSON.stringify({ detail: "Internal Proxy Error" }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }, { sessionRequired: false });
}

export const GET = handleProxy;
export const POST = handleProxy;
export const PUT = handleProxy;
export const DELETE = handleProxy;
export const PATCH = handleProxy;
