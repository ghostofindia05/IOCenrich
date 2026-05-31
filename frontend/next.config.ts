import type { NextConfig } from "next";

const apiDomain = process.env.NEXT_PUBLIC_API_URL
  ? new URL(process.env.NEXT_PUBLIC_API_URL).origin
  : 'https://api-iocenrich.netdefend.in';

const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline' https://static.cloudflareinsights.com https://www.googletagmanager.com;
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data: ${apiDomain} https://www.google-analytics.com https://www.googletagmanager.com;
    font-src 'self' data: https://fonts.gstatic.com;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    worker-src 'self' blob:;
    connect-src 'self' ${apiDomain} wss://${apiDomain.replace('https://', '').replace('http://', '')} https://cdn.jsdelivr.net https://browser-intake-us5-datadoghq.com data: https://www.google-analytics.com https://www.google.com https://analytics.google.com;
`

const nextConfig: NextConfig = {
  allowedDevOrigins: ['iocenrich.netdefend.in', 'api-iocenrich.netdefend.in', 'localhost:3000', '127.0.0.1:3000'],
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspHeader.replace(/\n/g, ''),
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          }
        ],
      },
    ];
  },
};

export default nextConfig;
