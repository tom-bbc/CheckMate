const { OpenAI } = require("openai");
const { dynamoScan, dynamoQuery, dynamoUpdate } = require("../helper/dynamo");
const getEmbeddingSimilarity = require("compute-cosine-similarity");


const process = {
    env: {
        FACT_CHECK_TABLE: 'cm-backend-dev-FactChecks',
    }
}


// Generate a single embedding vector of a text string
const getEmbedding = async (input_text, openai_connection) => {
    input_text = input_text.replace("\n", " ");

    let embedding = await openai_connection.embeddings.create({
        model: "text-embedding-3-small",
        input: input_text,
        encoding_format: "float",
        dimensions: 256
    });

    embedding = embedding.data[0].embedding;

    return embedding;
}


// Get the similarity score of two text strings using embeddings
module.exports.getTextSimilarity = async (input_text_1, input_text_2, openai_api_key) => {
    // Set up connection to OpenAI API embedding model
    let openai;
    try {
        openai = new OpenAI({ apiKey: openai_api_key });
    } catch (error) {
        console.log(`<!> ERROR: "${error.message}". Cannot set up OpenAI connection. <!>`);
        return 0;
    }

    // Get embedding vectors
    let embedding_1 = await getEmbedding(input_text_1, openai);
    let embedding_2 = await getEmbedding(input_text_2, openai);

    // Calculate similarity
    let similarity_score = getEmbeddingSimilarity(embedding_1, embedding_2);

    return similarity_score;
}


// Get the similarity score of two text strings using embeddings
module.exports.getClaimSimilarities = async (input_claim, claim_array, openai_api_key) => {
    // Set up connection to OpenAI API embedding model
    let openai;
    try {
        openai = new OpenAI({ apiKey: openai_api_key });
    } catch (error) {
        console.log(`<!> ERROR: "${error.message}". Cannot set up OpenAI connection. <!>`);
        return [];
    }

    // Generate embedding for the input claim
    let input_embedding;
    try {
        input_embedding = await getEmbedding(input_claim, openai);
    } catch (error) {
        console.log(`<!> ERROR: "${error.message}". Cannot generate embeddings. <!>`);
        return [];
    }

    // Generate embedding for each claim in array
    let claim_embeddings = [];
    for (const claim of claim_array) {
        try {
            let embedding = await getEmbedding(claim, openai);
            claim_embeddings.push(embedding);
        } catch (error) {
            console.log(`<!> ERROR: "${error.message}". Cannot generate embeddings. <!>`);
            claim_embeddings.push(0.5);
        }
    }

    // Generate similarity scores between input claim and all claims in array
    let similarity_scores = claim_embeddings.map(embedding => getEmbeddingSimilarity(input_embedding, embedding));
    similarity_scores = similarity_scores.map(score => Number((100 * score).toFixed(2)));

    return similarity_scores;
}


// Search a proprietary database of known fact-checks for an input claim
module.exports.factCheckDatabase = async (input_claim, openai_api_key) => {
    // !! UPDATE: check if embedding already in table, use that if so, and if not compute one, use this, and push to table

    // Set up connection to OpenAI API embedding model
    let openai;
    try {
        openai = new OpenAI({ apiKey: openai_api_key });
    } catch (error) {
        console.log(`<!> ERROR: "${error.message}". Cannot set up OpenAI connection. <!>`);
        return [];
    }

    // Get fact-check database from AWS
    let queryParams = {
        TableName: process.env.FACT_CHECK_TABLE,
        ProjectionExpression: "#claimID, #claim, #embedding",
        ExpressionAttributeNames: {
            "#claimID": "claimID",
            "#claim": "claim",
            "#embedding": "embedding"
        },
        Select: "SPECIFIC_ATTRIBUTES",
    };

    let aws_table_data;
    try {
        aws_table_data = await dynamoScan(queryParams);
    } catch (error) {
        console.log(`<!> ERROR: "${error.message}". Cannot connect to fact-check database. <!>`);
        return [];
    }

    // Get claim embeddings from database or generate via OpenAI
    aws_table_data = aws_table_data.Items;
    // console.log(aws_table_data);

    const regenerate_embeddings = false;
    let claim_embeddings = [];

    for (const row of aws_table_data) {
        let embedding = [];

        if (!regenerate_embeddings && row.embedding && row.embedding.S !== '') {
            // Get embedding from database for this claim
            console.log("Found claim with embedding:", row.claimID.S);
            embedding = JSON.parse(row.embedding.S);
        } else {
            // Generate new embedding
            console.log("Generating embedding for claim:", row.claimID.S);
            try {
                embedding = await getEmbedding(row.claim.S, openai);
            } catch (error) {
                console.log(`<!> ERROR: "${error.message}". Cannot generate embeddings. <!>`);
                return [];
            }

            // Add new embedding to database
            queryParams = {
                "ExpressionAttributeNames": {
                    "#embedding": "embedding"
                },
                "ExpressionAttributeValues": {
                    ":e": { S: JSON.stringify(embedding) }
                },
                "Key": {
                    "claimID": row.claimID
                },
                "ReturnValues": "ALL_NEW",
                "TableName": process.env.FACT_CHECK_TABLE,
                "UpdateExpression": "SET #embedding = :e"
            };

            try {
                await dynamoUpdate(queryParams);
            } catch (error) {
                console.log(`<!> ERROR: "${error.message}". Cannot update fact-check database. <!>`);
                return [];
            }
            console.log("Update item: ", row);
        }

        claim_embeddings.push(embedding);
    }

    let input_embedding;
    try {
        input_embedding = await getEmbedding(input_claim, openai);
    } catch (error) {
        console.log(`<!> ERROR: "${error.message}". Cannot generate embeddings. <!>`);
        return [];
    }
    // console.log(input_embedding);

    // Generate similarity scores between input claim and all claims in database
    let similarity_scores = claim_embeddings.map(embedding => getEmbeddingSimilarity(input_embedding, embedding));
    // console.log(similarity_scores);

    // Match the input claim to database claim with maximum similarity score (above threshold)
    const match_threshold = 0.5;
    const max_similarity = Math.max(...similarity_scores);

    if (max_similarity < match_threshold) {
        console.log("No claim found in AWS fact-check database.");
        return [];
    }

    const max_index = similarity_scores.indexOf(max_similarity);
    const matched_claim_id = aws_table_data[max_index].claimID;
    // console.log(`Matched claim: ${matched_claim_id} (${max_similarity})`);

    // Retrive fact-check data associated with the matched claim from fact-check database
    queryParams = {
        TableName: process.env.FACT_CHECK_TABLE,
        KeyConditionExpression: "#claimID = :claimID",
        ExpressionAttributeValues: {
            ":claimID": matched_claim_id,
        },
        ExpressionAttributeNames: { "#claimID": "claimID" },
        ScanIndexForward: false,
    };

    let matched_claim_data;
    try {
        matched_claim_data = await dynamoQuery(queryParams);
    } catch (error) {
        console.log(`<!> ERROR: "${error.message}". Cannot connect to fact-check database. <!>`);
        return [];
    }
    matched_claim_data = matched_claim_data.Items[0];
    // console.log(matched_claim_data);

    // Format fact-check data into output data structure
    const article_url = new URL(matched_claim_data.url.S);
    const publisher_url_href = article_url.origin;

    const fact_check_results = [{
        factCheckMethod: "Fact check database",
        matchedClaim: matched_claim_data.claim?.S,
        claimSimilarity: Number((100 * max_similarity).toFixed(2)),
        matchedClaimSpeaker: matched_claim_data.speaker?.S,
        claimReview: [{
            publisher: {
                name: "None",
                url: publisher_url_href
            },
            url: article_url.href,
            title: matched_claim_data.title?.S,
            textualRating: matched_claim_data.textualRating?.S,
            languageCode: matched_claim_data.languageCode?.S,
            reviewArticleExtract: "None",
        }]
    }];

    console.log(fact_check_results[0]);

    return fact_check_results;
}
