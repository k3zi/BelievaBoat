const request = require('request-promise');
module.exports = async function (url) {
    const opts = {
        method: 'GET',
        json: true,
        uri: `https://${url}/ws/new_session?callback=&partner=1&player=desktopPlayer&constraint=ETAT<>'AV'`,
        headers: {
        },
        gzip: true
    };

    return request(opts).then(function (json) {
        if (json.completion === 'OK') {
            let ans = [];
            for (var i = 0; i < json.parameters.step_information.answers.length; i++) {
                ans.push(`${i} - ${json.parameters.step_information.answers[i].answer}`);
            }

            return {
                session: json.parameters.identification.session,
                signature: json.parameters.identification.signature,
                question: json.parameters.step_information.question,
                answers: ans
            };
        } else if (json.completion === 'KO - SERVER DOWN') {
            throw new Error(`Akinator servers are down for the "${url}" URL. Check back later.`);
        } else if (json.completion === 'KO - TECHNICAL ERROR') {
            throw new Error(`Akinator's servers have had a technical error for the "${url}" URL. Check back later.`);
        } else {
            throw new Error('An unknown error has occured.');
        }
    });
};
