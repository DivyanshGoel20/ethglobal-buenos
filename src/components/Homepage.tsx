import { useState, useEffect } from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useReadContract, useChainId } from 'wagmi'
import { formatUnits } from 'viem'
import { GAME_BANK_ADDRESS, GAME_BANK_ABI, GAME_BANK_CHAIN_ID, TOKEN_INFO, TOKENS } from '../config/contract'
import { TransactionModal } from './TransactionModal'
import { Game } from './Game'
import './Homepage.css'

export function Homepage() {
	const { isConnected, address } = useAccount()
	const chainId = useChainId()
	const [depositModalOpen, setDepositModalOpen] = useState(false)
	const [withdrawModalOpen, setWithdrawModalOpen] = useState(false)
	const [gameStarted, setGameStarted] = useState(false)

	// Check if user is on the correct chain
	const isCorrectChain = chainId === GAME_BANK_CHAIN_ID

	// Fetch user stats - only when on correct chain
	const { data: stats, refetch: refetchStats } = useReadContract({
		address: GAME_BANK_ADDRESS,
		abi: GAME_BANK_ABI,
		functionName: 'getStats',
		args: address ? [address] : undefined,
		query: {
			enabled: !!address && isConnected && isCorrectChain,
		},
	})

	// Fetch user balances - only when on correct chain
	const { data: balances, refetch: refetchBalances } = useReadContract({
		address: GAME_BANK_ADDRESS,
		abi: GAME_BANK_ABI,
		functionName: 'getBalances',
		args: address ? [address] : undefined,
		query: {
			enabled: !!address && isConnected && isCorrectChain,
		},
	})

	const handleStartGame = () => {
		// Try to open in a new window first (works in regular browsers)
		try {
			const newWindow = window.open('/game.html', 'game', 'width=900,height=900,resizable=yes,scrollbars=no')
			
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

	// Calculate total money deposited (simplified - in production, use current prices)
	const totalDeposited = balances
		? (() => {
			const [wbtc, weth, wld] = balances as [bigint, bigint, bigint]
			// For now, just sum the raw values (in production, convert to USD using current prices)
			const wbtcFormatted = parseFloat(formatUnits(wbtc, TOKEN_INFO[TOKENS.WBTC].decimals))
			const wethFormatted = parseFloat(formatUnits(weth, TOKEN_INFO[TOKENS.WETH].decimals))
			const wldFormatted = parseFloat(formatUnits(wld, TOKEN_INFO[TOKENS.WLD].decimals))
			// This is a simplified calculation - in production, multiply by current token prices
			return (wbtcFormatted + wethFormatted + wldFormatted).toFixed(4)
		})()
		: '0'

	const bullets = stats ? formatUnits((stats as [bigint, bigint])[0], 18) : '0'
	const damage = stats ? formatUnits((stats as [bigint, bigint])[1], 18) : '0'

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
				<h1 className="homepage-title">Game Title</h1>
				<div className="homepage-buttons">
					<ConnectButton />
					
					{isConnected && (
						<>
							{!isCorrectChain && (
								<div className="chain-warning">
									Please switch to World Chain Sepolia (Chain ID: {GAME_BANK_CHAIN_ID})
								</div>
							)}
							<div className="game-stats">
								<div className="stat-item">
									<span className="stat-label">Money Deposited:</span>
									<span className="stat-value">{totalDeposited}</span>
								</div>
								<div className="stat-item">
									<span className="stat-label">Number of Bullets:</span>
									<span className="stat-value">{parseFloat(bullets).toFixed(2)}</span>
								</div>
								<div className="stat-item">
									<span className="stat-label">Damage Power:</span>
									<span className="stat-value">{parseFloat(damage).toFixed(2)}</span>
								</div>
							</div>
						</>
					)}

					{isConnected && (
						<div className="wallet-actions">
							<button className="action-button deposit-button" onClick={handleDepositMoney}>
								Deposit Money
							</button>
							<button className="action-button retrieve-button" onClick={handleRetrieveMoney}>
								Retrieve Money
							</button>
						</div>
					)}

					<button 
						className="start-game-button"
						onClick={handleStartGame}
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
				<Game onClose={handleGameClose} />
			)}
		</div>
	)
}

