"use strict";
const darksky = require('./api/darksky'),
	weatherunderground = require('./api/weatherunderground'),
	openweathermap = require('./api/openweathermap'),
	yahoo = require('./api/yahoo'),
	meteobridge = require('./api/meteobridge'),	// meteobridge support
	meteohub = require('./api/meteohub'),	// meteohub support
	debug = require('debug')('homebridge-weather-plus');

var Service,
	Characteristic,
	CustomCharacteristic,
	FakeGatoHistoryService;

module.exports = function (homebridge) {
	Service = homebridge.hap.Service;

	// Homekit Characteristics
	Characteristic = homebridge.hap.Characteristic;
	// History Service
	FakeGatoHistoryService = require('fakegato-history')(homebridge);

	homebridge.registerPlatform("homebridge-weather-plus", "WeatherPlus", WeatherStationPlatform);
};

// ============
// = Platform =
// ============
function WeatherStationPlatform(log, config, api) {
	debug("Init platform");
	this.log = log;
	this.config = config;
	this.displayName = config['displayName'];
	this.key = config['key'];
	this.units = config['units'] || 'si';
	this.location = config['location'];
	this.locationGeo = config['locationGeo'];
	this.locationCity = config['locationCity'];
	this.forecastDays = ('forecast' in config ? config['forecast'] : []);
	this.language = ('language' in config ? config['language'] : 'en');
	this.bridgeAddress = ('bridgeIP' in config ? config['bridgeIP'] : null);	// meteobridge support
	this.bridgePassword = ('bridgePass' in config ? config['bridgePass'] : null);	// meteobridge support
	this.hubAddress = ('hubAddress' in config ? config['hubAddress'] : null);	// meteohub support
	this.hubPort = ('hubPort' in config ? config['hubPort'] : null);	// meteohub support
	this.weatherService = config['service'].toLowerCase().replace(/\s/g, '');

	// Custom Characteristics
	CustomCharacteristic = require('./util/characteristics')(api, this.units);

	// API Service
//	let service = config['service'].toLowerCase().replace(/\s/g, '');
	if (this.weatherService === 'darksky') {
		debug("Using service dark sky");
		// TODO adapt unit of characteristics
		if (this.location) {
			this.locationGeo = this.location;
		}
		darksky.init(this.key, this.language, this.locationGeo, log, debug);
		this.api = darksky;
	}
	else if (this.weatherService === 'weatherunderground') {
		debug("Using service weather underground");
		weatherunderground.init(this.key, this.location, log, debug);
		this.api = weatherunderground;
	}
	else if (this.weatherService === 'openweathermap') {
		debug("Using service OpenWeatherMap");
        openweathermap.init(this.key, this.language, this.location, this.locationGeo, this.locationCity, log, debug);
		this.api = openweathermap;
	}
	else if (this.weatherService === 'meteobridge') {	// meteobridge support
		debug("Using service Meteobridge");
        meteobridge.init(this.bridgeAddress, this.bridgePassword, log, debug);
		this.api = meteobridge;
	}
	else if (this.weatherService === 'meteohub') {	// meteohub support
		debug("Using service Meteohub");
        meteohub.init(this.hubAddress, this.hubPort, log, debug);
		this.api = meteohub;
	}
	else if (this.weatherService === 'yahoo') {
		debug("Using service Yahoo");
        yahoo.init(this.location, log, debug);
		this.api = yahoo;
	}

	// Update interval
	this.interval = ('interval' in config ? parseInt(config['interval']) : 4);
	this.interval = (typeof this.interval !== 'number' || (this.interval % 1) !== 0 || this.interval < 0) ? 4 : this.interval;
}

WeatherStationPlatform.prototype = {
	// Get the current condition accessory and all forecast accessories
	accessories: async function (callback) {
		this.accessories = [];

		this.accessory = new CurrentConditionsWeatherAccessory();
		await this.accessory.init(this);
		this.accessories.push(this.accessory);

		// Add all configured forecast days
		for (let i = 0; i < this.forecastDays.length; i++) {
			const day = this.forecastDays[i];
			if (typeof day === 'number' && (day % 1) === 0 && day >= 1 && day <= this.api.forecastDays) {

				this.fcstAccessory = new ForecastWeatherAccessory(this, day - 1);
				await this.fcstAccessory.init(this);
				this.accessories.push(this.fcstAccessory);
			}
			else {
				debug("Ignoring forecast day: " + day);
			}
		}

		callback(this.accessories);
	},

	// Update the weather for all accessories
	updateWeather: function () {
		let that = this;

		this.api.update(function (error, weather) {
			if (!error) {

				for (var i = 0; i < that.accessories.length; i++) {
					// Add current weather conditions
					if (that.accessories[i].currentConditionsService !== undefined && weather.report !== undefined) {
						try {
							let service = that.accessories[i].currentConditionsService;
							let data = weather.report;

							for (let i = 0; i < that.api.reportCharacteristics.length; i++) {
								const name = that.api.reportCharacteristics[i];
								that.saveCharacteristic(service, name, data[name]);
							}
						}
						catch (error) {
							that.log.error("Exception while parsing weather report: " + error);
							that.log.error("Report: " + weather.report);
						}
					}
					// Add a weather forecast for the given day
					else if (that.accessories[i].forecastService !== undefined && weather.forecasts[that.accessories[i].day] !== undefined) {
						try {
							let service = that.accessories[i].forecastService;
							let data = weather.forecasts[that.accessories[i].day];

							for (let i = 0; i < that.api.forecastCharacteristics.length; i++) {
								const name = that.api.forecastCharacteristics[i];
								that.saveCharacteristic(service, name, data[name]);
							}
						}
						catch (error) {
							that.log.error("Exception while parsing weather forecast: " + error);
							that.log.error("Forecast: " + weather.forecast);
						}
					}
				}
			} else {
				that.log.error("Error updating service:" + error);
			}
		});
		setTimeout(this.updateWeather.bind(this), (this.interval) * 60 * 1000);
	},

	// Save changes from update in characteristics
	saveCharacteristic: function (service, name, value) {
		// humidity not a custom but a general apple home kit characteristic
		if (name === 'Humidity') {
			service.setCharacteristic(Characteristic.CurrentRelativeHumidity, value);
		}
		// temperature not a custom but a general apple home kit characteristic
		else if (name === 'Temperature') {
			service.setCharacteristic(Characteristic.CurrentTemperature, value);
		}
		// all other custom characteristics
		else {
			if (CustomCharacteristic[name]._unitvalue) value = CustomCharacteristic[name]._unitvalue(value);
			service.setCharacteristic(CustomCharacteristic[name], value);
		}
	},

	// Add history entry
	addHistory: function () {
		debug("Saving history entry");

		for (var i = 0; i < this.accessories.length; i++) {
			if (this.accessories[i] !== undefined && this.accessories[i].currentConditionsService !== undefined) {
				// Add entry to history
				this.accessories[i].historyService.addEntry({
					time: new Date().getTime() / 1000,
					temp: this.accessories[i].currentConditionsService.getCharacteristic(Characteristic.CurrentTemperature).value,
					pressure: this.accessories[i].currentConditionsService.getCharacteristic(CustomCharacteristic.AirPressure).value,
					humidity: this.accessories[i].currentConditionsService.getCharacteristic(Characteristic.CurrentRelativeHumidity).value
				});
				break;
			}
		}

		// Call function every 9:50 minutes (a new entry every 10 minutes is required to avoid gaps in the graph)
		setTimeout(this.addHistory.bind(this), (10 * 60 * 1000) - 10000);
	}
};

// ================================================================================
// = Use the bridge settiongs ... or ...										  =
// = Honor the original author for attribution is no data is setup in the bridge  =
// = ==============================================================================
async function updateAccessoryInformation(service, platform) {
	if (platform.bridgeAddress != null && platform.bridgePassword != null) {
		return new Promise((resolve, reject) => {
			platform.api.bridgeSpecs(function (error, specs) {
				if (!error) {
					if (platform.weatherService === 'meteohub') {
						service
						.setCharacteristic(Characteristic.Manufacturer, "smartbedded GmbH")
						.setCharacteristic(Characteristic.Model, "Platform Type: " + specs[0])
						.setCharacteristic(Characteristic.SerialNumber, specs[2])
						.setCharacteristic(Characteristic.FirmwareRevision, "Meteohub: " + specs[1])
						.setCharacteristic(Characteristic.Name, "Meteohub");
					} else if (platform.weatherService === 'meteobridge') {
						service
						.setCharacteristic(Characteristic.Manufacturer, "smartbedded GmbH")
						.setCharacteristic(Characteristic.Model, "Platform Type: " + specs[1])
						.setCharacteristic(Characteristic.SerialNumber, specs[0])
						.setCharacteristic(Characteristic.FirmwareRevision, "Meteobridge: " + specs[2])
						.setCharacteristic(Characteristic.Name, "Meteobridge");
					} else {
						platform.log("*** Unknnown Service ***")						
					}
					resolve(service)
				} else {
					service
						.setCharacteristic(Characteristic.Manufacturer, "github.com naofireblade")
						.setCharacteristic(Characteristic.Model, platform.api.attribution)
						.setCharacteristic(Characteristic.SerialNumber, platform.location);
					reject("Sorry ....")
					return
				}
			});            
		});	
	} else {
		service
			.setCharacteristic(Characteristic.Manufacturer, "github.com naofireblade")
			.setCharacteristic(Characteristic.Model, platform.api.attribution)
			.setCharacteristic(Characteristic.SerialNumber, platform.location);
		return
	}
}

// ======================================================
// = Current Condition Accessory 						=
// =  Restructured a bit to allow for async/await.		=  
// = Removed logic from constructor and added to init	=
// ======================================================
function CurrentConditionsWeatherAccessory() { }
CurrentConditionsWeatherAccessory.prototype = {
	identify: function (callback) {
		callback();
	},

	getServices: function () {
		return [this.informationService, this.currentConditionsService, this.historyService];
	},

	updateCharacteristics: async function (service, platform) {
		await updateAccessoryInformation(service, platform)
			.then(function (specs) {
				if (platform.weatherService === 'meteohub') {
					platform.log("[Meteohub] Accessory updated with Meteohub specifications");						
				} else if (platform.weatherService === 'meteobridge') {
					platform.log("[Meteobridge] Accessory updated with Meteobridge specifications");			
				}
				else {
					platform.error("Accessory not updated with any specifications");	
				}
				return service;
			})
			.catch(function (error) {
				if (platform.weatherService === 'meteohub') {
					platform.log("[Meteohub] Error updating accessory with Meteohub specifications: Error -->" + error);
				} else if (this.weatherService === 'meteobridge') {
					platform.log("[Meteobridge] Error updating accessory with Meteobridge specifications: Error -->" + error);			
				}
				return
			});
	},

	init: async function (platform) {
		this.platform = platform;
		this.log = platform.log;
		this.name = platform.displayName || "Now";
		let that = this;
	
		// Create temperature sensor service that includes temperature characteristic
		this.currentConditionsService = new Service.TemperatureSensor(this.name);
	
		// Fix negative temperatures not supported by homekit
		this.currentConditionsService.getCharacteristic(Characteristic.CurrentTemperature).props.minValue = -50;
	
		// Add additional characteristics to temperature sensor that are supported by the selected api
		for (let i = 0; i < this.platform.api.reportCharacteristics.length; i++) {
			const name = this.platform.api.reportCharacteristics[i];
	
			// humidity not a custom but a general apple home kit characteristic
			if (name === 'Humidity') {
				this.currentConditionsService.addCharacteristic(Characteristic['CurrentRelativeHumidity']);
			}
			// temperature is already in the service
			else if (name !== 'Temperature') {
				this.currentConditionsService.addCharacteristic(CustomCharacteristic[name]);
			}
		}
	
		// Create information service
		this.informationService = new Service.AccessoryInformation();
		await this.updateCharacteristics(this.informationService, platform);
	
		// Create history service
		this.historyService = new FakeGatoHistoryService("weather", this, {
			storage: 'fs'
		});
		setTimeout(this.platform.addHistory.bind(this.platform), 10000);

		// Start the weather update process
		this.platform.updateWeather();
	}
};

// ======================================================
// = Forecast Accessory 								=
// = Restructured a bit to allow for async/await.		=  
// = Removed logic from constructor and added to init	=
// ======================================================
function ForecastWeatherAccessory() { }
ForecastWeatherAccessory.prototype = {
	identify: function (callback) {
		callback();
	},

	getServices: function () {
		return [this.informationService, this.forecastService];
	},

	init: async function(platform, day) {
		this.platform = platform;
		this.log = platform.log;
	
		switch (day) {
			case 0:
				this.name = "Today";
				break;
			case 1:
				this.name = "In 1 Day";
				break;
			default:
				this.name = "In " + day + " Days";
				break;
		}
		if (this.platform.displayName) this.name = this.platform.displayName + ' ' + this.name;
		this.day = day;
	
		// Create temperature sensor service that includes temperature characteristic
		this.forecastService = new Service.TemperatureSensor(this.name);
	
		// Fix negative temperatures not supported by homekit
		this.forecastService.getCharacteristic(Characteristic.CurrentTemperature).props.minValue = -50;
	
		// Add additional characteristics to temperature sensor that are supported by the selected api
		for (let i = 0; i < this.platform.api.forecastCharacteristics.length; i++) {
			const name = this.platform.api.forecastCharacteristics[i];
	
			// humidity not a custom but a general apple home kit characteristic
			if (name === 'Humidity') {
				this.forecastService.addCharacteristic(Characteristic['CurrentRelativeHumidity']);
			}
			// temperature is already in the service
			else if (name !== 'Temperature') {
				this.forecastService.addCharacteristic(CustomCharacteristic[name]);
			}
		}
	
		// Create information service
		this.informationService = new Service.AccessoryInformation();
		await this.updateCharacteristics(this.informationService, platform);
	}
};
