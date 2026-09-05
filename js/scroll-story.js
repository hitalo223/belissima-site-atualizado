// Faz o vídeo avançar frame a frame conforme o usuário rola a página
// (scroll-scrubbing), como em sites tipo Apple. O vídeo não "toca" sozinho:
// o próprio scroll controla o tempo do vídeo (video.currentTime).

document.addEventListener('DOMContentLoaded', () => {
  const wrapper = document.querySelector('.scroll-video-wrapper');
  const video = document.querySelector('.scroll-video-pin video');
  const dots = Array.from(document.querySelectorAll('.story-progress .dot'));
  const sceneTexts = Array.from(document.querySelectorAll('.scene-text'));
  const loadingScreen = document.querySelector('.video-loading');
  const loadingBarFill = document.querySelector('.video-loading .bar-fill');

  if (!wrapper || !video) return;

  let videoDuration = 0;
  let targetProgress = 0;
  let currentProgress = 0;
  const smoothing = 0.12; // quanto menor, mais "suave"/atrasado; quanto maior, mais direto

  video.addEventListener('loadedmetadata', () => {
    videoDuration = video.duration;
  });

  video.addEventListener('progress', () => {
    if (video.buffered.length && video.duration) {
      const bufferedEnd = video.buffered.end(video.buffered.length - 1);
      const pct = Math.min(100, (bufferedEnd / video.duration) * 100);
      if (loadingBarFill) loadingBarFill.style.width = pct + '%';
      if (pct >= 99 && loadingScreen) loadingScreen.classList.add('hidden');
    }
  });

  video.addEventListener('canplaythrough', () => {
    if (loadingScreen) loadingScreen.classList.add('hidden');
  });

  function updateScene(progress) {
    sceneTexts.forEach((el) => {
      const [start, end] = el.dataset.range.split(',').map(Number);
      el.classList.toggle('active', progress >= start && progress < end);
    });

    const dotIndex = Math.min(dots.length - 1, Math.floor(progress * dots.length));
    dots.forEach((d, i) => d.classList.toggle('active', i === dotIndex));
  }

  function calculateTargetProgress() {
    const rect = wrapper.getBoundingClientRect();
    const totalScrollable = wrapper.offsetHeight - window.innerHeight;
    const scrolledInsideWrapper = Math.min(Math.max(-rect.top, 0), totalScrollable);
    targetProgress = totalScrollable > 0 ? scrolledInsideWrapper / totalScrollable : 0;
  }

  // Loop contínuo (não só em evento de scroll): a cada frame, currentProgress
  // "persegue" targetProgress suavemente. É isso que tira o efeito de degrau.
  function animationLoop() {
    currentProgress += (targetProgress - currentProgress) * smoothing;

    if (videoDuration) {
      video.currentTime = currentProgress * videoDuration;
    }
    updateScene(currentProgress);

    requestAnimationFrame(animationLoop);
  }

  window.addEventListener('scroll', calculateTargetProgress, { passive: true });
  window.addEventListener('resize', calculateTargetProgress);
  calculateTargetProgress();
  requestAnimationFrame(animationLoop);
});
