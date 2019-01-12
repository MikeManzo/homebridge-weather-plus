const req = require("request")
const moment = require("moment")

class Meteobridge {
  constructor(ipAddress, password) {
    this.ipAddress  = ipAddress
    this.bridgePass = password
    this.timeoutVal = 1000
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
        var url = `http://meteobridge:${this.bridgePass}@${this.ipAddress}/cgi-bin/template.cgi?template=[mbsystem-latitude],[mbsystem-longitude]`

        req (
            { url: url, timeout: this.timeoutVal}, (error, result, body) => {
              if (error) {
                reject(`Lat/Lon cannot be retrieved from station with ip:${this.ipAddress}. ERROR Code: ${error}`)
                return
              }
    
              if (result.statusCode !== 200) {
                reject(
                  `Lat/Lon cannot be retrieved from station with ip:${this.ipAddress}. Station Response: ${result.statusCode} ${result.statusMessage}`
                )
                return
              }
    
              return resolve(body.split(','))
            }
        )   
    })
}

/*
Structure of the data returning from the api bridge:
    data[0] = mac: Meteobridge MAC hardware address (example: "40:01:FE:23:12:A8")
    data[1] = platform: string that specifies hw platform (example: "TL-MR3020")
    data[2] = swversion: Meteobridge version string (example: "1.1")
    data[3] = latitude: latitude as float (example: 53.875120)
    data[4] = longitude: longitude as float (example: 53.875120)
    data[5] = buildnum: build number as integer (example: 1673)
*/
getSystemSpecifications() {
    return new Promise((resolve, reject) => {
        var url = `http://meteobridge:${this.bridgePass}@${this.ipAddress}/cgi-bin/template.cgi?template=[mbsystem-mac],[mbsystem-platform],[mbsystem-swversion],[mbsystem-latitude],[mbsystem-longitude],[mbsystem-buildnum]`
        
        req (
            { url: url, timeout: this.timeoutVal }, (error, result, body) => {
              if (error) {
                reject(`System Specifications cannot be retrieved from station with ip:${this.ipAddress}. ERROR Code: ${error}`)
                return
              }
    
              if (result.statusCode !== 200) {
                reject(
                  `System Specifications cannot be retrieved from station with ip:${this.ipAddress}. Station Response: ${result.statusCode} ${result.statusMessage}`
                )
                return
              }
              return resolve(body.split(','))
            }
        )   
    })
}

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
  getConditions() {
    return new Promise((resolve, reject) => {
      var url =  `http://meteobridge:${this.bridgePass}@${this.ipAddress}/cgi-bin/template.cgi?template=[th0temp-act=.1:---],[th0hum-act:---],[th0dew-act:---],[th0heatindex-act:---],[thb0press-act:---],[wind0wind-act:---],[wind0wind-dmax:---],[wind0dir-act:---],[wind0chill-act:---],[rain0rate-act:---],[rain0total-act:---],[uv0index-act:---],[sol0rad-act:---]`

        req(
            { url: url, timeout: this.timeoutVal }, (error, result, body) => {
                if (error) {
                    reject(`Conditions cannot be retrieved from station with ip:${this.ipAddress}. ERROR Code: ${error}`)
                    return
                }

                if (result.statusCode !== 200) {
                    reject(
                        `Conditions cannot be retrieved from station with ip:${this.ipAddress}. Station Response: ${result.statusCode} ${result.statusMessage}`
                    )
                    return
                }
                return resolve(body.split(','))
            }
        )
    })
  }
}

module.exports = Meteobridge