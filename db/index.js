const { Pool } = require('pg');

const pool = new Pool({
    user: "brianhong",
    host: "localhost",
    database: "ascend_takehome",
    password: null,
    port: 5432,
})

module.exports = {
    query: (text, params) => {
        return pool.query(text, params)
    }
}