module.exports.formatJSONfromOpenAI = (response) => {
    // If response includes text & json, start from element '```json\n' in response content and end on element '```'
    const json_start_char = '```json\n';
    const json_end_char = '```';
    let json_content = response.choices[0].message.content;

    if (json_content.includes(json_start_char) && json_content.includes(json_end_char)) {
        json_content = json_content.split(json_start_char)[1];
        json_content = json_content.split(json_end_char)[0];
    }

    json_content = JSON.parse(json_content);

    return json_content;
}
