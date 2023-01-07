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

function f_to_c(f) {
    return (f - 32) * (5 / 9);
}

function c_to_f(c) {
    return (c * (9 / 5)) + 32
}


function darksky_api_request(lat, long) {
    return fetch_json(`https://api.darksky.net/forecast/9b844f9ec461fb26f16bb808550c5aca/${encodeURIComponent(lat)},${encodeURIComponent(long)}?units=si`)
}

function openweathermap_api_request(lat, long) {
    return fetch_json(`https://api.openweathermap.org/data/3.0/onecall?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(long)}&appid=74b014b3526434e435b0b553d9f673e1&units=metric`)
}

function openmeteo_api_request(lat, long) {
    return fetch_json(`https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(long)}&hourly=temperature_2m,relativehumidity_2m,apparent_temperature,precipitation,cloudcover&current_weather=true&timeformat=unixtime`)
}

const generic_template = {
    "currently": {
        "summary": "Lorem ipsum",
        "temperature": 0,
        "apparent_temperature": 0,
        "humidity": 0,
        "cloud_cover": 0,
        "precipitation": 0
    },
    "hourly": {
        "summary": "Lorem ipsum",
        "temperature": [{x: 0, y: 0}/*, ...*/],
        "apparent_temperature": [{x: 0, y: 0}/*, ...*/],
        "humidity": [{x: 0, y: 0}/*, ...*/],
        "cloud_cover": [{x: 0, y: 0}/*, ...*/],
        "precipitation": [{x: 0, y: 0}/*, ...*/],
    },
    "daily": {
        "summary": "Lorem ipsum",
        "high": [{x: 0, y: 0}/*, ...*/],
        "apparent_high": [{x: 0, y: 0}/*, ...*/],
        "low": [{x: 0, y: 0}/*, ...*/],
        "apparent_low": [{x: 0, y: 0}/*, ...*/],
        "feels_like": [{x: 0, y: 0}/*, ...*/],
        "humidity": [{x: 0, y: 0}/*, ...*/],
        "cloud_cover": [{x: 0, y: 0}/*, ...*/],
        "precipitation": [{x: 0, y: 0}/*, ...*/],
    },
    "alerts": [
        {
            "severity": "advisory", // advisory, watch, warning
            "url": "https://example.com",
            "title": "Lorem ipsum",
            "expires": 0,
        }//, ...
    ],
    "source": "darksky", // darksky,openweathermap,openmeteo, etc
}

function zip_darksky(data, property, multiply_y_by = null) {
    return data.map(data_point => {
        let y = data_point[property];
        if (multiply_y_by) {
            y *= multiply_y_by
        }
        return {x: data_point["time"] * 1000, y: y}
    })
}

function zip_openweathermap(data, property, multiply_y_by = null) {
    return data.map(data_point => {
        let y = data_point[property] ?? 0;
        if (multiply_y_by) {
            y *= multiply_y_by
        }
        return {x: data_point["dt"] * 1000, y: y}
    })
}

function parse_darksky(data) {
    return {
        "currently": {
            "summary": data["currently"]["summary"],
            "temperature": data["currently"]["temperature"],
            "apparent_temperature": data["currently"]["apparentTemperature"],
            "humidity": data["currently"]["humidity"] * 100,
            "cloud_cover": data["currently"]["cloudCover"] * 100,
            "precipitation_intensity": data["currently"]["precipIntensity"]
        },
        "hourly": {
            "summary": data["hourly"]["summary"],
            "temperature": zip_darksky(data["hourly"]["data"], "temperature"),
            "apparent_temperature": zip_darksky(data["hourly"]["data"], "apparentTemperature"),
            "humidity": zip_darksky(data["hourly"]["data"], "humidity", 100),
            "cloud_cover": zip_darksky(data["hourly"]["data"], "cloudCover", 100),
            "precipitation_probability": zip_darksky(data["hourly"]["data"], "precipProbability", 100),
            "precipitation_intensity": zip_darksky(data["hourly"]["data"], "precipIntensity"),
        },
        "daily": {
            "summary": data["daily"]["summary"],
            "high": zip_darksky(data["daily"]["data"], "temperatureHigh"),
            "apparent_high": zip_darksky(data["daily"]["data"], "apparentTemperatureHigh"),
            "low": zip_darksky(data["daily"]["data"], "temperatureLow"),
            "apparent_low": zip_darksky(data["daily"]["data"], "apparentTemperatureLow"),
            "humidity": zip_darksky(data["daily"]["data"], "humidity", 100),
            "cloud_cover": zip_darksky(data["daily"]["data"], "cloudCover", 100),
            "precipitation_probability": zip_darksky(data["daily"]["data"], "precipProbability", 100),
            "precipitation_intensity": zip_darksky(data["daily"]["data"], "precipIntensity", 24),
        },
        "alerts": (data["alerts"] ?? []).map(alert => {
            return {
                "severity": alert["severity"], // advisory, watch, warning
                "url": alert["url"],
                "title": alert["title"],
                "description": alert["description"],
                "expires": alert["expires"],
            }
        }),
        "source": "darksky", // darksky,openweathermap,openmeteo, etc
    }
}

function openweathermap_sum_precip_over_hour(hour) {
    return (hour["rain"] ? hour["rain"]["1h"] : 0) +
        (hour["snow"] ? hour["snow"]["1h"] : 0)
}

function parse_openweathermap(data) {
    return {
        "currently": {
            "summary": data["current"]["weather"][0]["description"],
            "temperature": data["current"]["temp"],
            "apparent_temperature": data["current"]["feels_like"],
            "humidity": data["current"]["humidity"],
            "cloud_cover": data["current"]["clouds"],
            "precipitation_intensity": openweathermap_sum_precip_over_hour(data["current"])
        },
        "hourly": {
            "summary": data["daily"][0]["weather"]["description"],
            "temperature": zip_openweathermap(data["hourly"], "temp"),
            "apparent_temperature": zip_openweathermap(data["hourly"], "feels_like"),
            "humidity": zip_openweathermap(data["hourly"], "humidity"),
            "cloud_cover": zip_openweathermap(data["hourly"], "clouds"),
            "precipitation_probability": zip_openweathermap(data["hourly"], "pop", 100),
            "precipitation_intensity": data["hourly"].map(hour => {
                return {x: hour["dt"] * 1000, y: openweathermap_sum_precip_over_hour(hour)}
            }),
        },
        "daily": {
            "summary": "",
            "high": data["daily"].map(data_point => {
                return {x: data_point["dt"] * 1000, y: data_point["temp"]["max"]}
            }),
            "apparent_high": data["daily"].map(data_point => {
                // ugh why
                return {x: data_point["dt"] * 1000, y: Math.max(...Object.values(data_point["feels_like"]))}
            }),
            "low": data["daily"].map(data_point => {
                return {x: data_point["dt"] * 1000, y: data_point["temp"]["min"]}
            }),
            "apparent_low": data["daily"].map(data_point => {
                return {x: data_point["dt"] * 1000, y: Math.min(...Object.values(data_point["feels_like"]))}
            }),
            "humidity": zip_openweathermap(data["daily"], "humidity"),
            "cloud_cover": zip_openweathermap(data["daily"], "clouds"),
            "precipitation_probability": zip_openweathermap(data["daily"], "pop", 100),
            "precipitation_intensity": zip_openweathermap(data["daily"], "rain"),
        },
        "alerts": (data["alerts"] ?? []).map(alert => {
            return {
                "severity": alert["severity"], // advisory, watch, warning
                "url": "",
                "title": alert["event"],
                "description": alert["description"],
                "expires": alert["ends"],
            }
        }),
        "source": "openweathermap", // darksky,openweathermap,openmeteo, etc
    }
}

function parse_openmeteo(data) {
    return data
}

function get_weather_from_latlong(lat, long, provider) {
    switch (provider) {
        case "darksky":
            return darksky_api_request(lat, long).then(parse_darksky)
        case "openweathermap":
            return openweathermap_api_request(lat, long).then(parse_openweathermap)
        case "openmeteo":
            return openmeteo_api_request(lat, long).then(parse_openmeteo)
    }

}

function geocode(addr) {
    return fetch_json(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addr)}&format=json&addressdetails=1&limit=1`).then(r => {
        if (r && r.length) {
            return {
                "latitude": r[0]["lat"],
                "longitude": r[0]["lon"]
            }
        } else {
            return null
        }

    })
}

function reverse_geocode(lat, long, accuracy) {
    // accuracy of GPS is in meters, need to convert to OSM tiles https://wiki.openstreetmap.org/wiki/Zoom_levels
    accuracy = Math.min(Math.ceil(-Math.log2((accuracy * 2) / 40075017)), 12)

    return fetch_json(`https://nominatim.openstreetmap.org/reverse?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(long)}&format=json&zoom=${encodeURIComponent(accuracy)}`).then(r => {
        return r["display_name"]
    })
}

