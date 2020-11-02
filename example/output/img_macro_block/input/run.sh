TYPE="img"
mkdir /tmp/$TYPE
cd /tmp/$TYPE
rm -rf /tmp/$TYPE/package.json
rm -rf /tmp/$TYPE/tsconfig.json
rm -rf /tmp/$TYPE/src
rm -rf /tmp/$TYPE/dist
cp /input/package.json /tmp/$TYPE
cp /input/tsconfig.json /tmp/$TYPE
cp -a /input/src /tmp/$TYPE/src
[ $(node -p "try { require('fs-extra/package.json'); require('image-size/package.json'); require('typescript/package.json'); 'ok'; } catch (e) { 'fail'; }") != 'ok' ] && npm install
npm start