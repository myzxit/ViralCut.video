/**
 * Snapshot the built landing page into one self-contained HTML file.
 *
 * Used to publish a shareable preview of the marketing page without standing up
 * the whole service. The markup and CSS come from a running production build, so
 * the preview cannot drift from the real page; the handful of interactions that
 * React would normally provide are re-attached with plain JS, driven by data
 * imported from the same source of truth the app uses.
 *
 *   npx next build && npx next start -p 3120 &
 *   npx tsx scripts/build-preview.ts <outFile>
 */

import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { faqs, genres } from '../src/content/site';
import {
  MAX_TARGET_MINUTES,
  MIN_TARGET_MINUTES,
  estimateScriptCharacters,
  estimateSceneCount,
} from '../src/lib/reconstruct-plan';

const ORIGIN = process.env.PREVIEW_ORIGIN ?? 'http://localhost:3120';
const OUT = process.argv[2] ?? 'preview.html';

async function fetchText(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} -> ${response.status}`);
  return response.text();
}

async function main() {
  const page = await fetchText(`${ORIGIN}/`);

  const cssHrefs = [...page.matchAll(/\/_next\/static\/css\/[a-z0-9]+\.css/g)].map(
    (match) => match[0],
  );
  const css = (
    await Promise.all([...new Set(cssHrefs)].map((href) => fetchText(ORIGIN + href)))
  ).join('\n');

  const bodyMatch = page.match(/<body[^>]*>([\s\S]*)<\/body>/);
  if (!bodyMatch) throw new Error('could not find <body> in the rendered page');

  const body = bodyMatch[1]
    // React never hydrates here, so its bundles would only 404.
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<link[^>]*jsdelivr[^>]*>/g, '')
    .trim();

  // Precomputed so the slider matches the app exactly instead of re-deriving the
  // formula in a second place that can fall out of step.
  const plan = Object.fromEntries(
    Array.from({ length: MAX_TARGET_MINUTES - MIN_TARGET_MINUTES + 1 }, (_, i) => {
      const minutes = MIN_TARGET_MINUTES + i;
      return [
        minutes,
        {
          scenes: estimateSceneCount(minutes),
          chars: estimateScriptCharacters(minutes),
        },
      ];
    }),
  );

  const genreData = genres.map((genre) => ({
    id: genre.id,
    headline: genre.headline,
    detail: genre.detail,
  }));

  const html = `<title>ViralCut</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700;800;900&display=swap">
<style>
${css}

/* The app loads Pretendard from a CDN the artifact sandbox will not fetch, so the
   preview substitutes the closest Korean face available from Google Fonts. */
body,
.font-sans {
  font-family: 'Noto Sans KR', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
}

/* The viewer's ground is painted in their own theme; this page is a committed
   light design, so it states its background rather than inheriting one. */
body {
  background: #ffffff;
  color: #14121f;
}

.preview-banner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.25rem 0.75rem;
  padding: 0.7rem 1.25rem;
  background: linear-gradient(120deg, #5b3df5 0%, #8b5cf6 45%, #ff4d6d 100%);
  color: #fff;
  font-size: 0.8rem;
  font-weight: 600;
  text-align: center;
}

.preview-banner span {
  font-weight: 400;
  opacity: 0.85;
}

.preview-toast {
  position: fixed;
  left: 50%;
  bottom: 2rem;
  z-index: 200;
  transform: translate(-50%, 1rem);
  padding: 0.75rem 1.25rem;
  border-radius: 999px;
  background: #14121f;
  color: #fff;
  font-size: 0.85rem;
  font-weight: 500;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.preview-toast[data-visible='true'] {
  opacity: 1;
  transform: translate(-50%, 0);
}

@media (prefers-reduced-motion: reduce) {
  .preview-toast {
    transition: none;
  }
}
</style>

<div class="preview-banner">
  정적 미리보기 <span>— 로그인과 영상 제작은 서버를 띄워야 동작합니다</span>
</div>

${body}

<div class="preview-toast" id="preview-toast" role="status" aria-live="polite"></div>

<script>
(function () {
  var GENRES = ${JSON.stringify(genreData)};
  var FAQS = ${JSON.stringify(faqs.map((faq) => ({ q: faq.q, a: faq.a })))};
  var PLAN = ${JSON.stringify(plan)};

  // ---- toast -------------------------------------------------------------
  var toast = document.getElementById('preview-toast');
  var toastTimer;
  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.setAttribute('data-visible', 'true');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toast.setAttribute('data-visible', 'false');
    }, 2600);
  }

  // Same-origin routes have no server behind them here. Say so rather than
  // letting the click land on a 404.
  document.addEventListener('click', function (event) {
    var link = event.target.closest ? event.target.closest('a') : null;
    if (!link) return;
    var href = link.getAttribute('href') || '';
    if (href.charAt(0) === '#' || /^(https?:|mailto:)/.test(href)) return;
    event.preventDefault();
    showToast('미리보기에서는 열리지 않습니다. 서버를 띄우면 동작합니다.');
  });

  document.addEventListener('submit', function (event) {
    event.preventDefault();
    showToast('미리보기에서는 열리지 않습니다. 서버를 띄우면 동작합니다.');
  });

  // ---- genre tabs --------------------------------------------------------
  var firstPanel = document.querySelector('[id^="genre-panel-"]');
  var panelClassName = firstPanel ? firstPanel.className : '';

  GENRES.forEach(function (genre) {
    var tab = document.getElementById('genre-tab-' + genre.id);
    if (!tab) return;
    tab.addEventListener('click', function () {
      var panel = document.querySelector('[id^="genre-panel-"]');
      if (!panel) return;

      GENRES.forEach(function (other) {
        var otherTab = document.getElementById('genre-tab-' + other.id);
        if (!otherTab) return;
        var active = other.id === genre.id;
        otherTab.setAttribute('aria-selected', String(active));
        otherTab.className = active
          ? 'rounded-full border px-4 py-2.5 text-sm font-semibold transition border-transparent bg-ink text-white shadow-card'
          : 'rounded-full border px-4 py-2.5 text-sm font-semibold transition border-black/[0.08] bg-white text-ink-soft hover:border-brand-200 hover:text-brand-700';
      });

      panel.id = 'genre-panel-' + genre.id;
      panel.setAttribute('aria-labelledby', 'genre-tab-' + genre.id);
      panel.className = panelClassName;
      panel.innerHTML =
        '<h3 class="text-2xl font-bold leading-snug sm:text-[1.75rem]"></h3>' +
        '<p class="mt-4 text-base leading-relaxed text-ink-soft"></p>';
      panel.querySelector('h3').textContent = genre.headline;
      panel.querySelector('p').textContent = genre.detail;
    });
  });

  // ---- reconstruct length slider ----------------------------------------
  var slider = document.getElementById('length-preview');
  if (slider) {
    var card = slider.closest('div');
    var minutesEl = card ? card.querySelector('p.text-4xl') : null;
    var readouts = card ? card.querySelectorAll('p.text-lg') : [];

    slider.addEventListener('input', function () {
      var minutes = Number(slider.value);
      var entry = PLAN[minutes];
      if (!entry) return;
      slider.setAttribute('aria-valuetext', minutes + '분');
      if (minutesEl) {
        minutesEl.innerHTML =
          minutes + '<span class="ml-1 text-xl font-bold text-white/60">분</span>';
      }
      if (readouts[0]) readouts[0].textContent = '약 ' + entry.scenes + '개';
      if (readouts[1]) {
        readouts[1].textContent = '약 ' + entry.chars.toLocaleString('ko-KR') + '자';
      }
    });
  }

  // ---- FAQ accordion -----------------------------------------------------
  var faqButtons = document.querySelectorAll('[aria-controls^="faq-panel-"]');
  var faqRoot = faqButtons.length ? faqButtons[0].closest('div').parentElement : null;

  if (faqRoot) {
    var openIndex = 0;
    var render = function () {
      faqRoot.innerHTML = FAQS.map(function (faq, index) {
        var open = index === openIndex;
        return (
          '<div><h3><button type="button" data-faq="' + index + '" aria-expanded="' + open +
          '" aria-controls="faq-panel-' + index + '" ' +
          'class="flex w-full items-center justify-between gap-6 py-5 text-left">' +
          '<span class="text-base font-semibold text-ink sm:text-lg">' + faq.qHtml + '</span>' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
          'stroke-linecap="round" class="h-5 w-5 shrink-0 transition-transform duration-200 ' +
          (open ? 'rotate-45 text-brand-600' : 'text-ink-faint') +
          '"><path d="M5 12h14"/><path d="M12 5v14"/></svg>' +
          '</button></h3>' +
          (open
            ? '<div id="faq-panel-' + index + '" class="pb-6 pr-10">' +
              '<p class="text-[0.95rem] leading-relaxed text-ink-muted">' + faq.aHtml + '</p></div>'
            : '') +
          '</div>'
        );
      }).join('');
    };

    FAQS.forEach(function (faq) {
      var div = document.createElement('div');
      div.textContent = faq.q;
      faq.qHtml = div.innerHTML;
      div.textContent = faq.a;
      faq.aHtml = div.innerHTML;
    });

    render();
    faqRoot.addEventListener('click', function (event) {
      var button = event.target.closest('[data-faq]');
      if (!button) return;
      var index = Number(button.getAttribute('data-faq'));
      openIndex = openIndex === index ? -1 : index;
      render();
    });
  }
})();
</script>
`;

  await writeFile(path.resolve(OUT), html, 'utf8');
  console.log(`wrote ${OUT} (${(html.length / 1024).toFixed(0)} KB)`);
  console.log(`  css: ${cssHrefs.length} file(s), ${(css.length / 1024).toFixed(0)} KB`);
}

main().catch((error) => {
  console.error('FAILED:', error instanceof Error ? error.message : error);
  process.exit(1);
});
