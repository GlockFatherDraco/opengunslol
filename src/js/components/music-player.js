let globalAudio = null;

function initMusicPlayer() {
    const player = document.querySelector('.music-player');
    if (!player) return;

    const audio = new Audio();
    globalAudio = audio;
    const playPauseBtn = player.querySelector('.play-pause');
    const prevBtn = player.querySelector('.prev-track');
    const nextBtn = player.querySelector('.next-track');
    const trackName = player.querySelector('.music-track-name');
    const coverImg = player.querySelector('.music-cover');
    const currentTimeEl = player.querySelector('.current-time');
    const durationEl = player.querySelector('.duration-time');
    const seekbar = player.querySelector('.music-seekbar');
    const seekbarProgress = player.querySelector('.music-seekbar-progress');

    const iconPath = 'src/assets/icons/music/music-player/';
    const icons = {
        play: `${iconPath}play.svg`,
        pause: `${iconPath}pause.svg`,
        next: `${iconPath}next.svg`,
        prev: `${iconPath}previous.svg`
    };

    function setButtonIcon(btnEl, src, alt = '') {
        if (!btnEl) return;
        btnEl.innerHTML = `<img src="${src}" alt="${alt}" />`;
    }

    let currentTrackIndex = 0;
    let isPlaying = false;
    const autoPlay = true;
    
    const tracks = [
        { name: 'The World Looks White', file: 'src/assets/music/tracks/The_World_Looks_White.opus', cover: 'src/assets/music/covers/violence.png' },
        { name: 'The World Looks Red', file: 'src/assets/music/tracks/The_World_Looks_Red.opus', cover: 'src/assets/music/covers/violence.png' }
    ];

    function loadTrack(index) {
        const track = tracks[index];
        audio.src = track.file;
        trackName.textContent = track.name;
        coverImg.src = track.cover;
        coverImg.alt = track.name;
    }

    function togglePlayPause() {
        if (audio.paused) {
            audio.play();
            isPlaying = true;
            setButtonIcon(playPauseBtn, icons.pause, 'Pause');
        } else {
            audio.pause();
            isPlaying = false;
            setButtonIcon(playPauseBtn, icons.play, 'Play');
        }
    }

    function nextTrack() {
        currentTrackIndex = (currentTrackIndex + 1) % tracks.length;
        loadTrack(currentTrackIndex);
        if (isPlaying) {
            audio.play();
        }
    }

    function prevTrack() {
        currentTrackIndex = (currentTrackIndex - 1 + tracks.length) % tracks.length;
        loadTrack(currentTrackIndex);
        if (isPlaying) {
            audio.play();
        }
    }

    function formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    let isSeeking = false;

    function updateSeekbar() {
        if (!isSeeking && audio.duration) {
            const progress = (audio.currentTime / audio.duration) * 100 || 0;
            seekbarProgress.style.width = progress + '%';
            currentTimeEl.textContent = formatTime(audio.currentTime);
            durationEl.textContent = formatTime(audio.duration);
        }
    }

    function seekToPosition(e) {
        if (!audio.duration) return;
        
        const rect = seekbar.getBoundingClientRect();
        const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
        const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
        const newTime = (percent / 100) * audio.duration;
        
        audio.currentTime = newTime;
        seekbarProgress.style.width = percent + '%';
        currentTimeEl.textContent = formatTime(newTime);
    }

    seekbar.addEventListener('click', (e) => {
        seekToPosition(e);
    });

    let isDragging = false;
    
    seekbar.addEventListener('mousedown', (e) => {
        isDragging = true;
        isSeeking = true;
        seekToPosition(e);
    });

    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            seekToPosition(e);
        }
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            isSeeking = false;
        }
    });

    seekbar.addEventListener('touchstart', (e) => {
        e.preventDefault();
        isDragging = true;
        isSeeking = true;
        seekToPosition(e);
    });

    document.addEventListener('touchmove', (e) => {
        if (isDragging) {
            e.preventDefault();
            seekToPosition(e);
        }
    });

    document.addEventListener('touchend', () => {
        if (isDragging) {
            isDragging = false;
            isSeeking = false;
        }
    });

    setButtonIcon(playPauseBtn, icons.play, 'Play');
    setButtonIcon(nextBtn, icons.next, 'Next');
    setButtonIcon(prevBtn, icons.prev, 'Previous');

    playPauseBtn.addEventListener('click', togglePlayPause);
    nextBtn.addEventListener('click', nextTrack);
    prevBtn.addEventListener('click', prevTrack);
    audio.addEventListener('timeupdate', updateSeekbar);
    audio.addEventListener('loadedmetadata', updateSeekbar);
    audio.addEventListener('ended', nextTrack);

    loadTrack(currentTrackIndex);
    
    if (autoPlay) {
        let hasStarted = false;
        
        const tryAutoPlay = () => {
            if (hasStarted) return;
            hasStarted = true;
            
            audio.play().then(() => {
                isPlaying = true;
                setButtonIcon(playPauseBtn, icons.pause, 'Pause');
            }).catch(() => {});
            
            document.removeEventListener('click', tryAutoPlay);
            document.removeEventListener('keydown', tryAutoPlay);
        };
        
        audio.play().then(() => {
            hasStarted = true;
            isPlaying = true;
            setButtonIcon(playPauseBtn, icons.pause, 'Pause');
        }).catch(() => {
            document.addEventListener('click', tryAutoPlay, { once: true });
            document.addEventListener('keydown', tryAutoPlay, { once: true });
        });
    }
}

function getAudio() {
    return globalAudio;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { initMusicPlayer, getAudio };
}
