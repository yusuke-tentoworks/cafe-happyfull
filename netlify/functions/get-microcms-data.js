/**
 * Netlify Functions: get-microcms-data
 * microCMSのAPIキーを隠蔽し、安全に「お知らせ」「メニュー」データを取得するためのサーバーレス関数
 */

exports.handler = async function (event, context) {
  const { endpoint, contentId, draftKey } = event.queryStringParameters || {};

  // エンドポイントパラメータの検証
  if (!endpoint || (endpoint !== 'news' && endpoint !== 'menu' && endpoint !== 'menu-board')) {
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

  // 下書きプレビュー（draftKeyがある場合）と通常取得でURLを分岐
  let url = `https://${serviceDomain}.microcms.io/api/v1/${endpoint}`;
  if (draftKey) {
    if (contentId) {
      url = `https://${serviceDomain}.microcms.io/api/v1/${endpoint}/${contentId}?draftKey=${draftKey}`;
    } else {
      url = `https://${serviceDomain}.microcms.io/api/v1/${endpoint}?draftKey=${draftKey}`;
    }
  }

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

    // プレビュー（個別取得・リスト形式）の場合はオブジェクト単体が返るため、配列形式にして返却することでフロントエンドで扱いやすくする
    // オブジェクト形式APIのプレビュー、または通常時のオブジェクト形式取得では data.contents が無いため、そのまま data を返す
    const responseData = draftKey ? (contentId ? [data] : data) : (data.contents || data);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(responseData)
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

