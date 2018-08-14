const request = require('request-promise');
module.exports = async function (url, session, signature, answerid, step) {
    const opts = {
        method: 'GET',
        json: true,
        uri: `https://${url}/ws/answer?callback=&session=${session}&signature=${signature}&step=${step}&answer=${answerid}&constraint=ETAT<>'AV'`,
        headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Accept-Encoding': 'gzip, deflate',
            'Accept-Language': 'en-US,en;q=0.9',
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 6_0 like Mac OS X) AppleWebKit/536.26 (KHTML, like Gecko) Version/6.0 Mobile/10A5376e Safari/8536.25'
        },
        gzip: true
    };

    return request(opts).then(function(json) {
        console.log(json);
        if (json.completion === 'OK') {
            let ans = []
            for (var i = 0; i < json.parameters.answers.length; i++) {
                ans.push(`${i} - ${json.parameters.answers[i].answer}`)
            }
            game = {
                question: json.parameters.question,
                progress: json.parameters.progression,
                answers: ans
            }
            return game;
        } else if (json.completion === 'KO - SERVER DOWN') {
            throw new Error(`Akinator servers are down for the "${url}" URL. Check back later.`);
        } else if (json.completion === 'KO - TECHNICAL ERROR') {
            throw new Error(`Akinator's servers have had a technical error for the "${url}" URL. Check back later.`);
        } else if (json.completion === 'KO - INCORRECT PARAMETER') {
            throw new Error(`You inputted a wrong paramater, this could be session, URL, or signature.`);
        } else if (json.completion === 'KO - TIMED OUT') {
            throw new Error('Your Akinator session has timed out.');
        } else if (json.completion === `WARN - NO QUESTION`) {
            throw new Error('No more questions are left. You have defeated me :(');
        } else {
            throw new Error('Unknown error has occured. Server response: ' + json.completion);
        }
    });
};
