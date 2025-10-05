// nasa-api.js
class NASA_API {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseURL = 'https://api.nasa.gov/planetary/apod';
        this.marsRoverURL = 'https://api.nasa.gov/mars-photos/api/v1';
        this.asteroidsURL = 'https://api.nasa.gov/neo/rest/v1';
        this.donkiURL = 'https://api.nasa.gov/DONKI';
        this.earthURL = 'https://api.nasa.gov/planetary/earth';
        this.techportURL = 'https://api.nasa.gov/techport';
        this.patentsURL = 'https://api.nasa.gov/patents';
        this.smdcURL = 'https://api.nasa.gov/smdc';
        
        // Cache for API responses
        this.cache = new Map();
        
        // Default cache expiration time in milliseconds (1 hour)
        this.defaultCacheExpiration = 3600000;
        
        // Predefined NASA APOD dates for celestial bodies
        this.planetAPODDates = {
            sun: '2023-05-01',
            mercury: '2023-05-08',
            venus: '2022-06-03',
            earth: '2022-04-22',
            mars: '2022-07-06',
            jupiter: '2022-09-25',
            saturn: '2022-08-15',
            uranus: '2022-10-04',
            neptune: '2022-09-14'
        };
        
        // Fallback images using NASA's image library
        this.fallbackImages = {
            sun: 'https://images-assets.nasa.gov/image/PIA12348/PIA12348~orig.jpg',
            mercury: 'https://images-assets.nasa.gov/image/PIA19254/PIA19254~orig.jpg',
            venus: 'https://images-assets.nasa.gov/image/PIA00271/PIA00271~orig.jpg',
            earth: 'https://images-assets.nasa.gov/image/PIA00133/PIA00133~orig.jpg',
            mars: 'https://images-assets.nasa.gov/image/PIA04253/PIA04253~orig.jpg',
            jupiter: 'https://images-assets.nasa.gov/image/PIA02863/PIA02863~orig.jpg',
            saturn: 'https://images-assets.nasa.gov/image/PIA03550/PIA03550~orig.jpg',
            uranus: 'https://images-assets.nasa.gov/image/PIA01279/PIA01279~orig.jpg',
            neptune: 'https://images-assets.nasa.gov/image/PIA01492/PIA01492~orig.jpg',
            meteorite: 'https://images-assets.nasa.gov/image/PIA02194/PIA02194~orig.jpg',
            star: 'https://images-assets.nasa.gov/image/PIA04206/PIA04206~orig.jpg'
        };
    }

    // Generic method to make API requests with caching and retry logic
    async makeRequest(url, cacheKey = null, cacheExpiration = this.defaultCacheExpiration, retries = 3) {
        // Check cache first
        if (cacheKey && this.cache.has(cacheKey)) {
            const cachedData = this.cache.get(cacheKey);
            if (Date.now() - cachedData.timestamp < cacheExpiration) {
                return cachedData.data;
            }
        }
        
        let lastError;
        
        for (let i = 0; i < retries; i++) {
            try {
                const response = await fetch(url);
                
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                
                const data = await response.json();
                
                // Cache the response
                if (cacheKey) {
                    this.cache.set(cacheKey, {
                        data,
                        timestamp: Date.now()
                    });
                }
                
                return data;
            } catch (error) {
                lastError = error;
                console.error(`Request attempt ${i + 1} failed:`, error);
                
                // Wait before retrying (exponential backoff)
                if (i < retries - 1) {
                    await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
                }
            }
        }
        
        throw lastError;
    }

    // Get Astronomy Picture of the Day
    async getAstronomyPictureOfTheDay(date = null) {
        try {
            let url = `${this.baseURL}?api_key=${this.apiKey}`;
            if (date) {
                url += `&date=${date}`;
            }
            
            const cacheKey = `apod_${date || 'today'}`;
            const result = await this.makeRequest(url, cacheKey);
            
            // Ensure the result has the expected structure
            if (result && result.url) {
                return {
                    url: result.url,
                    title: result.title || 'Astronomy Picture of the Day',
                    date: result.date || new Date().toISOString().split('T')[0]
                };
            }
            
            // Fallback to a default image
            return {
                url: this.fallbackImages.sun,
                title: 'The Sun',
                date: new Date().toISOString().split('T')[0]
            };
        } catch (error) {
            console.error("Error fetching APOD:", error);
            // Return fallback data
            return {
                url: this.fallbackImages.sun,
                title: 'The Sun',
                date: new Date().toISOString().split('T')[0]
            };
        }
    }

    // Get Mars Rover Photos
    async getMarsRoverPhotos(rover = 'curiosity', sol = 1000, camera = 'fhaz') {
        try {
            const url = `${this.marsRoverURL}/rovers/${rover}/photos?sol=${sol}&camera=${camera}&api_key=${this.apiKey}`;
            const cacheKey = `mars_${rover}_${sol}_${camera}`;
            
            const data = await this.makeRequest(url, cacheKey);
            return data.photos;
        } catch (error) {
            console.error("Error fetching Mars Rover photos:", error);
            return null;
        }
    }

    // Get Near Earth Objects
    async getNearEarthObjects(startDate = null, endDate = null) {
        try {
            let url = `${this.asteroidsURL}/feed?api_key=${this.apiKey}`;
            
            if (startDate) {
                url += `&start_date=${startDate}`;
            }
            
            if (endDate) {
                url += `&end_date=${endDate}`;
            }
            
            const cacheKey = `neo_${startDate || 'today'}_${endDate || 'today'}`;
            const data = await this.makeRequest(url, cacheKey);
            return data.near_earth_objects;
        } catch (error) {
            console.error("Error fetching Near Earth Objects:", error);
            return null;
        }
    }

    // Get Planet Information using APOD with specific dates
    async getPlanetImage(planetName) {
        try {
            const planetKey = planetName.toLowerCase();
            
            // Get the specific date for this planet
            const date = this.planetAPODDates[planetKey];
            
            if (date) {
                const url = `${this.baseURL}?date=${date}&api_key=${this.apiKey}`;
                const cacheKey = `planet_${planetName}`;
                
                const result = await this.makeRequest(url, cacheKey);
                
                // Ensure the result has the expected structure
                if (result && result.url) {
                    return {
                        url: result.url,
                        title: result.title || planetName,
                        date: result.date || date
                    };
                }
            }
            
            // Fallback to predefined NASA image
            if (this.fallbackImages[planetKey]) {
                return {
                    url: this.fallbackImages[planetKey],
                    title: planetName,
                    date: new Date().toISOString().split('T')[0]
                };
            }
            
            // Final fallback
            return {
                url: this.fallbackImages.sun,
                title: planetName,
                date: new Date().toISOString().split('T')[0]
            };
        } catch (error) {
            console.error(`Error fetching ${planetName} image:`, error);
            // Return fallback data
            return {
                url: this.fallbackImages[planetName.toLowerCase()] || this.fallbackImages.sun,
                title: planetName,
                date: new Date().toISOString().split('T')[0]
            };
        }
    }

    // Get Solar System Data from NASA's DONKI API (Space Weather)
    async getSpaceWeatherData() {
        try {
            const url = `${this.donkiURL}/notifications?api_key=${this.apiKey}`;
            const cacheKey = 'space_weather';
            
            // Cache for shorter time since this data changes frequently
            return await this.makeRequest(url, cacheKey, 1800000); // 30 minutes
        } catch (error) {
            console.error("Error fetching space weather data:", error);
            return null;
        }
    }

    // Get Earth Imagery
    async getEarthImagery(date = null, enhance = true) {
        try {
            let url = `${this.earthURL}/imagery?api_key=${this.apiKey}`;
            
            if (date) {
                url += `&date=${date}`;
            }
            
            if (enhance) {
                url += `&enhance=${enhance}`;
            }
            
            const cacheKey = `earth_${date || 'latest'}`;
            return await this.makeRequest(url, cacheKey);
        } catch (error) {
            console.error("Error fetching Earth imagery:", error);
            return null;
        }
    }

    // Get Enhanced Planet Data (combining multiple sources)
    async getEnhancedPlanetData(planetName) {
        try {
            // Get basic planet image
            const imageData = await this.getPlanetImage(planetName);
            
            // Get additional data based on planet
            let additionalData = {};
            
            if (planetName.toLowerCase() === 'mars') {
                // Get Mars rover photos
                const marsPhotos = await this.getMarsRoverPhotos();
                additionalData.marsPhotos = marsPhotos ? marsPhotos.slice(0, 3) : [];
            } else if (planetName.toLowerCase() === 'earth') {
                // Get Earth imagery
                const earthImagery = await this.getEarthImagery();
                additionalData.earthImagery = earthImagery;
            }
            
            return {
                imageData,
                additionalData
            };
        } catch (error) {
            console.error(`Error fetching enhanced data for ${planetName}:`, error);
            return null;
        }
    }

    // Get Solar System Events from DONKI
    async getSolarSystemEvents() {
        try {
            const url = `${this.donkiURL}/events?api_key=${this.apiKey}`;
            const cacheKey = 'solar_events';
            
            return await this.makeRequest(url, cacheKey);
        } catch (error) {
            console.error("Error fetching solar system events:", error);
            return null;
        }
    }

    // Get multiple APOD images for a date range
    async getAPODRange(startDate, endDate) {
        try {
            const start = new Date(startDate);
            const end = new Date(endDate);
            const results = [];
            
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const dateStr = d.toISOString().split('T')[0];
                const apod = await this.getAstronomyPictureOfTheDay(dateStr);
                if (apod) {
                    results.push(apod);
                }
            }
            
            return results;
        } catch (error) {
            console.error("Error fetching APOD range:", error);
            return null;
        }
    }

    // Get Meteorite Data (using NASA's Open Data Portal)
    async getMeteoriteData() {
        try {
            // Using NASA's Open Data API for meteorite data
            const url = 'https://data.nasa.gov/resource/gh4g-9sfh.json';
            const cacheKey = 'meteorites';
            
            const data = await this.makeRequest(url, cacheKey, 86400000); // Cache for 24 hours
            
            // Process and format the data
            return data.map(meteorite => ({
                name: meteorite.name,
                type: meteorite.recclass || 'Unknown',
                location: meteorite.geolocation || 'Unknown',
                date: meteorite.year || 'Unknown',
                size: meteorite.mass ? `${(meteorite.mass / 1000).toFixed(2)} kg` : 'Unknown',
                description: `A ${meteorite.recclass || 'unknown'} type meteorite that fell in ${meteorite.geolocation || 'an unknown location'}.`,
                composition: meteorite.recclass ? `Classification: ${meteorite.recclass}` : 'Unknown composition',
                impact: meteorite.fall ? `Fall type: ${meteorite.fall}` : 'Unknown impact details'
            })).slice(0, 10); // Limit to 10 meteorites
        } catch (error) {
            console.error("Error fetching meteorite data:", error);
            return null;
        }
    }

    // Get Meteorite Image
    async getMeteoriteImage(meteoriteName) {
        try {
            // Use APOD with space-related dates for meteorite images
            const spaceDates = [
                '2023-02-15', // Chelyabinsk anniversary
                '2023-11-18', // Leonids meteor shower
                '2023-08-12', // Perseids meteor shower
                '2023-01-04', // Quadrantids meteor shower
                '2023-10-21', // Orionids meteor shower
                '2023-05-06'  // Eta Aquarids meteor shower
            ];
            
            // Select a date based on the meteorite name hash
            const hash = meteoriteName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            const date = spaceDates[hash % spaceDates.length];
            
            const url = `${this.baseURL}?date=${date}&api_key=${this.apiKey}`;
            const cacheKey = `meteorite_${meteoriteName}`;
            
            const result = await this.makeRequest(url, cacheKey);
            
            // Ensure the result has the expected structure
            if (result && result.url) {
                return {
                    url: result.url,
                    title: result.title || meteoriteName,
                    date: result.date || date
                };
            }
            
            // Fallback to meteorite image
            return {
                url: this.fallbackImages.meteorite,
                title: meteoriteName,
                date: new Date().toISOString().split('T')[0]
            };
        } catch (error) {
            console.error(`Error fetching ${meteoriteName} image:`, error);
            // Return fallback data
            return {
                url: this.fallbackImages.meteorite,
                title: meteoriteName,
                date: new Date().toISOString().split('T')[0]
            };
        }
    }

    // Get Star Data (using external astronomy API)
    async getStarData() {
        try {
            // Using a combination of NASA data and external star catalog
            const url = 'https://api.le-systeme-solaire.net/rest/bodies?filter[]=isPlanet,false&filter[]=bodyType,Star';
            const cacheKey = 'stars';
            
            const data = await this.makeRequest(url, cacheKey, 86400000); // Cache for 24 hours
            
            // Process and format the data
            return data.bodies.map(star => ({
                name: star.englishName,
                type: star.bodyType,
                distance: star.distanceFromSun ? `${star.distanceFromSun.value} ${star.distanceFromSun.unit}` : 'Unknown',
                magnitude: star.magnitude || 'Unknown',
                description: `A ${star.bodyType} in our cosmic neighborhood.`,
                properties: {
                    mass: star.mass ? `${star.mass.value} ${star.mass.unit}` : 'Unknown',
                    radius: star.meanRadius ? `${star.meanRadius.value} ${star.meanRadius.unit}` : 'Unknown',
                    temperature: star.avgTemp ? `${star.avgTemp} K` : 'Unknown',
                    luminosity: star.luminosity ? `${star.luminosity} solar luminosities` : 'Unknown',
                    age: star.age || 'Unknown',
                    planets: star.moons ? `${star.moons.length} known planets` : 'No confirmed planets'
                },
                specialFeature: star.discoveryDate ? `Discovered in ${star.discoveryDate}` : 'Ancient star'
            })).slice(0, 6); // Limit to 6 stars
        } catch (error) {
            console.error("Error fetching star data:", error);
            return null;
        }
    }

    // Get Star Image
    async getStarImage(starName) {
        try {
            // Use APOD with star-related dates
            const starDates = [
                '2023-06-21', // Summer solstice
                '2023-12-21', // Winter solstice
                '2023-03-20', // Spring equinox
                '2023-09-23', // Autumn equinox
                '2023-08-31', // Full moon
                '2023-01-01'  // New year
            ];
            
            // Select a date based on the star name hash
            const hash = starName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            const date = starDates[hash % starDates.length];
            
            const url = `${this.baseURL}?date=${date}&api_key=${this.apiKey}`;
            const cacheKey = `star_${starName}`;
            
            const result = await this.makeRequest(url, cacheKey);
            
            // Ensure the result has the expected structure
            if (result && result.url) {
                return {
                    url: result.url,
                    title: result.title || starName,
                    date: result.date || date
                };
            }
            
            // Fallback to star image
            return {
                url: this.fallbackImages.star,
                title: starName,
                date: new Date().toISOString().split('T')[0]
            };
        } catch (error) {
            console.error(`Error fetching ${starName} image:`, error);
            // Return fallback data
            return {
                url: this.fallbackImages.star,
                title: starName,
                date: new Date().toISOString().split('T')[0]
            };
        }
    }

    // Get Comet Data
    async getCometData() {
        try {
            const url = 'https://api.le-systeme-solaire.net/rest/bodies?filter[]=bodyType,Comet';
            const cacheKey = 'comets';
            
            const data = await this.makeRequest(url, cacheKey, 86400000); // Cache for 24 hours
            
            return data.bodies.map(comet => ({
                name: comet.englishName,
                type: comet.bodyType,
                orbitalPeriod: comet.sideralOrbit ? `${comet.sideralOrbit} days` : 'Unknown',
                perihelion: comet.perihelion ? `${comet.perihelion} AU` : 'Unknown',
                description: `A comet with an orbital period of ${comet.sideralOrbit || 'unknown'} days.`,
                properties: {
                    mass: comet.mass ? `${comet.mass.value} ${comet.mass.unit}` : 'Unknown',
                    radius: comet.meanRadius ? `${comet.meanRadius.value} ${comet.meanRadius.unit}` : 'Unknown',
                    temperature: comet.avgTemp ? `${comet.avgTemp} K` : 'Unknown',
                    eccentricity: comet.eccentricity || 'Unknown',
                    inclination: comet.inclination ? `${comet.inclination}°` : 'Unknown'
                }
            })).slice(0, 5); // Limit to 5 comets
        } catch (error) {
            console.error("Error fetching comet data:", error);
            return null;
        }
    }

    // Get Asteroid Data
    async getAsteroidData() {
        try {
            const url = 'https://api.le-systeme-solaire.net/rest/bodies?filter[]=bodyType,Asteroid';
            const cacheKey = 'asteroids';
            
            const data = await this.makeRequest(url, cacheKey, 86400000); // Cache for 24 hours
            
            return data.bodies.map(asteroid => ({
                name: asteroid.englishName,
                type: asteroid.bodyType,
                orbitalPeriod: asteroid.sideralOrbit ? `${asteroid.sideralOrbit} days` : 'Unknown',
                perihelion: asteroid.perihelion ? `${asteroid.perihelion} AU` : 'Unknown',
                description: `An asteroid with an orbital period of ${asteroid.sideralOrbit || 'unknown'} days.`,
                properties: {
                    mass: asteroid.mass ? `${asteroid.mass.value} ${asteroid.mass.unit}` : 'Unknown',
                    radius: asteroid.meanRadius ? `${asteroid.meanRadius.value} ${asteroid.meanRadius.unit}` : 'Unknown',
                    temperature: asteroid.avgTemp ? `${asteroid.avgTemp} K` : 'Unknown',
                    eccentricity: asteroid.eccentricity || 'Unknown',
                    inclination: asteroid.inclination ? `${asteroid.inclination}°` : 'Unknown'
                }
            })).slice(0, 5); // Limit to 5 asteroids
        } catch (error) {
            console.error("Error fetching asteroid data:", error);
            return null;
        }
    }

    // Get Solar Flare Data
    async getSolarFlareData() {
        try {
            const url = `${this.donkiURL}/FLR?startDate=2023-01-01&endDate=2023-12-31&api_key=${this.apiKey}`;
            const cacheKey = 'solar_flares';
            
            return await this.makeRequest(url, cacheKey, 3600000); // Cache for 1 hour
        } catch (error) {
            console.error("Error fetching solar flare data:", error);
            return null;
        }
    }

    // Get Coronal Mass Ejection Data
    async getCoronalMassEjectionData() {
        try {
            const url = `${this.donkiURL}/CME?startDate=2023-01-01&endDate=2023-12-31&api_key=${this.apiKey}`;
            const cacheKey = 'cme';
            
            return await this.makeRequest(url, cacheKey, 3600000); // Cache for 1 hour
        } catch (error) {
            console.error("Error fetching CME data:", error);
            return null;
        }
    }

    // Get Geomagnetic Storm Data
    async getGeomagneticStormData() {
        try {
            const url = `${this.donkiURL}/GST?startDate=2023-01-01&endDate=2023-12-31&api_key=${this.apiKey}`;
            const cacheKey = 'geomagnetic_storms';
            
            return await this.makeRequest(url, cacheKey, 3600000); // Cache for 1 hour
        } catch (error) {
            console.error("Error fetching geomagnetic storm data:", error);
            return null;
        }
    }

    // Clear cache
    clearCache() {
        this.cache.clear();
    }

    // Get cache size
    getCacheSize() {
        return this.cache.size;
    }
}

// Initialize the NASA API with your API key
const nasaAPI = new NASA_API('FigD8Ee4x1pQ4WCsNrwpKMCMl3hYlMBwvlTip8Xy');

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NASA_API;
}