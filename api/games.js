import axios from 'axios';

let accessToken = '';
async function getToken() {
  const res = await axios.post('https://id.twitch.tv/oauth2/token', null, {
    params: {
      client_id: process.env.TWITCH_CLIENT_ID,
      client_secret: process.env.TWITCH_CLIENT_SECRET,
      grant_type: 'client_credentials',
    }
  });
  accessToken = res.data.access_token;
}

export default async function handler(req, res) {
  if (!accessToken) {
    await getToken();
  }

  const query = req.query.q || '';
  const data = `search "${query}"; fields name,cover.url,first_release_date,rating,platforms.name,summary,category,genres.name; where category = (0,1); limit 10;`;

  try {
    const igdbRes = await axios.post('https://api.igdb.com/v4/games', data, {
      headers: {
        'Client-ID': process.env.TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${accessToken}`,
      }
    });
    res.status(200).json(igdbRes.data);
  } catch (err) {
    if (err.response && err.response.status === 401) {
      await getToken();
      // opakuj požadavek
      try {
        const igdbRes2 = await axios.post('https://api.igdb.com/v4/games', data, {
          headers: {
            'Client-ID': process.env.TWITCH_CLIENT_ID,
            'Authorization': `Bearer ${accessToken}`,
          }
        });
        return res.status(200).json(igdbRes2.data);
      } catch(e) {
        return res.status(500).json({ error: e.message });
      }
    }
    res.status(500).json({ error: err.message });
  }
}
