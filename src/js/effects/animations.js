function initCardAnimation() {
    const card = document.querySelector('.card');
    const musicPlayer = document.querySelector('.music-player');
    const volumeButton = document.querySelector('.volume-control-wrapper');
    
    if (card) {
        card.style.transform = 'translateY(-50px)';
        card.style.opacity = '0';
    }
    
    if (musicPlayer) {
        musicPlayer.style.transform = 'translateY(50px)';
        musicPlayer.style.opacity = '0';
    }
    
    if (volumeButton) {
        volumeButton.style.transform = 'translateX(-50px)';
        volumeButton.style.opacity = '0';
    }
    
    setTimeout(() => {
        if (card) {
            card.style.transition = 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }
        
        if (musicPlayer) {
            setTimeout(() => {
                musicPlayer.style.transition = 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)';
                musicPlayer.style.opacity = '1';
                musicPlayer.style.transform = 'translateY(0)';
            }, 75);
        }
        
        if (volumeButton) {
            setTimeout(() => {
                volumeButton.style.transition = 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)';
                volumeButton.style.opacity = '1';
                volumeButton.style.transform = 'translateX(0)';
            }, 150);
        }
    }, 5);
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { initCardAnimation };
}
