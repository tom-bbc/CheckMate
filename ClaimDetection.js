const { OpenAI } = require("openai");
const { getAuth } = require('./awsauth');

exports.claimDetection = async (transcript) => {
    const auth = await getAuth();

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

    try {
        const openai = new OpenAI({ apiKey: auth.OPEN_API_KEY })

        const response = await openai.chat.completions.create({
            messages: [
                { "role": "system", "content": "You are a helpful assistant focussed on extracting verifiable factual claims from transcripts of political debates and discussion." },
                { "role": "user", "content": prompt },
            ],
            model: "gpt-4o",
        });
        console.log(response.choices[0]);

        // Need to update this to start from element '```json\n' in content list of strings and end on element '```'
        const detected_claims = JSON.parse(response.choices[0].message.content)
        return detected_claims;

    } catch (error) {
        console.error(error);
        console.log("ERROR => OpenAI call failed");

        return false;
    }
}
