/**
 * Backend API Route Example for World ID Verification
 * 
 * This is an example of how to implement the backend verification endpoint.
 * You'll need to create this as a server-side API route.
 * 
 * For Next.js: Create this at app/api/verify/route.ts
 * For Express: Create this at routes/verify.ts
 * For other frameworks: Adapt accordingly
 */

import { verifyCloudProof } from '@worldcoin/minikit-js'
import type { IVerifyResponse, ISuccessResult } from '@worldcoin/minikit-js'

interface IRequestPayload {
	payload: ISuccessResult
	action: string
	signal: string | undefined
}

// Get your APP_ID from World ID Developer Portal
const APP_ID = process.env.WORLD_ID_APP_ID as `app_${string}`

export async function POST(req: Request) {
	try {
		const { payload, action, signal }: IRequestPayload = await req.json()

		if (!APP_ID) {
			return new Response(
				JSON.stringify({ 
					success: false, 
					message: 'APP_ID not configured' 
				}),
				{ status: 500, headers: { 'Content-Type': 'application/json' } }
			)
		}

		// Verify the proof using World ID's cloud verification
		const verifyRes = (await verifyCloudProof(
			payload,
			APP_ID,
			action,
			signal
		)) as IVerifyResponse

		if (verifyRes.success) {
			// This is where you should perform backend actions if the verification succeeds
			// Such as, setting a user as "verified" in a database
			// Example: await markUserAsVerified(userAddress)
			
			return new Response(
				JSON.stringify({ verifyRes, status: 200 }),
				{ status: 200, headers: { 'Content-Type': 'application/json' } }
			)
		} else {
			// This is where you should handle errors from the World ID /verify endpoint.
			// Usually these errors are due to a user having already verified.
			return new Response(
				JSON.stringify({ verifyRes, status: 400 }),
				{ status: 400, headers: { 'Content-Type': 'application/json' } }
			)
		}
	} catch (error: any) {
		console.error('Error in verification endpoint:', error)
		return new Response(
			JSON.stringify({ 
				success: false, 
				message: error.message || 'Internal server error' 
			}),
			{ status: 500, headers: { 'Content-Type': 'application/json' } }
		)
	}
}

