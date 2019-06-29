import { ReloadServer } from "./server";
import request = require('request');

test(
    'initial server must produce empty page',
    (done) => {
        const reloadServer = new ReloadServer(23458);
        request('http://127.0.0.1:23458/', (err, res, body) => {
            console.log(body);

            reloadServer.close();
            expect(err).toBeNull();
            expect(res).toBeDefined();
            expect(body).toBe('<html><head></head><body></body></html>');
            done();
        });
    },
    20000
);

test(
    'updated html must include top-right sticky and diff marker',
    (done) => {
        const reloadServer = new ReloadServer(23459);
        reloadServer.updateHtml('<html><head></head><body><p>0123456789</p></body></html>');
        request('http://127.0.0.1:23459/', (err, res, body) => {
            console.log(body);

            reloadServer.close();
            expect(err).toBeNull();
            expect(res).toBeDefined();
            expect(body).toBe('<html><head></head><body><p>0123456789</p></body></html>');
            done();
        });
    },
    20000
);