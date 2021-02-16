# Flatcar Container Linux Version
A Twitter bot @[FlatcarVersion](https://twitter.com/flatcarversion) for reporting the latest versions of Flatcar Container Linux.

## Usage
```sh
git clone https://github.com/heqian/CoreOSVersion.git
cd CoreOSVersion/
cp config.sample.js config.js
# Add your valid Twitter developer credentials
vi config.js
npm install
nohup node index.js &
```
