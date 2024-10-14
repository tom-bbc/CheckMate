const { CheckMate } = require('./CheckMate');
const { getAuth } = require('./helper/awsauth');
const credentials = require('./credentials.json');
const util = require('util');
const fs = require('fs');


const main = async () => {
    // Gather credentials
    const auth = await getAuth();

    const api_keys = {
        openai: auth.OPENAI_API_KEY,
        google: auth.GOOGLE_API_KEY,
        google_search_id: credentials.google_search_cx_id,
        google_client_id: credentials.google_oath_client_id,
        newscatcher: auth.NEWSCATCHER_API_KEY
    };

    // Input transcript (from AssemblyAI)
    const transcript_source = "trump_taxes.txt";
    const default_transcript = fs.readFileSync(`test-data/${transcript_source}`).toString();

    // Choose input type ["transcript" | "sentences"]
    const input_type = "transcript";
    // const input_type = "sentences";

    // Choose fact-check service ["Any" | "Google Fact Check" | "Search and Review" | "Fact Check Database"]
    // const service = "Any";
    // const service = "Google Fact Check";
    const service = "Search and review";

    // Run CheckMate claim detection & fact-checking process
    const results = await CheckMate(
        default_transcript,
        input_type,
        service,
        api_keys
    );

    console.log('\n', util.inspect(results, { showHidden: false, depth: null, colors: true }));
}


main();
