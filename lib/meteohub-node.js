const req = require("request")
const syncRequest = require('sync-request')      // Sync HTTP Requests
const moment = require("moment")
const xmlParser = require('xml2json')            // XML to JSON Object

class Meteobridge {
  constructor(address, port) {
    this.address    = address
    this.port       = port
    this.timeoutVal = 2000
  }

  static truthyOrZero(value) {
    return !!value || parseFloat(value) === 0
  }

  time(time) {
    if (Meteobridge.truthyOrZero(time)) {
      this.timeVal = moment(new Date(time)).format("YYYY-MM-DDTHH:mm:ss")
    } else {
      this.timeVal = null
    }
    return this
  }

  timeout(milliseconds) {
    if (milliseconds) {
      this.timeoutVal = milliseconds
    } else {
      this.timeoutVal = null
    }
    return this
  }

/*
  Structure of the data returning from the api bridge:
    data[0] = latitude: latitude as float (example: 53.875120)
    data[1] = longitude: longitude as float (example: 53.875120)
*/
getLatLon() {
    return new Promise((resolve, reject) => {
        var lat = ""
        var lon = ""

        var url = `http://${this.address}:${this.port}/meteograph.cgi?text=actual_station_latitude_decimal`
        req (
            { url: url, timeout: this.timeoutVal}, (error, result, body) => {
              if (error) {
                reject(`Cannot retrieve Latitude from hub with address:${this.address}. ERROR Code: ${error}`)
                return
              }
    
              if (result.statusCode !== 200) {
                reject(
                  `Cannot retrieve Latitude from Hub with address:${this.address}. Hub Response: ${result.statusCode} ${result.statusMessage}`
                )
                return
              }
              lat = body
            }
        )

        url = `http://${this.address}:${this.port}/meteograph.cgi?text=actual_station_longitude_decimal`
        req (
          { url: url, timeout: this.timeoutVal}, (error, result, body) => {
            if (error) {
              reject(`Cannot retrieve Longitude from Hub with address:${this.address}. ERROR Code: ${error}`)
              return
            }
  
            if (result.statusCode !== 200) {
              reject(
                `Cannot retrieve Longitude from station with address:${this.address}. Hub Response: ${result.statusCode} ${result.statusMessage}`
              )
              return
            }
            lon = body
          }
      )
        return resolve([lat,lon])
      })
}

/*
Structure of the data returning from the api bridge:
    data[0] = platform: string that specifies hw platform (example: "TL-MR3020")
    data[1] = swversion: Meteobridge version string (example: "1.1")
    data[3] = buildnum: build number as integer (example: 1673)
*/
getSystemSpecifications() {
  return new Promise((resolve, reject) => {
    var platform = ""
    var version = ""
    var build = ""
    
    var myURL = `http://${this.address}:${this.port}/meteograph.cgi?text=actual_system_platform_text`
    var result = syncRequest('GET', myURL);
    if (result.statusCode == 200) {
        var body = result.getBody().toString();
        platform = body
    } else {
      reject(
        `Cannot retrieve Platform information from Hub with address:${this.address}. Hub Response: ${result.statusCode} ${result.statusMessage}`
      )
      return
    }

    myURL = `http://${this.address}:${this.port}/meteograph.cgi?text=actual_system_version_text`
    var result = syncRequest('GET', myURL);
    if (result.statusCode == 200) {
        var body = result.getBody().toString();
        version = body
    } else {
      eject(
        `Cannot retrieve Software Version from Hub with address:${this.address}. Hub Response: ${result.statusCode} ${result.statusMessage}`
      )
      return
    }

    myURL = `http://${this.address}:${this.port}/meteograph.cgi?text=actual_system_build_num`
    var result = syncRequest('GET', myURL);
    if (result.statusCode == 200) {
        var body = result.getBody().toString();
        build = body
    } else {
      reject(
        `Cannot retrieve System Build from Hub with address:${this.address}. Hub Response: ${result.statusCode} ${result.statusMessage}`
      )
      return
    }     
      return resolve([platform,version,build])
    })
}

/*
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
  getConditions() {
    return new Promise((resolve, reject) => {

      var url = `http://${this.address}:${this.port}/meteolog.cgi?type=xml&quotes=1&mode=data&info=station&info=utcdate&info=sensorids`
      req(
        { url: url, timeout: this.timeoutVal }, (error, result, body) => {
          if (error) {
            reject(`Cannot retrieved conditions from the Hub with address:${this.address}. ERROR Code: ${error}`)
            return
          }

          if (result.statusCode !== 200) {
            reject(
              `Cannot retrieved conditions from the Hub with address:${this.address}. Hub Response: ${result.statusCode} ${result.statusMessage}`
            )
            return
          }
          var options = {
            object: true,
            reversible: false,
            coerce: false,
            sanitize: true,
            trim: true,
            arrayNotation: false,
            alternateTextNode: false
          };
          var json = xmlParser.toJson(body, options);
          return resolve([json.logger.TH.temp, json.logger.TH.hum, json.logger.TH.dew, json.logger.THB.seapress,
            json.logger.WIND.wind, json.logger.WIND.gust, json.logger.WIND.dir, json.logger.WIND.chill,
            json.logger.RAIN.rate, json.logger.RAIN.total])
        }
      )
    })
  }
}

module.exports = Meteobridge