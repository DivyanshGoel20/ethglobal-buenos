// Pyth Hermes API service
import { PYTH_FEED_IDS } from '../config/contract'

const HERMES_API_URL = 'https://hermes.pyth.network/v2/updates/price/latest'

interface HermesResponse {
	binary: {
		encoding: string
		data: string[]
	}
	parsed: Array<{
		id: string
		price: {
			price: string
			conf: string
			expo: number
			publish_time: number
		}
	}>
}

/**
 * Fetches price updates from Pyth Hermes REST API for all supported tokens
 * @returns Promise with price update data in the format needed for the contract (bytes[])
 */
export async function fetchPythPriceUpdates(): Promise<string[]> {
	const feedIds = [
		PYTH_FEED_IDS.WBTC,
		PYTH_FEED_IDS.WETH,
		PYTH_FEED_IDS.WLD,
	]

	console.log('Fetching Pyth price updates for feeds:', feedIds)

	try {
		// Build query parameters
		const params = new URLSearchParams()
		feedIds.forEach((id) => {
			params.append('ids[]', id)
		})

		const url = `${HERMES_API_URL}?${params.toString()}`
		console.log('Hermes API URL:', url)

		// Fetch price updates from Hermes REST API
		const response = await fetch(url, {
			method: 'GET',
			headers: {
				'Accept': 'application/json',
			},
		})

		if (!response.ok) {
			throw new Error(`Hermes API error: ${response.status} ${response.statusText}`)
		}

		const data: HermesResponse = await response.json()
		console.log('Hermes API response:', data)
		console.log('Binary data array length:', data.binary?.data?.length)

		// Extract binary data (hex strings)
		if (!data.binary || !data.binary.data || data.binary.data.length === 0) {
			throw new Error('No binary data received from Hermes API')
		}

		// Convert hex strings to 0x-prefixed format for viem
		const priceUpdates = data.binary.data.map((hexString: string) => {
			// Ensure the hex string has 0x prefix
			const hex = hexString.startsWith('0x') ? hexString : `0x${hexString}`
			console.log('Price update hex length:', hex.length)
			return hex
		})

		console.log('Price updates prepared:', priceUpdates.length, 'updates')
		console.log('First update preview:', priceUpdates[0]?.substring(0, 100) + '...')

		return priceUpdates
	} catch (error) {
		console.error('Error fetching Pyth price updates:', error)
		throw error
	}
}

/**
 * Fetches current prices from Pyth (for display purposes)
 */
export async function fetchPythPrices(): Promise<Record<string, { price: string; expo: number }>> {
	const feedIds = [
		PYTH_FEED_IDS.WBTC,
		PYTH_FEED_IDS.WETH,
		PYTH_FEED_IDS.WLD,
	]

	try {
		const params = new URLSearchParams()
		feedIds.forEach((id) => {
			params.append('ids[]', id)
		})

		const response = await fetch(`${HERMES_API_URL}?${params.toString()}`)
		
		if (!response.ok) {
			throw new Error(`Hermes API error: ${response.statusText}`)
		}

		const data: HermesResponse = await response.json()
		const prices: Record<string, { price: string; expo: number }> = {}

		if (data.parsed) {
			data.parsed.forEach((feed) => {
				prices[feed.id] = {
					price: feed.price.price,
					expo: feed.price.expo,
				}
			})
		}

		return prices
	} catch (error) {
		console.error('Error fetching Pyth prices:', error)
		throw error
	}
}

