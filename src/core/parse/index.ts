import { requestGeneratorXml } from "../ai";
import { sendHttpRequest } from "../sendHttpRequest";
import chalk from "chalk";

function prettyPrintJSON(obj: any): string {
  return JSON.stringify(obj, null, 2);
}

interface TestResult {
  name: string;
  method: string;
  success: boolean;
  duration: number;
  statusCode?: number;
  error?: string;
}

function divider() {
  console.log(chalk.gray("═".repeat(80)));
}

function sectionDivider() {
  console.log(chalk.blue("─".repeat(80)));
}

function spacer() {
  console.log("");
}

function headerBox(title: string) {
  const padding = " ".repeat(4);
  const line = "─".repeat(title.length + 8);
  console.log(chalk.cyan(`┌${line}┐`));
  console.log(chalk.cyan(`│${padding}${chalk.bold.white(title)}${padding}│`));
  console.log(chalk.cyan(`└${line}┘`));
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

function statusIcon(success: boolean) {
  return success ? chalk.green("✅") : chalk.red("❌");
}

function formatJson(obj: any, indent: number = 2): string {
  return JSON.stringify(obj, null, indent)
    .split("\n")
    .map((line) => `    ${line}`)
    .join("\n");
}

export async function requestToAi(prompt: string) {
  try {
    const response = await requestGeneratorXml(prompt);
    return response ?? "";
  } catch (err) {
    console.error("[requestToAi]: " + err);
  }
}

export async function aiParser(prompt: string) {
  const aiResponse = await requestToAi(prompt);
  if (!aiResponse) {
    throw new Error("aiResponse is undefined");
  }

  try {
    const testCases = JSON.parse(aiResponse);
    if (!Array.isArray(testCases)) {
      throw new Error("Expected an array of test cases");
    }

    const results: TestResult[] = [];
    const startTime = Date.now();

    console.log(chalk.cyan.bold("🚀 STARTING API TEST SUITE"));
    console.log(chalk.gray(`📅 ${new Date().toLocaleString()}`));
    console.log(chalk.gray(`📊 Total tests to run: ${testCases.length}`));
    divider();

    for (const test of testCases) {
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
      let headers: Record<string, string> = {
        ...testHeaders,
      };

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

      spacer();
      const testIndex = testCases.indexOf(test) + 1;
      const progressBar = `[${testIndex}/${testCases.length}]`;
      const progressPercent = ((testIndex / testCases.length) * 100).toFixed(0);

      headerBox(`TEST CASE ${progressBar} (${progressPercent}%)`);
      spacer();

      console.log(chalk.cyan("🧪 TEST NAME:"));
      console.log(chalk.white(`    ${chalk.bold(name)}`));
      spacer();

      console.log(chalk.magenta("📋 REQUEST DETAILS:"));
      console.log(chalk.yellow(`    Method:     ${methodColor(method)}`));
      console.log(chalk.yellow(`    Endpoint:   ${chalk.cyan(url)}`));
      console.log(chalk.yellow(`    Data Type:  ${chalk.magenta(dataType)}`));
      spacer();

      if (params && Object.keys(params).length > 0) {
        console.log(chalk.blue("📦 PARAMETERS:"));
        console.log(chalk.white(formatJson(params)));
        spacer();
      }

      if (body && Object.keys(body).length > 0) {
        console.log(chalk.blue("📝 REQUEST BODY:"));
        console.log(chalk.white(formatJson(body)));
        spacer();
      }

      if (headers && Object.keys(headers).length > 0) {
        console.log(chalk.blue("📬 HEADERS:"));
        console.log(chalk.white(formatJson(headers)));
        spacer();
      }

      sectionDivider();
      console.log(chalk.yellow(`⏳ Executing request... ${progressBar}`));
      spacer();

      const requestStart = Date.now();
      let testResult: TestResult;

      try {
        const result = await sendHttpRequest(url, method, body, headers);
        const duration = Date.now() - requestStart;

        testResult = {
          name,
          method,
          success: true,
          duration,
          statusCode: 200,
        };

        console.log(statusBadge(true) + chalk.green.bold(" SUCCESS!"));
        console.log(chalk.green(`⚡ Duration: ${chalk.bold(duration + "ms")}`));
        console.log(chalk.green("📤 RESPONSE:"));
        console.log(chalk.green(formatJson(result)));
      } catch (error: any) {
        const duration = Date.now() - requestStart;

        testResult = {
          name,
          method,
          success: false,
          duration,
          error: error.message || "Unknown error",
        };

        console.log(statusBadge(false) + chalk.red.bold(" FAILED!"));
        console.log(chalk.red(`⚡ Duration: ${chalk.bold(duration + "ms")}`));
        console.log(chalk.red("❌ ERROR:"));
        console.log(chalk.red(`    ${error.message || "Unknown error"}`));
      }

      results.push(testResult);
      divider();
    }

    spacer();

    // Test Summary
    const totalDuration = Date.now() - startTime;
    const passed = results.filter((r) => r.success).length;
    const failed = results.filter((r) => r.success === false).length;
    const passRate = ((passed / results.length) * 100).toFixed(1);

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
    console.log(
      chalk.gray(
        `🕐 Average per test: ${chalk.bold((totalDuration / results.length).toFixed(0) + "ms")}`,
      ),
    );
    spacer();

    if (failed > 0) {
      console.log(chalk.red.bold("❌ FAILED TESTS:"));
      results
        .filter((r) => !r.success)
        .forEach((result, index) => {
          console.log(chalk.red(`  ${index + 1}. ${chalk.bold(result.name)}`));
          console.log(chalk.red(`     Method: ${methodColor(result.method)}`));
          console.log(chalk.red(`     Error: ${chalk.bold(result.error)}`));
          console.log(
            chalk.red(`     Duration: ${chalk.bold(result.duration + "ms")}`),
          );
          spacer();
        });
    }

    const completionStatus =
      failed === 0
        ? chalk.green.bold("🏁 ALL TESTS COMPLETED SUCCESSFULLY! 🎉")
        : chalk.yellow.bold("🏁 TESTS COMPLETED WITH SOME FAILURES ⚠️");

    console.log(completionStatus);
    spacer();
  } catch (error) {
    console.error(chalk.bgRed.white("[aiParser Error]: "), error);
  }
}
