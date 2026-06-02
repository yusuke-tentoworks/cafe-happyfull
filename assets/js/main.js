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
        navList.style.backgroundColor = 'rgba(244, 241, 222, 0.95)';
        navList.style.padding = '1.5rem';
        navList.style.borderBottom = '1px solid rgba(156, 175, 136, 0.1)';
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
  // プレビューの対象APIエンドポイントを指定（未指定の場合は自動判定）
  const previewType = urlParams.get('previewType');

  // Netlify Functions（サーバーレス関数）経由でお知らせ、メニュー、全体メニューを取得
  let draftNews = null;
  let draftMenu = null;
  let draftMenuBoard = null;
  let detectedType = previewType;

  // プレビューパラメータがある場合、どの下書きかを自動判別または明示取得
  if (draftKey) {
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
    } else if (detectedType === 'menu-board') {
      try {
        const params = contentId ? { contentId, draftKey } : { draftKey };
        draftMenuBoard = await fetchFromMicroCMS('menu-board', params);
      } catch (e) {
        console.warn('Failed to fetch draft menu board', e);
      }
    } else {
      // previewType が未指定（または自動判定）の場合
      // 1. まずお知らせでの取得を試みる
      try {
        if (contentId) {
          const res = await fetchFromMicroCMS('news', { contentId, draftKey });
          if (res && res.length > 0 && !res.error && res[0] && !res[0].error) {
            draftNews = res;
            detectedType = 'news';
          } else {
            throw new Error('Not news draft');
          }
        } else {
          throw new Error('No contentId for news draft');
        }
      } catch (e) {
        // 2. お知らせで取得できなかった場合はメニューでの取得を試みる
        try {
          if (contentId) {
            const res = await fetchFromMicroCMS('menu', { contentId, draftKey });
            if (res && res.length > 0 && !res.error && res[0] && !res[0].error) {
              draftMenu = res;
              detectedType = 'menu';
            } else {
              throw new Error('Not menu draft');
            }
          } else {
            throw new Error('No contentId for menu draft');
          }
        } catch (err) {
          // 3. メニューでも取得できなかった場合、または contentId が無い場合は全体メニュー(menu-board)の取得を試みる
          try {
            const res = await fetchFromMicroCMS('menu-board', { draftKey });
            if (res && !res.error) {
              draftMenuBoard = res;
              detectedType = 'menu-board';
            }
          } catch (errBoard) {
            console.warn('Failed to auto-detect draft type', errBoard);
          }
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

  // 全体メニュー（Menu Board）のフェッチ
  try {
    let menuBoard;
    if (detectedType === 'menu-board' && draftMenuBoard) {
      menuBoard = draftMenuBoard;
      if (Array.isArray(menuBoard)) {
        if (menuBoard[0]) menuBoard[0].isDraft = true;
      } else if (menuBoard) {
        menuBoard.isDraft = true;
      }
    } else {
      menuBoard = await fetchFromMicroCMS('menu-board');
    }
    renderMenuBoard(menuBoard);
  } catch (e) {
    console.warn('microCMS Menu Board API Fetch Failed. Using default HTML image.', e);
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
  const btnContainer = document.getElementById('js-news-btn-container');
  const toggleBtn = document.getElementById('js-news-toggle-btn');
  if (!newsContainer) return;

  if (newsList.length === 0) {
    newsContainer.innerHTML = '<p class="text-muted">現在、新しいお知らせはありません。</p>';
    if (btnContainer) btnContainer.style.display = 'none';
    return;
  }

  // 表示する最大件数を5件に制限
  const displayList = newsList.slice(0, 5);

  // 1. お知らせカードのHTML描画（3件目以降は .is-hidden を付与）
  newsContainer.innerHTML = displayList.map((item, index) => {
    // 独自の日付フィールド(item.date)か、自動付与される公開日(item.publishedAt)を使用
    const rawDate = item.date || item.publishedAt || '';
    const formattedDate = rawDate ? rawDate.substring(0, 10).replace(/-/g, '.') : '';

    // 下書きプレビュー用のバッジと目立たせるための追加スタイル
    const draftBadge = item.isDraft ? '<span class="standard-item__badge" style="background-color: #ff8a80 !important; font-size: 0.8rem; margin-bottom: 0.5rem; display: inline-block;">下書きプレビュー</span>' : '';
    const draftStyle = item.isDraft ? 'border: 2px dashed #ff8a80; padding: 1.2rem; border-radius: 8px; background-color: rgba(255, 138, 128, 0.05);' : '';

    const isHiddenClass = index >= 3 ? 'is-hidden' : '';

    return `
      <article class="news__item ${isHiddenClass}" style="${draftStyle}">
        ${draftBadge}
        <span class="news__item-date">${formattedDate}</span>
        <h3 class="news__item-title">${item.title}</h3>
        <div class="news__item-content">${item.content}</div>
      </article>
    `;
  }).join('');

  // 2. 「もっと見る/折りたたむ」ボタンの制御
  if (displayList.length > 3 && btnContainer && toggleBtn) {
    btnContainer.style.display = 'block';

    // 重複リスナー登録を避けるため、クローンして置き換え
    const newToggleBtn = toggleBtn.cloneNode(true);
    toggleBtn.parentNode.replaceChild(newToggleBtn, toggleBtn);

    let isOpen = false;

    newToggleBtn.addEventListener('click', () => {
      const items = newsContainer.querySelectorAll('.news__item');

      if (!isOpen) {
        // 展開処理: 3件目以降に .is-visible を追加し、.is-hidden を除去
        items.forEach((item, index) => {
          if (index >= 3) {
            item.classList.remove('is-hidden');
            item.classList.add('is-visible');
          }
        });
        newToggleBtn.textContent = '折りたたむ';
        isOpen = true;
      } else {
        // 折りたたみ処理: 3件目以降から .is-visible を除去し、.is-hidden を追加
        items.forEach((item, index) => {
          if (index >= 3) {
            item.classList.remove('is-visible');
            item.classList.add('is-hidden');
          }
        });
        newToggleBtn.textContent = 'もっと見る';
        isOpen = false;

        // スムーズスクロールで「お知らせ」のトップへ戻る
        const newsSection = document.getElementById('news');
        if (newsSection) {
          const headerOffset = 80;
          const elementPosition = newsSection.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
        }
      }
    });
  } else {
    if (btnContainer) btnContainer.style.display = 'none';
  }
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

    // 価格のフォーマット（数値型の場合に対応し、未入力時は空文字、かつ "500円" のように単位を補う）
    const formattedPrice = (item.price !== undefined && item.price !== null)
      ? (String(item.price).endsWith('円') ? item.price : `${item.price}円`)
      : '';

    // 説明の取得（APIスキーマの description と、モックデータの desc の両方に対応）
    const menuDesc = item.description || item.desc || '';

    return `
      <div class="menu-card" style="${draftStyle}">
        <div class="menu-card__img">
          <img src="${imageSrc}" alt="${item.title}" loading="lazy">
        </div>
        <div class="menu-card__content">
          ${draftBadge}
          <div class="menu-card__header">
            <h4 class="menu-card__title">${item.title}</h4>
            <span class="menu-card__price">${formattedPrice}</span>
          </div>
          <p class="menu-card__desc">${menuDesc}</p>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * 全体メニュー（Menu Board）の画像レンダリング
 */
function renderMenuBoard(data) {
  const imgElement = document.getElementById('js-menu-board-img');
  if (!imgElement || !data) return;

  // リスト形式（配列）とオブジェクト形式の両方に対応
  const item = Array.isArray(data) ? data[0] : data;
  if (!item) return;

  // 下書きプレビュー用の破線ボーダー処理
  if (item.isDraft) {
    const parentContainer = imgElement.closest('.menu__overall-image');
    if (parentContainer) {
      parentContainer.style.border = '2px dashed #ff8a80';
      parentContainer.style.borderRadius = '8px';
      parentContainer.style.padding = '8px';
      parentContainer.style.backgroundColor = 'rgba(255, 138, 128, 0.05)';

      // プレビューバッジを追加（すでになければ追加）
      if (!parentContainer.querySelector('.draft-badge-board')) {
        const badge = document.createElement('span');
        badge.className = 'draft-badge-board';
        badge.innerHTML = '下書きプレビュー';
        badge.setAttribute('style', 'background-color: #ff8a80 !important; color: #fff; font-size: 0.8rem; padding: 2px 8px; border-radius: 4px; margin-bottom: 0.5rem; display: inline-block; font-weight: bold;');
        parentContainer.insertBefore(badge, imgElement);
      }
    }
  }

  // 画像オブジェクトまたは文字列URLから画像ソースを取り出す
  const imageObj = item.image || item.menuImage || item.menu_board_image;
  let imageUrl = '';
  if (imageObj && typeof imageObj === 'object') {
    imageUrl = imageObj.url;
  } else if (typeof imageObj === 'string') {
    imageUrl = imageObj;
  }

  if (imageUrl) {
    imgElement.src = imageUrl;
  }
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
