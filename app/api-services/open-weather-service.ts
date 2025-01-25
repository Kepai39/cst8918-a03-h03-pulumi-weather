import { redis } from '../data-access/redis-connection'

const API_KEY = process.env.WEATHER_API_KEY
const BASE_URL = 'https://api.openweathermap.org/data/2.5/weather'
const TEN_MINUTES = 1000 * 60 * 10 // in milliseconds

interface FetchWeatherDataParams {
  lat: number
  lon: number
  units: 'standard' | 'metric' | 'imperial'
}

export async function fetchWeatherData({
  lat,
  lon,
  units
}: FetchWeatherDataParams) {
  const queryString = `lat=${lat}&lon=${lon}&units=${units}`

  console.log(`Checking cache for key: ${queryString}`)

  const cacheEntry = await redis.get(queryString)
  if (cacheEntry) {
    console.log('Cache hit. Returning cached data.')
    return JSON.parse(cacheEntry)
  }

  console.log('Cache miss. Fetching data from API...')

  try {
    const response = await fetch(`${BASE_URL}?${queryString}&appid=${API_KEY}`)
    console.log(`API Response Status: ${response.status}`)

    if (!response.ok) {
      throw new Error(`API request failed with status: ${response.status} - ${response.statusText}`)
    }

    const data = await response.text()
    console.log('Fetched weather data:', data) // Log the raw response from the API

    await redis.set(queryString, data, { PX: TEN_MINUTES }) // The PX option sets the expiry time
    console.log(`Data cached for key: ${queryString} with expiry of ${TEN_MINUTES} ms`)

    return JSON.parse(data)
  } catch (error) {
    console.error('Error fetching weather data:', error)
    throw new Error('Failed to fetch weather data')
  }
}
