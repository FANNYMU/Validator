import { requestGeneratorXml } from "./core/ai";
import { aiParser } from "./core/parse";

aiParser(`
  API Documentation for Testing:

  POST http://127.0.0.1:8000/register — requires username, email, and password as QUERY PARAMETERS. Returns 200 OK if successful.

  POST http://127.0.0.1:8000/login — requires email and password as QUERY PARAMETERS. Returns 200 OK with JSON token.

  GET http://127.0.0.1:8000/user/{username} — requires x-token header with value "mocked-jwt-token". Returns 200 OK with user data. Use real username like "johndoe".

  PUT http://127.0.0.1:8000/user/{username} — optional email/password as QUERY PARAMETERS, requires x-token header with value "mocked-jwt-token". Returns 200 OK.

  DELETE http://127.0.0.1:8000/user/{username} — requires x-token header with value "mocked-jwt-token". Returns 200 OK if successful.

  POST http://127.0.0.1:8000/posts — requires title and content as QUERY PARAMETERS. Returns 201 Created.

  GET http://127.0.0.1:8000/posts?skip=0&limit=10 — returns array of posts.

  GET http://127.0.0.1:8000/posts/{post_id} — returns post detail or 404 if not found. Use numeric ID like 1, 2, 3.

  POST http://127.0.0.1:8000/feedback — accepts JSON body with "message" and "rating". Returns 200 OK with feedback details.

  CRITICAL: This FastAPI uses Query parameters for ALL POST and PUT endpoints, not body data, except for the /feedback endpoint which accepts JSON body.
  Use dataType: "query" for ALL POST and PUT requests except /feedback, which uses dataType: "json".
  Use x-token header (with dash, not underscore) with exact value "mocked-jwt-token" for authenticated endpoints.
  Use realistic test data like "johndoe", "john@example.com", "SecurePass123".
  `);
