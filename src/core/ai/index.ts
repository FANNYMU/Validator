import groqInstance from "../../utils/groq";

const aiSystemPrompt = `
You are an API test case generator.

Your job is to create a complete set of automated API test cases in **pure JSON** format based on user input.
You must cover all HTTP methods mentioned by the user (GET, POST, PUT, DELETE, etc).

Each test case must be structured like this:
{
  "name": "Brief description of the test",
  "method": "GET" | "POST" | "PUT" | "DELETE",
  "endpoint": "localhost:8080/example",
  "headers": {
    // HTTP headers like "Content-Type", "Authorization", etc.
  },
  "params": {
    // query or body parameters
  },
  "dataType": "json" | "form" | "query"
}

IMPORTANT RULES:
1. Use REALISTIC test data (not placeholders like "username", "email", "password")
2. For POST/PUT requests that might expect form data or query parameters, set "dataType": "form" or "dataType": "query"
3. For JSON requests, set "dataType": "json"
4. For path parameters like {id}, {username}, use realistic values (e.g., 1, "johndoe")
5. For authentication tokens, use realistic format like "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
6. If the endpoint does not require parameters, then "params" must be an empty object: {}
7. If the endpoint does not require special headers, then "headers" must be an empty object: {}

DATA TYPE RULES:
- "json": Send params as JSON body with Content-Type: application/json
- "form": Send params as form-urlencoded with Content-Type: application/x-www-form-urlencoded
- "query": Send params as query string parameters (usually for GET requests)

REALISTIC DATA EXAMPLES:
- username: "johndoe", "alice123", "testuser"
- email: "john@example.com", "alice@test.com"
- password: "SecurePass123", "mypassword456"
- token: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
- id: 1, 2, 123 (for numeric IDs)

Wrap all test cases in a JSON array. Respond ONLY with JSON. No explanations, no code blocks, and no markdown.

If input is ambiguous or incomplete, make realistic assumptions based on common API patterns.
`;

/**
 * Generates a set of API test cases in JSON format based on the provided user prompt.
 *
 * @param prompt - The user input describing the API endpoints, methods, and requirements for test case generation.
 * @returns A promise that resolves to a string containing the generated JSON test cases.
 *
 * This function uses a predefined AI system prompt to instruct the model on how to create realistic and complete API test cases.
 * The generated test cases include details such as HTTP method, endpoint, headers, parameters, and data type.
 *
 * Example usage:
 * ```
 * const testCasesJson = await requestGeneratorXml('Generate test cases for a user API with GET and POST methods.');
 * console.log(testCasesJson);
 * ```
 *
 * @throws An error if the AI model fails to generate a response or encounters an issue during processing.
 */
export async function requestGeneratorXml(prompt: string): Promise<string> {
  try {
    const response = await groqInstance.groqInstance.chat.completions.create({
      messages: [
        { role: "system", content: aiSystemPrompt },
        { role: "user", content: prompt },
      ],
      model: "llama-3.3-70b-versatile",
    });

    return response.choices?.[0]?.message?.content ?? "";
  } catch (err) {
    console.error(`[requestGeneratorXml]: ${err}`);
    return "";
  }
}
