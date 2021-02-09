import * as Tone from '../web_modules/tone.js'

//create a synth and connect it to the main output (your speakers)
const synth = new Tone.Synth().toDestination()

export const playSoundFromCard = (card) => {
	synth.triggerAttackRelease("C4", "8n")
}
