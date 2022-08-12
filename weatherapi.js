const apikey = "9b844f9ec461fb26f16bb808550c5aca";

async function fetch_json(url) {
    const response = await fetch(url)
    return await response.json()
}

function geolocate() {
    return new Promise((resolve, reject) => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true
            });
        } else {
            console.debug("no geolocation available")
            reject("no geolocation available")
        }
    })
}

async function get_weather_at_current_pos() {
    const position = await geolocate();
    return await get_weather_from_latlong(position.coords.latitude, position.coords.longitude);
}

function f_to_c(f) {
    return (f - 32) * (5 / 9);
}

function c_to_f(c) {
    return (c * (9 / 5)) + 32
}

function get_weather_from_latlong(lat, long) {
    // TODO: replace with openweathermap by March 31st, 2023
    const url1 = `https://api.darksky.net/forecast/${encodeURIComponent(apikey)}/${encodeURIComponent(lat)},${encodeURIComponent(long)}?units=us`;
    const url2 = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(long)}`;
    return Promise.all([fetch_json(url1), fetch_json(url2)])
}

