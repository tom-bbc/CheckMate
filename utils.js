const getEmbeddingSimilarity = require('compute-cosine-similarity');


const formatJSONfromOpenAI = (response) => {
    // If response includes text & json, start from element '```json\n' in response content and end on element '```'
    const json_start_char = '```json\n';
    const json_start_char_2 = '```\n';
    const json_end_char = '```';

    let json_content = response.choices[0].message.content;

    if (json_content.includes(json_start_char) && json_content.includes(json_end_char)) {
        json_content = json_content.split(json_start_char)[1];
        json_content = json_content.split(json_end_char)[0];
    } else if (json_content.includes(json_start_char_2) && json_content.includes(json_end_char)) {
        json_content = json_content.split(json_start_char_2)[1];
        json_content = json_content.split(json_end_char)[0];
    }

    json_content = JSON.parse(json_content);

    return json_content;
}


const splitTranscriptBySentence = (transcript) => {
    const sentences = transcript.replace(/([.?!])\s*(?=[A-Z])/g, "$1|").split("|");
    return sentences;
}


const countWordsInSentence = (sentence) => {
    const no_words = sentence.trim().split(/\s+/).length;
    return no_words;
}


const getEmbedding = async (input_text, openai_connection) => {
    input_text = input_text.replace("\n", " ");

    let embedding = await openai_connection.embeddings.create({
        model: "text-embedding-3-small",
        input: input_text,
        encoding_format: "float",
    });

    embedding = embedding.data[0].embedding;

    return embedding;
}


const getTextSimilarity = async (input_text_1, input_text_2, openai_connection) => {
    let embedding_1 = await getEmbedding(input_text_1, openai_connection);
    let embedding_2 = await getEmbedding(input_text_2, openai_connection);

    let similarity_score = getEmbeddingSimilarity(embedding_1, embedding_2);

    return similarity_score;
}


module.exports = {
    formatJSONfromOpenAI,
    splitTranscriptBySentence,
    countWordsInSentence,
    getEmbedding,
    getTextSimilarity,
    getEmbeddingSimilarity
};
