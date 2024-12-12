/** @type {import('next').NextConfig} */
const nextConfig = {};

// next.config.mjs
export default {
    async redirects() {
        return [
            {
                source: '/',
                destination: '/login',
                permanent: true,
            },
        ];
    },
};
