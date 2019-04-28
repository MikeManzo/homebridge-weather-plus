"use strict";

const Meteohub = require('../lib/meteohub-node'),
    converter = require('../util/converter'),
    moment = require('moment-timezone'),

    attribution = 'Powered by Meteohub',
    reportCharacteristics = [
        'AirPressure',
        'Humidity',
        'DewPoint',
        'Rain1h',
        'RainDay',
        'Temperature',
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

var init = function (address, port, l, d) {
    this.meteohub = new Meteohub(address, port)
    log = l;
    debug = d;
};

var update = function (callback) {
    debug("Updating current weather from meteohub");

    let weather = {};
    weather.forecasts = [];
    let that = this;

    that.meteohub.getConditions()
        .then(function (response) {
            weather.report = parseReport(response); // Current weather report
            callback(null, weather);
        })
        .catch(function (error) {
            log.error("[**Meteohub-API**] Error retrieving weather report");
            log.error("[**Meteohub-API**] Error Message: " + error);
            callback(error);
        });
};

/*
    Structure of the data returning from the api bridge:
        response[0] = mac: meteohub MAC hardware address (example: "40:01:FE:23:12:A8")
        response[1] = platform: string that specifies hw platform (example: "TL-MR3020")
        response[2] = swversion: meteohub version string (example: "1.1")
        response[3] = latitude: latitude as float (example: 53.875120)
        response[4] = longitude: longitude as float (example: 53.875120)
        response[5] = buildnum: build number as integer (example: 1673)
*/
var bridgeSpecs = function (callback) {
    debug("Retrieving Meteohub specificationse");
    let that = this;

    that.meteohub.getSystemSpecifications()
        .then(function (response) {
            callback(null, response);
        })
        .catch(function (error) {
            log.error("[**Meteohub-API**] Error retrieving meteohub specifications");
            log.error("[**Meteohub-API**] Error Message: " + error);
            callback(error);
        });
};

/*
    Structure of the data returning from the api bridge:
Structure of the data returning from the api bridge:
    data[0] = th0temp: outdoor temperature in degrees Celsius
    data[1] = th0hum: relative outdoor humidity as percentage
    data[2] = th0dew: outdoor dew point in degrees Celsius
    data[3] = thb0press: station pressure in hPa
    data[4] = wind0wind: wind speed in m/s
    data[5] = wind0wind-dmax: maximum value of today's windspeed in m/s
    data[6] = wind0dir: wind direction in degress (0° is North)
    data[7] = wind0chill: wind chill temperature in degrees Celsius
    data[8] = rain0rate: rain rate in mm/h
    data[9] = rain0total: rain fall in mm
*/
var parseReport = function (values) {
    let report = {};

    report.AirPressure          = parseFloat(values[3]);
    report.Humidity             = parseFloat(values[1]);
    report.DewPoint             = parseFloat(values[2]);
    report.Rain1h               = parseFloat(values[8]);
    report.RainDay              = parseFloat(values[9]);
    report.Temperature          = parseFloat(values[0]);
    report.WindDirection        = converter.getWindDirection(parseInt(values[6]));
    report.WindSpeed            = parseFloat(values[4]);
    report.WindSpeedMax         = parseFloat(values[5]);

    return report;
};

module.exports = {
    init,
    update,
    bridgeSpecs,
    reportCharacteristics,
    forecastCharacteristics,
    forecastDays,
    attribution
};