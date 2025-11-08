function initVolumeControl() {
    const volumeButton = document.querySelector('.volume-button');
    const volumeSlider = document.querySelector('.volume-slider');
    const volumeSliderWrapper = document.querySelector('.volume-slider-wrapper');
    
    if (!volumeButton || !volumeSlider || !volumeSliderWrapper) return;
    
    let isMuted = false;
    let previousVolume = 1.0;
    
    function updateVolumeIcon() {
        if (isMuted) {
            volumeButton.innerHTML = '<img src="src/assets/icons/music/volume-control/muted.svg" alt="Muted" style="width: 100%; height: 100%; object-fit: contain;">';
        } else {
            volumeButton.innerHTML = '<img src="src/assets/icons/music/volume-control/volume.svg" alt="Volume" style="width: 100%; height: 100%; object-fit: contain;">';
        }
    }
    

    
    function getAudioElement() {
        return typeof getAudio !== 'undefined' ? getAudio() : null;
    }
    
    function setVolume(value) {
        const audio = getAudioElement();
        if (audio) {
            audio.volume = value;
            volumeSlider.value = value * 100;
            volumeSliderWrapper.style.setProperty('--volume-percent', (value * 100) + '%');
        }
    }
    
    function toggleMute() {
        const audio = getAudioElement();
        if (!audio) return;
        
        if (isMuted) {
            isMuted = false;
            setVolume(previousVolume);
        } else {
            isMuted = true;
            previousVolume = audio.volume;
            setVolume(0);
        }
        updateVolumeIcon();
    }
    
    volumeButton.addEventListener('dblclick', (e) => {
        e.preventDefault();
        toggleMute();
    });
    
    function updateVolume(e) {
        const volume = e.target.value / 100;
        const audio = getAudioElement();
        
        if (audio) {
            audio.volume = volume;
            volumeSliderWrapper.style.setProperty('--volume-percent', e.target.value + '%');
            
            if (volume === 0) {
                isMuted = true;
            } else if (isMuted) {
                isMuted = false;
                previousVolume = volume;
            }
            updateVolumeIcon();
        }
    }
    
    function handleClick(e) {
        const rect = volumeSlider.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
        volumeSlider.value = percent;
        updateVolume({ target: volumeSlider });
    }
    
    volumeSlider.addEventListener('input', updateVolume);
    volumeSlider.addEventListener('change', updateVolume);
    volumeSlider.addEventListener('click', handleClick);
    
    setTimeout(() => {
        setVolume(1.0);
        updateVolumeIcon();
    }, 100);
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { initVolumeControl };
}
