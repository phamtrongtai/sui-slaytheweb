import {html, Component} from '../vendor/htm-preact-standalone.mjs'

const Healthbar = ({max, value}) => html`
	<div class="Healthbar">
		<p>${value} / ${max}</p>
		<div class="Healthbar-value" style=${`width: ${value}%`}></div>
	</div>
`

export default class Player extends Component {
	constructor(props) {
		super(props)
		this.state = {
			maxEnergy: 3,
			currentEnergy: 3,
			maxHealth: 100,
			currentHealth: 10
		}
	}
	render(props, state) {
		const name = props.name ? props.name : 'Anonymous'
		return html`
			<div class="Player">
				<p>${name}</p>
				<p class="Energy"><i>${state.currentEnergy}</i> / ${state.maxEnergy}</p>
				<${Healthbar} max=${state.maxHealth} value=${state.currentHealth} />
			</div>
		`
	}
}