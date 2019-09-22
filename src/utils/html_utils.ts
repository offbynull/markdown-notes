import WebResourceInliner from 'web-resource-inliner';
import { JSDOM } from 'jsdom';

export function inlineHtml(html: string, htmlResourcePath: string, callback: (output: string) => void) {
    WebResourceInliner.html(
        {
            fileContent: html,
            images: true,
            links: true,
            scripts: true,
            svgs: true,
            strict: true,
            relativeTo: htmlResourcePath
        },
        (error, result) => {
            if (error) {
                throw error;
            }
            callback(result);
        }
    );
}

export function injectHtmlErrorOverlay(html: string, message: string, backgroundColor: string): string {
    const dom = new JSDOM(html);
    const body = dom.window.document.getElementsByTagName('body')[0];

    const overlayDiv = dom.window.document.createElement('div');
    overlayDiv.style.position = 'fixed';
    overlayDiv.style.display = 'block';
    overlayDiv.style.width = '100%';
    overlayDiv.style.height = '100%';
    overlayDiv.style.top = '0';
    overlayDiv.style.left = '0';
    overlayDiv.style.right = '0';
    overlayDiv.style.bottom = '0';
    overlayDiv.style.backgroundColor = backgroundColor;
    overlayDiv.style.zIndex = '999999';

    const textPre = dom.window.document.createElement('pre');
    textPre.style.position = 'absolute';
    textPre.style.fontSize = '12px';
    textPre.style.color = 'white';
    textPre.style.backgroundColor = 'rgb(0,0,0)'
    textPre.textContent = message;
    overlayDiv.style.overflow = 'auto';

    overlayDiv.insertBefore(textPre, null);
    body.insertBefore(overlayDiv, null);


    return dom.serialize();
}