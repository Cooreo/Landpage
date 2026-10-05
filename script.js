(() => {
  'use strict';

  const reports = Array.isArray(window.REPORTS) ? window.REPORTS.filter(Boolean) : [];
  const grid = document.getElementById('report-grid');
  const toolbar = document.getElementById('archive-toolbar');
  const emptyState = document.getElementById('empty-state');
  const noResults = document.getElementById('no-results');
  const countDisplay = document.getElementById('archive-count');
  const countLabel = document.getElementById('archive-count-label');
  const navCount = document.getElementById('nav-report-count');
  const searchInput = document.getElementById('report-search');
  const categoryFilter = document.getElementById('category-filter');
  const sortOrder = document.getElementById('sort-order');

  const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);

  const formatCount = (value) => String(value).padStart(2, '0');

  function safeHref(value) {
    if (typeof value !== 'string' || !value.trim()) return '';
    const href = value.trim();
    if (/^(https?:|mailto:)/i.test(href)) return href;
    // Keep relative paths and in-page links, but don't allow executable schemes.
    if (/^[a-z][a-z\d+.-]*:/i.test(href) || href.startsWith('//')) return '';
    return href;
  }

  function formatDate(value) {
    if (!value) return '';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '';
    return new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(parsed);
  }

  function createCard(report) {
    const title = escapeHTML(report.title || 'Untitled report');
    const category = escapeHTML(report.category || 'Report');
    const date = formatDate(report.date);
    const summary = escapeHTML(report.summary || 'More details about this report will be added soon.');
    const details = escapeHTML(report.details || '');
    const highlights = Array.isArray(report.highlights)
      ? report.highlights.map((item) => `<li>${escapeHTML(item)}</li>`).join('')
      : '';
    const readTime = escapeHTML(report.readTime || 'Report');
    const href = safeHref(report.href);
    const opensNewTab = /^https?:/i.test(href);
    const detailBlock = details || highlights
      ? `<details>
           <summary>What you'll find inside</summary>
           <div class="report-details">${details ? `<p>${details}</p>` : ''}${highlights ? `<ul>${highlights}</ul>` : ''}</div>
         </details>`
      : '';
    const linkBlock = href
      ? `<a class="report-link" href="${escapeHTML(href)}"${opensNewTab ? ' target="_blank" rel="noopener noreferrer"' : ''}>Read the report <span aria-hidden="true">↗</span></a>`
      : '<span class="report-reading-time">Report link coming soon</span>';

    return `<article class="report-card">
      <div class="report-card-top">
        <span class="report-category">${category}</span>
        ${date ? `<time class="report-date" datetime="${escapeHTML(report.date)}">${escapeHTML(date)}</time>` : ''}
      </div>
      <h3>${title}</h3>
      <p class="report-summary">${summary}</p>
      ${detailBlock}
      <div class="report-card-footer">
        <span class="report-reading-time">${readTime}</span>
        ${linkBlock}
      </div>
    </article>`;
  }

  function setCount(number, filtered) {
    countDisplay.textContent = formatCount(number);
    if (filtered) {
      countLabel.textContent = `of ${reports.length} ${reports.length === 1 ? 'report' : 'reports'}`;
    } else {
      countLabel.textContent = reports.length === 1 ? 'report in the library' : 'reports in the library';
    }
  }

  function updateArchive() {
    const query = searchInput.value.trim().toLocaleLowerCase();
    const category = categoryFilter.value;
    const sort = sortOrder.value;
    const matching = reports.filter((report) => {
      const text = [report.title, report.category, report.summary, report.details]
        .concat(Array.isArray(report.highlights) ? report.highlights : [])
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase();
      return (!query || text.includes(query)) && (category === 'all' || report.category === category);
    });

    matching.sort((a, b) => {
      if (sort === 'title') return String(a.title || '').localeCompare(String(b.title || ''));
      const dateA = Date.parse(a.date || '') || 0;
      const dateB = Date.parse(b.date || '') || 0;
      return sort === 'oldest' ? dateA - dateB : dateB - dateA;
    });

    grid.innerHTML = matching.map(createCard).join('');
    const hasReports = reports.length > 0;
    const hasMatches = matching.length > 0;
    toolbar.hidden = !hasReports;
    emptyState.hidden = hasReports;
    noResults.hidden = !hasReports || hasMatches;
    setCount(matching.length, query.length > 0 || category !== 'all');
  }

  const categories = [...new Set(reports.map((report) => String(report.category || '').trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));
  categories.forEach((category) => {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    categoryFilter.append(option);
  });
  navCount.textContent = formatCount(reports.length);
  updateArchive();

  searchInput.addEventListener('input', updateArchive);
  categoryFilter.addEventListener('change', updateArchive);
  sortOrder.addEventListener('change', updateArchive);

  // Small-screen navigation stays keyboard-friendly and closes after navigation.
  const menuToggle = document.getElementById('menu-toggle');
  const primaryNav = document.getElementById('primary-nav');
  function closeMenu() {
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Open navigation');
    primaryNav.classList.remove('is-open');
  }
  menuToggle.addEventListener('click', () => {
    const isOpen = menuToggle.getAttribute('aria-expanded') === 'true';
    menuToggle.setAttribute('aria-expanded', String(!isOpen));
    menuToggle.setAttribute('aria-label', isOpen ? 'Open navigation' : 'Close navigation');
    primaryNav.classList.toggle('is-open', !isOpen);
  });
  primaryNav.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMenu();
  });

  // Copy-to-clipboard with a fallback for browsers without the Clipboard API.
  const copyButton = document.getElementById('copy-email');
  const copyStatus = document.getElementById('copy-status');
  let copyResetTimer;
  copyButton.addEventListener('click', async () => {
    const email = 'fwepic01@gmail.com';
    let copied = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(email);
        copied = true;
      } else {
        const temporaryInput = document.createElement('textarea');
        temporaryInput.value = email;
        temporaryInput.setAttribute('readonly', '');
        temporaryInput.style.position = 'fixed';
        temporaryInput.style.opacity = '0';
        document.body.append(temporaryInput);
        temporaryInput.select();
        copied = document.execCommand('copy');
        temporaryInput.remove();
      }
    } catch (_) {
      copied = false;
    }
    copyStatus.textContent = copied ? 'Email copied to clipboard.' : 'Select the email address to copy it.';
    copyButton.textContent = copied ? 'Copied!' : 'Copy email';
    window.clearTimeout(copyResetTimer);
    copyResetTimer = window.setTimeout(() => {
      copyButton.textContent = 'Copy email';
      copyStatus.textContent = '';
    }, 3000);
  });

  // A gentle, locally generated ambient pad. It never starts until the visitor
  // explicitly presses the sound control (browsers block autoplay by design).
  const soundToggle = document.getElementById('sound-toggle');
  const soundStatus = document.getElementById('sound-status');
  let audioContext = null;
  let masterGain = null;
  let chordBuses = [];
  let sequenceTimer = null;
  let chordStep = 0;
  let soundIsOn = false;

  const chords = [
    [65.41, 130.81, 164.81, 196.00, 246.94], // C major 9
    [55.00, 110.00, 130.81, 164.81, 196.00], // A minor 9
    [43.65, 87.31, 130.81, 174.61, 220.00],  // F major 9
    [49.00, 98.00, 146.83, 174.61, 220.00]   // G suspended
  ];

  function prepareAmbientAudio() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return false;
    audioContext = new AudioContextClass();

    const lowPass = audioContext.createBiquadFilter();
    lowPass.type = 'lowpass';
    lowPass.frequency.value = 1000;
    lowPass.Q.value = 0.45;

    masterGain = audioContext.createGain();
    masterGain.gain.value = 0;
    lowPass.connect(masterGain);
    masterGain.connect(audioContext.destination);

    // Slow filter breathing keeps the sustained chords soft and organic.
    const filterLfo = audioContext.createOscillator();
    const filterLfoDepth = audioContext.createGain();
    filterLfo.type = 'sine';
    filterLfo.frequency.value = 0.075;
    filterLfoDepth.gain.value = 115;
    filterLfo.connect(filterLfoDepth);
    filterLfoDepth.connect(lowPass.frequency);
    filterLfo.start();

    chordBuses = chords.map((frequencies) => {
      const bus = audioContext.createGain();
      bus.gain.value = 0;
      bus.connect(lowPass);
      frequencies.forEach((frequency, index) => {
        const oscillator = audioContext.createOscillator();
        const voiceGain = audioContext.createGain();
        oscillator.type = index === 0 ? 'triangle' : 'sine';
        oscillator.frequency.value = frequency;
        voiceGain.gain.value = index === 0 ? 0.055 : 0.045;
        oscillator.connect(voiceGain);
        voiceGain.connect(bus);
        oscillator.start();
      });
      return bus;
    });
    return true;
  }

  function moveToChord(index) {
    const now = audioContext.currentTime;
    chordBuses.forEach((bus, busIndex) => {
      const gain = bus.gain;
      gain.cancelScheduledValues(now);
      gain.setTargetAtTime(busIndex === index ? 0.85 : 0, now, 2.8);
    });
  }

  function updateSoundButton(isOn) {
    soundToggle.setAttribute('aria-pressed', String(isOn));
    soundToggle.setAttribute('aria-label', isOn ? 'Turn ambient sound off' : 'Turn ambient sound on');
    soundToggle.classList.toggle('is-playing', isOn);
    soundToggle.querySelector('.sound-label').textContent = isOn ? 'Ambient on' : 'Sound off';
    soundStatus.textContent = isOn ? 'Ambient sound is on.' : 'Ambient sound is off.';
  }

  soundToggle.addEventListener('click', async () => {
    if (soundIsOn) {
      soundIsOn = false;
      updateSoundButton(false);
      window.clearInterval(sequenceTimer);
      sequenceTimer = null;
      const contextToSuspend = audioContext;
      if (contextToSuspend && masterGain) {
        const gain = masterGain.gain;
        gain.cancelScheduledValues(contextToSuspend.currentTime);
        gain.setTargetAtTime(0, contextToSuspend.currentTime, 0.35);
        window.setTimeout(() => {
          if (!soundIsOn && audioContext === contextToSuspend && contextToSuspend.state === 'running') {
            contextToSuspend.suspend().catch(() => {});
          }
        }, 1300);
      }
      return;
    }

    try {
      if (!audioContext && !prepareAmbientAudio()) {
        soundStatus.textContent = 'Ambient sound is not supported in this browser.';
        return;
      }
      await audioContext.resume();
      soundIsOn = true;
      updateSoundButton(true);
      chordStep = 0;
      moveToChord(chordStep);
      const gain = masterGain.gain;
      gain.cancelScheduledValues(audioContext.currentTime);
      gain.setTargetAtTime(0.23, audioContext.currentTime, 1.8);
      sequenceTimer = window.setInterval(() => {
        if (!soundIsOn || !audioContext || audioContext.state !== 'running') return;
        chordStep = (chordStep + 1) % chordBuses.length;
        moveToChord(chordStep);
      }, 14500);
    } catch (_) {
      soundIsOn = false;
      updateSoundButton(false);
      soundStatus.textContent = 'Ambient sound could not be started. Please try again.';
    }
  });
})();
