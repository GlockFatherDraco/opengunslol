function createRipple(e) {
    const ripple = document.createElement('span');
    ripple.classList.add('ripple-effect');
    ripple.style.left = e.clientX + 'px';
    ripple.style.top = e.clientY + 'px';
    document.body.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
}

function initEntrySequence() {
    const overlay = document.querySelector('.entry-overlay');
    if (!overlay) return;
    
    document.body.classList.add('entry-active');
    let isDismissed = false;
    
    function hideOverlay() {
        if (isDismissed) return;
        isDismissed = true;
        overlay.classList.add('hidden');
        document.body.classList.remove('entry-active');
        
        setTimeout(() => {
            if (typeof initCardAnimation === 'function') {
                initCardAnimation();
            }
        }, 50);

        setTimeout(() => {
            overlay.remove();
        }, parseFloat(getComputedStyle(overlay).transitionDuration) * 1000);
    }
    
    overlay.addEventListener('click', (e) => {
        if (isDismissed) return;
        createRipple(e);
        setTimeout(() => hideOverlay(), 200);
    });
    
    document.addEventListener('keydown', function onKeyPress(e) {
        if (overlay.classList.contains('hidden')) return;
        hideOverlay();
        document.removeEventListener('keydown', onKeyPress);
    });
}

function initGlobalRipple() {
    document.body.addEventListener('click', createRipple);
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { initEntrySequence, initGlobalRipple };
}
