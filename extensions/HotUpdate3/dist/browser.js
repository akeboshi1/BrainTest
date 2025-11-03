"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.methods = exports.unload = exports.load = exports.log = exports.PACKAGE_NAME = void 0;
const packageJSON = require('../package.json');
// 必须保持和 package.json 一样
exports.PACKAGE_NAME = packageJSON.name;
function log(...arg) {
    return console.log(`[${exports.PACKAGE_NAME}] `, ...arg);
}
exports.log = log;
function load() {
    // log("browser loaded!");
}
exports.load = load;
function unload() {
    // log("browser unload!");
}
exports.unload = unload;
exports.methods = {
//
};
