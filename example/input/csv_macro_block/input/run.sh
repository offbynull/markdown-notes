TYPE="csv"
mkdir /tmp/$TYPE
cd /tmp/$TYPE
rm /tmp/$TYPE/package.json
rm /tmp/$TYPE/code.js
cp /input/package.json /tmp/$TYPE
cp /input/code.js /tmp/$TYPE
ls -al node_modules
[ $(node -p "try { require('csv-parse/package.json'); 'ok'; } catch (e) { 'fail'; }") != 'ok' ] && npm install
node code.js