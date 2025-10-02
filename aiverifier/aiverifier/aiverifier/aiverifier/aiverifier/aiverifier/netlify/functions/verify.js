exports.handler = async (event) => {
  const url = event.queryStringParameters.url || "";

  if (!url) {
    return { statusCode: 400, body: JSON.stringify({ status: "error", message: "No URL provided" }) };
  }

  // Simple example logic
  let message = "This appears to be a valid human-made video.";
  if (url.includes("ai") || url.includes("deepfake")) {
    message = "⚠️ Warning: This content may be AI-generated or altered.";
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ status: "Verified", message })
  };
};
