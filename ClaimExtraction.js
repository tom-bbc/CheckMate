const { OpenAI } = require("openai");
const { getAuth } = require('./getAWSCreds');

async function main() {
    const auth = await getAuth();
    const openai = new OpenAI({ apiKey: auth.OPEN_API_KEY })

    const transcript = "The NHS is broken. Be honest with us. It'll take to fix it? As Janet knows and everyone knows, the NHS is still recovering from COVID. We went through the best part of two years where the NHS couldn't conduct all the treatments it normally would, and it is going to take time to recover from that. But we are now making progress. The waiting lists are coming down. But what Keir Starmer didn't mention to you, which you did Julie, is that they're now 7.5 million. He says they're coming down. And this guy says he's good at maths. Yeah, they are now coming down. They were at 7.2 million when you said you'd get them down, now they're 7.5 million. I'd like you to explain how they're coming down. Because they were coming down from where they were when they were higher on their way down. They are down, right? Yes, because the NHS was impacted by industrial action and if it wasn't for that, half a million appointments would have been set. It's somebody else's fault. I'm really grateful for everyone in the NHS for working so hard and we have now settled pay rises with everyone in the NHS except for the junior doctors.";

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

    const response = await openai.chat.completions.create({
        messages: [
            { "role": "system", "content": "You are a helpful assistant focussed on extracting verifiable factual claims from transcripts of political debates and discussion." },
            { "role": "user", "content": prompt },
        ],
        model: "gpt-4o",
    });

    const resp_text_content = JSON.parse(response.choices[0].message.content)
    console.log(resp_text_content);
}

main();
