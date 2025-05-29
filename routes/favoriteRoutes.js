// favoritesRoutes.js
import express from 'express';
import cookieParser from 'cookie-parser';

const router = express.Router();
router.use(cookieParser());

// Constants
const FAVORITES_COOKIE_NAME = 'weather_favorites';
const MAX_FAVORITES = 10;
const COOKIE_OPTIONS = {
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict'
};

// Helper functions
const getFavoritesFromCookie = (req) => {
  try {
    const cookieData = req.cookies[FAVORITES_COOKIE_NAME];
    return cookieData ? JSON.parse(cookieData) : [];
  } catch {
    return [];
  }
};

const setFavoritesCookie = (res, favorites) => {
  res.cookie(FAVORITES_COOKIE_NAME, JSON.stringify(favorites), COOKIE_OPTIONS);
};

// Favorites Endpoints
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

  if (favorites.length >= MAX_FAVORITES) {
    return res.status(403).json({ 
      error: `Maximum ${MAX_FAVORITES} favorites allowed`,
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
  res.clearCookie(FAVORITES_COOKIE_NAME);
  res.json({ 
    message: 'All favorites cleared',
    favorites: []
  });
});

export default router;
