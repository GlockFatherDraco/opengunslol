(function() {
    const prefix = '@';
    const fullText = document.title.replace(prefix, '');
    let currentIndex = 0;
    let isTyping = true;
    let typingSpeed = 500;
    let pauseDuration = 3000;
    
    function animateTitle() {
        if (isTyping) {
            document.title = prefix + fullText.substring(0, currentIndex);
            currentIndex++;
            if (currentIndex > fullText.length) {
                setTimeout(() => {
                    isTyping = false;
                    currentIndex = fullText.length;
                    animateTitle();
                }, pauseDuration);
                return;
            }
        } else {
            currentIndex--;
            document.title = prefix + fullText.substring(0, currentIndex);
            if (currentIndex === 0) {
                setTimeout(() => {
                    isTyping = true;
                    animateTitle();
                }, pauseDuration);
                return;
            }
        }
        setTimeout(animateTitle, typingSpeed);
    }
    
    animateTitle();
})();
