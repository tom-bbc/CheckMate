const { OpenAI } = require("openai");
const { getAuth } = require('./getAWSCreds');

async function main() {
    const auth = await getAuth();
    const openai = new OpenAI({ apiKey: auth.OPEN_API_KEY })

    const response = await openai.chat.completions.create({
        messages: [
            { "role": "system", "content": "You are a helpful assistant." },
            { "role": "user", "content": "Who won the world series in 2020?" },
        ],
        model: "gpt-4o",
    });

    const resp_text_content = response.choices[0].message.content
    console.log(resp_text_content);
}

main();
