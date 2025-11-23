import { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import { PreloadAssets } from '../game/scenes/preloadAssets'
import { PlayGame } from '../game/scenes/playGame'
import { GameOptions } from '../game/gameOptions'
import './Game.css'

interface GameProps {
	onClose?: () => void
	initialBullets?: number
	initialDamage?: number
}

export function Game({ onClose, initialBullets, initialDamage }: GameProps) {
	const gameRef = useRef<Phaser.Game | null>(null)
	const containerRef = useRef<HTMLDivElement>(null)
	const onCloseRef = useRef(onClose)
	
	// Get bullets and damage from props or sessionStorage (for new window)
	const bullets = initialBullets ?? (() => {
		const stored = sessionStorage.getItem('gameBullets')
		return stored ? parseInt(stored, 10) : 0
	})()
	
	const damage = initialDamage ?? (() => {
		const stored = sessionStorage.getItem('gameDamage')
		return stored ? parseFloat(stored) : 0
	})()
	
	console.log('Game component initialized with bullets:', bullets, 'damage:', damage)

	// Keep onClose ref updated
	useEffect(() => {
		onCloseRef.current = onClose
	}, [onClose])

	useEffect(() => {
		// Only initialize if container exists
		if (!containerRef.current) return

		let initTimeout: NodeJS.Timeout | null = null
		let isMounted = true

		// Clean up any existing game instance first
		if (gameRef.current) {
			try {
				gameRef.current.destroy(true)
			} catch (e) {
				console.warn('Error destroying existing game:', e)
			}
			gameRef.current = null
		}

		// Small delay to ensure DOM is ready
		initTimeout = setTimeout(() => {
			if (!containerRef.current || !isMounted) return

			// object to initialize the Scale Manager
			const scaleObject: Phaser.Types.Core.ScaleConfig = {
				mode: Phaser.Scale.FIT, // adjust size to automatically fit in the window
				autoCenter: Phaser.Scale.CENTER_BOTH, // center the game horizontally and vertically
				parent: containerRef.current, // DOM element where to render the game
				width: GameOptions.gameSize.width, // game width, in pixels
				height: GameOptions.gameSize.height, // game height, in pixels
			}

			// game configuration object
			const configObject: Phaser.Types.Core.GameConfig = {
				type: Phaser.WEBGL, // game renderer
				backgroundColor: GameOptions.gameBackgroundColor, // game background color
				scale: scaleObject, // scale settings
				scene: [
					// array with game scenes
					PreloadAssets, // PreloadAssets scene
					PlayGame, // PlayGame scene
				],
				physics: {
					default: 'arcade', // physics engine used is arcade physics
				},
			}

			// the game itself
			try {
				if (isMounted && containerRef.current) {
					gameRef.current = new Phaser.Game(configObject)
					// Store bullets and damage in registry for scenes to access (after game is created)
					gameRef.current.registry.set('initialBullets', bullets)
					gameRef.current.registry.set('initialDamage', damage)
					console.log('Stored in registry - bullets:', bullets, 'damage:', damage)
				}
			} catch (e) {
				console.error('Error initializing game:', e)
			}
		}, 100)

		// Cleanup function
		return () => {
			isMounted = false
			if (initTimeout) {
				clearTimeout(initTimeout)
			}
			if (gameRef.current) {
				try {
					// Stop all scenes first
					const scenes = gameRef.current.scene.getScenes(true)
					scenes.forEach(scene => {
						if (scene.scene.isActive() || scene.scene.isPaused()) {
							scene.scene.stop()
						}
					})
					gameRef.current.destroy(true)
				} catch (e) {
					console.warn('Error destroying game on cleanup:', e)
				}
				gameRef.current = null
			}
		}
	}, []) // Empty dependency array - only run once when component mounts

	const handleClose = () => {
		// Destroy game before closing
		if (gameRef.current) {
			try {
				// Stop all scenes first
				const scenes = gameRef.current.scene.getScenes(true)
				scenes.forEach(scene => {
					if (scene.scene.isActive() || scene.scene.isPaused()) {
						scene.scene.stop()
					}
				})
				gameRef.current.destroy(true)
			} catch (e) {
				console.warn('Error destroying game on close:', e)
			}
			gameRef.current = null
		}
		// Call onClose callback
		if (onCloseRef.current) {
			onCloseRef.current()
		}
	}

	return (
		<div className="game-container">
			{onClose && (
				<button className="game-close-button" onClick={handleClose}>
					×
				</button>
			)}
			<div ref={containerRef} className="game-wrapper" />
		</div>
	)
}

