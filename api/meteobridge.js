"use strict";

const Meteobridge = require('../lib/meteobridge-node'),
    converter = require('../util/converter'),
    moment = require('moment-timezone'),

    attribution = 'Powered by Meteobridge',
    reportCharacteristics = [
        'AirPressure',
//        'Condition',
//        'ConditionCategory',
        'Humidity',
        'DewPoint',
        'Rain1h',
        'RainDay',
        'SolarRadiation',
        'Temperature',
        'UVIndex',
        'WindDirection',
        'WindSpeed',
        'WindSpeedMax'
    ],
    forecastCharacteristics = [
        'Condition',
        'ConditionCategory',
        'ForecastDay',
        'Humidity',
        'RainChance',
        'RainDay',
        'Temperature',
        'TemperatureMin',
        'WindDirection',
        'WindSpeed',
        'WindSpeedMax'
    ],
    forecastDays = 4;

var debug, log;

var init = function (ipAddress, password, l, d) {
    this.meteobridge = new Meteobridge(ipAddress, password)
    log = l;
    debug = d;
};

var update = function (callback) {
    debug("Updating current weather from meteobridge");

    let weather = {};
    weather.forecasts = [];
    let that = this;

    that.meteobridge.getConditions()
        .then(function (response) {
            // Current weather report
            weather.report = parseReport(response);
            callback(null, weather);
        })
        .catch(function (error) {
            log.error("[**Meteobridge-API**] Error retrieving weather report and forecast");
            log.error("[**Meteobridge-API**] Error Message: " + error);
            callback(error);
        });
};

/*
    Structure of the data returning from the api bridge:
        response[0] = mac: Meteobridge MAC hardware address (example: "40:01:FE:23:12:A8")
        response[1] = platform: string that specifies hw platform (example: "TL-MR3020")
        response[2] = swversion: Meteobridge version string (example: "1.1")
        response[3] = latitude: latitude as float (example: 53.875120)
        response[4] = longitude: longitude as float (example: 53.875120)
        response[5] = buildnum: build number as integer (example: 1673)
*/
var bridgeSpecs = function (callback) {
    debug("Retrieving Meteobridge specificationse");
    let that = this;

    that.meteobridge.getSystemSpecifications()
        .then(function (response) {
            callback(null, response);
        })
        .catch(function (error) {
            log.error("[**Meteobridge-API**] Error retrieving meteobridge specifications");
            log.error("[**Meteobridge-API**] Error Message: " + error);
            callback(error);
        });
};

/*
    Structure of the data returning from the api bridge:
        data[0] = th0temp: outdoor temperature in degrees Celsius
        data[1] = th0hum: relative outdoor humidity as percentage
        data[2] = th0dew: outdoor dew point in degrees Celsius
        data[3] = th0heatindex: outdoor heat index in degrees Celsius
        data[4] = thb0press: station pressure in hPa
        data[5] = wind0wind: wind speed in m/s
        data[6] = wind0wind-dmax: maximum value of today's windspeed in m/s
        data[7] = wind0dir: wind direction in degress (0° is North)
        data[8] = wind0chill: wind chill temperature in degrees Celsius
        data[9] = rain0rate: rain rate in mm/h
        data[10] = rain0total: rain fall in mm
        data[11] = uv0index: uv index
        data[12] = sol0rad: solar radiation in W/m^2
 */
var parseReport = function (values) {
    let report = {};

    report.AirPressure          = parseFloat(values[4]);
//    report.Condition            = "Temp"; // Hardcoded for now
//    report.ConditionCategory    = 0; // Hardcoded for now
    report.Humidity             = parseFloat(values[1]);
    report.DewPoint             = parseFloat(values[2]);
    report.Rain1h               = parseFloat(values[9]);
    report.RainDay              = parseFloat(values[10]);
    report.SolarRadiation       = parseFloat(values[12]);
    report.Temperature          = parseFloat(values[0]);
    report.UVIndex              = parseFloat(values[11]);
    report.WindDirection        = converter.getWindDirection(parseInt(values[7]));
    report.WindSpeed            = parseFloat(values[5]);
    report.WindSpeedMax         = parseFloat(values[6]);

    return report;
};

/*
 **** The bridge does not forecast ... so, we're not going to here.
*/

/*
var parseForecast = function (values) {
    let forecast = {};

    forecast.Condition = values['conditions'];
    forecast.ConditionCategory = converter.getConditionCategory(values['icon']);
    forecast.ForecastDay = values['date']['weekday'];
    forecast.Humidity = parseInt(values['avehumidity'])
    forecast.RainChance = values['pop'];
    forecast.RainDay = isNaN(parseInt(values['qpf_allday']['mm'])) ? 0 : parseInt(values['qpf_allday']['mm']);
    forecast.Temperature = values['high']['celsius'];
    forecast.TemperatureMin = values['low']['celsius'];
    forecast.WindDirection = values['avewind']['dir'];
    forecast.WindSpeed = parseFloat(values['avewind']['kph']);
    forecast.WindSpeedMax = parseFloat(values['maxwind']['kph']);

    return forecast;
};
*/

module.exports = {
    init,
    update,
    bridgeSpecs,
    reportCharacteristics,
    forecastCharacteristics,
    forecastDays,
    attribution
};