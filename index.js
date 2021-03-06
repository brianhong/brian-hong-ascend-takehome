require('dotenv').config();

const express = require('express')
const app = express();
const port = process.env.PORT || 3000;
const bodyParser = require('body-parser')

const {validateAddresses} = require('./helpers/addressHelper')

app.use(bodyParser.json())
app.use(
    bodyParser.urlencoded({
      extended: true,
    })
  );

app.post('/validateAddress', async (req, res) => {
    try {
        const result = await validateAddresses(req.body)
        res.setHeader('Content-Type', 'application/json')
        res.json(result)
    } catch (err) {
        res.status(400).send(err.message)
    }
})

app.use((req, res, next) => {
    res.status(404).json({
        message: 'Route not found.'
    })
});

app.listen(port, () => {
    console.log(`App listening on port ${port}`);
})
