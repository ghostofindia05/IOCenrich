import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/settings', '/verify', '/forgot-password', '/reset-password'],
        },
        sitemap: 'https://iocenrich.netdefend.in/sitemap.xml',
    }
}
