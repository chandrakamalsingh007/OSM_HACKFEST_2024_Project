var map;
var marker;
var circle;
var allSites = []; // Store all the sites in this array

// Function to calculate the distance between two lat-lng points in km
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
}

// Initialize map
function initializeMap(lat, lng) {
    map = L.map('map').setView([lat, lng], 15);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    // Create a custom marker for the user's location with a red color
    var userLocationIcon = L.divIcon({
        className: 'user-location-marker',
        html: '<div style="background-color: red; border-radius: 50%; width: 20px; height: 20px;"></div>',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    });

    // Add user's location marker with the custom red icon
    marker = L.marker([lat, lng], {icon: userLocationIcon}).addTo(map);

    // Add circle around the user's location (20 km radius)
    circle = L.circle([lat, lng], {
        radius: 20000, // 20 km
        color: 'blue',
        fillColor: 'blue',
        fillOpacity: 0.1
    }).addTo(map);
}

// Fetch tourist and historic sites using Overpass API
function fetchSites(lat, lng) {
    var overpassUrl = `https://overpass-api.de/api/interpreter?data=[out:json];node["tourism"="attraction"](around:20000,${lat},${lng});node["historic"](around:20000,${lat},${lng});out;`;

    fetch(overpassUrl)
        .then(response => response.json())
        .then(data => {
            allSites = []; // Reset the sites list before adding new data
            const siteRequests = data.elements.map(element => {
                var siteLat = element.lat;
                var siteLon = element.lon;
                var title = element.tags.name || ''; // Use an empty string if no name is available

                // Skip unnamed sites
                if (!title) return null;

                return fetchGeminiDescription(siteLat, siteLon).then(description => {
                    // Check if the site is within the 20 km radius
                    var distance = getDistance(lat, lng, siteLat, siteLon);
                    if (distance <= 20) {
                        allSites.push({
                            title: title,
                            lat: siteLat,
                            lon: siteLon,
                            description: description || 'No description available'
                        });

                        // Create a green marker for each tourist/historic site
                        var siteMarker = L.marker([siteLat, siteLon]).addTo(map)
                            .bindPopup(`<b>${title}</b>`); // Show name in the popup
                    }
                });
            });

            // Wait for all description fetches to complete
            Promise.all(siteRequests).then(() => {
                displaySiteDetails(allSites); // Display sites in the section below the map
            });
        })
        .catch(err => console.log('Error fetching OSM data: ', err));
}

// Function to fetch description from Gemini API
function fetchGeminiDescription(lat, lon) {
    // Mock API endpoint for Gemini (replace with your actual API URL)
    const geminiApiUrl = `https://mock-api.com/heritage_sites?lat=${lat}&lon=${lon}`;

    return fetch(geminiApiUrl)
        .then(response => response.json())
        .then(data => {
            if (data && data.description) {
                return data.description; // Assuming the API returns a description field
            }
            return null; // Return null if no description is found
        })
        .catch(err => {
            console.log('Error fetching Gemini description: ', err);
            return null; // Return null in case of an error
        });
}

// Display sites in cards below the map
function displaySiteDetails(sites) {
    const siteList = document.getElementById('siteList');
    siteList.innerHTML = ''; // Clear previous site list

    sites.forEach(site => {
        var card = document.createElement('div');
        card.classList.add('site-card');
        card.innerHTML = `
            <h3>${site.title}</h3>
            <p><strong>Description:</strong> ${site.description}</p>
            <p><strong>Location:</strong> Latitude: ${site.lat}, Longitude: ${site.lon}</p>
        `;
        siteList.appendChild(card);
    });
}

// Initialize the map with user's location
navigator.geolocation.getCurrentPosition(position => {
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    initializeMap(lat, lng);
    fetchSites(lat, lng); // Fetch nearby sites based on user's location
});

// Search functionality for heritage sites
function searchPlacesOrSites() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    const filteredSites = allSites.filter(site => site.title.toLowerCase().includes(query));

    displaySiteDetails(filteredSites); // Display filtered results
}
