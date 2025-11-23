# World ID Verification Setup Guide

This guide explains how to set up World ID verification for Token Strike.

## Prerequisites

1. **World ID Developer Portal Account**
   - Sign up at https://developer.worldcoin.org
   - Create a new application
   - Get your `APP_ID` (format: `app_xxxxxxxxxxxxxxxxxxxxx`)
   - Create an action (e.g., `token-strike-action`)

## Environment Variables

Create a `.env` file in the root of your project with the following variables:

```env
# World ID Configuration
VITE_WORLD_ID_ACTION_ID=your-action-id-here
VITE_WORLD_ID_APP_ID=app_your_app_id_here
VITE_VERIFY_API_URL=http://localhost:3000/api/verify
```

**Note:** 
- `VITE_WORLD_ID_ACTION_ID` - The action ID you created in the Developer Portal
- `VITE_WORLD_ID_APP_ID` - Your app ID from the Developer Portal (only needed for backend)
- `VITE_VERIFY_API_URL` - Your backend API endpoint for verification

## Backend Setup

You need to create a backend API endpoint to verify the World ID proofs. The frontend sends the proof to your backend, and your backend verifies it with World ID's API.

### Example Implementation

See `src/api/verify.example.ts` for a complete example of how to implement the verification endpoint.

**Key points:**
1. The endpoint should accept POST requests with the proof payload
2. Use `verifyCloudProof()` from `@worldcoin/minikit-js` to verify the proof
3. Return success/error responses accordingly
4. Store verification status in your database if needed

### For Vite Development

Since Vite is a frontend build tool, you'll need to set up a separate backend server. Options:

1. **Express.js Server** - Create a simple Express server
2. **Next.js API Routes** - If migrating to Next.js
3. **Serverless Functions** - Deploy to Vercel, Netlify, etc.

## How It Works

1. **User clicks "Verify with World ID"** button
2. **MiniKit sends verify command** to World App
3. **World App shows verification drawer** to user
4. **User confirms verification** in World App
5. **MiniKit receives proof** and sends it to your backend
6. **Backend verifies proof** with World ID API
7. **Frontend shows success/error** message

## Testing

1. **In Browser**: The button will show "World ID Not Available" since MiniKit only works in World App
2. **In World App**: Open your app in World App to test the full flow
3. **Check Console**: All verification steps are logged to the console for debugging

## Files Created

- `src/hooks/useWorldIDVerification.ts` - React hook for World ID verification
- `src/api/verify.example.ts` - Example backend implementation
- Integration in `src/components/Homepage.tsx` - UI for verification

## Next Steps

1. Set up your backend API endpoint using the example
2. Add your environment variables
3. Test in World App
4. Implement any additional logic (e.g., storing verification status in database)

