"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.configs = exports.unload = exports.load = void 0;
const load = function () {
    // log("builder loaded!");
};
exports.load = load;
const unload = function () {
    // log("builder unload!");
};
exports.unload = unload;
const buildPlugin = {
    hooks: './hooks',
    options: {
        hotUpdateEnable: {
            label: 'i18n:hot-update.builder.hotupdate_enable',
            default: false,
            render: {
                ui: 'ui-checkbox'
            },
            verifyRules: [],
        },
        remoteAddress: {
            label: 'i18n:hot-update.builder.remote_address',
            description: 'i18n:hot-update.builder.remote_address',
            default: 'http://127.0.0.1',
            render: {
                ui: 'ui-input',
                attributes: {
                    placeholder: 'i18n:hot-update.builder.remote_address',
                },
            },
            verifyRules: ['http'],
        },
        storagePath: {
            label: 'i18n:hot-update.builder.hotupdate_storage',
            description: 'i18n:hot-update.builder.hotupdate_storage_desc',
            default: 'hotupdate_storage',
            render: {
                ui: 'ui-input',
                attributes: {
                    placeholder: 'i18n:hot-update.builder.hotupdate_storage_desc',
                },
            },
            verifyRules: ['isValidStorage'],
        },
        version: {
            label: 'i18n:hot-update.builder.hotupdate_version',
            description: 'i18n:hot-update.builder.hotupdate_version_desc',
            default: '1.0.0',
            render: {
                ui: 'ui-input',
                attributes: {
                    placeholder: 'i18n:hot-update.builder.hotupdate_version_desc',
                },
            },
            verifyRules: ['isValidVersion'],
        },
        buildNum: {
            label: 'i18n:hot-update.builder.build_num',
            description: 'i18n:hot-update.builder.build_num_desc',
            default: 1,
            render: {
                ui: 'ui-num-input',
                attributes: {
                    step: 1,
                    min: 1,
                    preci: 0,
                },
            },
            verifyRules: [],
        },
    },
    verifyRuleMap: {
        isValidVersion: {
            message: 'i18n:hot-update.builder.hotupdate_version_verify_msg',
            func(val, option) {
                if (val) {
                    return true;
                }
                return false;
            },
        },
        isValidStorage: {
            message: 'i18n:hot-update.builder.hotupdate_storage_verify_msg',
            func(val, option) {
                if (val) {
                    return true;
                }
                return false;
            },
        },
    },
};
exports.configs = {
    'ios': buildPlugin,
    'mac': buildPlugin,
    'android': buildPlugin,
    'windows': buildPlugin,
};
