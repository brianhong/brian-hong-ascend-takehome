let { validateAddresses, convertAddressForGoogle, convertAddressesForResponse, persistAddressData, NoBodyError, MissingAddressKeyError} = require("./addressHelper");
const NodeCache = require('node-cache')
require('../services/googleMaps.service')
require('../db')

jest.mock('./addressHelper', () => ({
    ...jest.requireActual('./addressHelper'),
    convertAddressForGoogle: jest.fn().mockImplementation(address => `Mock address ${address['address_line_one']}`),
    convertAddressesForResponse: jest.fn(),
    persistAddressData: jest.fn(),
}));

jest.mock('../services/googleMaps.service', () => ({
    ...jest.requireActual('../services/googleMaps.service'),
    fetchAddressCoordinates: jest.fn().mockImplementation(address => ({lat: 1, lng: 1}))
}))

jest.mock('../db', () => ({
    ...jest.requireActual('../db'),
    query: jest.fn()
}))


describe('validateAddresses', () => {
    let reqBody;

    describe('with no data to work with', () => {
        beforeEach(() => {
            reqBody = null;
        })

        test('it should throw NoBodyError', async () => {
            try {
                await validateAddresses(reqBody);
            } catch(e) {
                expect(e).toBeInstanceOf(NoBodyError)
            }
        })
    })

    describe('with meaningful data to work with', () => {
        beforeEach(() => {
            convertAddressForGoogle.mockImplementation((address) => `Mock Address ${address}`)

            reqBody = [{
                "address_line_one": "1600 Amphitheatre Parkway",
                "city": "Mountain View",
                "state": "CA",
                "zip_code": "94043"
            },
            {
                "address_line_one": "54 E Swedesford Road",
                "city": "Malvern",
                "state": "PA",
                "zip_code": "19355"
            }]
        })

        test('it should return true', async () => {
            try {
                const result = await validateAddresses(reqBody);
                const expected = [{
                    "address_line_one": "1600 Amphitheatre Parkway",
                    "city": "Mountain View",
                    "state": "CA",
                    "zip_code": "94043",
                    "latitude": 1,
                    "longitude": 1
                },
                {
                    "address_line_one": "54 E Swedesford Road",
                    "city": "Malvern",
                    "state": "PA",
                    "zip_code": "19355",
                    "latitude": 1,
                    "longitude": 1
                }]
                expect(result).toEqual(expected);
            } catch(e) {
                console.error(e)
            }
        })
    })
})

describe('convertAddressForGoogle', () => {
    let address;

    beforeEach(() => {
        convertAddressForGoogle = jest.requireActual('./addressHelper').convertAddressForGoogle;
    })

    describe('with incomplete address input', () => {
        beforeEach(() => {
            address = {
                    "city": "Mountain View",
                    "state": "CA",
                    "zip_code": "94043",
                    "latitude": 1,
                    "longitude": 1
            }
        })

        test('it should throw MissingAddressKeyError', () => {
            try {
                convertAddressForGoogle(address)
            } catch(e) {
                expect(e).toBeInstanceOf(MissingAddressKeyError)
            }
        })
    })

    describe('with complete data', () => {
        beforeEach(() => {
            address = {
                "address_line_one": "1600 Amphitheatre Parkway",
                "city": "Mountain View",
                "state": "CA",
                "zip_code": "94043",
            }
        })

        test('it should return properly formatted address', () => {
            try {
                const result = convertAddressForGoogle(address)
                const expected = '1600 Amphitheatre Parkway, Mountain View, CA, 94043';
                expect(result).toEqual(expected)

            } catch(e) {
                console.error(e)
                expect(e).not.toBeTruthy()
            }
        })
    })
})

describe('convertAddressesForResponse', () => {
    let cache;

    beforeEach(() => {
        convertAddressesForResponse = jest.requireActual('./addressHelper').convertAddressesForResponse;
    })

    afterEach(() => {
        jest.clearAllMocks();
    })

    it('should try to get info from cache', () => {
        try {
            cache = new NodeCache()
            const cacheGetSpy = jest.spyOn(cache, 'get')
            convertAddressesForResponse(cache, null, 'abc')
            expect(cacheGetSpy).toHaveBeenCalledWith('abc'); 
        } catch(e) {
            console.error(e)
            expect(e).not.toBeTruthy();
        }
    })
    
    describe('and data exists in cache', () => {
        beforeEach(() => {
            cache = new NodeCache();
            cache.set('abc', {'mock': 'data'})
        })

        it("shouldn't try to perform unnecessary work", () => {
            try {
                convertAddressesForResponse(cache, {}, 'abc')
                const fetchSpy = jest.spyOn(require('../services/googleMaps.service'), 'fetchAddressCoordinates')
                expect(fetchSpy).not.toHaveBeenCalled();
            } catch(e) {
                console.error(e);
                expect(e).not.toBeTruthy();
            }
        })
    })

    describe('and data does not exist in cache', () => {
        beforeEach(() => {
            cache = new NodeCache();
            cache.set('abc', {'mock': 'data'})
        })

        it("should make network call", () => {
            try {
                const fetchSpy = jest.spyOn(require('../services/googleMaps.service'), 'fetchAddressCoordinates')
                convertAddressesForResponse(cache, {}, 'def')
                expect(fetchSpy).toHaveBeenCalled();
            } catch(e) {
                console.error(e);
                expect(e).not.toBeTruthy();
            }
        })

        it('should persist data to database', () => {
            try {
                const persistSpy = jest.spyOn(require('./addressHelper'), 'persistAddressData')
                convertAddressesForResponse(cache, {}, 'xyz')
                expect(persistSpy).toHaveBeenCalled();
            } catch(e) {
                console.error(e)
                expect(e).not.toBeTruthy();
            }
        })
    })
})