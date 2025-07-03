import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();
const app = express();
const port = 3001;

// Nastavíme složku pro frontend
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, '../frontend')));

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
await getToken();

// API endpoint pro hledání her
app.get('/api/games', async (req, res) => {
  const query = req.query.q || '';
  const data = `search "${query}";
  fields name,cover.url,first_release_date,rating,platforms.name,summary,category,genres.name;
  where category = (0,1);
  limit 10;`;

  try {
    const igdbRes = await axios.post('https://api.igdb.com/v4/games', data, {
      headers: {
        'Client-ID': process.env.TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${accessToken}`,
      }
    });
    res.json(igdbRes.data);
  } catch (err) {
    if (err.response && err.response.status === 401) {
      await getToken();
      return res.redirect(req.originalUrl);
    }
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Server běží na http://localhost:${port}`);
});
