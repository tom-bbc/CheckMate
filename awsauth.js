// // npm install @aws-sdk/client-ssm
const { GetParameterCommand, SSMClient } = require("@aws-sdk/client-ssm");

exports.getAuth = async (name) => {
  const ssmClient = new SSMClient();

  const params = {
    Name: name ?? `/cm-backend/dev/keys`,
    WithDecryption: true,
  };

  try {
    const auth = await ssmClient.send(new GetParameterCommand(params));
    const credentials = JSON.parse(auth.Parameter.Value)
    // console.log("Auth credentials:", credentials);

    return credentials;
  } catch (ex) {
    console.error(ex);
    console.log("ERROR => Interner AWS Fehler (Param Store / S3)");

    return false;
  }
};
