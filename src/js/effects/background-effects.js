function initBackgroundEffects() {
    const stylesheets = Array.from(document.styleSheets);
    let activeEffect = 'default';
    
    stylesheets.forEach(sheet => {
        try {
            if (sheet.href && sheet.href.includes('effects/background/')) {
                if (sheet.href.includes('rain.css')) activeEffect = 'rain';
                else if (sheet.href.includes('snow.css')) activeEffect = 'snow';
                else if (sheet.href.includes('stars.css')) activeEffect = 'stars';
                else if (sheet.href.includes('particles.css')) activeEffect = 'particles';
                else if (sheet.href.includes('oldtv.css')) activeEffect = 'oldtv';
                else if (sheet.href.includes('crt.css')) activeEffect = 'crt';
                else if (sheet.href.includes('storm.css')) activeEffect = 'storm';
                else if (sheet.href.includes('bloodrain.css')) activeEffect = 'bloodrain';
                else if (sheet.href.includes('blur.css')) activeEffect = 'blur';
            }
        } catch (e) {}
    });
    
    switch(activeEffect) {
        case 'rain': initRain(); break;
        case 'snow': initSnow(); break;
        case 'stars': initStars(); break;
        case 'particles': initParticles(); break;
        case 'oldtv': initOldTV(); break;
        case 'crt': initCRT(); break;
        case 'storm': initStorm(); break;
        case 'bloodrain': initBloodRain(); break;
        case 'blur': initBlur(); break;
    }
}

function initRain() {
    const container = document.createElement('div');
    container.className = 'rain-effect';
    for (let i = 0; i < 30; i++) {
        const drop = document.createElement('div');
        drop.className = 'rain-drop';
        container.appendChild(drop);
    }
    document.body.appendChild(container);
}

function initSnow() {
    const container = document.createElement('div');
    container.className = 'snow-effect';
    for (let i = 0; i < 20; i++) {
        const flake = document.createElement('div');
        flake.className = 'snowflake';
        flake.textContent = '❄';
        container.appendChild(flake);
    }
    document.body.appendChild(container);
}

function initStars() {
    const container = document.createElement('div');
    container.className = 'stars-effect';
    for (let i = 0; i < 30; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        container.appendChild(star);
    }
    document.body.appendChild(container);
}

function initParticles() {
    const container = document.createElement('div');
    container.className = 'particles-effect';
    for (let i = 0; i < 20; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        container.appendChild(particle);
    }
    document.body.appendChild(container);
}

function initOldTV() {
    const container = document.createElement('div');
    container.className = 'oldtv-effect';
    const flicker = document.createElement('div');
    flicker.className = 'oldtv-flicker';
    container.appendChild(flicker);
    const staticNoise = document.createElement('div');
    staticNoise.className = 'oldtv-static';
    container.appendChild(staticNoise);
    document.body.appendChild(container);
}

function initCRT() {
    const container = document.createElement('div');
    container.className = 'crt-effect';
    const rgb = document.createElement('div');
    rgb.className = 'crt-rgb';
    container.appendChild(rgb);
    const glow = document.createElement('div');
    glow.className = 'crt-glow';
    container.appendChild(glow);
    const flicker = document.createElement('div');
    flicker.className = 'crt-flicker';
    container.appendChild(flicker);
    const roll = document.createElement('div');
    roll.className = 'crt-roll';
    container.appendChild(roll);
    document.body.appendChild(container);
}

function initStorm() {
    const container = document.createElement('div');
    container.className = 'rain-effect';
    for (let i = 0; i < 30; i++) {
        const drop = document.createElement('div');
        drop.className = 'rain-drop';
        container.appendChild(drop);
    }
    const lightning = document.createElement('div');
    lightning.className = 'lightning-flash';
    container.appendChild(lightning);
    for (let i = 0; i < 3; i++) {
        const bolt = document.createElement('div');
        bolt.className = 'lightning-bolt';
        container.appendChild(bolt);
    }
    document.body.appendChild(container);
}

function initBloodRain() {
    const container = document.createElement('div');
    container.className = 'rain-effect';
    for (let i = 0; i < 30; i++) {
        const drop = document.createElement('div');
        drop.className = 'rain-drop';
        container.appendChild(drop);
    }
    document.body.appendChild(container);
}

function initBlur() {}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { initBackgroundEffects };
}
