const cursor = document.createElement('div');
cursor.className = 'custom-cursor';
cursor.style.display = 'block';

if (document.body) {
    document.body.appendChild(cursor);
} else {
    document.addEventListener('DOMContentLoaded', () => {
        document.body.appendChild(cursor);
    });
}

function updateCursorImage(imageUrl) {
    if (imageUrl && cursor) {
        document.documentElement.style.setProperty('--cursor-image', `url('${imageUrl}')`);
        cursor.style.backgroundImage = `url('${imageUrl}')`;
    }
}

function loadCursorImage() {
    const metaTag = document.querySelector('meta[name="cursor-image"]');
    const bodyAttr = document.body.getAttribute('data-cursor-image');
    
    let cursorImageUrl = null;
    if (metaTag) {
        cursorImageUrl = metaTag.getAttribute('content');
    } else if (bodyAttr) {
        cursorImageUrl = bodyAttr;
    }
    
    if (cursorImageUrl) {
        updateCursorImage(cursorImageUrl);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadCursorImage);
} else {
    loadCursorImage();
}

document.addEventListener('mousemove', (e) => {
    cursor.style.left = e.clientX + 'px';
    cursor.style.top = e.clientY + 'px';
}, { passive: true });

document.addEventListener('mouseenter', () => {
    cursor.style.opacity = '1';
});

document.addEventListener('mouseleave', () => {
    cursor.style.opacity = '0';
});

window.addEventListener('blur', () => {
    cursor.style.opacity = '0';
});

window.addEventListener('focus', () => {
    cursor.style.opacity = '1';
});
