import express from 'express';
import cookieParser from 'cookie-parser';

const router = express.Router();
router.use(cookieParser());

const favorites_cookie_name = 'weather_favorites';
const max_favorites = 10;
const cookie_options = {
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict'
};

const getFavoritesFromCookie = (req) => {
  try {
    const cookieData = req.cookies[favorites_cookie_name];
    return cookieData ? JSON.parse(cookieData) : [];
  } catch {
    return [];
  }
};

const setFavoritesCookie = (res, favorites) => {
  res.cookie(favorites_cookie_name, JSON.stringify(favorites), cookie_options);
};

router.get('/favorites', (req, res) => {
  const favorites = getFavoritesFromCookie(req);
  res.json(favorites);
});

router.post('/favorites', (req, res) => {
  const { city, country } = req.body;

  if (!city || !country) {
    return res.status(400).json({ 
      error: 'Both city and country are required',
      example: { city: 'Vilnius', country: 'Lithuania' }
    });
  }

  const favorites = getFavoritesFromCookie(req);
  const exists = favorites.some(fav => 
    fav.city.toLowerCase() === city.toLowerCase() && 
    fav.country.toLowerCase() === country.toLowerCase()
  );

  if (exists) {
    return res.status(409).json({ 
      error: 'City already in favorites',
      favorites
    });
  }

  if (favorites.length >= max_favorites) {
    return res.status(403).json({ 
      error: `Maximum ${max_favorites} favorites allowed`,
      favorites
    });
  }

  const newFavorites = [...favorites, { city, country }];
  setFavoritesCookie(res, newFavorites);

  res.status(201).json({ 
    message: 'City added to favorites',
    favorites: newFavorites
  });
});

router.delete('/favorites', (req, res) => {
  const { city, country } = req.body;

  if (!city || !country) {
    return res.status(400).json({ 
      error: 'Both city and country are required',
      example: { city: 'Vilnius', country: 'Lithuania' }
    });
  }

  const favorites = getFavoritesFromCookie(req);
  const newFavorites = favorites.filter(fav => 
    !(fav.city.toLowerCase() === city.toLowerCase() && 
      fav.country.toLowerCase() === country.toLowerCase())
  );

  if (newFavorites.length === favorites.length) {
    return res.status(404).json({ 
      error: 'City not found in favorites',
      favorites
    });
  }

  setFavoritesCookie(res, newFavorites);
  res.json({ 
    message: 'City removed from favorites',
    favorites: newFavorites
  });
});

router.delete('/favorites/all', (req, res) => {
  res.clearCookie(favorites_cookie_name);
  res.json({ 
    message: 'All favorites cleared',
    favorites: []
  });
});

export default router;
