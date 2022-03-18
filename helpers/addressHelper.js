const {fetchAddressCoordinates, GoogleRequestError} = require('../services/googleMaps.service')
const db = require('../db')
const hash = require('object-hash')

const NodeCache = require('node-cache')
const cache = new NodeCache()

function MissingAddressKeyError(missingKeys) {
    this.message = `Missing key(s): ${missingKeys.join(',')}`;
}

function NoBodyError(message = 'Request has no body') {
    this.message = message;
}

function PersistenceError(message = '') {
    this.message = message ? message : 'Error persisting data'
}

const validateAddresses = async (reqBody) => {
    try {
        if (!reqBody || Object.keys(reqBody).length === 0) {
            throw new NoBodyError('No body found on validate address request.')
        }

        const convertedAddresses = {};

        reqBody.forEach(address => {
            convertedAddresses[convertAddressForGoogle(address)] = address
        });

        const addressValidationRequests = Object.entries(convertedAddresses).map(([convertedAddress, addressObj]) => convertAddressesForResponse(addressObj, convertedAddress))

        const result = await Promise.all(addressValidationRequests)
        return result;
    } catch(err) {
        throw err;
    }
}

function convertAddressForGoogle(address) {
    const requiredKeys = [
        'address_line_one',
        'city',
        'state',
        'zip_code'
    ];

    const missingKeys = [];

    for (let key of requiredKeys) {
        if (!address.hasOwnProperty(key)) {
            missingKeys.push(key)
        }   
    }

    if (missingKeys.length > 0) {
        throw new MissingAddressKeyError(missingKeys)
    }

    const {address_line_one, city, state, zip_code} = address
    return `${address_line_one}, ${city}, ${state}, ${zip_code}`
}

const convertAddressesForResponse = async (addressObj, convertedAddress) => {
    try {
        const cacheCheck = cache.get(convertedAddress)
        if (cacheCheck) {
            return cacheCheck
        }

        const coordinates = await fetchAddressCoordinates(convertedAddress)
        const result = {...addressObj, "latitude": coordinates.lat, "longitude": coordinates.lng}

        await persistAddressData(convertedAddress, result)
        
        return result;
    } catch (err) {
        if (err instanceof GoogleRequestError) {
            return {
                errorMessage: `Could not get info for address ${convertedAddress}`
            }
        } else {
            throw err;
        }
    }
}

const persistAddressData = async (convertedAddressKey, addressObj) => {
    try {
        const insertQuery = 'INSERT INTO validated_addresses(address_hash, address_line_one, state, city, zip_code, lat, lng) VALUES($1, $2, $3, $4, $5, $6, $7)';
        const { address_line_one, state, city, zip_code, latitude, longitude} = addressObj;
        const values = [hash(addressObj), address_line_one, state, city, zip_code, latitude, longitude]

        await db.query(insertQuery, values)
        cache.set(convertedAddressKey, addressObj)
    } catch (err) {
        console.log(err)
        throw new PersistenceError();
    }
}

module.exports = {
    validateAddresses,
    NoBodyError
}