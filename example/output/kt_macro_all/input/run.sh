TYPE="katex"
mkdir -p /opt/$TYPE
rm -rf /opt/$TYPE/package.json
rm -rf /opt/$TYPE/code.js
cp /input/package.json /opt/$TYPE
cp /input/code.js /opt/$TYPE
cd /opt/$TYPE
[ $(node -p "try { require('fs-extra/package.json'); require('katex/package.json'); 'ok'; } catch (e) { 'fail'; }") != 'ok' ] && npm install
node code.js