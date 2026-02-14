export class AudioManager {
    constructor() {
        this.sounds = {
            correct: new Audio('https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3'),
            wrong: new Audio('https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3'),
            click: new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3'),
            background: new Audio('https://assets.mixkit.co/active_storage/sfx/120/120-preview.mp3') // Placeholder
        };

        // Preload sounds
        Object.values(this.sounds).forEach(sound => sound.load());
    }

    play(soundName) {
        if (this.sounds[soundName]) {
            const sound = this.sounds[soundName].cloneNode();
            sound.volume = 0.5;
            sound.play().catch(e => console.log('Audio play failed:', e));
        }
    }
}
