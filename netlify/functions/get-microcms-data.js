/**
 * Netlify Functions: get-microcms-data
 * microCMSのAPIキーを隠蔽し、安全に「お知らせ」「メニュー」データを取得するためのサーバーレス関数
 */

exports.handler = async function(event, context) {
  const { endpoint } = event.queryStringParameters || {};

  // エンドポイントパラメータの検証
  if (!endpoint || (endpoint !== 'news' && endpoint !== 'menu')) {
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Invalid endpoint parameter. Must be "news" or "menu".' })
    };
  }

  const serviceDomain = process.env.MICROCMS_SERVICE_DOMAIN;
  const apiKey = process.env.MICROCMS_API_KEY;

  // 環境変数の存在チェック
  if (!serviceDomain || !apiKey) {
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Server configuration error. microCMS credentials missing.' })
    };
  }

  const url = `https://${serviceDomain}.microcms.io/api/v1/${endpoint}`;

  try {
    // Node.js 18+ のネイティブ fetch を利用
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-MICROCMS-API-KEY': apiKey
      }
    });

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: `microCMS API error: ${response.statusText}` })
      };
    }

    const data = await response.json();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(data.contents) // リスト形式のデータ（contents）のみを返却
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: error.message })
    };
  }
};
