// Backend API route for verifying World ID proofs
// This should be implemented on your backend server
// For now, this is a placeholder that shows the expected structure

import { verifyCloudProof } from '@worldcoin/minikit-js'
import type { ISuccessResult, IVerifyResponse } from '@worldcoin/minikit-js'

interface IRequestPayload {
	payload: ISuccessResult
	action: string
	signal: string | undefined
}

// TODO: Replace with your actual APP_ID from World ID Developer Portal
const APP_ID = import.meta.env.VITE_WORLD_ID_APP_ID as `app_${string}` || 'app_staging_xxxxxxxxxxxxxxxxxxxxx'

export async function verifyProof(payload: IRequestPayload): Promise<IVerifyResponse> {
	const { payload: proofPayload, action, signal } = payload

	try {
		// Verify the proof using World ID's cloud verification
		const verifyRes = (await verifyCloudProof(
			proofPayload,
			APP_ID,
			action,
			signal
		)) as IVerifyResponse

		return verifyRes
	} catch (error: any) {
		console.error('Error verifying proof:', error)
		return {
			success: false,
			message: error.message || 'Verification failed',
		} as IVerifyResponse
	}
}

