TYPE="img"
mkdir -p /opt/$TYPE
rm -rf /opt/$TYPE/package.json
rm -rf /opt/$TYPE/*.js
cp /input/package.json /opt/$TYPE
cp /input/code.js /opt/$TYPE
cp /input/image_utils.js /opt/$TYPE
cd /opt/$TYPE
node code.js