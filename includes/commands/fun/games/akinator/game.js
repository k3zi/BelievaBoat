const regionToURLMapping = {
    english: "srv2.akinator.com:9157",
    arabic: "srv2.akinator.com:9155",
    chinese: "srv5.akinator.com:9125",
    german: "srv7.akinator.com:9145",
    spanish: "srv6.akinator.com:9127",
    france: "api-fr3.akinator.com",
    hebrew: "srv9.akinator.com:9131",
    italian: "srv9.akinator.com:9131",
    japanese: "srv10.akinator.com:9120",
    korean: "srv2.akinator.com:9156",
    nederlands: "srv9.akinator.com:9133",
    polish: "srv7.akinator.com:9143",
    portuguese: "srv3.akinator.com:9166",
    russian: "srv5.akinator.com:9124",
    turkish: "srv3.akinator.com:9164",
};

const regions = Object.keys(regionToURLMapping);

exports.regions = regions;

exports.start = async function (region) {
    region = region.toLowerCase();
    if (!regions.includes(region)) {
        throw new Error("Invalid language provided.");
    }
    let url = regionToURLMapping[region];
    return require('./start')(url);
};

exports.answer = async function (region, session, signature, answerid, step) {
    region = region.toLowerCase();
    if (!regions.includes(region)) {
        throw new Error("Invalid language provided.");
    }
    let url = regionToURLMapping[region];
    return require('./answer')(url, session, signature, answerid, step);
};

exports.list = async function (region, session, signature, step) {
    region = region.toLowerCase();
    if (!regions.includes(region)) {
        throw new Error("Invalid language provided.");
    }
    let url = regionToURLMapping[region];
    return require('./list')(url, session, signature, step);
};
