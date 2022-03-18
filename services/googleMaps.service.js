const API_KEY = process.env.GOOGLE_API_KEY;

const {Client} = require("@googlemaps/google-maps-services-js");

const googleMapClient = new Client({})

function GoogleRequestError() {
    this.message = 'Error making request to Google Maps API'
}

const fetchAddressCoordinates = async (inputAddress) => {
    try {
        const args = {params:{key: API_KEY, address: inputAddress}}
        const response = await googleMapClient.geocode(args)

        if (response.data.status === 'ZERO_RESULTS') {
            throw new Error();
        }

        return response.data.results[0]['geometry']['location'];
    } catch (err) {
        throw new GoogleRequestError();
    }
}

module.exports = {
    fetchAddressCoordinates,
    GoogleRequestError
}