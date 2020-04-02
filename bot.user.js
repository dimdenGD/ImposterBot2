
// ==UserScript==
// @name         Reddit April Fools Imposter Bot 2
// @namespace    dimden.dev
// @version      1.0.0
// @description  A bot that tries to guess correct answer using data from few sources
// @author       dimden
// @match        https://gremlins-api.reddit.com/results?*
// @updateurl    https://github.com/dimdenGD/ImposterBot2/raw/master/bot.user.js
// ==/UserScript==

DETECTOR_URL = "https://huggingface.co/openai-detector/?";
ABRA_URL = "https://librarian.abra.me/check";
SPACESCIENCE_URL = "https://spacescience.tech/check.php?id=";
OCEAN_URL = "https://wave.ocean.rip/answers/answer?text=";

async function checkExistingAbra(msgs) {
    let myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");

    let raw = JSON.stringify({"texts": msgs});

    let requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: raw,
        redirect: 'follow'
    };

    let json = await fetch(ABRA_URL, requestOptions)
                         .then(response => response.json());
    return json.results;
}

async function checkExistingSpacescience(id) {
    let requestOptions = {
        method: 'GET',
        redirect: 'follow'
    };

    let json = await fetch(SPACESCIENCE_URL+id, requestOptions)
                         .then(response => response.json());

    for (let key in json) {
        if (json[key].hasOwnProperty("flag")) {
            if (json[key].flag = 1) {
                switch(json[key].result) {
                    case "WIN":
//                         return "known fake";
//                         Known bot data is completely unrealiable.
                   
                    case "LOSE":
                        return "known human";
                }
            }
        }
    }
    return "unknown";
}

async function checkExistingOcean(msg) {
    let requestOptions = {
        method: 'GET',
        redirect: 'follow'
    };

    let json = await fetch(OCEAN_URL+msg, requestOptions)
                         .then(response => response.json());

    if (json.status=200) {
        if (json.answer.is_correct) {
            return "known fake";
        } else {
            return "known human";
        }
    }

    return "unknown";
}

async function checkDetector(msg) {
    let requestOptions = {
        method: 'GET',
        redirect: 'follow'
    };
      
    let json = await fetch(DETECTOR_URL + msg, requestOptions)
                         .then(response => response.json());
    return json.fake_probability;
        
}
function handleExisting(result) {
    if (result === "known fake") {
        return true;
    } else if (result === "known human") {
        return false;
    }
}

class Imposter {
    constructor() {
        this.wins = [];
        this.loses = [];
    }
    async getRoom() {
        let res = await (await fetch("https://gremlins-api.reddit.com/room?nightmode=1&platform=desktop")).text();
        let parser = new DOMParser();
        let doc = parser.parseFromString(res, "text/html");
        // id, value
        return {
            token: doc.getElementsByTagName("gremlin-app")[0].getAttribute("csrf"),
            options: Array.from(doc.getElementsByTagName("gremlin-note")).map(e => ({ id: e.id, value: e.innerText.trim() }))
        };
    };
    async submitAnswer(token, id) {
        let body = new FormData();
        body.append("undefined", "undefined");
        body.append("note_id", id);
        body.append("csrf_token", token);
        let res = await (await fetch("https://gremlins-api.reddit.com/submit_guess", {
            method: "post",
            body
        })).text();

        return JSON.parse(res);
    }
    async processAnswers(answers) {

        let abra = await checkExistingAbra(answers.map(a => a.value));
        for(let i in answers) {
            answers[i].ABRA_RES = null;
            answers[i].SPACE_RES = null;
            answers[i].OCEAN_RES = null;

            if(abra[i] !== "unknown") a.ABRA_RES = abra[i];
            answers[i].SPACE_RES = await checkExistingSpacescience(answers[i].id);
            try {
                answers[i].OCEAN_RES = await checkExistingOcean(answers[i].value);
            } catch(e) {}
        }
        return answers.filter(answer => 
            (!answer.ABRA_RES || answer.ABRA_RES === "known fake") 
            && answer.SPACE_RES === "unknown"
            && (answer.OCEAN_RES === "known fake" || !answer.OCEAN_RES));
    }
}
async function tick() {
    g = new Imposter();
    room = await g.getRoom();
    answers = await g.processAnswers(room.options);
    if(answers.length > 1) return;
    console.log(await g.submitAnswer(room.token, answers[0].id));

    tick();
};
