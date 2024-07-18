const { OpenAI } = require("openai");
const { getAuth } = require('./getAWSCreds');

async function main() {
    const auth = await getAuth();
    const openai = new OpenAI({ apiKey: auth.OPEN_API_KEY })

    const completion = await openai.chat.completions.create({
        messages: [{ role: "system", content: "You are a helpful assistant." }],
        model: "gpt-3.5-turbo",
    });

    console.log(completion.choices[0]);
}

main();
