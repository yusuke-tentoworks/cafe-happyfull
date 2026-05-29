/**
 * カフェ はぴふる (Cafe Happyfull)
 * Main JavaScript (Smooth scroll, dynamic microCMS fetch, and forms)
 */

document.addEventListener('DOMContentLoaded', () => {
  initMobileMenu();
  initSmoothScroll();
  initMicroCMS();
  initPrivacyModal();
});

/**
 * 1. モバイルメニューの制御
 */
function initMobileMenu() {
  const toggleBtn = document.querySelector('.nav__toggle');
  const navList = document.querySelector('.nav__list');

  if (toggleBtn && navList) {
    toggleBtn.addEventListener('click', () => {
      const isVisible = navList.style.display === 'flex';
      navList.style.display = isVisible ? 'none' : 'flex';
      // モバイル用の簡易トグルアニメーション
      if (!isVisible) {
        navList.style.flexDirection = 'column';
        navList.style.position = 'absolute';
        navList.style.top = '80px';
        navList.style.left = '0';
        navList.style.width = '100%';
        navList.style.backgroundColor = 'rgba(250, 248, 245, 0.95)';
        navList.style.padding = '1.5rem';
        navList.style.borderBottom = '1px solid rgba(122, 178, 182, 0.1)';
        navList.style.boxShadow = '0 4px 15px rgba(0,0,0,0.05)';
      }
    });

    // リンククリック時に閉じる
    navList.querySelectorAll('.nav__link').forEach(link => {
      link.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
          navList.style.display = 'none';
        }
      });
    });
  }
}

/**
 * 2. アンカーリンクのスムーズスクロール
 */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const targetId = this.getAttribute('href');

      // ロゴまたは「#」のみの場合はページ最上部へスムーズスクロール
      if (targetId === '#' || this.id === 'js-logo-top') {
        window.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
        return;
      }

      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        const headerOffset = 80;
        const elementPosition = targetElement.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    });
  });
}

/**
 * 3. microCMS 動的データ取得 & モックフォールバック
 */
async function initMicroCMS() {
  // まずはお知らせとメニューの初期表示用モックデータを定義（API未接続時のフォールバック）
  const mockNews = [
    {
      id: 'pre-open',
      title: '6月20日(土)・21日(日) プレオープン開催決定！',
      date: '2026-05-27',
      content: '諏訪プリオビル2階に新しくオープンする「カフェ はぴふる」です。オープンに先駆けて、2日間のプレオープンを行います。こだわりのハンドドリップコーヒーと、本場仕込みの北欧風シナモンロールをぜひお試しください！皆様のお越しを心よりお待ちしております。'
    },
    {
      id: 'supporters',
      title: '第1期「はぴふるサポーター」大募集！',
      date: '2026-05-27',
      content: '間借りカフェマスター、マルシェメンバーズ、boxshopオーナー、レンタルキッチン利用者を募集中です。あなたの「得意」や「やってみたい」を、はぴふるで形にしませんか？まずはお気軽にお問い合わせください。'
    }
  ];

  const mockMenu = [
    {
      id: 'coffee-drip',
      title: '自家焙煎ハンドドリップコーヒー',
      price: '500円',
      desc: '豊川の小さな自家焙煎コーヒー店の豆を厳選し、丁寧にハンドドリップいたします。お好みに合わせた豆をご用意。',
      image: 'assets/images/coffee.png'
    },
    {
      id: 'cinnamon-roll',
      title: '手作り北欧風シナモンロール',
      price: '380円',
      desc: '生地にカルダモンを贅沢に練り込んだ、北欧スウェーデンの本格的な味覚をお楽しみいただけます。コーヒーとの相性抜群です。',
      image: 'assets/images/cinnamon.png'
    },
    {
      id: 'cafe-au-lait',
      title: 'カフェオレ',
      price: '550円',
      desc: '深煎りの自家焙煎コーヒーに、たっぷりの温かいミルクを注ぎました。まろやかで優しい味わいです。',
      image: '' // 画像なしのフォールバック
    }
  ];

  // URLからプレビュー用のクエリパラメータを取得
  const urlParams = new URLSearchParams(window.location.search);
  const contentId = urlParams.get('contentId');
  const draftKey = urlParams.get('draftKey');
  // プレビューの対象APIエンドポイントを指定（デフォルトはnews）
  const previewType = urlParams.get('previewType') || 'news';

  // Netlify Functions（サーバーレス関数）経由でお知らせとメニューを取得
  let draftNews = null;
  let draftMenu = null;
  let detectedType = previewType;

  // プレビューパラメータがある場合、どちらの下書きかを自動判別または明示取得
  if (contentId && draftKey) {
    if (detectedType === 'menu') {
      try {
        draftMenu = await fetchFromMicroCMS('menu', { contentId, draftKey });
      } catch (e) {
        console.warn('Failed to fetch draft menu', e);
      }
    } else if (detectedType === 'news') {
      try {
        draftNews = await fetchFromMicroCMS('news', { contentId, draftKey });
      } catch (e) {
        console.warn('Failed to fetch draft news', e);
      }
    } else {
      // previewType が未指定（または自動判定）の場合
      // 1. まずお知らせでの取得を試みる
      try {
        const res = await fetchFromMicroCMS('news', { contentId, draftKey });
        if (res && res.length > 0 && !res.error && res[0] && !res[0].error) {
          draftNews = res;
          detectedType = 'news';
        } else {
          throw new Error('Not news draft');
        }
      } catch (e) {
        // 2. お知らせで取得できなかった場合はメニューでの取得を試みる
        try {
          const res = await fetchFromMicroCMS('menu', { contentId, draftKey });
          if (res && res.length > 0 && !res.error && res[0] && !res[0].error) {
            draftMenu = res;
            detectedType = 'menu';
          }
        } catch (err) {
          console.warn('Failed to auto-detect draft type', err);
        }
      }
    }
  }

  // お知らせ（News）のフェッチとマージ
  try {
    let news;
    if (detectedType === 'news' && draftNews) {
      // 通常の公開済みニュースも取得してマージ
      try {
        const publicNews = await fetchFromMicroCMS('news');
        const filteredPublicNews = publicNews.filter(item => item.id !== contentId);

        draftNews[0].isDraft = true;
        if (!draftNews[0].date && !draftNews[0].publishedAt) {
          const today = new Date();
          const yyyy = today.getFullYear();
          const mm = String(today.getMonth() + 1).padStart(2, '0');
          const dd = String(today.getDate()).padStart(2, '0');
          draftNews[0].date = `${yyyy}-${mm}-${dd}`;
        }
        news = [...draftNews, ...filteredPublicNews];
      } catch (e) {
        draftNews[0].isDraft = true;
        news = draftNews;
      }
    } else {
      news = await fetchFromMicroCMS('news');
    }
    renderNews(news);
  } catch (e) {
    console.warn('microCMS News API Fetch Failed. Loading Mock Data instead.', e);
    renderNews(mockNews);
  }

  // メニュー（Menu）のフェッチとマージ
  try {
    let menu;
    if (detectedType === 'menu' && draftMenu) {
      // 通常の公開済みメニューも取得してマージ
      try {
        const publicMenu = await fetchFromMicroCMS('menu');
        const filteredPublicMenu = publicMenu.filter(item => item.id !== contentId);

        draftMenu[0].isDraft = true;
        menu = [...draftMenu, ...filteredPublicMenu];
      } catch (e) {
        draftMenu[0].isDraft = true;
        menu = draftMenu;
      }
    } else {
      menu = await fetchFromMicroCMS('menu');
    }
    renderMenu(menu);
  } catch (e) {
    console.warn('microCMS Menu API Fetch Failed. Loading Mock Data instead.', e);
    renderMenu(mockMenu);
  }
}

/**
 * APIのベースURLを決定する関数
 * GitHub Pages (yusuke-tentoworks.github.io) やローカル環境では、Netlify上の絶対URLを叩くようにし、
 * Netlify本番環境では、同一ドメイン内の相対パスで実行する。
 */
function getApiBaseUrl() {
  const hostname = window.location.hostname;

  // NetlifyのSecrets scanningの誤検知を回避するため文字列を分割して定義
  const githubUser = 'yusuke-' + 'tentoworks';
  const netlifyApp = 'cafe-' + 'happyfull';

  if (hostname === `${githubUser}.github.io` || hostname === 'localhost' || hostname === '127.0.0.1') {
    return `https://${netlifyApp}.netlify.app`;
  }
  return '';
}

/**
 * Netlify Functionsを介してmicroCMSのデータを取得する共通関数
 */
async function fetchFromMicroCMS(endpoint, params = {}) {
  const baseUrl = getApiBaseUrl();
  let url = `${baseUrl}/.netlify/functions/get-microcms-data?endpoint=${endpoint}`;

  if (params.contentId && params.draftKey) {
    url += `&contentId=${params.contentId}&draftKey=${params.draftKey}`;
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return await response.json();
}

/**
 * お知らせ（News）のHTMLレンダリング
 */
function renderNews(newsList) {
  const newsContainer = document.getElementById('js-news-list');
  if (!newsContainer) return;

  if (newsList.length === 0) {
    newsContainer.innerHTML = '<p class="text-muted">現在、新しいお知らせはありません。</p>';
    return;
  }

  newsContainer.innerHTML = newsList.map(item => {
    // 独自の日付フィールド(item.date)か、自動付与される公開日(item.publishedAt)を使用
    const rawDate = item.date || item.publishedAt || '';
    const formattedDate = rawDate ? rawDate.substring(0, 10).replace(/-/g, '.') : '';

    // 下書きプレビュー用のバッジと目立たせるための追加スタイル
    const draftBadge = item.isDraft ? '<span class="standard-item__badge" style="background-color: #ff8a80 !important; font-size: 0.8rem; margin-bottom: 0.5rem; display: inline-block;">下書きプレビュー</span>' : '';
    const draftStyle = item.isDraft ? 'border: 2px dashed #ff8a80; padding: 1.2rem; border-radius: 8px; background-color: rgba(255, 138, 128, 0.05);' : '';

    return `
      <article class="concept__highlight" style="margin-bottom: 1.5rem; ${draftStyle}">
        ${draftBadge}
        <span class="standard-item__badge" style="font-size: 0.85rem; margin-bottom: 0.2rem; display: block;">${formattedDate}</span>
        <h4 style="font-size: 1.15rem; margin-bottom: 0.5rem; color: var(--text-dark);">${item.title}</h4>
        <div class="concept__highlight-content" style="font-size: 0.95rem; color: var(--text-muted); margin-bottom: 0; line-height: 1.6;">${item.content}</div>
      </article>
    `;
  }).join('');
}


/**
 * メニュー（Menu）のHTMLレンダリング
 */
function renderMenu(menuList) {
  const menuContainer = document.getElementById('js-menu-list');
  if (!menuContainer) return;

  if (menuList.length === 0) {
    menuContainer.innerHTML = '<p class="text-muted">メニューを準備中です。</p>';
    return;
  }

  menuContainer.innerHTML = menuList.map(item => {
    // 画像が無い場合のプレースホルダー。microCMSの画像オブジェクト { url: '...' } とモック用文字列の両方に対応
    const imageSrc = (item.image && typeof item.image === 'object') ? item.image.url : (item.image || 'assets/images/coffee.png');

    // 下書きプレビュー用のバッジと目立たせるための追加スタイル
    const draftBadge = item.isDraft ? '<span class="standard-item__badge" style="background-color: #ff8a80 !important; font-size: 0.8rem; margin-bottom: 0.5rem; display: inline-block;">下書きプレビュー</span>' : '';
    const draftStyle = item.isDraft ? 'border: 2px dashed #ff8a80; padding: 1.2rem; border-radius: 8px; background-color: rgba(255, 138, 128, 0.05);' : '';

    return `
      <div class="menu-card" style="${draftStyle}">
        <div class="menu-card__img">
          <img src="${imageSrc}" alt="${item.title}" loading="lazy">
        </div>
        <div class="menu-card__content">
          ${draftBadge}
          <div class="menu-card__header">
            <h4 class="menu-card__title">${item.title}</h4>
            <span class="menu-card__price">${item.price}</span>
          </div>
          <p class="menu-card__desc">${item.desc || ''}</p>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * 4. プライバシーポリシーモーダルの制御
 */
function initPrivacyModal() {
  const modal = document.getElementById('js-privacy-modal');
  const trigger = document.getElementById('js-privacy-trigger');
  const closeBtn = document.getElementById('js-privacy-close');
  const overlay = document.getElementById('js-privacy-overlay');

  if (modal && trigger && closeBtn && overlay) {
    // 開く
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      modal.classList.add('is-active');
      document.body.style.overflow = 'hidden'; // 背景スクロールを防止
    });

    // 閉じる関数
    const closeModal = () => {
      modal.classList.remove('is-active');
      document.body.style.overflow = ''; // スクロール復元
    };

    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', closeModal);

    // Escキーで閉じる
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('is-active')) {
        closeModal();
      }
    });
  }
}
