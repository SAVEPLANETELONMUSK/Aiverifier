export async function handler(event) {
  const url = event.queryStringParameters.url;

  if (!url || !url.includes("youtube.com")) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Only YouTube links are supported right now." })
    };
  }

  try {
    const apiUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error("Invalid video or YouTube blocked request.");
    }

    const data = await response.json();

    return {
      statusCode: 200,
      body: JSON.stringify({
        title: data.title,
        thumbnail: data.thumbnail_url,
        url
      })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Verification failed." })
    };
  }
}
