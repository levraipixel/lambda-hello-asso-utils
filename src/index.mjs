// import helloasso from 'helloasso-node';
import { ClientCredentials } from 'simple-oauth2';
import { DynamoDBClient, BatchWriteItemCommand } from "@aws-sdk/client-dynamodb";

const API_BASE_URL = 'https://api.helloasso.com';
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const ORGANIZATION_SLUG = process.env.ORGANIZATION_SLUG;
const DYNAMODB_TABLE = process.env.DYNAMODB_TABLE || "Payments";

// Create the client credentials instance
const oAuthClient = new ClientCredentials({
  client: {
    id: CLIENT_ID,
    secret: CLIENT_SECRET,
  },
  auth: {
    tokenHost: API_BASE_URL,
    tokenPath: '/oauth2/token',
  },
  options: {
    authorizationMethod: 'body',
  }
});

let accessToken = ACCESS_TOKEN;
const getAccessToken = async () => {
  if (accessToken) {
    return accessToken;
  }

  try {
    const token = await oAuthClient.getToken();
    console.error('Obtained new access token:', JSON.stringify(token));
    accessToken = token.token.access_token;
    return accessToken;
  } catch (error) {
    console.error('Error getting access token:', error.message);
  }
};

const ensureAccessToken = async () => {
  // helloasso.ApiClient.instance.authentications['OAuth2'].accessToken = await getAccessToken();
  await getAccessToken();
};

const getOrganizationDetails = async () => {
  await ensureAccessToken();

  const apiInstance = new helloasso.OrganisationApi();
  return new Promise((resolve, reject) => {
    apiInstance.organizationsOrganizationSlugGet(ORGANIZATION_SLUG, (error, data, response) => {
      if (error) {
        console.error('Error getting organization details:', error);
        return reject(error);
      }
      
      console.log('Organization details:', data, response);
      resolve(data);
    });
  });
};

const apiGet = async (path, params = {}) => {
  console.log(`API GET ${path} with params:`, JSON.stringify(params));
  const apiToken = await getAccessToken();

  const myHeaders = new Headers();
  myHeaders.append("Authorization", `Bearer ${apiToken}`);
  myHeaders.append("Content-Type", "application/json");

  const requestOptions = {
    method: "GET",
    headers: myHeaders,
    redirect: "follow"
  };

  const url = new URL(`${API_BASE_URL}${path}`);
  url.search = new URLSearchParams(params);

  const response = await fetch(url.toString(), requestOptions);
  if (!response.ok) {
    throw new Error(`Response status: ${response.status}`);
  }

  const result = await response.json();
  return result;
};

const getLastPayments = async () => {
  const requestParams = {
    // from: new Date("2013-10-20T19:20:30+01:00"),
    // to: new Date("2013-10-20T19:20:30+01:00"),
    pageIndex: 1,
    pageSize: 100,
    states: ['Authorized'],
    sortField: 'Date',
    sortOrder: 'Desc',
    withCount: true
  };

  const paymentsResponse = await apiGet(`/v5/organizations/${ORGANIZATION_SLUG}/payments`, requestParams);
  return paymentsResponse.data;

  // await ensureAccessToken();
  // const apiInstance = new helloasso.PaiementsApi();
  // return new Promise((resolve, reject) => {
  //   apiInstance.organizationsOrganizationSlugPaymentsGet(ORGANIZATION_SLUG, requestParams, (error, paymentResults, response) => {
  //     if (error) {
  //       console.error('Error getting payments:', error);
  //       return reject(error);
  //     }
  //     resolve(paymentResults);
  //   });
  // });
};

const savePaymentsToDynamoDB = async (payments) => {
  if (!payments || !Array.isArray(payments) || payments.length === 0) {
    console.log("No payments to save.");
    return;
  }

  const client = new DynamoDBClient({ region: process.env.AWS_REGION || "eu-west-3" });

  // DynamoDB BatchWriteItem supports up to 25 items per request
  const chunks = [];
  for (let i = 0; i < payments.length; i += 25) {
    chunks.push(payments.slice(i, i + 25));
  }

  for (const chunk of chunks) {
    const putRequests = chunk.map(payment => ({
      PutRequest: {
        Item: {
          paymentId: { S: String(payment.id) },
          ...Object.fromEntries(
            Object.entries(payment).map(([k, v]) => [k, { S: typeof v === "string" ? v : JSON.stringify(v) }])
          )
        }
      }
    }));

    const params = {
      RequestItems: {
        [DYNAMODB_TABLE]: putRequests
      }
    };

    try {
      await client.send(new BatchWriteItemCommand(params));
      console.log(`Saved ${putRequests.length} payments to DynamoDB.`);
    } catch (err) {
      console.error("Error saving payments to DynamoDB:", err);
    }
  }
};

const ACTION_REFRESH_MEMBERS = 'refreshMembers';

const handleRefreshMembers = async () => {
  console.log('Refreshing members...');
  
  const lastPayments = await getLastPayments();
  console.log(`Fetched ${lastPayments.length} payments.`);
  // console.log('Payments:', JSON.stringify(lastPayments));
  console.log('Latest payment:', JSON.stringify(lastPayments[0]));

  await savePaymentsToDynamoDB(lastPayments);

  // Return a Lambda-compatible response
  return {
    statusCode: 200,
    body: JSON.stringify({ count: lastPayments.length }),
    headers: {
      'Content-Type': 'application/json'
    }
  };
};

export const handler = async (event) => {
  console.log('Handling request', event);

  const action = event.action;
  console.log('HelloAsso action:', action);
  switch (action) {
    case ACTION_REFRESH_MEMBERS:
      return handleRefreshMembers();
    default:
      console.log('Unknown action:', action);
      return {
        statusCode: 422,
        body: JSON.stringify({ error: 'Unknown action', action }),
        headers: {
          'Content-Type': 'application/json'
        }
      };
  }
  // const orgDetails = await getOrganizationDetails();
  // console.log('Result:', orgDetails);
};
