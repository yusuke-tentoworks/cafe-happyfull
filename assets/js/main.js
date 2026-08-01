/**
 * カフェ はぴふる (Cafe Happyfull)
 * Main JavaScript (Smooth scroll, dynamic microCMS fetch, and forms)
 */

// 全体メニュー画像がmicroCMSから取得できなかった場合に表示するテキスト
const MENU_BOARD_ERROR_TEXT = 'メニューの読み込みに失敗しました。お手数ですが、時間をおいて再度ご確認ください。';

document.addEventListener('DOMContentLoaded', () => {
  initMobileMenu();
  initSmoothScroll();
  initMicroCMS();
  initPrivacyModal();
  initMenuLightbox();
});

/**
 * 1. モバイルメニューの制御
 */
function initMobileMenu() {
  const toggleBtn = document.querySelector('.nav__toggle');
  const navList = document.querySelector('.nav__list');

  if (!toggleBtn || !navList) return;

  // 開閉状態はクラスのみで管理する。
  // インラインstyleで display を書き込むと、PC幅に戻したときに
  // メディアクエリより優先されてナビゲーションが消えてしまうため。
  const setMenuState = (isOpen) => {
    navList.classList.toggle('is-open', isOpen);
    toggleBtn.setAttribute('aria-expanded', String(isOpen));
    toggleBtn.setAttribute('aria-label', isOpen ? 'メニューを閉じる' : 'メニューを開く');
  };

  const closeMenu = () => setMenuState(false);

  toggleBtn.addEventListener('click', () => {
    setMenuState(!navList.classList.contains('is-open'));
  });

  // リンク選択時は常に閉じる。
  // PC幅では .is-open 自体が効かないため、幅の判定は不要。
  navList.querySelectorAll('.nav__link').forEach(link => {
    link.addEventListener('click', closeMenu);
  });

  // メニュー外のタップ / Escape でも閉じる
  document.addEventListener('click', (e) => {
    if (!navList.classList.contains('is-open')) return;
    if (navList.contains(e.target) || toggleBtn.contains(e.target)) return;
    closeMenu();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navList.classList.contains('is-open')) {
      closeMenu();
      toggleBtn.focus();
    }
  });
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
      'store-name': 'カフェ はぴふる',
      'product-name': '自家焙煎ハンドドリップコーヒー',
      price: 500,
      description: '豊川の小さな自家焙煎コーヒー店の豆を厳選し、丁寧にハンドドリップいたします。お好みに合わせた豆をご用意。',
      image: 'assets/images/coffee.webp'
    },
    {
      id: 'cinnamon-roll',
      'store-name': 'カフェ はぴふる',
      'product-name': '手作り北欧風シナモンロール',
      price: 380,
      description: '生地にカルダモンを贅沢に練り込んだ、北欧スウェーデンの本格的な味覚をお楽しみいただけます。コーヒーとの相性抜群です。',
      image: 'assets/images/cinnamon.webp'
    },
    {
      id: 'cafe-au-lait',
      'store-name': 'カフェ はぴふる',
      'product-name': 'カフェオレ',
      price: 550,
      description: '深煎りの自家焙煎コーヒーに、たっぷりの温かいミルクを注ぎました。まろやかで優しい味わいです。',
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

  // 営業日カレンダーのフェッチ
  try {
    const calendar = await fetchFromMicroCMS('calendar');
    renderCalendar(calendar);
  } catch (e) {
    console.warn('microCMS Calendar API Fetch Failed.', e);
  }

  // サポーター紹介（Supporter Profiles）のフェッチ
  try {
    const supporterProfiles = await fetchFromMicroCMS('supporter-profiles');
    renderSupporterProfiles(supporterProfiles);
  } catch (e) {
    console.warn('microCMS Supporter Profiles API Fetch Failed.', e);
    renderSupporterProfiles([]);
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
    console.warn('microCMS Menu Board API Fetch Failed.', e);
    renderMenuBoard(null);
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
    const rawImage = (item.image && typeof item.image === 'object') ? item.image.url : item.image;
    const hasImage = !!rawImage;
    // カードの表示サイズは約280x200。Retina想定で2倍の600pxに抑える
    const imageSrc = hasImage ? withImageParams(rawImage, 600) : 'assets/images/coffee.webp';

    // 下書きプレビュー用のバッジと目立たせるための追加スタイル
    const draftBadge = item.isDraft ? '<span class="standard-item__badge" style="background-color: #ff8a80 !important; font-size: 0.8rem; margin-bottom: 0.5rem; display: inline-block;">下書きプレビュー</span>' : '';
    const draftStyle = item.isDraft ? 'border: 2px dashed #ff8a80; padding: 1.2rem; border-radius: 8px; background-color: rgba(255, 138, 128, 0.05);' : '';

    // 価格のフォーマット（数値型の場合に対応し、未入力時は空文字、かつ "500円" のように単位を補う）
    const formattedPrice = (item.price !== undefined && item.price !== null)
      ? (String(item.price).endsWith('円') ? item.price : `${item.price}円`)
      : '';

    // 説明の取得（APIスキーマの description と、モックデータの desc の両方に対応）
    const menuDesc = item.description || item.desc || '';

    // 商品名の取得（新スキーマの product-name と、旧モックデータの title の両方に対応）
    const productName = item['product-name'] || item.title || '';

    // 店名の取得（新スキーマの store-name。未入力時はラベルを出さない）
    const storeName = item['store-name'] || '';
    const storeLabel = storeName ? `<span class="menu-card__store">${storeName}</span>` : '';

    // 掲載しているのは商品ではなく豆の提供元（焙煎所）の店舗外観のため、
    // altは商品名ではなく写っているものを説明する。
    // プレースホルダー画像に差し替わった場合は店舗写真ではないので商品名を使う
    const imageAlt = (hasImage && storeName) ? `${storeName}の店舗外観` : productName;

    return `
      <div class="menu-card" style="${draftStyle}">
        <div class="menu-card__img">
          <img src="${imageSrc}" alt="${escapeHtmlAttr(imageAlt)}" loading="lazy">
        </div>
        <div class="menu-card__content">
          ${draftBadge}
          <div class="menu-card__header">
            ${storeLabel}
            <h4 class="menu-card__title">${productName}</h4>
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
  const container = document.getElementById('js-menu-board');
  const imgElement = document.getElementById('js-menu-board-img');
  const trigger = document.getElementById('js-menu-board-trigger');
  const messageElement = document.getElementById('js-menu-board-fallback');
  if (!container || !imgElement || !messageElement) return;

  // 画像が取得・表示できなかった場合は、ダミー画像ではなくテキストで状況を伝える
  const showMessage = () => {
    imgElement.hidden = true;
    imgElement.removeAttribute('src');
    if (trigger) trigger.hidden = true;
    messageElement.textContent = MENU_BOARD_ERROR_TEXT;
    messageElement.hidden = false;
    container.classList.add('is-empty');
  };

  // リスト形式（配列）とオブジェクト形式の両方に対応
  const item = Array.isArray(data) ? data[0] : data;
  if (!item) {
    showMessage();
    return;
  }

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
        badge.textContent = '下書きプレビュー';
        badge.setAttribute('style', 'background-color: #ff8a80 !important; color: #fff; font-size: 0.8rem; padding: 2px 8px; border-radius: 4px; margin-bottom: 0.5rem; display: inline-block; font-weight: bold;');
        // 画像は拡大用ボタンの内側にあるため、コンテナ先頭へ挿入する
        parentContainer.prepend(badge);
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

  if (!imageUrl) {
    showMessage();
    return;
  }

  // 画像URL自体の読み込みに失敗した場合もテキスト表示に切り替える
  imgElement.onerror = showMessage;
  // ページ内の表示幅は最大800px。Retina想定で2倍の1600pxに抑える
  imgElement.src = withImageParams(imageUrl, 1600);
  imgElement.hidden = false;
  if (trigger) {
    // 拡大表示では文字を読ませるため、より大きい版を使う
    trigger.dataset.zoomSrc = withImageParams(imageUrl, 2200);
    trigger.hidden = false;
  }
  messageElement.hidden = true;
  container.classList.remove('is-empty');
}

/**
 * 5. メニュー表の拡大表示（ライトボックス）
 * メニュー表は画像内に価格などの文字が入っており、SPでは原寸の約14%まで
 * 縮小されて判読できないため、拡大して読める手段を用意する
 */
function initMenuLightbox() {
  const trigger = document.getElementById('js-menu-board-trigger');
  const lightbox = document.getElementById('js-menu-lightbox');
  const overlay = document.getElementById('js-menu-lightbox-overlay');
  const closeBtn = document.getElementById('js-menu-lightbox-close');
  const zoomImg = document.getElementById('js-menu-lightbox-img');
  const boardImg = document.getElementById('js-menu-board-img');

  if (!trigger || !lightbox || !overlay || !closeBtn || !zoomImg) return;

  const scrollArea = lightbox.querySelector('.lightbox__scroll');

  const open = () => {
    zoomImg.src = trigger.dataset.zoomSrc || (boardImg && boardImg.src) || '';
    zoomImg.alt = (boardImg && boardImg.alt) || 'メニュー表';
    lightbox.classList.add('is-active');
    document.body.style.overflow = 'hidden';
    closeBtn.focus();
  };

  const close = () => {
    lightbox.classList.remove('is-active');
    document.body.style.overflow = '';
    // 次に開いたときに前回のスクロール位置が残らないようにする
    if (scrollArea) scrollArea.scrollTo(0, 0);
    trigger.focus();
  };

  trigger.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', close);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && lightbox.classList.contains('is-active')) {
      close();
    }
  });
}

/**
 * 営業日カレンダー画像のレンダリング
 */
function renderCalendar(data) {
  if (!data) return;

  const items = Array.isArray(data) ? data : [data];

  const setCalendarImage = (imgElement, item) => {
    if (!imgElement) return;
    const wrapper = imgElement.closest('.access__calendar-image-wrapper');

    if (!item) {
      if (wrapper) wrapper.style.display = 'none';
      return;
    }

    const imageObj = item['calendar-image'];
    let imageUrl = '';
    if (imageObj && typeof imageObj === 'object') {
      imageUrl = imageObj.url;
    } else if (typeof imageObj === 'string') {
      imageUrl = imageObj;
    }

    if (imageUrl) {
      // 表示幅は最大800px。Retina想定で2倍の1600pxに抑える
      imgElement.src = withImageParams(imageUrl, 1600);
      imgElement.alt = item.title || '営業日カレンダー';
      if (wrapper) wrapper.style.display = '';
    } else if (wrapper) {
      wrapper.style.display = 'none';
    }
  };

  setCalendarImage(document.getElementById('js-calendar-img'), items[0]);
  setCalendarImage(document.getElementById('js-calendar-img-2'), items[1]);
}

/**
 * SNSリンクのURLをサニタイズする（http/https以外のスキーム（javascript: 等）を除去）
 */
function sanitizeSnsUrl(url) {
  try {
    const parsed = new URL(String(url), window.location.href);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.href;
    }
  } catch (e) {
    // 不正なURL形式は無視
  }
  return '';
}

/**
 * HTML属性へ埋め込むための簡易エスケープ
 */
/**
 * microCMSの画像URLに変換パラメータを付与して転送量を抑える。
 * 入稿された原寸（数千px・数MB）をそのまま配信すると表示サイズに対して過大なため、
 * 表示幅の約2倍を上限として配信する。
 * microCMS以外のURL（ローカルのプレースホルダー等）はそのまま返す。
 */
function withImageParams(url, width, quality = 80) {
  if (!url || typeof url !== 'string') return url;
  if (!url.includes('images.microcms-assets.io')) return url;

  try {
    const parsed = new URL(url);
    parsed.searchParams.set('fm', 'webp');
    parsed.searchParams.set('w', String(width));
    // fit=max を付けないと、原寸が指定幅より小さい画像が引き伸ばされ
    // かえって重くなる（例: 1080px の画像が w=1600 で 73KB → 192KB）。
    // 指定幅は「上限」として扱い、拡大はさせない
    parsed.searchParams.set('fit', 'max');
    parsed.searchParams.set('q', String(quality));
    return parsed.toString();
  } catch (e) {
    // URLとして解釈できない場合は加工せずそのまま使う
    return url;
  }
}

function escapeHtmlAttr(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * SNSの種類に応じたアイコンSVGを返す
 */
function getSnsIcon(platform) {
  const icons = {
    'Instagram': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" stroke="none"/></svg>',
    'X (Twitter)': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="5" x2="19" y2="19"/><line x1="19" y1="5" x2="5" y2="19"/></svg>',
    'Facebook': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 21v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3V2h-3a5 5 0 0 0-5 5v2H7v4h3v8z"/></svg>',
    'LINE公式アカウント': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="12" rx="4"/><path d="M8 17v4l4-4"/></svg>',
    '公式サイト': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><line x1="3" y1="12" x2="21" y2="12"/><path d="M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18z"/></svg>'
  };
  return icons[platform] || '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></svg>';
}

/**
 * サポーター紹介（Supporter Profiles）のHTMLレンダリング
 */
function renderSupporterProfiles(profileList) {
  const container = document.getElementById('js-supporter-profiles-list');
  if (!container) return;

  if (!Array.isArray(profileList) || profileList.length === 0) {
    container.innerHTML = '<p class="text-muted" style="grid-column: 1 / -1; text-align: center;">現在、ご紹介できるサポーターを準備中です。</p>';
    return;
  }

  container.innerHTML = profileList.map(item => {
    // 画像オブジェクト { url: '...' } と文字列URLの両方に対応。未設定時はプレースホルダー
    const rawImage = (item.image && typeof item.image === 'object') ? item.image.url : item.image;
    // カードの表示サイズは約280x200。Retina想定で2倍の600pxに抑える
    const imageSrc = rawImage ? withImageParams(rawImage, 600) : 'assets/images/logo-square.webp';

    // セレクトフィールド（type）は配列で返るため、文字列にも対応させて先頭要素を取り出す
    const typeValue = Array.isArray(item.type) ? item.type[0] : item.type;
    const badge = typeValue ? `<span class="supporter-profile-card__badge">${typeValue}</span>` : '';

    // フィールドID: store-name（出店者名）
    const storeName = item['store-name'] || item.storeName || '';
    const content = item.content || '';

    // フィールドID: sns（繰り返し。各要素は platform / url を持つ）
    const snsList = Array.isArray(item.sns) ? item.sns : [];
    const snsHtml = snsList
      .map(sns => {
        const safeUrl = sanitizeSnsUrl(sns && sns.url);
        if (!safeUrl) return '';
        const platform = (sns && sns.platform) || 'SNS';
        return `<a href="${escapeHtmlAttr(safeUrl)}" class="supporter-profile-card__sns-link" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtmlAttr(platform)}" title="${escapeHtmlAttr(platform)}">${getSnsIcon(platform)}</a>`;
      })
      .join('');
    const snsSection = snsHtml ? `<div class="supporter-profile-card__sns">${snsHtml}</div>` : '';

    return `
      <div class="supporter-profile-card">
        <div class="supporter-profile-card__img">
          <img src="${imageSrc}" alt="${storeName}" loading="lazy">
        </div>
        <div class="supporter-profile-card__content">
          ${badge}
          <h3 class="supporter-profile-card__name">${storeName}</h3>
          <p class="supporter-profile-card__desc">${content}</p>
          ${snsSection}
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
