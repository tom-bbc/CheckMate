const { GetParameterCommand, SSMClient } = require("@aws-sdk/client-ssm");

const SERVICE = 'cm-backend';
const STAGE = 'dev';

const ssmClient = new SSMClient();

module.exports.getAuth = async (name) => {
  const params = {
    Name: name ?? `/${SERVICE}/${STAGE}/keys`,
    WithDecryption: true,
  };

  try {
    const auth = await ssmClient.send(new GetParameterCommand(params));

    return JSON.parse(auth.Parameter.Value);
  } catch (ex) {
    console.error(ex);
    console.log("ERROR => Interner AWS Fehler (Param Store / S3)");

    return false;
  }
};
