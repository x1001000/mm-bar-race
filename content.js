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
    // Find the chart controls area
    const chartControls = document.querySelector('.chart-controls') ||
                         document.querySelector('[class*="chart"]')?.parentElement;

    if (!chartControls || document.getElementById('bar-race-toggle')) {
      return;
    }

    // Create the bar race toggle button
    const button = document.createElement('button');
    button.id = 'bar-race-toggle';
    button.textContent = '📊 Bar Race';
    button.style.cssText = `
      padding: 8px 16px;
      margin: 8px;
      background: #3bafda;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: background 0.3s;
      position: fixed;
      top: 120px;
      right: 20px;
      z-index: 10000;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    `;

    button.addEventListener('mouseenter', () => {
      button.style.background = '#2a9ec9';
    });

    button.addEventListener('mouseleave', () => {
      button.style.background = '#3bafda';
    });

    button.addEventListener('click', () => {
      // Send message to page script
      window.postMessage({ type: 'TOGGLE_BAR_RACE' }, '*');
    });

    document.body.appendChild(button);
  }

  // Listen for messages from page script
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;

    if (event.data.type === 'BAR_RACE_ENABLED') {
      const button = document.getElementById('bar-race-toggle');
      if (button) {
        button.textContent = '📈 Original View';
        button.style.background = '#e9573f';
      }
    } else if (event.data.type === 'BAR_RACE_DISABLED') {
      const button = document.getElementById('bar-race-toggle');
      if (button) {
        button.textContent = '📊 Bar Race';
        button.style.background = '#3bafda';
      }
    } else if (event.data.type === 'BAR_RACE_ERROR') {
      alert(event.data.message);
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
