const { OpenAI } = require("openai");
const { getAuth } = require('./awsauth');

module.exports.claimDetection = async (transcript) => {
    // Get OpenAI credentials
    const auth = await getAuth();

    // Define prompt to send to GPT model
    const prompt = `
        I will provide you with a transcript. Extract the key factual claims from this transcript.
        Ensure to only include relevant and substantial claims that are verifiable and not opinion or sarcasm.
        Present the extracted claims in JSON format, ensuring each claim includes the following details:

        Claim: The factual statement itself. This should be an exact quote from the trainscript with no rewriting or summarisation.
        Speaker: The person who made the claim.
        Context: A brief description of the context in which the claim was made.

        The JSON format should look as follows:
        "[
            {
                "Claim": "The Earth revolves around the Sun.",
                "Speaker": "Dr. Smith",
                "Context": "During the discussion on planetary movements."
            },
            ...
        ]"

        Here is the transcript:
        ${transcript}
    `;

    // Retrieve and format response from GPT model
    try {
        const openai = new OpenAI({ apiKey: auth.OPEN_API_KEY })

        const response = await openai.chat.completions.create({
            messages: [
                { "role": "system", "content": "You are a helpful assistant focussed on extracting verifiable factual claims from transcripts of political debates and discussion." },
                { "role": "user", "content": prompt },
            ],
            model: "gpt-4o",
        });

        // If response includes text & json, start from element '```json\n' in response content and end on element '```'
        const json_start_char = '```json\n';
        const json_end_char = '```';
        let json_content = response.choices[0].message.content;

        if (json_content.includes(json_start_char) && json_content.includes(json_end_char)) {
            json_content = json_content.split(json_start_char)[1];
            json_content = json_content.split(json_end_char)[0];
        }

        const detected_claims = JSON.parse(json_content);
        return detected_claims;

    } catch (error) {
        console.error(error);
        console.log("ERROR: OpenAI call failed.");

        return [];
    }
}
