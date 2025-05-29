import express from 'express';
import axios from 'axios';

const router = express.Router();

router.get('/forecast', async (req, res) => {
  const city = req.query.city;
  if (!city) return res.status(400).json({ error: 'City is required' });

  try {
    const response = await axios.get(`https://api.meteo.lt/v1/places/${city}/forecasts/long-term`);
    res.json(response.data);
  } catch (err) {
    if (err.response?.status === 404) {
      return res.status(404).json({ error: 'City not found' });
    }
    res.status(500).json({ error: 'Failed to fetch forecast' });
  }
});

router.get('/forecast/places', async (_req, res) => {
  try {
    const { data } = await axios.get('https://api.meteo.lt/v1/places');
    const cities = data.map(({ code, name }) => ({ code, name }));
    res.json(cities);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch places' });
  }
});

router.get('/forecast/hourly', async (req, res) => {
  const city = req.query.city;
  if (!city) return res.status(400).json({ error: 'City is required' });

  try {
    const { data } = await axios.get(`https://api.meteo.lt/v1/places/${city}/forecasts/long-term`);
    const filtered = data.forecastTimestamps.filter(item => {
      const hour = new Date(item.forecastTimeUtc).getHours();
      return hour % 3 === 0;
    });
    res.json(filtered);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch hourly forecast' });
  }
});

export default router;
