const { z } = require("zod");
const { OpenAI } = require("openai");
const { zodResponseFormat } = require("openai/helpers/zod");

const claimsObject = z.object({
  claims: z.array(z.string()),
});

module.exports.sentenceClaimDetection = async (
  sentence,
  context,
  openai_api_key
) => {
  // Define prompt to send to GPT model
  const system_prompt = `
        I will provide you with a single sentence from a transcript. If the sentence contains any factual claims, extract and return those claims in an array.
        I will also provide a string of context containing the sentences preceeding the input sentence in the transcript.
        This context can be used to help identify claims in the input sentence, but only claims identified in the single highlighted input sentence should be identified and output.

        A claim is a factual statement that should be an exact quote from the transcript with no rewriting or summarisation.
        You should respond with an array containing any extracted claims from the single input sentence. If no claims are found, return any empty array. Do not respond with anything but an array
        Ensure to only include relevant and substantial claims that are verifiable and not opinion or sarcasm.

        Example 1:
         * Input sentence: "I tell you Stephen, this year alone 10,000 people have crossed on boats, that's a record number, so again, he's made a promise and he's completely failed to keep it."
         * Output claims: ["this year alone, 10,000 people have crossed on boats"]

        Example 2:
         * Input sentence: "We need to smash the gangs that are running this file trade making a huge amount of money."
         * Output claims: []
    `;

  const user_prompt = `
        This is the input sentence from a transcript to extract claims from:
        ${sentence}

        This is the context of preceeding sentences:
        ${context}
    `;

  // Set up connection to OpenAI API
  let openai;
  try {
    openai = new OpenAI({ apiKey: openai_api_key });
  } catch (error) {
    console.log(
      `<!> ERROR: "${error.message}". Cannot set up OpenAI connection. <!>`
    );
    return [];
  }

  // Send prompt & retrieve response from OpenAI model
  let response;
  try {
    response = await openai.chat.completions.create({
      messages: [
        { role: "system", content: system_prompt },
        { role: "user", content: user_prompt },
      ],
      model: "gpt-4o-2024-08-06",
      response_format: zodResponseFormat(claimsObject, "claims"),
    });
  } catch (error) {
    console.log(
      `<!> ERROR: "${error.message}". Cannot get response from OpenAI. <!>`
    );
    return [];
  }

  // Extract array of claims from OpenAI response
  let detected_claims = response.choices[0].message;

  console.log(response.choices[0]);

  if (detected_claims.refusal) {
    return [];
  } else {
    detected_claims = JSON.parse(detected_claims.content).claims;
    return detected_claims;
  }
};

module.exports.transcriptClaimDetection = async (
  transcript,
  openai_api_key
) => {
  // Define prompt to send to GPT model
  const prompt = `
        I will provide you with a transcript. Extract the key factual claims from this transcript.
        A claim is a factual statement that should be an exact quote from the trainscript with no rewriting or summarisation.
        Ensure to only include relevant and substantial claims that are verifiable and not opinion or sarcasm.
        Return the extracted claims within an output array. If no claims are found return an empty array.

        Example output claims:
        [
            "More Americans will die from drugs this year than were killed in the entire Vietnam war.",
            "We have now settled pay rises with everyone in the NHS except for the junior doctors.",
            "This year alone, 10,000 people have crossed on boats. That's a record number."
        ]

        This is the input transcript to extract claims from:
        ${transcript}
    `;

  // Set up connection to OpenAI API
  let openai;
  try {
    openai = new OpenAI({ apiKey: openai_api_key });
  } catch (error) {
    console.log(
      `<!> ERROR: "${error.message}". Cannot set up OpenAI connection. <!>`
    );
    return [];
  }

  // Send prompt & retrieve response from OpenAI model
  let response;
  try {
    response = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant focussed on extracting verifiable factual claims from transcripts of political debates and discussion.",
        },
        { role: "user", content: prompt },
      ],
      model: "gpt-4o-2024-08-06",
      response_format: zodResponseFormat(claimsObject, "claims"),
    });
  } catch (error) {
    console.log(
      `<!> ERROR: "${error.message}". Cannot get response from OpenAI. <!>`
    );
    return [];
  }

  // Extract array of claims from OpenAI response
  let detected_claims = response.choices[0].message;

  if (detected_claims.refusal) {
    return [];
  } else {
    detected_claims = JSON.parse(detected_claims.content).claims;
    return detected_claims;
  }
};
