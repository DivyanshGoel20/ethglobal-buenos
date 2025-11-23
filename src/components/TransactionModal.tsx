import { useState, useEffect } from 'react'
import { useAccount, useBalance, useReadContract, useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi'
import { parseUnits, formatUnits, maxUint256 } from 'viem'
import { GAME_BANK_ADDRESS, GAME_BANK_ABI, GAME_BANK_CHAIN_ID, TOKENS, TOKEN_INFO, ERC20_ABI } from '../config/contract'
import { fetchPythPriceUpdates } from '../services/pyth'
import './TransactionModal.css'

interface TransactionModalProps {
	isOpen: boolean
	onClose: () => void
	mode: 'deposit' | 'withdraw'
}

export function TransactionModal({ isOpen, onClose, mode }: TransactionModalProps) {
	const { address } = useAccount()
	const chainId = useChainId()
	const [selectedToken, setSelectedToken] = useState<keyof typeof TOKENS>('WLD')
	const [amount, setAmount] = useState('')
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const tokenAddress = TOKENS[selectedToken]
	const tokenInfo = TOKEN_INFO[tokenAddress]
	const isCorrectChain = chainId === GAME_BANK_CHAIN_ID

	// Get user's token balance - use wallet's current chain
	const { data: tokenBalance, refetch: refetchBalance } = useBalance({
		address,
		token: tokenAddress as `0x${string}`,
		query: {
			enabled: !!address && isOpen && isCorrectChain,
		},
	})

	// Get user's deposited balance in contract - use wallet's current chain
	const { data: depositedBalances } = useReadContract({
		address: GAME_BANK_ADDRESS,
		abi: GAME_BANK_ABI,
		functionName: 'getBalances',
		args: address ? [address] : undefined,
		query: {
			enabled: !!address && isOpen && isCorrectChain,
		},
	})

	const { writeContract, data: hash, isPending } = useWriteContract()
	const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
		hash,
	})

	// Get allowance - use wallet's current chain
	const { data: allowance } = useReadContract({
		address: tokenAddress as `0x${string}`,
		abi: ERC20_ABI,
		functionName: 'allowance',
		args: address && tokenAddress ? [address, GAME_BANK_ADDRESS] : undefined,
		query: {
			enabled: !!address && isOpen && mode === 'deposit' && isCorrectChain,
		},
	})

	const { writeContract: writeApprove } = useWriteContract()

	useEffect(() => {
		if (isSuccess) {
			setIsLoading(false)
			setAmount('')
			setError(null)
			refetchBalance()
			setTimeout(() => {
				onClose()
			}, 2000)
		}
	}, [isSuccess, onClose, refetchBalance])

	if (!isOpen) return null

	const handleMax = () => {
		if (!tokenBalance) return
		
		if (mode === 'deposit') {
			setAmount(formatUnits(tokenBalance.value, tokenBalance.decimals))
		} else {
			// For withdraw, use deposited balance
			if (depositedBalances) {
				const [wbtc, weth, wld] = depositedBalances as [bigint, bigint, bigint]
				const balance = selectedToken === 'WBTC' ? wbtc : selectedToken === 'WETH' ? weth : wld
				setAmount(formatUnits(balance, tokenInfo.decimals))
			}
		}
	}

	const handleSubmit = async () => {
		if (!address || !amount || parseFloat(amount) <= 0) {
			setError('Please enter a valid amount')
			return
		}

		setError(null)
		setIsLoading(true)

		try {
			const amountWei = parseUnits(amount, tokenInfo.decimals)

			// Check balance
			if (mode === 'deposit') {
				if (!tokenBalance || tokenBalance.value < amountWei) {
					setError('Insufficient balance')
					setIsLoading(false)
					return
				}

				// Check and handle approval
				if (!allowance || allowance < amountWei) {
					// Need to approve first
					writeApprove({
						address: tokenAddress as `0x${string}`,
						abi: ERC20_ABI,
						functionName: 'approve',
						args: [GAME_BANK_ADDRESS, maxUint256],
					}, {
						onSuccess: async () => {
							// Wait a bit for approval to be mined, then proceed with deposit
							await new Promise(resolve => setTimeout(resolve, 3000))
							await executeDeposit(amountWei)
						},
						onError: (err) => {
							setError(err.message)
							setIsLoading(false)
						},
					})
					return
				}
			} else {
				// Withdraw mode - check deposited balance
				if (depositedBalances) {
					const [wbtc, weth, wld] = depositedBalances as [bigint, bigint, bigint]
					const deposited = selectedToken === 'WBTC' ? wbtc : selectedToken === 'WETH' ? weth : wld
					
					if (deposited < amountWei) {
						setError('Insufficient deposited balance')
						setIsLoading(false)
						return
					}
				}
			}

			await executeTransaction(amountWei)
		} catch (err: any) {
			setError(err.message || 'Transaction failed')
			setIsLoading(false)
		}
	}

	const executeDeposit = async (amountWei: bigint) => {
		try {
			console.log('Executing deposit after approval...')
			await executeTransaction(amountWei)
		} catch (err: any) {
			console.error('Deposit execution error:', err)
			setError(err.message || 'Failed to execute deposit')
			setIsLoading(false)
		}
	}

	const executeTransaction = async (amountWei: bigint) => {
		try {
			console.log('Starting transaction execution...')
			console.log('Mode:', mode)
			console.log('Token address:', tokenAddress)
			console.log('Amount (wei):', amountWei.toString())
			
			// Fetch Pyth price updates
			console.log('Fetching Pyth price updates...')
			const priceUpdates = await fetchPythPriceUpdates()
			console.log('Received price updates:', priceUpdates.length)
			console.log('Price updates:', priceUpdates)
			
			// Convert string array to bytes array format
			const priceUpdateBytes = priceUpdates.map(update => {
				const bytes = update as `0x${string}`
				console.log('Price update bytes length:', bytes.length)
				return bytes
			})

			console.log('Prepared price update bytes:', priceUpdateBytes.length)
			console.log('Contract address:', GAME_BANK_ADDRESS)
			console.log('Chain ID:', GAME_BANK_CHAIN_ID)

			if (mode === 'deposit') {
				console.log('Calling deposit function...')
			writeContract({
				address: GAME_BANK_ADDRESS,
				abi: GAME_BANK_ABI,
				functionName: 'deposit',
				args: [tokenAddress, amountWei, priceUpdateBytes],
			}, {
					onSuccess: (hash) => {
						console.log('Deposit transaction hash:', hash)
					},
					onError: (err) => {
						console.error('Deposit error:', err)
						setError(err.message)
						setIsLoading(false)
					},
				})
			} else {
				console.log('Calling withdraw function...')
				writeContract({
					address: GAME_BANK_ADDRESS,
					abi: GAME_BANK_ABI,
					functionName: 'withdraw',
					args: [tokenAddress, amountWei, priceUpdateBytes],
				}, {
					onSuccess: (hash) => {
						console.log('Withdraw transaction hash:', hash)
					},
					onError: (err) => {
						console.error('Withdraw error:', err)
						setError(err.message)
						setIsLoading(false)
					},
				})
			}
		} catch (err: any) {
			console.error('Transaction execution error:', err)
			setError(err.message || 'Failed to fetch price updates')
			setIsLoading(false)
		}
	}

	const availableBalance = mode === 'deposit' 
		? tokenBalance ? formatUnits(tokenBalance.value, tokenBalance.decimals) : '0'
		: depositedBalances 
			? (() => {
				const [wbtc, weth, wld] = depositedBalances as [bigint, bigint, bigint]
				const balance = selectedToken === 'WBTC' ? wbtc : selectedToken === 'WETH' ? weth : wld
				return formatUnits(balance, tokenInfo.decimals)
			})()
			: '0'

	return (
		<div className="modal-overlay" onClick={onClose}>
			<div className="modal-content" onClick={(e) => e.stopPropagation()}>
				<div className="modal-header">
					<h2>{mode === 'deposit' ? 'Deposit' : 'Withdraw'} {tokenInfo.symbol}</h2>
					<button className="modal-close" onClick={onClose}>×</button>
				</div>

				<div className="modal-body">
					{!isCorrectChain && (
						<div className="error-message">
							Please switch to World Chain Sepolia (Chain ID: {GAME_BANK_CHAIN_ID}) to use this feature.
							Current chain: {chainId}
						</div>
					)}
					
					<div className="token-selector">
						<label>Select Token:</label>
						<select 
							value={selectedToken} 
							onChange={(e) => setSelectedToken(e.target.value as keyof typeof TOKENS)}
							disabled={isLoading || !isCorrectChain}
						>
							<option value="WBTC">WBTC</option>
							<option value="WETH">WETH</option>
							<option value="WLD">WLD</option>
						</select>
					</div>

					<div className="amount-input">
						<label>Amount:</label>
						<div className="input-group">
							<input
								type="number"
								value={amount}
								onChange={(e) => setAmount(e.target.value)}
								placeholder="0.0"
								disabled={isLoading || !isCorrectChain}
								step="any"
								min="0"
							/>
							<button 
								className="max-button" 
								onClick={handleMax}
								disabled={isLoading || !isCorrectChain}
							>
								MAX
							</button>
						</div>
						<div className="balance-info">
							Available: {parseFloat(availableBalance).toFixed(6)} {tokenInfo.symbol}
							{!isCorrectChain && ' (Switch to correct chain)'}
						</div>
					</div>

					{error && <div className="error-message">{error}</div>}

					{isSuccess && (
						<div className="success-message">
							Transaction successful!
						</div>
					)}
				</div>

				<div className="modal-footer">
					<button 
						className="modal-button cancel-button" 
						onClick={onClose}
						disabled={isLoading || isPending || isConfirming}
					>
						Cancel
					</button>
					<button 
						className="modal-button submit-button" 
						onClick={handleSubmit}
						disabled={isLoading || isPending || isConfirming || !amount || parseFloat(amount) <= 0 || !isCorrectChain}
					>
						{isLoading || isPending || isConfirming 
							? 'Processing...' 
							: mode === 'deposit' ? 'Deposit' : 'Withdraw'
						}
					</button>
				</div>
			</div>
		</div>
	)
}

