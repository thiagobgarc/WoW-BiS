/**
 * Routes in app/ are addresses, not implementations — architecture.md
 * Section 6 puts screen code under src/features/. Keeping them one line
 * also keeps test files out of expo-router's require.context over app/,
 * which would otherwise pull the testing library into the shipped bundle.
 */
export { default } from '@/features/search/SearchScreen';
