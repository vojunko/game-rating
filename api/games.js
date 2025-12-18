import axios from 'axios';

let accessToken = '';
let tokenExpiresAt = 0;

async function getToken() {
  const res = await axios.post('https://id.twitch.tv/oauth2/token', null, {
    params: {
      client_id: process.env.TWITCH_CLIENT_ID,
      client_secret: process.env.TWITCH_CLIENT_SECRET,
      grant_type: 'client_credentials',
    }
  });

  accessToken = res.data.access_token;
  tokenExpiresAt = Date.now() + res.data.expires_in * 1000;
}

export default async function handler(req, res) {
  const query = (req.query.q || '').trim();
  if (!query) return res.status(400).json([]);

  if (!accessToken || Date.now() > tokenExpiresAt) {
    await getToken();
  }

  const body = `
    search "${query}";
    fields name,cover.url,first_release_date,rating,platforms.name,summary,category,genres.name;
    where category = (0,1);
    limit 10;
  `;

  try {
    const igdbRes = await axios.post(
      'https://api.igdb.com/v4/games',
      body,
      {
        headers: {
          'Client-ID': process.env.TWITCH_CLIENT_ID,
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      }
    );

    res.status(200).json(igdbRes.data);
  } catch (e) {
    console.error(e.response?.data || e.message);
    res.status(500).json({ error: 'IGDB error' });
  }
}
