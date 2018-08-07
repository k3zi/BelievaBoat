const helpers = {};

helpers.log = function (category, content) {
    return console.log(`${category} → ${content}`);
};

module.exports = helpers;
