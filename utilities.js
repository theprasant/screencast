const { wssAccessControlAllowOrigins } = require("./consts")
function log(...text) {
  var time = new Date();
  console.log(`[${time.toLocaleTimeString()}]`, ...text);
}
function isAllowedOrigin(origin) {
  let allowedOrigins = wssAccessControlAllowOrigins;
  if (allowedOrigins.includes("*")) return true;
  if (allowedOrigins.includes(origin)) return true;
}
module.exports.log = log;
module.exports.isAllowedOrigin = isAllowedOrigin;