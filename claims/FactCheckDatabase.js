const { OpenAI } = require("openai");
const { dynamoScan, dynamoQuery } = require("../helper/dynamo");
const getEmbeddingSimilarity = require("compute-cosine-similarity");


const process = {
    env: {
        FACT_CHECK_TABLE: "cm-backend-dev-FactChecks"
    }
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


module.exports.searchFactCheckDatabase = async (input_claim, openai_api_key) => {
    // Get fact-check database from AWS
    let queryParams = {
        TableName: process.env.FACT_CHECK_TABLE,
        ProjectionExpression: "#claimID, #claim",
        ExpressionAttributeNames: {
            "#claimID": "claimID",
            "#claim": "claim",
        },
        Select: "SPECIFIC_ATTRIBUTES",
    };

    const data = await dynamoScan(queryParams);
    const subtable = data.Items;
    console.log(subtable);

    // Extract claims to input into the embeddings process
    const known_claims = subtable.map(row => row.claim.S);
    console.log(known_claims);

    // Set up connection to OpenAI API
    let openai;
    try {
        openai = new OpenAI({ apiKey: openai_api_key });
    } catch (error) {
        console.log(`<!> ERROR: "${error.message}". Cannot set up OpenAI connection. <!>`);
        return;
    }

    // Create embedding for each claim in database
    let claim_embeddings = [];
    for (const claim of known_claims) {
        let embedding = await getEmbedding(claim, openai);
        claim_embeddings.push(embedding);
    }

    console.log(claim_embeddings);

    // Generate similarity scores between input claim and all claims in database
    const match_threshold = 0.5;
    const input_embedding = await getEmbedding(input_claim, openai);

    let similarity_scores = [];
    for (const embedding of claim_embeddings) {
        let similarity = getEmbeddingSimilarity(input_embedding, embedding);
        similarity_scores.push(similarity);
    }

    console.log(similarity_scores);

    // Match the input claim to database claim with maximum similarity score (above threshold)
    const max_similarity = Math.max(...similarity_scores);

    if (max_similarity < match_threshold) {
        console.log("No claim found.");
        return {
            resultsFound: false,
            inputClaim: input_claim,
            factCheck: ''
        }
    }

    const max_index = similarity_scores.indexOf(max_similarity);
    const matched_claim_id = subtable[max_index].claimID;
    console.log(matched_claim_id);

    // Retrive fact-check info associated with the matched claim in the fact-check database
    queryParams = {
        TableName: process.env.FACT_CHECK_TABLE,
        KeyConditionExpression: "#claimID = :claimID",
        ExpressionAttributeValues: {
            ":claimID": matched_claim_id,
        },
        ExpressionAttributeNames: { "#claimID": "claimID" },
        ScanIndexForward: false,
    };

    let matched_claim_data = await dynamoQuery(queryParams);
    matched_claim_data = matched_claim_data.Items[0];
    console.log(matched_claim_data);

    return {
        resultsFound: true,
        inputClaim: input_claim,
        factCheck: matched_claim_data
    }
}
