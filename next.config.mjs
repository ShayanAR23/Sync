import withSerwistInit from "@serwist/next";

/** @type {import('next').NextConfig} */
const nextConfig = {};

const withSerwist = withSerwistInit({
  swSrc: "app/sw.js",
  swDest: "public/sw.js",
  // Serwist's defaultCache already no-ops in dev (network-only), but we skip
  // generating the worker entirely so a stale build can't shadow HMR.
  disable: process.env.NODE_ENV === "development",
  // The app shell itself: Next.js documents aren't plain static files, so
  // Serwist won't pick them up automatically — precache them explicitly so
  // a cold, fully-offline open of the app still renders instead of falling
  // through to the offline page.
  additionalPrecacheEntries: [
    { url: "/", revision: String(Date.now()) },
    { url: "/offline", revision: String(Date.now()) },
  ],
});

export default withSerwist(nextConfig);
