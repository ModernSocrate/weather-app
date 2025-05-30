import { icons } from './icons.js';

const weather = document.querySelector(".weather");
const searchBtn = document.querySelector('button[role="search"]');
const cityField = document.querySelector('input[type="search"]');
const forecastRow = document.querySelector(".forecast > .row");
const dateElement = document.querySelector(".header-date");
const favoritesList = document.querySelector(".favorites-list");

let favoriteButton = null;

let currentCity = null;
let activeHourlyIndex = null;


const API_BASE_URL = 'http://localhost:3000/api';


async function fetchData(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      ...options
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Request failed');
    }

    return await response.json();
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
}


async function getFavorites() {
  try {
    return await fetchData('/favorites');
  } catch (error) {
    console.error('Failed to load favorites:', error);
    return [];
  }
}

async function addFavorite(city, country) {
  try {
    await fetchData('/favorites', {
      method: 'POST',
      body: JSON.stringify({ city, country })
    });
    return true;
  } catch (error) {
    console.error('Failed to add favorite:', error);
    alert(error.message);
    return false;
  }
}

async function removeFavorite(city, country) {
  try {
    await fetchData('/favorites', {
      method: 'DELETE',
      body: JSON.stringify({ city, country })
    });
    return true;
  } catch (error) {
    console.error('Failed to remove favorite:', error);
    alert(error.message);
    return false;
  }
}

function printTodayDate() {
  const today = new Date();
  const options = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  dateElement.textContent = today.toLocaleString("lt", options);
}

function getWeekDay(date) {
  const options = { weekday: "long" };
  return date.toLocaleString("lt", options);
}

function removeChildren(parent) {
  while (parent.firstChild) {
    parent.removeChild(parent.firstChild);
  }
}

function renderForecast(forecast) {
  removeChildren(forecastRow);

  // Get today's date at midnight for comparison
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  forecast.forEach((dayData, index) => {
    const forecastDate = new Date(dayData.forecastTimeUtc);
    const day = getWeekDay(forecastDate);
    const iconClass = icons[dayData.conditionCode] || 'wi-na';

    // Skip if this is today's forecast
    if (forecastDate <= today) {
      return;
    }

    const markup = `
      <div class="forecast-day" data-index="${index}">
        <div class="day-summary">
          <h3 class="forecast-date">${day}</h3>
          <i class='wi ${iconClass} forecast-icon'></i>
          <p class="forecast-temp">${Math.round(dayData.airTemperature)}°C</p>
        </div>
      </div>
    `;

    forecastRow.insertAdjacentHTML('beforeend', markup);

    const dayElement = document.querySelector(`.forecast-day[data-index="${index}"]`);
    dayElement.addEventListener('click', async () => {
      if (activeHourlyIndex === index) {
        removeHourlyCards();
        removeActiveClass(index);
        activeHourlyIndex = null;
        return;
      }

      removeHourlyCards();
      removeActiveClass(activeHourlyIndex);
      activeHourlyIndex = index;
      dayElement.classList.add("active-day");

      const dayName = getWeekDay(new Date(dayData.forecastTimeUtc));
      await renderHourlyCards(index, dayName);
    });
  });
}

function removeHourlyCards() {
  document.querySelectorAll(".hourly-card-list").forEach(el => el.remove());
}

function removeActiveClass(index) {
  const prev = document.querySelector(`.forecast-day[data-index="${index}"]`);
  if (prev) prev.classList.remove("active-day");
}

async function renderHourlyCards(index, dayName) {
  const allForecast = window.fullForecast || [];
  const matchingDay = allForecast.filter(item => {
    const date = new Date(item.forecastTimeUtc);
    return getWeekDay(date) === dayName;
  });

  const filteredHours = matchingDay.filter(item => {
    const hour = new Date(item.forecastTimeUtc).getHours();
    return hour % 3 === 0;
  });

  if (!filteredHours.length) return;

  const wrapper = document.createElement("div");
  wrapper.classList.add("hourly-card-list", "row");
  wrapper.dataset.index = index;

  const markup = filteredHours.map(hour => {
    const time = new Date(hour.forecastTimeUtc);
    const hourString = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const iconClass = icons[hour.conditionCode] || 'wi-na';

    return `
      <div class="forecast-day hourly-card">
        <div class="day-summary">
          <h4 class="forecast-date">${hourString}</h4>
          <i class="wi ${iconClass} forecast-icon"></i>
          <p class="forecast-temp">${Math.round(hour.airTemperature)}°C</p>
          <p class="forecast-desc">${hour.windSpeed} m/s</p>
        </div>
      </div>
    `;
  }).join('');

  wrapper.innerHTML = markup;
  forecastRow.insertAdjacentElement("afterend", wrapper);
}

async function renderFavorites() {
  removeChildren(favoritesList);
  
  try {
    const favorites = await getFavorites();
    
    if (favorites.length === 0) {
      favoritesList.innerHTML = `
        <div class="empty-favorites">
          <p>Mėgstamiausių miestų dar nėra</p>
        </div>
      `;
      return;
    }
    
    favorites.forEach((fav, index) => {
      const favElement = document.createElement("div");
      favElement.className = "favorite-item";
      favElement.innerHTML = `
        <div class="favorite-city" data-city="${fav.city}" data-country="${fav.country}">
          <span>${fav.city}, ${fav.country}</span>
          <button class="btn-remove" data-index="${index}" title="Pašalinti iš mėgstamiausių">
          </button>
        </div>
      `;
      
      favoritesList.appendChild(favElement);
      
      favElement.querySelector(".favorite-city").addEventListener("click", () => {
        getCityWeather(fav.city);
      });
      
      favElement.querySelector(".btn-remove").addEventListener("click", async (e) => {
        e.stopPropagation();
        const success = await removeFavorite(fav.city, fav.country);
        if (success) {
          await renderFavorites();
          if (currentCity && currentCity.place.name === fav.city && currentCity.place.country === fav.country) {
            updateFavoriteButton(false);
          }
        }
      });
    });
  } catch (error) {
    console.error('Error rendering favorites:', error);
  }
}

function createFavoriteButton() {
  if (favoriteButton) {
    favoriteButton.remove();
  }
  
  favoriteButton = document.createElement("button");
  favoriteButton.className = "btn-favorite";
  favoriteButton.innerHTML = `
    Pridėti prie mėgstamiausių
  `;
  
  favoriteButton.addEventListener("click", async () => {
    if (!currentCity) return;
    
    const city = currentCity.place.name;
    const country = currentCity.place.country;
    
    try {
      const favorites = await getFavorites();
      const isAlreadyFavorite = favorites.some(
        fav => fav.city === city && fav.country === country
      );
      
      if (isAlreadyFavorite) {
        const success = await removeFavorite(city, country);
        if (success) {
          updateFavoriteButton(false);
          await renderFavorites();
        }
      } else {
        const success = await addFavorite(city, country);
        if (success) {
          updateFavoriteButton(true);
          await renderFavorites();
        }
      }
    } catch (error) {
      console.error('Error updating favorites:', error);
    }
  });
  
  return favoriteButton;
}

function updateFavoriteButton(isFavorite) {
  if (!favoriteButton) return;
  
  if (isFavorite) {
    favoriteButton.innerHTML = `
      Pašalinti iš mėgstamiausių
    `;
    favoriteButton.classList.add("is-favorite");
  } else {
    favoriteButton.innerHTML = `
      Pridėti prie mėgstamiausių
    `;
    favoriteButton.classList.remove("is-favorite");
  }
}

async function getCityWeather(city) {
  try {
    const data = await fetchData(`/forecast?city=${encodeURIComponent(city)}`);
    const current = data.forecastTimestamps[0];
    const iconClass = icons[current.conditionCode] || "wi-na";

    const markup = `
      <div class="weather-header">
        <h1 class="location">${data.place.name}, ${data.place.country}</h1>
      </div>
      <div class="weather-summary">
        <p><i class="wi ${iconClass} weather-icon"></i> <span class="weather-celsius-value">${Math.round(current.airTemperature)}°C</span></p>
        <ul class="weather-miscellaneous">
          <li><i class="wi wi-humidity"></i> Santykinis oro drėgnis: <span>${current.relativeHumidity}%</span></li>
          <li><i class="wi wi-small-craft-advisory"></i> Vėjo greitis: <span>${current.windSpeed} m/s</span></li>
        </ul>
      </div>
    `;

    removeChildren(weather);
    weather.insertAdjacentHTML("beforeend", markup);
    
    const weatherHeader = document.querySelector(".weather-header");
    const favButton = createFavoriteButton();
    weatherHeader.appendChild(favButton);
    
    currentCity = data;
    
    try {
      const favorites = await getFavorites();
      const isFavorite = favorites.some(
        fav => fav.city === data.place.name && fav.country === data.place.country
      );
      updateFavoriteButton(isFavorite);
    } catch (error) {
      console.error('Error checking favorites:', error);
    }

    const dailyForecasts = data.forecastTimestamps
      .filter((item) => item.forecastTimeUtc.endsWith("12:00:00"))
      .slice(0, 5);

    renderForecast(dailyForecasts);
    window.fullForecast = data.forecastTimestamps;
    //activeHourlyIndex = null;
    document.querySelector('.main-content').scrollTo(0, 0);
  } catch (error) {
    console.error("Error fetching weather:", error);
    alert(error.message || "Failed to fetch weather data");
  }
}

printTodayDate();
renderFavorites();

searchBtn.addEventListener("click", (e) => {
  e.preventDefault();
  const city = cityField.value.trim();
  if (city) {
    getCityWeather(city);
  }
});

cityField.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    searchBtn.click();
  }
});