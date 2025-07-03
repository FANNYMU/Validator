export async function sendHttpRequest(
  url: string,
  method: string,
  data?: any,
  headers: Record<string, string> = {},
): Promise<any> {
  const hasBody = ["POST", "PUT", "PATCH"].includes(method.toUpperCase());

  try {
    let body: string | FormData | undefined;

    if (hasBody && data) {
      const contentType = headers["Content-Type"] || headers["content-type"];

      if (contentType?.includes("application/json")) {
        body = JSON.stringify(data);
      } else if (contentType?.includes("application/x-www-form-urlencoded")) {
        body = new URLSearchParams(data).toString();
      } else if (contentType?.includes("multipart/form-data")) {
        const formData = new FormData();
        Object.keys(data).forEach((key) => {
          formData.append(key, data[key]);
        });
        body = formData;
        delete headers["Content-Type"];
        delete headers["content-type"];
      } else {
        body = JSON.stringify(data);
      }
    }

    const response = await fetch(url, {
      method,
      headers,
      body,
    });

    const contentType = response.headers.get("content-type");
    const isJSON = contentType?.includes("application/json");

    if (!response.ok) {
      const msg = isJSON ? await response.json() : await response.text();
      throw new Error(
        `HTTP error! status: ${response.status} - ${JSON.stringify(msg)}`,
      );
    }

    return isJSON ? await response.json() : await response.text();
  } catch (error) {
    // console.error("[sendHttpRequest]:", error);
    throw error;
  }
}
