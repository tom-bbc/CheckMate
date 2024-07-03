const fetch = require('node-fetch');
const credentials = require('./credentials.json');

exports.factCheck = async (claim) => {
    const google_api_key = credentials.google_fact_check_api_key;
    const url = "https://factchecktools.googleapis.com/v1alpha1/claims:search";
    const request = `${url}?key=${google_api_key}&query=${claim}`;

    let response = await fetch(request);
    response = await response.json();
    console.log(response);
};
