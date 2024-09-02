const getEmbeddingSimilarity = require('compute-cosine-similarity');


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
    getEmbedding,
    getTextSimilarity,
    getEmbeddingSimilarity
};
