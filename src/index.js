const fs = require('fs');

const config = require('../config.js');

const express = require('express');
const bodyParser = require('body-parser');
const app = express();
app.use(bodyParser.json());

const api = require('./api.js');
const views = require('./views.js');

// STATIC ASSETS
const STATIC_PATHS = {
    '/': 'index.html',
}
const respondWith = (res, static_path) => {
    fs.readFile(`static/${static_path}`, 'utf8', (err, data) => {
        if (err) {
            throw err;
        }

        res.set('Content-Type', 'text/html');
        res.send(data);
    });
}
for (const [uri, path] of Object.entries(STATIC_PATHS)) {
    app.get(uri, (req, res) => {
        try {
            respondWith(res, path);
        } catch (e) {
            console.error(e);
            // For now, assume it's a not-found error
            respondWith(res, '404.html');
        }
    });
}
app.use('/static', express.static('static'));

// VIEWS
const VIEW_PATHS = {
    '/base': views.baseView,
}
for (const [uri, renderer] of Object.entries(VIEW_PATHS)) {
    app.get(uri, (req, res) => {
        try {
            res.set('Content-Type', 'text/html');
            const html = renderer(req.params);
            if (html !== false) {
                res.send(html);
            } else {
                respondWith(res, '404.html');
            }
        } catch (e) {
            console.error(e);
            respondWith(res, '500.html');
        }
    })
}

// API
const API_PATHS = {
    'GET /api/frame/test': api.frame.get,
}
const METHODS = ['GET', 'POST', 'PUT', 'DELETE'];
for (const [spec, handler] of Object.entries(API_PATHS)) {
    const [method, route] = spec.split(' ');
    let appMethod;
    if (METHODS.includes(method)) {
        appMethod = app[method.toLowerCase()].bind(app);
    } else {
        throw new Error(`Method ${method} for route ${route} is not valid`);
    }

    appMethod(route, (req, res) => {
        try {
            res.set('Content-Type', 'application/json');
            const result = handler(req.params, req.query, req.body);
            res.send(JSON.stringify(result));
        } catch (e) {
            console.error(e);
            res.set('Content-Type', 'application/json');
            res.send(JSON.stringify({
                error: '500 Server Error',
            }));
        }
    });
}

// 404 last
app.use((req, res) => respondWith(res, '404.html'));

app.listen(
    config.PORT,
    () => console.log(`Codeframe running on localhost:${config.PORT}`)
);
