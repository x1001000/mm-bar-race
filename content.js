// Content script to inject bar race functionality into MacroMicro charts

(function() {
  'use strict';

  // Inject the main script into the page context to access Highcharts
  function injectPageScript() {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('page-script.js');
    script.onload = function() {
      this.remove();
    };
    (document.head || document.documentElement).appendChild(script);
  }

  // Wait for the page to load and find the chart
  function injectBarRaceButton() {
    if (document.getElementById('bar-race-toggle')) {
      return;
    }

    // Find the share button (分享/Share) or any toolbar button to insert before
    const shareButton = Array.from(document.querySelectorAll('button')).find(btn =>
      btn.textContent.includes('分享') || btn.textContent.includes('Share')
    );

    if (!shareButton) {
      return;
    }

    // Create the bar race toggle button
    const button = document.createElement('button');
    button.id = 'bar-race-toggle';
    button.textContent = 'Bar Race';

    // Copy the same classes from the share button if it has any
    if (shareButton.className) {
      button.className = shareButton.className;
    }

    button.style.cssText = `
      padding: 6px 12px;
      background: #3bafda;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 400;
      transition: background 0.3s;
      height: 32px;
      line-height: 1;
      margin-right: 8px;
    `;

    button.addEventListener('mouseenter', () => {
      if (button.textContent === 'Bar Race') {
        button.style.background = '#2a9ec9';
      } else {
        button.style.background = '#d14435';
      }
    });

    button.addEventListener('mouseleave', () => {
      if (button.textContent === 'Bar Race') {
        button.style.background = '#3bafda';
      } else {
        button.style.background = '#e9573f';
      }
    });

    button.addEventListener('click', () => {
      // Send message to page script
      window.postMessage({ type: 'TOGGLE_BAR_RACE' }, '*');
    });

    // Insert the button before the share button
    shareButton.parentNode.insertBefore(button, shareButton);
  }

  function showBarRaceControls(totalDates) {
    // Remove existing controls if any
    hideBarRaceControls();

    // Create controls container
    const controlsContainer = document.createElement('div');
    controlsContainer.id = 'bar-race-controls';
    controlsContainer.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(255, 255, 255, 0.95);
      border-radius: 8px;
      padding: 16px 24px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      display: flex;
      align-items: center;
      gap: 16px;
      backdrop-filter: blur(10px);
    `;

    // Play/Pause button
    const playPauseBtn = document.createElement('button');
    playPauseBtn.id = 'bar-race-play-pause';
    playPauseBtn.innerHTML = '⏸️';
    playPauseBtn.title = 'Pause';
    playPauseBtn.style.cssText = `
      background: #3bafda;
      color: white;
      border: none;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      cursor: pointer;
      font-size: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.3s;
    `;
    playPauseBtn.addEventListener('mouseenter', () => {
      playPauseBtn.style.background = '#2a9ec9';
    });
    playPauseBtn.addEventListener('mouseleave', () => {
      playPauseBtn.style.background = '#3bafda';
    });
    playPauseBtn.addEventListener('click', () => {
      window.postMessage({ type: 'PLAY_PAUSE_BAR_RACE' }, '*');
    });

    // Timeline slider
    const sliderContainer = document.createElement('div');
    sliderContainer.style.cssText = `
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 400px;
    `;

    const slider = document.createElement('input');
    slider.id = 'bar-race-timeline';
    slider.type = 'range';
    slider.min = '0';
    slider.max = (totalDates - 1).toString();
    slider.value = '0';
    slider.style.cssText = `
      flex: 1;
      height: 6px;
      border-radius: 3px;
      background: #ddd;
      outline: none;
      -webkit-appearance: none;
    `;

    // Add custom styling for the slider thumb
    const style = document.createElement('style');
    style.textContent = `
      #bar-race-timeline::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: #3bafda;
        cursor: pointer;
        transition: background 0.3s;
      }
      #bar-race-timeline::-webkit-slider-thumb:hover {
        background: #2a9ec9;
      }
      #bar-race-timeline::-moz-range-thumb {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: #3bafda;
        cursor: pointer;
        border: none;
        transition: background 0.3s;
      }
      #bar-race-timeline::-moz-range-thumb:hover {
        background: #2a9ec9;
      }
    `;
    document.head.appendChild(style);

    let isUserSeeking = false;
    slider.addEventListener('mousedown', () => {
      isUserSeeking = true;
    });
    slider.addEventListener('mouseup', () => {
      isUserSeeking = false;
    });
    slider.addEventListener('input', (e) => {
      if (isUserSeeking) {
        window.postMessage({
          type: 'SEEK_BAR_RACE',
          index: parseInt(e.target.value, 10)
        }, '*');
      }
    });

    const progress = document.createElement('span');
    progress.id = 'bar-race-progress';
    progress.style.cssText = `
      font-size: 12px;
      color: #666;
      min-width: 80px;
      text-align: right;
    `;
    progress.textContent = `0 / ${totalDates}`;

    sliderContainer.appendChild(slider);
    sliderContainer.appendChild(progress);

    controlsContainer.appendChild(playPauseBtn);
    controlsContainer.appendChild(sliderContainer);

    document.body.appendChild(controlsContainer);
  }

  function hideBarRaceControls() {
    const controls = document.getElementById('bar-race-controls');
    if (controls) {
      controls.remove();
    }
  }

  function updatePlayPauseButton(isPlaying) {
    const btn = document.getElementById('bar-race-play-pause');
    if (btn) {
      btn.innerHTML = isPlaying ? '⏸️' : '▶️';
      btn.title = isPlaying ? 'Pause' : 'Play';
    }
  }

  function updateTimelineSlider(index) {
    const slider = document.getElementById('bar-race-timeline');
    const progress = document.getElementById('bar-race-progress');
    if (slider && progress) {
      slider.value = index.toString();
      const total = parseInt(slider.max, 10) + 1;
      progress.textContent = `${index} / ${total}`;
    }
  }

  // Listen for messages from page script
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;

    if (event.data.type === 'BAR_RACE_ENABLED') {
      const button = document.getElementById('bar-race-toggle');
      if (button) {
        button.textContent = 'Original View';
        button.style.background = '#e9573f';
      }
      // Show controls
      showBarRaceControls(event.data.totalDates);
    } else if (event.data.type === 'BAR_RACE_DISABLED') {
      const button = document.getElementById('bar-race-toggle');
      if (button) {
        button.textContent = 'Bar Race';
        button.style.background = '#3bafda';
      }
      // Hide controls
      hideBarRaceControls();
    } else if (event.data.type === 'BAR_RACE_ERROR') {
      alert(event.data.message);
    } else if (event.data.type === 'BAR_RACE_PLAYING') {
      updatePlayPauseButton(true);
    } else if (event.data.type === 'BAR_RACE_PAUSED') {
      updatePlayPauseButton(false);
    } else if (event.data.type === 'BAR_RACE_PROGRESS') {
      updateTimelineSlider(event.data.index);
    }
  });

  // Initialize
  injectPageScript();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(injectBarRaceButton, 1000);
    });
  } else {
    setTimeout(injectBarRaceButton, 1000);
  }

  // Also try to inject when navigation happens (SPA behavior)
  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      setTimeout(injectBarRaceButton, 1000);
    }
  }).observe(document, { subtree: true, childList: true });

})();
