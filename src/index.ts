import express from "express";
import path from "path";
import { requestGeneratorXml } from "./core/ai";
import { sendHttpRequest } from "./core/sendHttpRequest";
import chalk from "chalk";

const app = express();
const PORT = process.env.PORT || 1234;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../src/templates"));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

interface TestResult {
  name: string;
  method: string;
  success: boolean;
  duration: number;
  statusCode?: number;
  error?: string;
  response?: any;
  responseHeaders?: Record<string, string>;
}

function formatJson(obj: any, indent: number = 2): string {
  return JSON.stringify(obj, null, indent);
}

function methodColor(method: string) {
  switch (method.toUpperCase()) {
    case "GET":
      return chalk.green(method);
    case "POST":
      return chalk.blue(method);
    case "PUT":
      return chalk.yellow(method);
    case "DELETE":
      return chalk.red(method);
    default:
      return chalk.white(method);
  }
}

function statusBadge(success: boolean) {
  return success ? chalk.bgGreen.black(" PASS ") : chalk.bgRed.white(" FAIL ");
}

/**
 * Handles streaming AI-generated API test cases to the client via Server-Sent Events (SSE).
 *
 * @param prompt - The user input describing the API endpoints, methods, and requirements for test case generation.
 * @param res - The Express response object used to stream data to the client.
 *
 * This function processes the user prompt to generate API test cases using an AI model. It streams the test execution
 * results back to the client in real-time, including details such as test case metadata, execution status, and response data.
 *
 * The streaming format follows the Server-Sent Events (SSE) protocol, allowing the client to receive updates as tests are executed.
 *
 * Example usage:
 * ```
 * await streamingAiParser('Generate test cases for a user API with GET and POST methods.', res);
 * ```
 *
 * @throws An error if the AI model fails to generate test cases or if an issue occurs during test execution.
 */
async function streamingAiParser(prompt: string, res: express.Response) {
  try {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Cache-Control",
    });

    const sendData = (data: any) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    const aiResponse = await requestGeneratorXml(prompt);
    if (!aiResponse) {
      sendData({ type: "error", error: "aiResponse is undefined" });
      res.end();
      return;
    }

    const testCases = JSON.parse(aiResponse);
    if (!Array.isArray(testCases)) {
      sendData({ type: "error", error: "Expected an array of test cases" });
      res.end();
      return;
    }

    const results: TestResult[] = [];
    const startTime = Date.now();

    sendData({
      type: "start",
      message: "Starting API test suite",
      totalTests: testCases.length,
    });

    for (let i = 0; i < testCases.length; i++) {
      const test = testCases[i];
      const {
        name,
        method,
        endpoint,
        headers: testHeaders = {},
        params = {},
        dataType = "json",
      } = test;

      const fullUrl = endpoint.startsWith("http")
        ? endpoint
        : `http://${endpoint}`;
      let url = fullUrl;
      let body: any = null;
      let headers: Record<string, string> = { ...testHeaders };

      if (
        params &&
        typeof params === "object" &&
        Object.keys(params).length > 0
      ) {
        if (
          dataType === "query" ||
          ["GET", "DELETE"].includes(method.toUpperCase())
        ) {
          const query = new URLSearchParams(params).toString();
          if (query) {
            const separator = url.includes("?") ? "&" : "?";
            url += `${separator}${query}`;
          }
        } else if (dataType === "form") {
          body = params;
          if (!headers["Content-Type"] && !headers["content-type"]) {
            headers["Content-Type"] = "application/x-www-form-urlencoded";
          }
        } else {
          body = params;
          if (!headers["Content-Type"] && !headers["content-type"]) {
            headers["Content-Type"] = "application/json";
          }
        }
      }

      sendData({
        type: "test_start",
        index: i,
        total: testCases.length,
        testCase: {
          name,
          method,
          endpoint: url,
          headers,
          params,
          dataType,
          body,
        },
      });

      const requestStart = Date.now();
      let testResult: TestResult;

      try {
        const httpResponse = await sendHttpRequest(url, method, body, headers);
        const duration = Date.now() - requestStart;

        testResult = {
          name,
          method,
          success: true,
          duration,
          statusCode: httpResponse.status,
          response: httpResponse.data,
          responseHeaders: httpResponse.headers,
        };

        console.log(statusBadge(true) + chalk.green.bold(" SUCCESS!"));
        console.log(chalk.green(`⚡ Duration: ${chalk.bold(duration + "ms")}`));
        console.log(chalk.green("📤 RESPONSE:"));
        console.log(chalk.green(formatJson(httpResponse.data)));
      } catch (error: any) {
        const duration = Date.now() - requestStart;

        testResult = {
          name,
          method,
          success: false,
          duration,
          error: error.message || "Unknown error",
          response: null,
        };

        console.log(statusBadge(false) + chalk.red.bold(" FAILED!"));
        console.log(chalk.red(`⚡ Duration: ${chalk.bold(duration + "ms")}`));
        console.log(chalk.red("❌ ERROR:"));
        console.log(chalk.red(`    ${error.message || "Unknown error"}`));
      }

      results.push(testResult);

      sendData({
        type: "test_complete",
        index: i,
        testCase: {
          name,
          method,
          endpoint: url,
          headers,
          params,
          dataType,
          body,
          fullUrl: url,
        },
        result: testResult,
        response: testResult.response,
        responseHeaders: testResult.responseHeaders,
        requestBody: body,
        fullUrl: url,
      });
    }

    const totalDuration = Date.now() - startTime;
    const passed = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;
    const passRate = ((passed / results.length) * 100).toFixed(1);

    // Log final summary to console
    console.log(chalk.cyan.bold("📊 TEST EXECUTION SUMMARY"));
    console.log(chalk.cyan("══════════════════════════════════════"));
    console.log(
      chalk.white(
        `📝 Total Tests:     ${chalk.bold(results.length.toString())}`,
      ),
    );
    console.log(
      chalk.green(`✅ Passed:          ${chalk.bold(passed.toString())}`),
    );
    console.log(
      chalk.red(`❌ Failed:          ${chalk.bold(failed.toString())}`),
    );
    console.log(
      chalk.yellow(`📈 Pass Rate:       ${chalk.bold(passRate + "%")}`),
    );
    console.log(
      chalk.blue(`⏱️  Total Duration:  ${chalk.bold(totalDuration + "ms")}`),
    );

    sendData({
      type: "complete",
      summary: {
        total: results.length,
        passed,
        failed,
        passRate,
        totalDuration,
      },
    });

    res.end();
  } catch (error: any) {
    console.error("Streaming error:", error);
    res.write(
      `data: ${JSON.stringify({ type: "error", error: error.message })}\n\n`,
    );
    res.end();
  }
}

app.get("/", (req, res) => {
  res.render("index", {
    title: "API Test Generator Dashboard",
    message: "Welcome to the AI-powered API testing dashboard",
  });
});

app.get("/dashboard", (req, res) => {
  res.render("index", {
    title: "API Test Generator Dashboard",
    message: "Welcome to the AI-powered API testing dashboard",
  });
});

app.post("/api/parse", (req: express.Request, res: express.Response) => {
  (async () => {
    try {
      const { prompt } = req.body;

      if (!prompt) {
        res.status(400).json({ error: "Prompt is required" });
        return;
      }

      await streamingAiParser(prompt, res);
    } catch (error: any) {
      console.error("API parse error:", error);
      res.status(500).json({ error: error.message });
    }
  })();
});

app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

app.use((req, res) => {
  res.status(404).json({ error: "Not Found" });
});

app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    console.error(err.stack);
    res.status(500).json({ error: "Something went wrong!" });
  },
);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Dashboard available at http://localhost:${PORT}/dashboard`);
});

module.exports = app;
