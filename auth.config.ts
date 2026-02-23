import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
    pages: {
        signIn: '/login',
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;

            // Allow public access to login and register pages
            if (nextUrl.pathname === '/login' || nextUrl.pathname === '/register') {
                if (isLoggedIn) {
                    // Redirect logged-in users to dashboard
                    return Response.redirect(new URL('/dashboard', nextUrl));
                }
                return true;
            }

            // Allow access to API routes (NextAuth handles its own protection for /api/auth/*)
            // But general API routes might need protection check inside them. 
            // The middleware matcher excludes /api, so this callback mainly affects pages.
            // If matcher includes page routes, we need to return true/false.

            // Protection for ALL other pages
            if (isLoggedIn) return true;

            // Redirect unauthenticated users to login page
            return false;
        },
    },
    providers: [], // Add providers with an empty array for now
} satisfies NextAuthConfig;
