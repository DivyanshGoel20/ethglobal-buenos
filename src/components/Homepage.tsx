import { useState } from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useReadContract } from 'wagmi'
import { formatUnits } from 'viem'
import { GAME_BANK_ADDRESS, GAME_BANK_ABI, GAME_BANK_CHAIN_ID, TOKEN_INFO, TOKENS } from '../config/contract'
import { TransactionModal } from './TransactionModal'
import './Homepage.css'

export function Homepage() {
	const { isConnected, address } = useAccount()
	const [depositModalOpen, setDepositModalOpen] = useState(false)
	const [withdrawModalOpen, setWithdrawModalOpen] = useState(false)

	// Fetch user stats
	const { data: stats, refetch: refetchStats } = useReadContract({
		address: GAME_BANK_ADDRESS,
		abi: GAME_BANK_ABI,
		functionName: 'getStats',
		args: address ? [address] : undefined,
		chainId: GAME_BANK_CHAIN_ID,
		query: {
			enabled: !!address && isConnected,
			// Disable auto-refetch to avoid CORS issues - user can manually refresh
			refetchInterval: false,
		},
	})

	// Fetch user balances
	const { data: balances, refetch: refetchBalances } = useReadContract({
		address: GAME_BANK_ADDRESS,
		abi: GAME_BANK_ABI,
		functionName: 'getBalances',
		args: address ? [address] : undefined,
		chainId: GAME_BANK_CHAIN_ID,
		query: {
			enabled: !!address && isConnected,
			// Disable auto-refetch to avoid CORS issues - user can manually refresh
			refetchInterval: false,
		},
	})

	// Debug: Log token addresses
	console.log('Homepage - WLD token address:', TOKENS.WLD)
	console.log('Homepage - User address:', address)
	console.log('Homepage - Balances:', balances)

	const handleStartGame = () => {
		// Placeholder - will be implemented later
		console.log('Start game clicked')
	}

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
						className={`start-game-button ${!isConnected ? 'disabled' : ''}`}
						onClick={handleStartGame}
						disabled={!isConnected}
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
		</div>
	)
}

