import { useEffect, useState, useCallback } from 'react'
import { MiniKit, ResponseEvent, VerificationLevel } from '@worldcoin/minikit-js'
import type { ISuccessResult, MiniAppVerifyActionPayload, VerifyCommandInput } from '@worldcoin/minikit-js'

interface VerificationState {
	isVerifying: boolean
	isVerified: boolean
	error: string | null
}

// TODO: Replace with your actual action ID from World ID Developer Portal
const ACTION_ID = import.meta.env.VITE_WORLD_ID_ACTION_ID || 'token-strike-action'

// TODO: Replace with your backend API endpoint
const VERIFY_API_URL = import.meta.env.VITE_VERIFY_API_URL || '/api/verify'

export function useWorldIDVerification() {
	const [state, setState] = useState<VerificationState>({
		isVerifying: false,
		isVerified: false,
		error: null,
	})

	// Subscribe to verification responses
	useEffect(() => {
		if (!MiniKit.isInstalled()) {
			console.log('MiniKit is not installed - verification will not work')
			return
		}

		console.log('Setting up MiniKit verification listener...')

		const handleVerification = async (response: MiniAppVerifyActionPayload) => {
			console.log('Verification response received:', response)

			if (response.status === 'error') {
				console.error('Verification error:', response)
				setState({
					isVerifying: false,
					isVerified: false,
					error: 'Verification failed. Please try again.',
				})
				return
			}

			// Verify the proof in the backend
			try {
				setState(prev => ({ ...prev, isVerifying: true }))

				const verifyResponse = await fetch(VERIFY_API_URL, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						payload: response as ISuccessResult,
						action: ACTION_ID,
						signal: undefined, // Optional - add if needed
					}),
				})

				const verifyResponseJson = await verifyResponse.json()
				console.log('Backend verification response:', verifyResponseJson)

				if (verifyResponse.ok && verifyResponseJson.status === 200) {
					console.log('Verification success!')
					setState({
						isVerifying: false,
						isVerified: true,
						error: null,
					})
				} else {
					throw new Error(verifyResponseJson.message || 'Verification failed')
				}
			} catch (error: any) {
				console.error('Error verifying proof:', error)
				setState({
					isVerifying: false,
					isVerified: false,
					error: error.message || 'Failed to verify proof. Please try again.',
				})
			}
		}

		MiniKit.subscribe(ResponseEvent.MiniAppVerifyAction, handleVerification)

		return () => {
			console.log('Cleaning up MiniKit verification listener...')
			MiniKit.unsubscribe(ResponseEvent.MiniAppVerifyAction)
		}
	}, [])

	const verify = useCallback((signal?: string) => {
		if (!MiniKit.isInstalled()) {
			setState({
				isVerifying: false,
				isVerified: false,
				error: 'MiniKit is not installed. Please open this app in World App.',
			})
			return
		}

		console.log('Initiating World ID verification...')
		setState({
			isVerifying: true,
			isVerified: false,
			error: null,
		})

		try {
			const verifyPayload: VerifyCommandInput = {
				action: ACTION_ID,
				signal: signal,
				verification_level: VerificationLevel.Orb, // Can be changed to VerificationLevel.Device
			}

			console.log('Sending verify command with payload:', verifyPayload)
			const payload = MiniKit.commands.verify(verifyPayload)
			console.log('Verify command sent:', payload)
		} catch (error: any) {
			console.error('Error sending verify command:', error)
			setState({
				isVerifying: false,
				isVerified: false,
				error: error.message || 'Failed to initiate verification',
			})
		}
	}, [])

	return {
		...state,
		verify,
		isMiniKitInstalled: MiniKit.isInstalled(),
	}
}

