import { useState, useEffect } from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useReadContract } from 'wagmi'
import { formatUnits } from 'viem'
import { GAME_BANK_ADDRESS, GAME_BANK_ABI, TOKEN_INFO, TOKENS } from '../config/contract'
import { TransactionModal } from './TransactionModal'
import { Game } from './Game'
import { useWorldIDVerification } from '../hooks/useWorldIDVerification'
import './Homepage.css'

export function Homepage() {
	const { isConnected, address } = useAccount()
	const [depositModalOpen, setDepositModalOpen] = useState(false)
	const [withdrawModalOpen, setWithdrawModalOpen] = useState(false)
	const [gameStarted, setGameStarted] = useState(false)
	
	// World ID verification
	const worldIDVerification = useWorldIDVerification()
	const { verify, isVerified, isVerifying, error: verificationError, isMiniKitInstalled } = worldIDVerification

	// Fetch user stats
	const { data: stats, refetch: refetchStats, isLoading: isLoadingStats, error: statsError } = useReadContract({
		address: GAME_BANK_ADDRESS,
		abi: GAME_BANK_ABI,
		functionName: 'getStats',
		args: address ? [address as `0x${string}`] : undefined,
		query: {
			enabled: !!address && isConnected,
			refetchInterval: 5000, // Refetch every 5 seconds
		},
	})

	// Fetch user balances
	const { data: balances, refetch: refetchBalances, isLoading: isLoadingBalances } = useReadContract({
		address: GAME_BANK_ADDRESS,
		abi: GAME_BANK_ABI,
		functionName: 'getBalances',
		args: address ? [address as `0x${string}`] : undefined,
		query: {
			enabled: !!address && isConnected,
			refetchInterval: 5000, // Refetch every 5 seconds
		},
	})

	// Debug logs
	useEffect(() => {
		console.log('=== Debug Info ===')
		console.log('Address:', address)
		console.log('Is connected:', isConnected)
		console.log('Is loading stats:', isLoadingStats)
		console.log('Stats error:', statsError)
		
		if (stats) {
			console.log('=== Stats from getStats ===')
			console.log('Raw stats:', stats)
			console.log('Stats type:', typeof stats)
			console.log('Stats is array:', Array.isArray(stats))
			console.log('Stats keys:', typeof stats === 'object' && stats !== null ? Object.keys(stats) : 'N/A')
			
			// Try different parsing methods
			if (Array.isArray(stats)) {
				console.log('Stats as array:', stats)
				console.log('Bullets (index 0):', stats[0]?.toString())
				console.log('Damage (index 1):', stats[1]?.toString())
			} else if (typeof stats === 'object' && stats !== null) {
				console.log('Stats as object:', stats)
				console.log('Bullets property:', (stats as any).bullets?.toString())
				console.log('Damage property:', (stats as any).damage?.toString())
				console.log('Result property:', (stats as any).result)
			}
		} else {
			console.log('Stats is null/undefined')
		}
		
		if (balances) {
			console.log('=== Balances from getBalances ===')
			console.log('Raw balances:', balances)
			console.log('Balances type:', typeof balances)
			console.log('Balances array:', Array.isArray(balances) ? balances : 'Not an array')
		}
	}, [stats, balances, address, isConnected, isLoadingStats, statsError])

	const handleStartGame = () => {
		// Get current bullets count and damage from contract stats
		const bulletsCount = bulletsNumber
		const damageValue = damageNumber
		
		console.log('Starting game with bullets:', bulletsCount, 'and damage:', damageValue)
		
		// Try to open in a new window first (works in regular browsers)
		try {
			// Calculate center position for the window
			const width = 900
			const height = 900
			// Use screen.availWidth/Height to account for taskbars
			const screenWidth = window.screen.availWidth || window.screen.width
			const screenHeight = window.screen.availHeight || window.screen.height
			// Get current window position
			const screenLeft = window.screenX || 0
			const screenTop = window.screenY || 0
			
			const left = screenLeft + (screenWidth / 2) - (width / 2)
			const top = screenTop + (screenHeight / 2) - (height / 2)
			
			// Store bullets count and damage in sessionStorage for the new window to access
			sessionStorage.setItem('gameBullets', bulletsCount.toString())
			sessionStorage.setItem('gameDamage', damageValue.toString())
			
			const newWindow = window.open(
				'/game.html', 
				'game', 
				`width=${width},height=${height},left=${Math.round(left)},top=${Math.round(top)},resizable=yes,scrollbars=no`
			)
			
			if (newWindow) {
				// Successfully opened in new window
				newWindow.focus()
				return
			}
		} catch (e) {
			console.log('window.open() failed, falling back to modal:', e)
		}
		
		// Fallback: Open in fullscreen modal (works in mini-apps and when popups are blocked)
		setGameStarted(true)
	}

	const handleGameClose = () => {
		setGameStarted(false)
	}

	// Listen for game over event (when game ends in modal mode)
	useEffect(() => {
		const handleGameOver = () => {
			setGameStarted(false)
		}

		window.addEventListener('gameOver', handleGameOver)
		return () => {
			window.removeEventListener('gameOver', handleGameOver)
		}
	}, [])

	const handleDepositMoney = () => {
		setDepositModalOpen(true)
	}

	const handleRetrieveMoney = () => {
		setWithdrawModalOpen(true)
	}

	// Parse balances from getBalances
	const balanceData = balances
		? (() => {
			const [wbtc, weth, wld] = balances as [bigint, bigint, bigint]
			return {
				wbtc: formatUnits(wbtc, TOKEN_INFO[TOKENS.WBTC].decimals),
				weth: formatUnits(weth, TOKEN_INFO[TOKENS.WETH].decimals),
				wld: formatUnits(wld, TOKEN_INFO[TOKENS.WLD].decimals),
			}
		})()
		: { wbtc: '0', weth: '0', wld: '0' }

	// Parse stats from getStats
	const statsData = stats
		? (() => {
			try {
				let bulletsRaw: bigint
				let damageRaw: bigint
				
				// Handle different response formats
				if (Array.isArray(stats)) {
					// If it's an array [bullets, damage]
					bulletsRaw = stats[0] as bigint
					damageRaw = stats[1] as bigint
				} else if (typeof stats === 'object' && stats !== null) {
					// If it's an object { bullets, damage } or { result: [bullets, damage] }
					const statsObj = stats as any
					if (statsObj.result && Array.isArray(statsObj.result)) {
						bulletsRaw = statsObj.result[0] as bigint
						damageRaw = statsObj.result[1] as bigint
					} else if (statsObj.bullets !== undefined && statsObj.damage !== undefined) {
						bulletsRaw = statsObj.bullets as bigint
						damageRaw = statsObj.damage as bigint
					} else {
						console.error('Unknown stats format:', statsObj)
						return { bullets: '0', damage: '0' }
					}
				} else {
					console.error('Stats is not in expected format:', stats)
					return { bullets: '0', damage: '0' }
				}
				
				console.log('Parsed bullets raw:', bulletsRaw?.toString())
				console.log('Parsed damage raw:', damageRaw?.toString())
				
				// The contract returns values that are already in their final form
				// Bullets and damage are stored as uint256 but are already the final values
				// (not scaled by 18 decimals), so we convert BigInt to number directly
				return {
					bullets: bulletsRaw ? Number(bulletsRaw).toString() : '0',
					damage: damageRaw ? Number(damageRaw).toString() : '0',
				}
			} catch (error) {
				console.error('Error parsing stats:', error)
				return { bullets: '0', damage: '0' }
			}
		})()
		: { bullets: '0', damage: '0' }

	const bulletsNumber = parseFloat(statsData.bullets)
	const damageNumber = parseFloat(statsData.damage)
	const hasBullets = bulletsNumber > 0

	const handleModalClose = () => {
		setDepositModalOpen(false)
		setWithdrawModalOpen(false)
		// Refetch data after transaction
		setTimeout(() => {
			refetchStats()
			refetchBalances()
		}, 2000)
	}


	return (
		<div className="homepage">
			<div className="homepage-container">
				<h1 className="homepage-title">Token Strike</h1>
				<p className="homepage-subtitle">On-chain Gaming with Real Assets</p>
				<div className="homepage-buttons">
					<ConnectButton />
					
					{isConnected && (
						<>
							<div className="game-stats">
								<div className="stat-item">
									<span className="stat-label">Number of Bullets:</span>
									<span className="stat-value">
										{isLoadingStats ? 'Loading...' : statsError ? 'Error' : bulletsNumber.toFixed(2)}
									</span>
								</div>
								<div className="stat-item">
									<span className="stat-label">Damage Power:</span>
									<span className="stat-value">
										{isLoadingStats ? 'Loading...' : statsError ? 'Error' : damageNumber.toFixed(2)}
									</span>
								</div>
								{statsError && (
									<div className="error-message">
										Error: {statsError.message}
									</div>
								)}
							</div>
							
							<div className="token-balances">
								<h3 className="balances-title">Deposited Balances</h3>
								<div className="balance-item">
									<span className="balance-label">WBTC:</span>
									<span className="balance-value">
										{isLoadingBalances ? 'Loading...' : parseFloat(balanceData.wbtc).toFixed(6)}
									</span>
								</div>
								<div className="balance-item">
									<span className="balance-label">WETH:</span>
									<span className="balance-value">
										{isLoadingBalances ? 'Loading...' : parseFloat(balanceData.weth).toFixed(6)}
									</span>
								</div>
								<div className="balance-item">
									<span className="balance-label">WLD:</span>
									<span className="balance-value">
										{isLoadingBalances ? 'Loading...' : parseFloat(balanceData.wld).toFixed(6)}
									</span>
								</div>
							</div>
						</>
					)}

					{isConnected && (
						<>
							<div className="wallet-actions">
								<button className="action-button deposit-button" onClick={handleDepositMoney}>
									Deposit Money
								</button>
								<button className="action-button retrieve-button" onClick={handleRetrieveMoney}>
									Retrieve Money
								</button>
							</div>
							
							<div className="world-id-section">
								{!isVerified ? (
									<button 
										className="action-button verify-button" 
										onClick={() => verify()}
										disabled={isVerifying || !isMiniKitInstalled}
									>
										{isVerifying ? 'Verifying...' : isMiniKitInstalled ? 'Verify with World ID' : 'World ID Not Available'}
									</button>
								) : (
									<div className="verification-success">
										✓ Verified with World ID
									</div>
								)}
								{verificationError && (
									<div className="verification-error">
										{verificationError}
									</div>
								)}
							</div>
						</>
					)}

					<button 
						className="start-game-button"
						onClick={handleStartGame}
						disabled={!hasBullets}
					>
						Start Game
					</button>
				</div>
			</div>

			<TransactionModal
				isOpen={depositModalOpen}
				onClose={handleModalClose}
				mode="deposit"
			/>

			<TransactionModal
				isOpen={withdrawModalOpen}
				onClose={handleModalClose}
				mode="withdraw"
			/>

			{/* Fallback: Show game in modal if window.open() failed (for mini-apps) */}
			{gameStarted && (
				<Game onClose={handleGameClose} initialBullets={bulletsNumber} initialDamage={damageNumber} />
			)}
		</div>
	)
}

