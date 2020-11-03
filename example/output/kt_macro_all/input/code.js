const fs = require('fs');
const cp = require('child_process');

const packageJson = JSON.parse(fs.readFileSync('package.json', { encoding: 'utf8' }));
try {
    for (const requiredModule of Object.keys(packageJson.dependencies)) {
        require(requiredModule)
    }
} catch (e) {
    cp.execSync('npm install', { stdio: [0, 1, 2] });
}



const kt = require('katex');
const fse = require('fs-extra');

const blockMode = (() => {
    const mode = fse.readFileSync('/input/input.mode', { encoding: 'utf8' });
    switch (mode) {
        case 'block':
            return true;
        case 'inline':
            return false;
        default:
            throw new Error('Bad mode: ' + mode);
    }
})();
const tex = fse.readFileSync('/input/input.data', { encoding: 'utf8' });

const html = kt.renderToString(
    tex,
    {
        displayMode: blockMode,
        throwOnError: false
    }
);

fse.writeFileSync('/output/output.md', html, { encoding: 'utf8' });

fse.copySync('node_modules/katex/dist', '/output/katex');
fse.writeFileSync('/output/output.injects', '[ ["katex/katex.min.css", "css"] ]', { encoding: 'utf8' });

        // const headElement = document.getElementsByTagName('head')[0];

        // const katexHtmlBasePath = context.injectDir('node_modules/katex/dist');
        // const linkElem = document.createElement('link');
        // linkElem.setAttribute('href', katexHtmlBasePath + '/katex.min.css');
        // linkElem.setAttribute('rel', 'stylesheet');
        // headElement.appendChild(linkElem);

        // You only need this for browser-side rendering -- we're doing server-side rendering here.
        // const scriptElem = document.createElement('script');
        // scriptElem.setAttribute('type', 'text/javascript');
        // scriptElem.setAttribute('src', 'node_modules/katex/dist/katex.js');
        // headElement.appendChild(scriptElem