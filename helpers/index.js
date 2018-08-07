const helpers = {};

helpers.log = function (...args) {
    return console.log(args.join(` → `));
};

module.exports = helpers;
