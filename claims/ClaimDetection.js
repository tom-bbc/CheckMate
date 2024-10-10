const { z } = require("zod");
const { OpenAI } = require("openai");
const { zodResponseFormat } = require("openai/helpers/zod");


// Response object from OpenAI API call containing detected claims
const claimsObject = z.object({
  claims: z.array(z.string()),
});


// Claim detection over a single transcript sentence
module.exports.sentenceClaimDetection = async (sentence, context, openai_api_key) => {
  // Define prompt for OpenAI model to extract claims from a transcript sentence (with preceding context)
  const system_prompt = `
        I will provide you with a single sentence from a transcript. Identify whether the sentence contains any factual claims, and extract them.

        A claim is a checkable part of any sentence that's can be determined to be true or false by gathering evidence from an external source. There are many different types of claims, such as claims about quantities (e.g. "GDP has risen by 5%"), claims about cause and effect (e.g. "this policy leads to econimic growth"), or predictive claims about the future (e.g. "the economy will grow by 10%").

        Identified claims should be an exact quote from the transcript. Ensure to only include relevant and substantial claims that are verifiable and not opinion or sarcasm.

        I will also provide a string of context containing the sentences preceeding the input sentence in the transcript. This context can be used to help identify claims in the input sentence.

        If the claim makes reference to someone or something (e.g. "he said"), search backwards in the context sentences to identify the subject being referenced (e.g. "Rishi Sunak"), and replace the reference within the claim with the named subject.

        You should respond with an array containing any extracted claims from the single input sentence. If no claims are found, return any empty array.

        Example 1:
         * Input sentence: "I tell you Stephen, this year alone 10,000 people have crossed on boats, that's a record number, so again, he's made a promise and he's completely failed to keep it."
         * Output claims: ["this year alone, 10,000 people have crossed on boats"]

        Example 2:
         * Input sentence: "We need to smash the gangs that are running this file trade making a huge amount of money."
         * Output claims: []

        Example 3:
         * Input sentence: "Donald Trump is unburdened unburdened by the truth. He said the neo nazi rally in Charlottesville was fabricated."
         * Output claims: ["Donald Trump said the neo nazi rally in Charlottesville was fabricated"]
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
    console.log(`<!> ERROR: "${error.message}". Cannot set up OpenAI connection. <!>`);
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
    console.log(`<!> ERROR: "${error.message}". Cannot get response from OpenAI. <!>`);
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


// Claim detection over a full transcript
module.exports.transcriptClaimDetection = async (transcript, openai_api_key) => {
  // Define prompt for OpenAI model to extract claims from a full transcript
  const system_prompt = `
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
    `;

    const user_prompt = `
        This is the input transcript to extract claims from:
        ${transcript}
    `;

  // Set up connection to OpenAI API
  let openai;
  try {
    openai = new OpenAI({ apiKey: openai_api_key });
  } catch (error) {
    console.log( `<!> ERROR: "${error.message}". Cannot set up OpenAI connection. <!>`);
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
    console.log(`<!> ERROR: "${error.message}". Cannot get response from OpenAI. <!>`);
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
