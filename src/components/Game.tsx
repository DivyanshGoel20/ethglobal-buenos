import { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import { PreloadAssets } from '../game/scenes/preloadAssets'
import { PlayGame } from '../game/scenes/playGame'
import { GameOptions } from '../game/gameOptions'
import './Game.css'

interface GameProps {
	onClose?: () => void
}

export function Game({ onClose }: GameProps) {
	const gameRef = useRef<Phaser.Game | null>(null)
	const containerRef = useRef<HTMLDivElement>(null)
	const onCloseRef = useRef(onClose)

	// Keep onClose ref updated
	useEffect(() => {
		onCloseRef.current = onClose
	}, [onClose])

	useEffect(() => {
		// Only initialize if container exists
		if (!containerRef.current) return

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
		const initTimeout = setTimeout(() => {
			if (!containerRef.current) return

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
				gameRef.current = new Phaser.Game(configObject)
			} catch (e) {
				console.error('Error initializing game:', e)
			}
		}, 100)

		// Cleanup function
		return () => {
			clearTimeout(initTimeout)
			if (gameRef.current) {
				try {
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

