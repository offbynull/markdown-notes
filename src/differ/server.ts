import { createServer, IncomingMessage, ServerResponse, Server } from 'http';
import { Buffer } from 'buffer';
import { JSDOM } from 'jsdom';
import { markChangeInBody } from './differ';

const ERROR_MSG: Buffer = Buffer.from('Not supported', 'utf8');

export class ReloadServer {
    public readonly httpPort: number;
    private readonly httpServer: Server;
    private unmodifiedServeHtml: string;
    private serveHtml: Buffer;
    private closed: boolean;

    public constructor(httpPort: number) {
        this.closed = false;

        if (httpPort < 1 || httpPort > 65535) {
            throw 'Port out of bounds: ' + httpPort;
        }

        this.unmodifiedServeHtml = '<html><head></head><body></body></html>';
        this.serveHtml = Buffer.from(this.unmodifiedServeHtml, 'utf8');
        this.httpServer = createServer((req, res) => this.servePage(req, res));
        try {
            this.httpServer.listen(httpPort, '127.0.0.1', () => { /* console.log('Server is listening on port ' + httpPort); */ });
        } catch (e) {
            try {
                this.httpServer.close();
            } catch (e) {
                // do nothing
            }
            throw e;
        }
        this.httpPort = httpPort;
    }

    public updateHtml(data: string) {
        if (this.closed) {
            throw 'Server closed';
        }

        const oldDom = new JSDOM(this.unmodifiedServeHtml);
        const newDom = new JSDOM(data);
        const changed = markChangeInBody(oldDom, newDom, '__CHANGE_POINT');
        if (changed === false) {
            throw 'No change detected';
        }

        const oldBody = oldDom.window.document.getElementsByTagName('body')[0];
        const newBody = newDom.window.document.getElementsByTagName('body')[0];
        if (oldBody === undefined || newBody === undefined) {
            throw 'Body tag missing'; // should never happen at this point because this is checked in injectMarkerAtHtmlDifference()
        }

        // inject controller
        const injectElement = newDom.window.document.createElement('div');
        injectElement.style.position = 'fixed';
        injectElement.style.top = '0';
        injectElement.style.right = '0';
        injectElement.style.border = '1';
        injectElement.innerHTML = '<p>hello world!</p>';
        newBody.insertBefore(injectElement, null);

        this.serveHtml = Buffer.from(newDom.serialize(), 'utf8');
        this.unmodifiedServeHtml = data;
    }

    private servePage(req: IncomingMessage, res: ServerResponse) {
        if (this.closed) {
            throw 'Server closed';
        }

        if (req.method === 'GET') {
            res.writeHead(200, { 'Content-Type': 'text/html', 'Content-Length': this.serveHtml.byteLength });
            res.write(this.serveHtml);
        } else { 
            res.writeHead(500, { 'Content-Type': 'text/plain', 'Content-Length': ERROR_MSG.byteLength });
            res.write(ERROR_MSG);
        }
    }

    public close() {
        this.closed = true;
        this.httpServer.close();
    }
}