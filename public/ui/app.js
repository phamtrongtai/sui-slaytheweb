// Third party dependencies
import {html, Component} from '../../web_modules/htm/preact/standalone.module.js'
import {Sortable, OnSpill} from '../../web_modules/sortablejs/modular/sortable.core.esm.js'

// Game logic
import ActionManager from '../game/action-manager.js'
import actions from './../game/actions.js'
import {isCurrentRoomCompleted} from '../game/utils.js'
import {createSimpleDungeon} from '../game/dungeon-encounters.js'
import {createCard} from './../game/cards.js'

// Components
import {Player, Monster} from './player.js'
import Cards from './cards.js'
import History from './history.js'
import Map from './map.js'

// Puts and gets the game state in the URL.
const save = state => (location.hash = encodeURIComponent(JSON.stringify(state)))
const load = () => JSON.parse(decodeURIComponent(window.location.hash.split('#')[1]))

export default class App extends Component {
	constructor() {
		super()
		// Set up our action manager.
		this.am = ActionManager()

		// Set up either a saved or new game.
		const savedGame = window.location.hash && load()
		if (savedGame) {
			this.state = savedGame
		} else {
			let state = actions.createNewGame()
			state = actions.setDungeon(state, createSimpleDungeon())
			state = actions.addStarterDeck(state)
			state = actions.drawCards(state)
			this.state = state
		}

		// Enable debugging in the browser.
		window.slaytheweb = {
			component: this,
			actions,
			createCard
		}
	}
	componentDidMount() {
		this.enableDrop()
	}
	enqueue(action) {
		this.am.enqueue(action)
	}
	dequeue(callback) {
		try {
			const nextState = this.am.dequeue(this.state)
			this.setState(nextState, callback)
			// save(nextState)
		} catch (err) {
			console.log(err)
			alert(err)
		}
	}
	undo() {
		const prev = this.am.past.takeFromTop()
		if (!prev) return
		console.log('Undoing', prev.action.type)
		this.setState(prev.state)
	}
	endTurn() {
		this.enqueue({type: 'endTurn'})
		this.dequeue()
	}
	goToNextRoom() {
		this.enqueue({type: 'endTurn'})
		this.enqueue({type: 'goToNextRoom'})
		// Enable dragdrop again because the DOM of the targets changed.
		this.dequeue(() => this.dequeue(this.enableDrop))
	}
	handleShortcuts(event) {
		const {key} = event
		if (key === 'e') this.endTurn()
		if (key === 'u') this.undo()
		if (key === 'a') this.base.querySelector('.DrawPile').toggleAttribute('open')
		if (key === 's') this.base.querySelector('.DiscardPile').toggleAttribute('open')
		if (key === 'm') this.base.querySelector('.Map').toggleAttribute('open')
	}
	enableDrop() {
		const overClass = 'is-dragOver'
		const self = this
		// Enable required plugin for the 'revertOnSpill' option.
		Sortable.mount(OnSpill)
		// We want to be able to drag cards in the hand.
		new Sortable(this.base.querySelector('.Hand .Cards'), {
			group: 'hand',
			draggable: '.Card:not([disabled])',
			revertOnSpill: true,
			onSpill() {
				targets.forEach(t => t.classList.remove(overClass))
			},
			onMove(event) {
				// Do as little as possible here. It gets called a lot.
				targets.forEach(t => t.classList.remove(overClass))
				event.to.classList.add(overClass)
			}
		})

		// And we want to be able to drop on all the targets (player + monsters)
		const targets = this.base.querySelectorAll('.Target')
		targets.forEach(el => {
			new Sortable(el, {
				group: {
					name: 'player',
					pull: false,
					put: ['hand']
				},
				draggable: '.TRICKYOUCANT',
				// When you drop, play the card.
				onAdd(event) {
					const {item, to} = event
					const card = self.state.hand.find(c => c.id === item.dataset.id)
					const index = Array.from(to.parentNode.children).indexOf(to)
					let target = to.dataset.type + index
					self.enqueue({type: 'playCard', target, card})
					self.dequeue()
					targets.forEach(t => t.classList.remove(overClass))
				}
			})
		})
	}
	render(props, state) {
		const room = state.dungeon.rooms[state.dungeon.index]
		const isDead = state.player.currentHealth < 1
		const didWin = isCurrentRoomCompleted(state)
		return html`
			<div class="App" tabindex="0" onKeyDown=${e => this.handleShortcuts(e)}>
				<p class="App-statusline">
					<a href="https://github.com/oskarrough/slaytheweb">Slay the Web</a>
					<${History}
						future=${this.am.future.list}
						past=${this.am.past.list}
						undo=${this.undo.bind(this)}
					/>
					<button onclick=${() => save(state)}>Save</button>
				</p>

				<div class="Targets">
					<div class="Split">
						<${Player} model=${state.player} name="You" />
						<div class="Monsters">
							${room.monsters.map(
								(monster, index) =>
									html`
										<${Monster} model=${monster} name=${`Monster ${index}`} />
									`
							)}
						</div>
					</div>
				</div>

				<div class="Split">
					<div class="EnergyBadge">${state.player.currentEnergy}/${state.player.maxEnergy}</div>
					<p class="Actions">
						${isDead
							? html`
									You are dead. <button onclick=${() => this.props.onLoose()}>Try again?</button>
							  `
							: didWin
							? html`
									You win.
									<button onclick=${() => this.goToNextRoom()}>Go to the next floor</button>
							  `
							: html`
									<button onclick=${() => this.endTurn()}><u>E</u>nd turn</button>
							  `}
					</p>
				</div>

				<div class="Hand">
					<${Cards} cards=${state.hand} isHand=${true} energy=${state.player.currentEnergy} />
				</div>

				<div class="Split">
					<details class="DrawPile Overlay" bottomleft>
						<summary>Dr<u>a</u>w pile ${state.drawPile.length}</summary>
						<${Cards} cards=${state.drawPile} />
					</details>
					<details class="DiscardPile Overlay" bottomright>
						<summary align-right>Di<u>s</u>card pile ${state.discardPile.length}</summary>
						<${Cards} cards=${state.discardPile} />
					</details>
				</div>

				<div class="Split"></div>

				<details class="Map Overlay" topright>
					<summary><u>M</u>ap</summary>
					<${Map} dungeon=${state.dungeon} />
				</details>
			</div>
		`
	}
}
