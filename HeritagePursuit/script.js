var map, marker, circle;
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

            var userLocationIcon = L.divIcon({
                className: 'user-location-marker',
                html: '<div style="background-color: red; border-radius: 50%; width: 20px; height: 20px;"></div>',
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            });

            marker = L.marker([lat, lng], {icon: userLocationIcon}).addTo(map);
            circle = L.circle([lat, lng], {
                radius: 20000,
                color: 'blue',
                fillColor: 'blue',
                fillOpacity: 0.1
            }).addTo(map);
        }

        function fetchSites(lat, lng) {
            var overpassUrl = `https://overpass-api.de/api/interpreter?data=[out:json];node["tourism"="attraction"](around:20000,${lat},${lng});node["historic"](around:20000,${lat},${lng});out;`;

            fetch(overpassUrl)
                .then(response => response.json())
                .then(data => {
                    allSites = [];
                    data.elements.forEach(element => {
                        var siteLat = element.lat;
                        var siteLon = element.lon;
                        var title = element.tags.name || '';
                        if (!title) return;

                        allSites.push({
                            title: title,
                            lat: siteLat,
                            lon: siteLon,
                            description: element.tags.description || 'No description available'
                        });

                        L.marker([siteLat, siteLon]).addTo(map)
                            .bindPopup(`<b>${title}</b><br>${element.tags.description || 'No description available'}`);
                    });
                    displaySiteDetails(allSites);
                })
                .catch(err => console.log('Error fetching OSM data: ', err));
        }

        function displaySiteDetails(sites) {
            const siteList = document.getElementById('siteList');
            siteList.innerHTML = '';

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

        function searchPlacesOrSites() {
            var input = document.getElementById('searchInput').value.toLowerCase();

            if (input.length >= 3) {
                fetch(`https://nominatim.openstreetmap.org/search?q=${input}&format=json&addressdetails=1&limit=5`)
                    .then(response => response.json())
                    .then(data => {
                        if (data.length > 0) {
                            var place = data[0];
                            var lat = place.lat;
                            var lon = place.lon;

                            map.setView([lat, lon], 15);
                            fetchSites(lat, lon);
                        }
                    })
                    .catch(err => console.log('Error searching for place: ', err));
            } else {
                var filteredSites = allSites.filter(site => site.title.toLowerCase().includes(input));
                displaySiteDetails(filteredSites);
            }
        }

        navigator.geolocation.watchPosition(success, error);

        function success(pos) {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;

            initializeMap(lat, lng);
            fetchSites(lat, lng);
        }

        function error(err) {
            if (err.code === 1) {
                alert("Please allow geolocation access.");
            } else {
                alert("Can't get current location.");
            }
        }