// Contract configuration
export const GAME_BANK_ADDRESS = '0xDdc2567AbCB9eCC1b21A50658219670463607CF9' as const
export const GAME_BANK_CHAIN_ID = 480 // World Chain Sepolia

// Token addresses - must match GameBank.sol
export const TOKENS = {
	WBTC: '0x03C7054BCB39f7b2e5B2c7AcB37583e32D70Cfa3' as const,
	WETH: '0x4200000000000000000000000000000000000006' as const,
	WLD: '0x2cFc85d8E48F8EAB294be644d9E25C3030863003' as const, 
} as const

// Token metadata
export const TOKEN_INFO = {
	[TOKENS.WBTC]: {
		name: 'Wrapped Bitcoin',
		symbol: 'WBTC',
		decimals: 18,
	},
	[TOKENS.WETH]: {
		name: 'Wrapped Ether',
		symbol: 'WETH',
		decimals: 18,
	},
	[TOKENS.WLD]: {
		name: 'Worldcoin',
		symbol: 'WLD',
		decimals: 18,
	},
} as const

// Pyth Feed IDs
export const PYTH_FEED_IDS = {
	WBTC: '0xc9d8b075a5c69303365ae23633d4e085199bf5c520a3b90fed1322a0342ffc33',
	WETH: '0x9d4294bbcd1174d6f2003ec365831e64cc31d9f6f15a2b85399db8d5000960f6',
	WLD: '0xd6835ad1f773de4a378115eb6824bd0c0e42d84d1c84d9750e853fb6b6c7794a',
} as const

// Contract ABI
export const GAME_BANK_ABI = [
	{
		inputs: [
			{ internalType: 'address', name: 'token', type: 'address' },
			{ internalType: 'uint256', name: 'amount', type: 'uint256' },
			{ internalType: 'bytes[]', name: 'priceUpdate', type: 'bytes[]' },
		],
		name: 'deposit',
		outputs: [],
		stateMutability: 'payable',
		type: 'function',
	},
	{
		inputs: [
			{ internalType: 'address', name: 'token', type: 'address' },
			{ internalType: 'uint256', name: 'amount', type: 'uint256' },
			{ internalType: 'bytes[]', name: 'priceUpdate', type: 'bytes[]' },
		],
		name: 'withdraw',
		outputs: [],
		stateMutability: 'payable',
		type: 'function',
	},
	{
		inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
		name: 'getStats',
		outputs: [
			{ internalType: 'uint256', name: 'bullets', type: 'uint256' },
			{ internalType: 'uint256', name: 'damage', type: 'uint256' },
		],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
		name: 'getBalances',
		outputs: [
			{ internalType: 'uint256', name: 'wbtc', type: 'uint256' },
			{ internalType: 'uint256', name: 'weth', type: 'uint256' },
			{ internalType: 'uint256', name: 'wld', type: 'uint256' },
		],
		stateMutability: 'view',
		type: 'function',
	},
] as const

// ERC20 ABI for balance checking and approval
export const ERC20_ABI = [
	{
		inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
		name: 'balanceOf',
		outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [
			{ internalType: 'address', name: 'spender', type: 'address' },
			{ internalType: 'uint256', name: 'amount', type: 'uint256' },
		],
		name: 'approve',
		outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
		stateMutability: 'nonpayable',
		type: 'function',
	},
	{
		inputs: [
			{ internalType: 'address', name: 'owner', type: 'address' },
			{ internalType: 'address', name: 'spender', type: 'address' },
		],
		name: 'allowance',
		outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [],
		name: 'decimals',
		outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
		stateMutability: 'view',
		type: 'function',
	},
] as const

